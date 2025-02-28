import json
import os
import subprocess
from pathlib import Path
from urllib.parse import urlparse

import boto3

lambda_client = boto3.client("lambda")
s3_client = boto3.client("s3")

INPUT_DIR = "/tmp/input"
OUTPUT_DIR = "/tmp/output"
DPORTAL_BUCKET = os.environ["DPORTAL_BUCKET"]
PGXFLOW_BUCKET = os.environ["PGXFLOW_BUCKET"]
# PGXFLOW_PHARMCAT_LAMBDA = os.environ["PGXFLOW_PHARMCAT_LAMBDA"]


def run_preprocessor(input_path, vcf):
    """Run the PharmCAT VCF preprocessor."""
    cmd = [
        "python3",
        "/var/task/preprocessor/pharmcat_vcf_preprocessor.py",
        "--vcf",
        input_path,
        "--output-dir",
        OUTPUT_DIR,
        "--base-filename",
        vcf,
    ]
    subprocess.run(cmd, check=True)


def lambda_handler(event, context):
    request_id = event["requestId"]
    location = event["location"]
    project = event["project"]

    filename = Path(urlparse(location).path).name
    ext = "".join(Path(filename).suffixes)
    vcf = f"{request_id}{ext}"
    local_input_path = os.path.join(INPUT_DIR, vcf)
    local_output_path = os.path.join(OUTPUT_DIR, vcf)

    s3_client.download(
        Bucket=DPORTAL_BUCKET,
        Key=location,
        Filename=local_input_path,
    )

    run_preprocessor(local_input_path, vcf)

    preprocessed_vcf_key = f"preprocessed/{vcf}"

    s3_client.upload(
        Bucket=PGXFLOW_BUCKET,
        Key=preprocessed_vcf_key,
        Filename=local_output_path,
    )

    # lambda_client.invoke(
    #    FunctionName=PGXFLOW_PHARMCAT_LAMBDA,
    #    InvocationType="Event",
    #    Payload=json.dumps(
    #        {
    #            "requestId": request_id,
    #            "projectName": project,
    #            "location": preprocessed_vcf_key,
    #        }
    #    ),
    # )
