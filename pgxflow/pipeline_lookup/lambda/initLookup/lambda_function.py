import csv
from io import StringIO
import json
from pathlib import Path
import os
import subprocess
import traceback
from urllib.parse import urlparse

from shared.apiutils import bad_request, bundle_response
from shared.dynamodb import check_user_in_project, update_clinic_job
from shared.utils import LoggingClient

PGXFLOW_DBSNP_LAMBDA = os.environ["PGXFLOW_DBSNP_LAMBDA"]
REFERENCE_BUCKET = os.environ["REFERENCE_BUCKET"]
LOOKUP_REFERENCE = os.environ["LOOKUP_REFERENCE"]
CHR_HEADER = os.environ["CHR_HEADER"]
START_HEADER = os.environ["START_HEADER"]
END_HEADER = os.environ["END_HEADER"]

lambda_client = LoggingClient("lambda")
s3_client = LoggingClient("s3")


def get_sample_count(location):
    cmd = f'bcftools query -l "{location}" | wc -l'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return int(result.stdout.strip())


def check_assoc_matrix():
    try:
        response = s3_client.get_object(Bucket=REFERENCE_BUCKET, Key=LOOKUP_REFERENCE)
    except Exception as e:
        traceback.print_exc() 
        return (
            False,
            f"Unable to access association matrix at s3://{REFERENCE_BUCKET}/{LOOKUP_REFERENCE}. Please contact an AWS administrator.",
        )

    required_columns = [CHR_HEADER, START_HEADER, END_HEADER]
    try:
        body = response["Body"].read().decode("utf-8")
        reader = csv.DictReader(StringIO(body))
    except Exception as e:
        traceback.print_exc()
        return False, "Unable to read the association matrix file. Please contact an AWS administrator."
    missing_columns = [col for col in required_columns if col not in reader.fieldnames]
    if missing_columns:
        return (
            False,
            f"Missing required column(s) in association matrix: {', '.join(missing_columns)}. Please contact an AWS administrator.",
        )

    return True, None


def lambda_handler(event, context):
    print(f"Event recevied: {json.dumps(event)}")
    sub = event["requestContext"]["authorizer"]["claims"]["sub"]

    event_body = event.get("body")
    if not event_body:
        return bad_request("No body sent with request")
    try:
        body_dict = json.loads(event_body)
        request_id = body_dict.get("requestId")
        request_id = f"{request_id}" if request_id is not None else event["requestContext"]["requestId"]
        project = body_dict["projectName"]
        source_vcf_key = body_dict["location"]
        job_name = body_dict["jobName"]

        check_user_in_project(sub, project)
    except ValueError:
        return bad_request("Error parsing request body, Expected JSON.")
    
    passed, error_message = check_assoc_matrix()
    if not passed:
        return bad_request(error_message)

    try:
        sample_count = get_sample_count(source_vcf_key)
    except subprocess.CalledProcessError as e:
        return bad_request(str(e))

    if sample_count != 1:
        return bad_request("Only single-sample VCFs are supported.")

    parsed_location = urlparse(source_vcf_key)
    input_vcf_key = parsed_location.path.lstrip("/")
    input_vcf = Path(input_vcf_key).name

    lambda_client.invoke(
        FunctionName=PGXFLOW_DBSNP_LAMBDA,
        InvocationType="Event",
        Payload=json.dumps(
            {
                "requestId": request_id,
                "projectName": project,
                "sourceVcfKey": input_vcf_key,
            }
        ),
    )

    update_clinic_job(
        job_id=request_id,
        job_name=job_name,
        job_status="pending",
        project_name=project,
        input_vcf=input_vcf,
        user_id=sub,
        skip_email=True,
    )

    return bundle_response(
        200,
        {
            "Response": "Process started",
            "RequestId": request_id,
            "ProjectName": project,
            "Success": True,
        },
    )
