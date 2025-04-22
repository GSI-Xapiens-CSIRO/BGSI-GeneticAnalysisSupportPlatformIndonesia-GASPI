import json
import os
import subprocess

import boto3

from shared.utils import handle_failed_execution
lambda_client = boto3.client("lambda")
s3_client = boto3.client("s3")

LOCAL_DIR = "/tmp"
DPORTAL_BUCKET = os.environ["DPORTAL_BUCKET"]
PGXFLOW_BUCKET = os.environ["PGXFLOW_BUCKET"]
REFERENCE_BUCKET = os.environ["REFERENCE_BUCKET"]
PGXFLOW_PHARMCAT_LAMBDA = os.environ["PGXFLOW_PHARMCAT_LAMBDA"]
PHARMCAT_REFERENCES = [
    "pharmcat_positions.vcf.bgz",
    "pharmcat_positions.vcf.bgz.csi",
    "pharmcat_positions.uniallelic.vcf.bgz",
    "pharmcat_positions.uniallelic.vcf.bgz.csi",
    "reference.fna.bgz",
    "reference.fna.bgz.fai", 
    "reference.fna.bgz.gzi",
    "pharmcat_regions.bed",
]


def run_preprocessor(input_path, vcf, reference_fna, reference_vcf):
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
        "-refFna",
        reference_fna,
        "-refVcf",
        reference_vcf,
    ]
    subprocess.run(cmd, check=True)


def lambda_handler(event, context):
    print(f"Event received: {json.dumps(event)}")
    request_id = event["requestId"]
    source_vcf_key = event["sourceVcfKey"]
    project = event["projectName"]

    try:
        vcf = f"{request_id}.vcf.gz"
        local_input_path = os.path.join(LOCAL_DIR, vcf)

        print(f"Calling s3.download_file from s3://{DPORTAL_BUCKET}/{source_vcf_key}")
        s3_client.download_file(
            Bucket=DPORTAL_BUCKET,
            Key=source_vcf_key,
            Filename=local_input_path,
        )

        local_reference_dir = os.path.join(LOCAL_DIR, "preprocessor_refs")
        os.makedirs(local_reference_dir, exist_ok=True)

        local_references = [os.path.join(local_reference_dir, reference_file) for reference_file in PHARMCAT_REFERENCES]
        for local_reference_path in local_references:
            # Skip download if file exists to leverage warm starts
            if os.path.exists(local_reference_path):
                print(f"Skipping download of {local_reference_path} as it already exists.")
                continue
            reference_key = f"preprocessor/{os.path.basename(local_reference_path)}"
            local_reference_path = os.path.join(local_reference_dir, local_reference_path)
            print(f"Calling s3_client.download_file from s3://{DPORTAL_BUCKET}/{source_vcf_key}")
            s3_client.download_file(
                Bucket=REFERENCE_BUCKET,
                Key=reference_key,
                Filename=local_reference_path,
            )
        reference_vcf = os.path.join(local_reference_dir, PHARMCAT_REFERENCES[0])
        reference_fna = os.path.join(local_reference_dir, PHARMCAT_REFERENCES[4])

        run_preprocessor(local_input_path, request_id, reference_fna, reference_vcf)
        preprocessed_vcf = f"{request_id}.preprocessed.vcf.bgz"
        local_output_path = os.path.join(LOCAL_DIR, preprocessed_vcf)

        s3_output_key = f"preprocessed_{request_id}.vcf.gz"
        print(f"Calling s3_client.upload_file from {local_output_path} to s3://{DPORTAL_BUCKET}/{s3_output_key}")
        s3_client.upload_file(
            Bucket=PGXFLOW_BUCKET,
            Key=s3_output_key,
            Filename=local_output_path,
        )

        lambda_client.invoke(
            FunctionName=PGXFLOW_PHARMCAT_LAMBDA,
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
