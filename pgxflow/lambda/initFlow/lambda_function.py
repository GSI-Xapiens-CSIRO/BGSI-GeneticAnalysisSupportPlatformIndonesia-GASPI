import json
import os
import subprocess

import boto3

from shared.apiutils import bad_request, bundle_response

PGXFLOW_PREPROCESSOR_LAMBDA = os.environ["PGXFLOW_PREPROCESSOR_LAMBDA"]

lambda_client = boto3.client("lambda")


def get_sample_count(location):
    cmd = f'bcftools query -l "{location}" | wc -l'
    result = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
    return int(result.stdout.strip())


def lambda_handler(event, context):
    print(f"Event received: {json.dumps(event)}")
    event_body = event.get("body")
    if not event_body:
        return bad_request("No body sent with request.")
    try:
        body_dict = json.loads(event_body)
        request_id = event["requestContext"]["requestId"]
        project = body_dict["projectName"]
        user_id = body_dict["userId"]
        location = body_dict["location"]
    except ValueError:
        return bad_request("Error parsing request body, Expected JSON.")

    try:
        sample_count = get_sample_count(location)
    except subprocess.CalledProcessError as e:
        return bad_request(str(e))

    if sample_count != 1:
        return bad_request("Only single-sample VCFs are supported.")

    lambda_client.invoke(
        FunctionName=PGXFLOW_PREPROCESSOR_LAMBDA,
        InvocationType="Event",
        Payload=json.dumps(
            {
                "requestId": request_id,
                "projectName": project,
                "location": location,
            }
        ),
    )

    return bundle_response(
        200,
        {
            "Response": "Process started",
            "RequestId": request_id,
            "ProjectName": project,
        },
    )
