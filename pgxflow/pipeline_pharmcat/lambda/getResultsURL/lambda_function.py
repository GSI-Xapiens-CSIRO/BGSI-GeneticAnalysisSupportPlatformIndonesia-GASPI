import os
import json

import boto3

from shared.apiutils import bad_request, bundle_response
from shared.dynamodb import check_user_in_project

DPORTAL_BUCKET = os.environ["DPORTAL_BUCKET"]
RESULT_SUFFIX = os.environ["RESULT_SUFFIX"]
s3_resource = boto3.resource("s3")
s3_client = boto3.client("s3")


def read_from_s3(bucket_name, key, at, size):
    byte_range = f"bytes={at}-{at + size - 1}"
    response = s3_client.get_object(Bucket=bucket_name, Key=key, Range=byte_range)
    return response["Body"].read()


def read_size_from_s3(bucket_name, key):
    response = s3_client.head_object(Bucket=bucket_name, Key=key)
    return response["Body"].read()


def lambda_handler(event, _):
    print(f"Event received: {json.dumps(event)}")

    try:
        sub = event["requestContext"]["authorizer"]["claims"]["sub"]
        request_id = event["queryStringParameters"]["request_id"]
        project_name = event["queryStringParameters"]["project_name"]
        results_path = (
            f"projects/{project_name}/clinical-workflows/{request_id}{RESULT_SUFFIX}"
        )

        check_user_in_project(sub, project_name)

        # Handle small files (less than 5MB) by returning the entire content
        file_size = s3_client.head_object(Bucket=DPORTAL_BUCKET, Key=results_path)[
            "ContentLength"
        ]
        content = read_from_s3(DPORTAL_BUCKET, results_path, 0, file_size)
        return bundle_response(
            200,
            {
                "url": None,
                "pages": {"-": 1},
                "page": 1,
                "content": content.decode("utf-8"),
            },
        )

    except ValueError:
        return bad_request("Error parsing request body, Expected JSON")
    except KeyError:
        return bad_request("Invalid parameters.")
    except Exception as e:
        print("Unhandled", e)
        return bad_request("Unhandled exception. Please contact admin with the jobId.")
