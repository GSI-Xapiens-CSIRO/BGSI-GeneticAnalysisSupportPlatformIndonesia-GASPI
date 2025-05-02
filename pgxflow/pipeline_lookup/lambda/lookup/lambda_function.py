import csv
import json
import os
from io import StringIO
import subprocess

import boto3

from shared.utils import handle_failed_execution
from shared.dynamodb import update_clinic_job

LOCAL_DIR = "/tmp"
RESULT_SUFFIX = os.environ["RESULT_SUFFIX"]
DPORTAL_BUCKET = os.environ["DPORTAL_BUCKET"]
PGXFLOW_BUCKET = os.environ["PGXFLOW_BUCKET"]
REFERENCE_BUCKET = os.environ["REFERENCE_BUCKET"]
LOOKUP_REFERENCE = os.environ["LOOKUP_REFERENCE"]

s3_client = boto3.client("s3")
lambda_client = boto3.client("lambda")


def get_rsids(local_annotated_vcf_path):
    try:
        query_rsid_args = ["bcftools", "query", "-f", "%ID\n", local_annotated_vcf_path]
        output = subprocess.check_output(
            args=query_rsid_args,
            cwd=LOCAL_DIR,
            stderr=subprocess.PIPE,
            encoding="utf-8",
        )
        return output.strip().split("\n")
    except subprocess.CalledProcessError as e:
        print(
            f"cmd {e.cmd} returned non-zero error code {e.returncode}. stderr:\n{e.stderr}"
        )


def load_lookup():
    response = s3_client.get_object(
        Bucket=REFERENCE_BUCKET,
        Key=LOOKUP_REFERENCE,
    )
    body = response["Body"]
    csvfile = StringIO(body.read().decode("utf-8-sig"))
    reader = csv.DictReader(csvfile)
    lookup_table = {}
    for row in reader:
        rsid = row["Variant"]
        values = {key: row[key] for key in row}
        lookup_table[rsid] = values
    return lookup_table


def lambda_handler(event, context):
    print(f"Event received: {json.dumps(event)}")
    request_id = event["requestId"]
    project_name = event["projectName"]
    # Source VCF will be used for gnomad annotations
    source_vcf_key = event["sourceVcfKey"]
    dbsnp_annotated_vcf_key = event["dbsnpAnnotatedVcfKey"]

    annotated_vcf_s3_uri = f"s3://{PGXFLOW_BUCKET}/{dbsnp_annotated_vcf_key}"

    try:
        rsids = get_rsids(annotated_vcf_s3_uri)

        lookup_table = load_lookup()

        local_output_path = os.path.join(LOCAL_DIR, f"annotated_{request_id}.jsonl")
        with open(local_output_path, "w") as f:
            for rsid in rsids:
                if rsid not in lookup_table:
                    continue
                json.dump(lookup_table[rsid], f)
                f.write("\n")

        s3_output_key = (
            f"projects/{project_name}/clinical-workflows/{request_id}{RESULT_SUFFIX}"
        )

        print(
            f"Calling s3_client.upload_file from {local_output_path} to s3://{DPORTAL_BUCKET}/{s3_output_key}"
        )
        s3_client.upload_file(
            Bucket=DPORTAL_BUCKET,
            Key=s3_output_key,
            Filename=local_output_path,
        )

        print(f"Deleting {annotated_vcf_s3_uri}")
        s3_client.delete_object(
            Bucket=PGXFLOW_BUCKET,
            Key=dbsnp_annotated_vcf_key,
        )

        dbsnp_annotated_vcf_index_key = f"{dbsnp_annotated_vcf_key}.csi"
        print(f"Deleting {dbsnp_annotated_vcf_index_key}")
        s3_client.delete_object(
            Bucket=PGXFLOW_BUCKET,
            Key=dbsnp_annotated_vcf_index_key,
        )

        update_clinic_job(request_id, job_status="completed")
    except Exception as e:
        handle_failed_execution(request_id, e)
