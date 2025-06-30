import json
import os
import subprocess

from shared.utils import handle_failed_execution, LoggingClient

lambda_client = LoggingClient("lambda")
s3_client = LoggingClient("s3")

LOCAL_DIR = os.environ.get("LOCAL_DIR", "/tmp")
PGXFLOW_BUCKET = os.environ["PGXFLOW_BUCKET"]
PGXFLOW_PHARMCAT_POSTPROCESSOR_LAMBDA = os.environ[
    "PGXFLOW_PHARMCAT_POSTPROCESSOR_LAMBDA"
]


def run_pharmcat(input_path, vcf):
    "Run PharmCAT on the preprocessed VCF"
    cmd = [
        "java",
        "-Xmx2g",
        "-Dlogback.configurationFile=/opt/logback.xml",
        "-jar",
        "pharmcat.jar",
        "--reporter-extended",
        "--reporter-save-json",
        "--matcher-save-html",
        "-vcf",
        input_path,
        "-o",
        LOCAL_DIR,
        "-bf",
        vcf,
    ]
    subprocess.run(cmd, check=True)


def lambda_handler(event, context):
    print(f"Event received: {json.dumps(event)}")
    request_id = event["requestId"]
    s3_input_keys = event["s3Keys"]
    project = event["projectName"]
    source_vcf_key = event["sourceVcfKey"]
    missing_to_ref = event["missingToRef"]

    pharmcat_configs = []
    for key in s3_input_keys:
        if ".ref." in key:
            pharmcat_configs.append(
                {
                    "inputKey": key,
                    "outputKey": f"{request_id}.pharmcat.ref.json",
                }
            )
        elif ".nonref." in key:
            pharmcat_configs.append(
                {
                    "inputKey": key,
                    "outputKey": f"{request_id}.pharmcat.nonref.json",
                }
            )
        else:
            pharmcat_configs.append(
                {
                    "inputKey": key,
                    "outputKey": f"{request_id}.pharmcat.json",
                }
            )
    s3_output_keys = []

    try:
        for config in pharmcat_configs:
            preprocessed_vcf = f"{request_id}.preprocessed.vcf.gz"

            local_input_path = os.path.join(LOCAL_DIR, preprocessed_vcf)
            s3_input_key = config["inputKey"]
            s3_client.download_file(
                Bucket=PGXFLOW_BUCKET,
                Key=s3_input_key,
                Filename=local_input_path,
            )

            run_pharmcat(local_input_path, request_id)
            processed_json = f"{request_id}.report.json"
            local_output_path = os.path.join(LOCAL_DIR, processed_json)

            s3_output_key = config["outputKey"]
            s3_client.upload_file(
                Bucket=PGXFLOW_BUCKET,
                Key=s3_output_key,
                Filename=local_output_path,
            )

            s3_client.delete_object(
                Bucket=PGXFLOW_BUCKET,
                Key=s3_input_key,
            )

            s3_output_keys.append(s3_output_key)

        lambda_client.invoke(
            FunctionName=PGXFLOW_PHARMCAT_POSTPROCESSOR_LAMBDA,
            InvocationType="Event",
            Payload=json.dumps(
                {
                    "requestId": request_id,
                    "projectName": project,
                    "s3Keys": s3_output_keys,
                    "sourceVcfKey": source_vcf_key,
                    "missingToRef": missing_to_ref,
                }
            ),
        )
    except Exception as e:
        handle_failed_execution(request_id, e)
