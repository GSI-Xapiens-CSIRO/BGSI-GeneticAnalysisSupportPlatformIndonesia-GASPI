import json
import os
import subprocess
from pathlib import Path
from urllib.parse import urlparse

import boto3

from shared.utils import handle_failed_execution
lambda_client = boto3.client("lambda")
s3_client = boto3.client("s3")

LOCAL_DIR = "/tmp"
DPORTAL_BUCKET = os.environ["DPORTAL_BUCKET"]
PGXFLOW_BUCKET = os.environ["PGXFLOW_BUCKET"]
PGXFLOW_PHARMCAT_LAMBDA = os.environ["PGXFLOW_PHARMCAT_LAMBDA"]


def run_preprocessor(input_path, vcf):
    """Run the PharmCAT VCF preprocessor."""
    cmd = [
        "python3",
        "/opt/preprocessor/pharmcat_vcf_preprocessor.py",
        "--vcf",
        input_path,
        "--output-dir",
        LOCAL_DIR,
        "--base-filename",
        vcf,
    ]
    subprocess.run(cmd, check=True)


def lambda_handler(event, context):
    print(f"Event received: {json.dumps(event)}")
    request_id = event["requestId"]
    location = event["location"]
    project = event["projectName"]

    try:
        s3_path = urlparse(location).path
        vcf = f"{request_id}.vcf.gz"

        local_input_path = os.path.join(LOCAL_DIR, vcf)
        s3_client.download_file(
            Bucket=DPORTAL_BUCKET,
            Key=s3_path.lstrip("/"),
            Filename=local_input_path,
        )

        #s3_reference_fasta = f"{REFERENCE_FASTA_BASE}.fna.gz"
        #local_reference_fasta = os.path.join(LOCAL_DIR, f"{REFERENCE_FASTA_BASE}.fna.gz")
        #for ext in ["", ".fai", ".gzi"]:
        #    s3_path = f"{s3_reference_fasta}{ext}"
        #    local_path = f"{local_reference_fasta}{ext}"
        #    s3_client.download_file(
        #        Bucket=REFERENCE_BUCKET,
        #        Key=s3_path,
        #        Filename=local_path,
        #    )

        run_preprocessor(local_input_path, request_id)
        preprocessed_vcf = f"{request_id}.preprocessed.vcf.bgz"
        local_output_path = os.path.join(LOCAL_DIR, preprocessed_vcf)

        output_key = f"preprocessed_{request_id}.vcf.gz"
        s3_client.upload_file(
            Bucket=PGXFLOW_BUCKET,
            Key=output_key,
            Filename=local_output_path,
        )

        s3_output_location = f"s3://{PGXFLOW_BUCKET}/{output_key}"
        lambda_client.invoke(
            FunctionName=PGXFLOW_PHARMCAT_LAMBDA,
            InvocationType="Event",
            Payload=json.dumps(
                {
                    "requestId": request_id,
                    "projectName": project,
                    "location": s3_output_location,
                    "sourceVcfLocation": location,
                }
            ),
        )
    except Exception as e:
        handle_failed_execution(request_id, e)
