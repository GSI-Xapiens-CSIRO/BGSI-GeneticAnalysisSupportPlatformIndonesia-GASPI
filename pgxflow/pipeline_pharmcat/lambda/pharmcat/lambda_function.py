import json
import os
import subprocess

from shared.utils import handle_failed_execution, LoggingClient

lambda_client = LoggingClient("lambda")
s3_client = LoggingClient("s3")

LOCAL_DIR = "/tmp"
PGXFLOW_BUCKET = os.environ["PGXFLOW_BUCKET"]
PGXFLOW_PHARMCAT_POSTPROCESSOR_LAMBDA = os.environ[
    "PGXFLOW_PHARMCAT_POSTPROCESSOR_LAMBDA"
]


def run_pharmcat(input_path, vcf):
    "Run PharmCAT on the preprocessed VCF"
    cmd = [
        "java",
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
    s3_input_key = event["s3Key"]
    project = event["projectName"]
    source_vcf_key = event["sourceVcfKey"]

    try:
        preprocessed_vcf = f"{request_id}.preprocessed.vcf.gz"

        local_input_path = os.path.join(LOCAL_DIR, preprocessed_vcf)
        s3_client.download_file(
            Bucket=PGXFLOW_BUCKET,
            Key=s3_input_key,
            Filename=local_input_path,
        )

        run_pharmcat(local_input_path, request_id)
        processed_json = f"{request_id}.report.json"
        local_output_path = os.path.join(LOCAL_DIR, processed_json)

        s3_output_key = f"pharmcat_{request_id}.json"
        s3_client.upload_file(
            Bucket=PGXFLOW_BUCKET,
            Key=s3_output_key,
            Filename=local_output_path,
        )

        s3_client.delete_object(
            Bucket=PGXFLOW_BUCKET,
            Key=s3_input_key,
        )

        lambda_client.invoke(
            FunctionName=PGXFLOW_PHARMCAT_POSTPROCESSOR_LAMBDA,
            InvocationType="Event",
            Payload=json.dumps(
                {
                    "requestId": request_id,
                    "projectName": project,
                    "s3Key": s3_output_key,
                    "sourceVcfKey": source_vcf_key,
                }
            ),
        )
    except Exception as e:
        handle_failed_execution(request_id, e)
