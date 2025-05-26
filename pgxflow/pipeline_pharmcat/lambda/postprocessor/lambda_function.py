import json
import os

from genes import yield_genes
from drugs import yield_drugs
from utils import create_b64_id
from shared.utils import handle_failed_execution, LoggingClient
from shared.dynamodb import update_clinic_job

LOCAL_DIR = "/tmp"
RESULT_SUFFIX = os.environ["RESULT_SUFFIX"]
PGXFLOW_BUCKET = os.environ["PGXFLOW_BUCKET"]
DPORTAL_BUCKET = os.environ["DPORTAL_BUCKET"]
ORGANISATIONS = json.loads(os.environ["ORGANISATIONS"])

s3_client = LoggingClient("s3")


def lambda_handler(event, _):
    print(f"Event received: {json.dumps(event)}")
    request_id = event["requestId"]
    s3_input_key = event["s3Key"]
    project = event["projectName"]
    source_vcf_key = event["sourceVcfKey"]

    try:
        processed_json = f"{request_id}.pharmcat.json"
        tmp1_diplotypes_jsonl = os.path.join(
            LOCAL_DIR, f"tmp1_diplotypes_{processed_json}l"
        )
        tmp2_diplotypes_jsonl = os.path.join(
            LOCAL_DIR, f"tmp2_diplotypes_{processed_json}l"
        )
        tmp_variants_jsonl = os.path.join(LOCAL_DIR, f"tmp_variants_{processed_json}l")
        postprocessed_json = f"out_{processed_json}"

        local_input_path = os.path.join(LOCAL_DIR, processed_json)
        s3_client.download_file(
            Bucket=PGXFLOW_BUCKET,
            Key=s3_input_key,
            Filename=local_input_path,
        )

        diplotype_offsets = {}
        drugs_to_genes = {entry["drug"]: entry["gene"] for entry in ORGANISATIONS}
        with open(tmp1_diplotypes_jsonl, "w") as d1_f, open(
            tmp_variants_jsonl, "w"
        ) as v_f:
            for diplotype_chunk, diplotype_id_chunk, variant_chunk in yield_genes(
                local_input_path, source_vcf_key
            ):
                for i in range(len(diplotype_chunk)):
                    offset = d1_f.tell()
                    diplotype_id = diplotype_id_chunk[i]
                    diplotype_offsets[diplotype_id] = offset
                    json.dump(diplotype_chunk[i], d1_f)
                    d1_f.write("\n")

                visited_mapping_ids = set()
                for i in range(len(variant_chunk)):
                    mapping_id = variant_chunk[i]["mapping"]
                    if mapping_id not in visited_mapping_ids:
                        visited_mapping_ids.add(mapping_id)
                        json.dump(variant_chunk[i], v_f)
                        v_f.write("\n")

        with open(tmp1_diplotypes_jsonl, "rb") as d1_f, open(
            tmp2_diplotypes_jsonl, "w"
        ) as d2_f:
            visited_annotations = set()
            for annotation_chunk in yield_drugs(local_input_path):
                for i in range(len(annotation_chunk)):
                    annotation = annotation_chunk[i]
                    annotation_id = create_b64_id(
                        annotation["org"],
                        annotation["drug"],
                        annotation["gene"],
                        annotation["alleles"],
                    )
                    if annotation_id in visited_annotations:
                        continue
                    visited_annotations.add(annotation_id)

                    diplotype_mapping_id = create_b64_id(
                        drugs_to_genes.get(annotation["org"]),
                        annotation["gene"],
                        annotation["alleles"],
                    )
                    offset = diplotype_offsets.get(diplotype_mapping_id)
                    d1_f.seek(offset)
                    diplotype = json.loads(d1_f.readline())
                    for prop in [
                        # Organisation from drug annotation replaces org from gene
                        "org",
                        "drug",
                        "pmids",
                        "implications",
                        "recommendation",
                        "dosingInformation",
                        "alternateDrugAvailable",
                        "otherPrescribingGuidance",
                    ]:
                        diplotype[prop] = annotation[prop]

                    json.dump(diplotype, d2_f)
                    d2_f.write("\n")

        diplotypes = []
        variants = []

        with open(tmp2_diplotypes_jsonl, "rb") as d2_f, open(
            tmp_variants_jsonl, "rb"
        ) as v_f:
            for line in d2_f:
                diplotype = json.loads(line)
                diplotypes.append(diplotype)

            for line in v_f:
                variant = json.loads(line)
                variants.append(variant)

        local_output_path = os.path.join(LOCAL_DIR, postprocessed_json)
        with open(local_output_path, "w") as out_f:
            json.dump(
                {
                    "diplotypes": diplotypes,
                    "variants": variants,
                },
                out_f,
                indent=4,
            )

        s3_client.upload_file(
            Filename=local_output_path,
            Bucket=DPORTAL_BUCKET,
            Key=f"projects/{project}/clinical-workflows/{request_id}{RESULT_SUFFIX}",
        )

        s3_client.delete_object(
            Bucket=PGXFLOW_BUCKET,
            Key=s3_input_key,
        )

        update_clinic_job(request_id, job_status="completed")

    except Exception as e:
        handle_failed_execution(request_id, e)
