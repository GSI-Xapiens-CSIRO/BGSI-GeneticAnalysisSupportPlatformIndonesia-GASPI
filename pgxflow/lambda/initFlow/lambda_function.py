import json
from pathlib import Path
import os
import subprocess
import traceback
from urllib.parse import urlparse

from botocore.client import ClientError

from shared.apiutils import bad_request, bundle_response
from shared.dynamodb import check_user_in_project, update_clinic_job
from shared.utils import LoggingClient, handle_failed_execution, query_references_table
from dynamodb import does_clinic_job_exist_by_name
from pharmcat import check_pharmcat_configuration
from lookup import check_assoc_matrix

HUB_NAME = os.environ["HUB_NAME"]
PHARMCAT_PREPROCESSOR_SNS_TOPIC_ARN = os.environ["PHARMCAT_PREPROCESSOR_SNS_TOPIC_ARN"]
LOOKUP_DBSNP_SNS_TOPIC_ARN = os.environ["LOOKUP_DBSNP_SNS_TOPIC_ARN"]
PHARMCAT_HUBS = ["RSPON", "RSJPD"]
LOOKUP_HUBS = ["RSIGNG", "RSJPD"]
PHARMCAT_REFERENCE_IDS = ["pharmcat_version", "pharmgkb_version"]
LOOKUP_REFERENCE_IDS = ["dbsnp_version", "lookup_version"]
HUB_CONFIG = {
    "RSPON": {
        "reference_ids": PHARMCAT_REFERENCE_IDS,
        "sns_topics": [PHARMCAT_PREPROCESSOR_SNS_TOPIC_ARN],
    },
    "RSIGNG": {
        "reference_ids": LOOKUP_REFERENCE_IDS,
        "sns_topics": [LOOKUP_DBSNP_SNS_TOPIC_ARN],
    },
    "RSJPD": {
        "reference_ids": PHARMCAT_REFERENCE_IDS + LOOKUP_REFERENCE_IDS,
        "sns_topics": [PHARMCAT_PREPROCESSOR_SNS_TOPIC_ARN, LOOKUP_DBSNP_SNS_TOPIC_ARN],
    },
}

sns_client = LoggingClient("sns")


def handle_init_failure(result, is_batch_job):
    """
    Handles failure responses for both batch and non-batch jobs.
    Batch jobs will log the error and update the job status in DynamoDB.
    Non-batch jobs will return a bad request response.
    """
    error_message = result.get("error", "Unknown error")
    if is_batch_job:
        if request_id := result.get("requestId"):
            handle_failed_execution(request_id, error_message)
        else:
            print(
                "Error in batch job without requestId:",
                error_message,
            )
    else:
        return bad_request(error_message)


def parse_sns(event):
    try:
        message = json.loads(event["Records"][0]["Sns"]["Message"])
    except (KeyError, ValueError) as e:
        return {
            "success": False,
            "error": f"Error parsing SNS message: {str(e)}",
        }

    result = {
        "success": False,
        "requestId": message.get("requestId"),
    }

    required_fields = ["sub", "projectName", "location", "jobName"]
    try:
        for field in required_fields:
            result[field] = message[field]
        result["missingToRef"] = message.get("missingToRef", False)
        result["success"] = True
    except KeyError as e:
        result["error"] = f"Missing expected field in SNS message: {str(e)}"

    return result


def parse_api_gateway(event):
    try:
        body = json.loads(event["body"])
    except ValueError:
        return {
            "success": False,
            "error": "Error parsing request body: Invalid JSON.",
        }

    result = {
        "success": False,
        "requestId": event.get("requestContext", {}).get("requestId"),
        "sub": event.get("requestContext", {})
        .get("authorizer", {})
        .get("claims", {})
        .get("sub"),
    }
    if not result["sub"]:
        result["error"] = "User not authenticated."
        return result

    required_fields = ["projectName", "location", "jobName"]
    try:
        for field in required_fields:
            result[field] = body[field]
        result["missingToRef"] = body.get("missingToRef", False)
        result["success"] = True
    except KeyError as e:
        result["error"] = f"Missing expected field in request body: {str(e)}"

    return result


def get_sample_count(location):
    cmd = f'bcftools query -l "{location}" | wc -l'
    result = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
    return int(result.stdout.strip())


def lambda_handler(event, context):
    print(f"Event received: {json.dumps(event)}")
    is_batch_job = False
    if "Records" in event and event["Records"][0].get("EventSource") == "aws:sns":
        is_batch_job = True

    result = parse_sns(event) if is_batch_job else parse_api_gateway(event)
    if not result.get("success", False):
        return handle_init_failure(result, is_batch_job)

    request_id = result["requestId"]
    sub = result["sub"]
    project = result["projectName"]
    location = result["location"]
    job_name = result["jobName"]
    missing_to_ref = result["missingToRef"]

    try:
        check_user_in_project(sub, project)
    except Exception as e:
        result["error"] = f"Error checking user in project: {str(e)}"
        return handle_init_failure(result, is_batch_job)

    job_name_exists = (not is_batch_job) and does_clinic_job_exist_by_name(
        job_name.lower(), project
    )
    if job_name_exists:
        result["error"] = (
            f"Job name '{job_name}' already exists in project '{project}'."
        )
        return handle_init_failure(result, is_batch_job)

    try:
        sample_count = get_sample_count(location)
    except subprocess.CalledProcessError as e:
        result["error"] = f"Error counting samples: {str(e)}"
        return handle_init_failure(result, is_batch_job)
    if sample_count != 1:
        result["error"] = "Only single-sample VCFs are supported."
        return handle_init_failure(result, is_batch_job)

    config = HUB_CONFIG.get(HUB_NAME)
    if not config:
        result["error"] = f"Unknown HUB_NAME: {HUB_NAME}."
        return handle_init_failure(result, is_batch_job)

    reference_versions = {}
    failed_ids = []
    for reference_id in config.get("reference_ids", []):
        try:
            version = query_references_table(reference_id)
            reference_versions[reference_id] = version
        except ClientError as e:
            traceback.print_exc()
            failed_ids.append(reference_id)
    if failed_ids:
        result["error"] = (
            f"Unable to retrieve reference versions for: {', '.join(failed_ids)}. "
            "Please contact an AWS administrator."
        )
        return handle_init_failure(result, is_batch_job)
    missing_references = [
        ref_id for ref_id, version in reference_versions.items() if version is None
    ]
    if missing_references:
        result["error"] = (
            f"Missing reference versions for: {', '.join(missing_references)}. "
            "Please contact an AWS administrator."
        )
        return handle_init_failure(result, is_batch_job)

    if HUB_NAME in PHARMCAT_HUBS:
        passed, error_message = check_pharmcat_configuration()
        if not passed:
            result["error"] = error_message
            return handle_init_failure(result, is_batch_job)
    if HUB_NAME in LOOKUP_HUBS:
        passed, error_message = check_assoc_matrix()
        if not passed:
            result["error"] = error_message
            return handle_init_failure(result, is_batch_job)

    parsed_location = urlparse(location)
    source_vcf_key = parsed_location.path.lstrip("/")
    input_vcf = Path(source_vcf_key).name

    sns_topics = config.get("sns_topics", [])
    if not sns_topics:
        result["error"] = (
            "No SNS topics configured for this hub. Please contact an AWS administrator."
        )
        return handle_init_failure(result, is_batch_job)
    try:
        for topic_arn in HUB_CONFIG.get(HUB_NAME, {}).get("sns_topics"):
            message = json.dumps(
                {
                    "requestId": request_id,
                    "projectName": project,
                    "sourceVcfKey": source_vcf_key,
                    "missingToRef": missing_to_ref,
                }
            )
            kwargs = {"TopicArn": topic_arn, "Message": message}
            sns_client.publish(**kwargs)
    except ClientError as e:
        result["error"] = f"Failed to publish message to SNS topic: {str(e)}"
        return handle_init_failure(result, is_batch_job)

    update_clinic_job(
        job_id=request_id,
        job_name=job_name,
        job_status="pending",
        project_name=project,
        input_vcf=input_vcf,
        user_id=sub,
        reference_versions=reference_versions,
        missing_to_ref=missing_to_ref,
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
