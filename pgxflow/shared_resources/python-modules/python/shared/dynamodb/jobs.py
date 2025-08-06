from datetime import datetime, timezone
import json
import os

import boto3

lambda_client = boto3.client("lambda")
dynamodb_client = boto3.client("dynamodb")

DYNAMO_CLINIC_JOBS_TABLE = os.environ.get("DYNAMO_CLINIC_JOBS_TABLE", "")
DYNAMO_PROJECT_USERS_TABLE = os.environ.get("DYNAMO_PROJECT_USERS_TABLE", "")
SEND_JOB_EMAIL_ARN = os.environ.get("SEND_JOB_EMAIL_ARN", "")


def query_clinic_job(job_id):
    kwargs = {
        "TableName": DYNAMO_CLINIC_JOBS_TABLE,
        "Key": {"job_id": {"S": job_id}},
    }
    print(f"Calling dynamodb.get_item with kwargs: {json.dumps(kwargs)}")
    response = dynamodb_client.get_item(**kwargs)
    print(f"Received response: {json.dumps(response, default=str)}")
    return response.get("Item")


def dynamodb_update_item(job_id, update_fields: dict):
    update_expression = "SET " + ", ".join(f"{k} = :{k}" for k in update_fields.keys())
    kwargs = {
        "TableName": DYNAMO_CLINIC_JOBS_TABLE,
        "Key": {
            "job_id": {"S": job_id},
        },
        "UpdateExpression": update_expression,
        "ExpressionAttributeValues": {f":{k}": v for k, v in update_fields.items()},
    }
    print(f"Calling dynamodb.update_item with kwargs: {json.dumps(kwargs)}")
    response = dynamodb_client.update_item(**kwargs)
    print(f"Received response: {json.dumps(response, default=str)}")


def send_job_email(
    job_id,
    job_status,
    project_name=None,
    input_vcf=None,
    user_id=None,
    is_from_failed_execution=False,
    pipeline_names=[],
):
    payload = {
        "job_id": job_id,
        "job_status": job_status,
        "project_name": project_name,
        "input_vcf": input_vcf,
        "user_id": user_id,
        "is_from_failed_execution": is_from_failed_execution,
        "pipeline_names": pipeline_names,
    }

    print(f"[send_job_email] - payload: {payload}")

    lambda_client.invoke(
        FunctionName=SEND_JOB_EMAIL_ARN,
        InvocationType="Event",
        Payload=json.dumps(payload),
    )


def update_clinic_job(
    job_id,
    job_status=None,
    job_name=None,
    project_name=None,
    input_vcf=None,
    failed_step=None,
    error_message=None,
    user_id=None,
    pipeline_names=[],
    is_from_failed_execution=False,
    reference_versions={},
    missing_to_ref=None,
    skip_email=False,
):
    update_fields = {}
    if job_status is not None:
        pipeline_names = (
            ["pharmcat_status", "lookup_status"]
            if not pipeline_names
            else pipeline_names
        )
        for name in pipeline_names:
            update_fields[f"{name}_status"] = {"S": job_status}
    if failed_step is not None:
        if not pipeline_names:
            update_fields["failed_step"] = {"S": failed_step}
        else:
            for name in pipeline_names:
                update_fields[f"{name}_failed_step"] = {"S": failed_step}
    if error_message is not None:
        if not pipeline_names:
            update_fields["error_message"] = {"S": error_message}
        else:
            for name in pipeline_names:
                update_fields[f"{name}_error_message"] = {"S": error_message}
    if project_name is not None:
        update_fields["project_name"] = {"S": project_name}
    if job_name is not None:
        update_fields["job_name"] = {"S": job_name}
        update_fields["job_name_lower"] = {"S": job_name.lower()}
        now = datetime.now(timezone.utc)
        update_fields["created_at"] = {"S": now.strftime("%Y-%m-%dT%H:%M:%S.%f+0000")}
    if input_vcf is not None:
        update_fields["input_vcf"] = {"S": input_vcf}
    if user_id is not None:
        update_fields["uid"] = {"S": user_id}
    if reference_versions:
        update_fields["reference_versions"] = {
            "M": {
                reference_id: {"S": reference_version}
                for reference_id, reference_version in reference_versions.items()
            }
        }
    if missing_to_ref is not None:
        update_fields["missing_to_ref"] = {"BOOL": missing_to_ref}

    dynamodb_update_item(job_id, update_fields)

    if skip_email:
        print(f"[update_clinic_job] - Skipping email for job: {job_id}")
        return

    send_job_email(
        job_id=job_id,
        job_status=job_status,
        project_name=project_name,
        input_vcf=input_vcf,
        user_id=user_id,
        pipeline_names=pipeline_names,
        is_from_failed_execution=is_from_failed_execution,
    )


def check_user_in_project(sub, project):
    response = dynamodb_client.get_item(
        TableName=DYNAMO_PROJECT_USERS_TABLE,
        Key={"name": {"S": project}, "uid": {"S": sub}},
    )

    assert "Item" in response, "User not found in project"
