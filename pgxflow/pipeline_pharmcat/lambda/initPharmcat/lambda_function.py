import json
from pathlib import Path
import os
import subprocess
from urllib.parse import urlparse

from shared.apiutils import bad_request, bundle_response
from shared.dynamodb import check_user_in_project, update_clinic_job
from shared.utils import LoggingClient

PGXFLOW_PHARMCAT_PREPROCESSOR_LAMBDA = os.environ[
    "PGXFLOW_PHARMCAT_PREPROCESSOR_LAMBDA"
]
ORGANISATIONS = json.loads(os.environ.get("ORGANISATIONS"))
GENES = os.environ.get("GENES")
DRUGS = os.environ.get("DRUGS")

lambda_client = LoggingClient("lambda")


def get_sample_count(location):
    cmd = f'bcftools query -l "{location}" | wc -l'
    result = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
    return int(result.stdout.strip())


def check_pgxflow_configuration():
    if not ORGANISATIONS:
        return (
            False,
            "ORGANISATIONS environment variable is not set. Please contact an AWS administrator.",
        )
    if not GENES:
        return (
            False,
            "GENES environment variable is not set. Please contact an AWS administrator.",
        )
    if not DRUGS:
        return (
            False,
            "DRUGS environment variable is not set. Please contact an AWS administrator.",
        )
    return True, None


def lambda_handler(event, context):
    print(f"Event received: {json.dumps(event)}")
    sub = event["requestContext"]["authorizer"]["claims"]["sub"]

    event_body = event.get("body")
    if not event_body:
        return bad_request("No body sent with request.")
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
    
    passed, error_message = check_pgxflow_configuration()
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
        FunctionName=PGXFLOW_PHARMCAT_PREPROCESSOR_LAMBDA,
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
