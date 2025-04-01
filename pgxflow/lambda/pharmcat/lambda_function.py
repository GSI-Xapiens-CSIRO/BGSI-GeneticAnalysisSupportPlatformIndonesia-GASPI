import json
import os
import subprocess
from urllib.parse import urlparse

import boto3

lambda_client = boto3.client("lambda")
s3_client = boto3.client("s3")

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
    location = event["location"]
    project = event["projectName"]
    source_vcf_location = event["sourceVcfLocation"]

    s3_path = urlparse(location).path
    preprocessed_vcf = f"{request_id}.preprocessed.vcf.gz"

    local_input_path = os.path.join(LOCAL_DIR, preprocessed_vcf)
    s3_client.download_file(
        Bucket=PGXFLOW_BUCKET,
        Key=s3_path.lstrip("/"),
        Filename=local_input_path,
    )

    run_pharmcat(local_input_path, request_id)
    processed_json = f"{request_id}.report.json"
    local_output_path = os.path.join(LOCAL_DIR, processed_json)

    output_key = f"pharmcat_{request_id}.json"
    s3_client.upload_file(
        Bucket=PGXFLOW_BUCKET,
        Key=output_key,
        Filename=local_output_path,
    )

    s3_client.delete_object(
        Bucket=PGXFLOW_BUCKET,
        Key=s3_path.lstrip("/"),
    )

    s3_output_location = f"s3://{PGXFLOW_BUCKET}/{output_key}"
    lambda_client.invoke(
        FunctionName=PGXFLOW_PHARMCAT_POSTPROCESSOR_LAMBDA,
        InvocationType="Event",
        Payload=json.dumps(
            {
                "requestId": request_id,
                "projectName": project,
                "location": s3_output_location,
                "sourceVcfLocation": source_vcf_location,
            }
        ),
    )
