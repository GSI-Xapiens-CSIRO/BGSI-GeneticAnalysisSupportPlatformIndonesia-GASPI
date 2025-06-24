import json
import os

from genes import yield_genes, create_diplotype
from drugs import yield_drugs
from messages import yield_messages
from utils import create_b64_id
from shared.utils import handle_failed_execution, LoggingClient

LOCAL_DIR = "/tmp"
PGXFLOW_BUCKET = os.environ["PGXFLOW_BUCKET"]
ORGANISATIONS = json.loads(os.environ["ORGANISATIONS"])
PGXFLOW_PHARMCAT_GNOMAD_LAMBDA = os.environ["PGXFLOW_PHARMCAT_GNOMAD_LAMBDA"]

lambda_client = LoggingClient("lambda")
s3_client = LoggingClient("s3")


def write_messages(messages_jsonl, local_input_path):
    with open(messages_jsonl, "w") as m_f:
        for message_chunk in yield_messages(local_input_path):
            for message in message_chunk:
                json.dump(message, m_f)
                m_f.write("\n")


def write_diplotypes_and_variants(
    local_input_path,
    source_vcf_key,
    tmp_diplotypes_jsonl,
    variants_jsonl,
):
    diplotype_offsets = {}
    with open(tmp_diplotypes_jsonl, "w") as d1_f, open(variants_jsonl, "w") as v_f:
        for (
            diplotype_chunk,
            diplotype_id_chunk,
            variant_chunk,
        ) in yield_genes(local_input_path, source_vcf_key):
            for i in range(len(diplotype_chunk)):
                offset = d1_f.tell()
                diplotype_id = diplotype_id_chunk[i]
                diplotype_offsets[diplotype_id] = offset
                json.dump(diplotype_chunk[i], d1_f)
                d1_f.write("\n")

            visited_mapping_ids = set()
            for variant in variant_chunk:
                mapping_id = variant["mapping"]
                if mapping_id not in visited_mapping_ids:
                    visited_mapping_ids.add(mapping_id)
                    json.dump(variant, v_f)
                    v_f.write("\n")

    return diplotype_offsets


def write_annotations(
    tmp_diplotypes_jsonl,
    diplotypes_jsonl,
    local_input_path,
    diplotype_offsets,
    drugs_to_genes,
):
    with open(tmp_diplotypes_jsonl, "rb") as d1_f, open(diplotypes_jsonl, "w") as d2_f:
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
                if offset is not None:
                    d1_f.seek(offset)
                    diplotype = json.loads(d1_f.readline())
                else:
                    diplotype = create_diplotype(
                        drugs_to_genes.get(annotation["org"]),
                        annotation["gene"],
                    )
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


def lambda_handler(event, _):
    print(f"Event received: {json.dumps(event)}")
    request_id = event["requestId"]
    s3_input_keys = event["s3Keys"]
    source_vcf_key = event["sourceVcfKey"]
    project = event["projectName"]
    missing_to_ref = event["missingToRef"]

    postprocessor_configs = []
    for key in s3_input_keys:
        if ".ref." in key:
            postprocessor_configs.append(
                {
                    "inputKey": key,
                    "outputKey": f"{request_id}.pharmcat.ref.json",
                    "pipelineRole": "annotations",
                }
            )
        elif ".nonref." in key:
            postprocessor_configs.append(
                {
                    "inputKey": key,
                    "outputKey": f"{request_id}.pharmcat.nonref.json",
                    "pipelineRole": "messages",
                }
            )
        else:
            postprocessor_configs.append(
                {
                    "inputKey": key,
                    "outputKey": f"{request_id}.pharmcat.json",
                }
            )

    try:
        processed_json = f"{request_id}.pharmcat.json"
        tmp_diplotypes_jsonl = os.path.join(
            LOCAL_DIR, f"tmp_diplotypes_{processed_json}l"
        )
        diplotypes_jsonl = os.path.join(LOCAL_DIR, f"diplotypes_{processed_json}l")
        variants_jsonl = os.path.join(LOCAL_DIR, f"variants_{processed_json}l")
        messages_jsonl = os.path.join(LOCAL_DIR, f"messages_{processed_json}l")

        for config in postprocessor_configs:
            local_input_path = os.path.join(LOCAL_DIR, processed_json)
            s3_client.download_file(
                Bucket=PGXFLOW_BUCKET,
                Key=config["inputKey"],
                Filename=local_input_path,
            )

            pipeline_role = config.get("pipelineRole")
            if not missing_to_ref or pipeline_role == "messages":
                write_messages(
                    messages_jsonl,
                    local_input_path,
                )

            if not missing_to_ref or pipeline_role == "annotations":
                diplotype_offsets = write_diplotypes_and_variants(
                    local_input_path,
                    source_vcf_key,
                    tmp_diplotypes_jsonl,
                    variants_jsonl,
                )

                drugs_to_genes = {
                    entry["drug"]: entry["gene"] for entry in ORGANISATIONS
                }
                write_annotations(
                    tmp_diplotypes_jsonl,
                    diplotypes_jsonl,
                    local_input_path,
                    diplotype_offsets,
                    drugs_to_genes,
                )

        s3_output_key = f"{request_id}.postprocessed.json"

        def load_jsonl(file_obj):
            return [json.loads(line) for line in file_obj]

        # Not memory safe, will be replaced merged with streaming process when sns orchestration is implemented
        with open(messages_jsonl, "rb") as m_f, open(
            diplotypes_jsonl, "rb"
        ) as d_f, open(variants_jsonl, "rb") as v_f:
            merged = {
                "messages": load_jsonl(m_f),
                "diplotypes": load_jsonl(d_f),
                "variants": load_jsonl(v_f),
            }

        s3_client.put_object(
            Bucket=PGXFLOW_BUCKET,
            Key=s3_output_key,
            Body=json.dumps(merged, indent=2).encode(),
        )

        lambda_client.invoke(
            FunctionName=PGXFLOW_PHARMCAT_GNOMAD_LAMBDA,
            InvocationType="Event",
            Payload=json.dumps(
                {
                    "requestId": request_id,
                    "projectName": project,
                    "s3Key": s3_output_key,
                }
            ),
        )

    except Exception as e:
        handle_failed_execution(request_id, e)
