import json
import os

from genes import yield_genes
from drugs import yield_drugs
from utils import create_b64_id
from shared.utils import handle_failed_execution, LoggingClient

LOCAL_DIR = "/tmp"
PGXFLOW_BUCKET = os.environ["PGXFLOW_BUCKET"]
ORGANISATIONS = json.loads(os.environ["ORGANISATIONS"])
PGXFLOW_PHARMCAT_GNOMAD_LAMBDA = os.environ["PGXFLOW_PHARMCAT_GNOMAD_LAMBDA"]

lambda_client = LoggingClient("lambda")
s3_client = LoggingClient("s3")


def lambda_handler(event, _):
    print(f"Event received: {json.dumps(event)}")
    request_id = event["requestId"]
    s3_key = event["s3Key"]
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

        local_input_path = os.path.join(LOCAL_DIR, processed_json)
        s3_client.download_file(
            Bucket=PGXFLOW_BUCKET,
            Key=s3_key,
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
                    if offset is None:
                        print(
                            f"Skippping the following annotation as it is not associated with any diplotype:\n{annotation}"
                        )
                        continue
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

        s3_client.put_object(
            Bucket=PGXFLOW_BUCKET,
            Key=s3_key,
            Body=json.dumps(
                {
                    "diplotypes": diplotypes,
                    "variants": variants,
                }
            ).encode(),
        )
        lambda_client.invoke(
            FunctionName=PGXFLOW_PHARMCAT_GNOMAD_LAMBDA,
            InvocationType="Event",
            Payload=json.dumps(
                {
                    "requestId": request_id,
                    "projectName": project,
                    "s3Key": s3_key,
                }
            ),
        )
    except Exception as e:
        handle_failed_execution(request_id, e)
