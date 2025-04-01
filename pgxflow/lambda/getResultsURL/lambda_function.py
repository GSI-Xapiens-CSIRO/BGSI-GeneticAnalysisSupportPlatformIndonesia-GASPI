import gzip
import os
import json

import boto3
import botocore

from shared.apiutils import bad_request, bundle_response
from dynamodb import check_user_in_project
from search import get_page

RESULT_BUCKET = os.environ["RESULT_BUCKET"]
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


def get_index(key):
    try:
        index = s3_resource.Object(RESULT_BUCKET, key).get()
        index = gzip.decompress(index["Body"].read())
        index = json.loads(index)
        return index
    except botocore.exceptions.ClientError:
        return None


def lambda_handler(event, _):
    print(f"Event received: {json.dumps(event)}")

    try:
        sub = event["requestContext"]["authorizer"]["claims"]["sub"]
        request_id = event["queryStringParameters"]["request_id"]
        project_name = event["queryStringParameters"]["project_name"]
        results_path = (
            f"projects/{project_name}/clinical-workflows/{request_id}{RESULT_SUFFIX}"
        )
        index_path = f"{results_path}.index.json"

        check_user_in_project(sub, project_name)

        # Handle small files (less than 5MB) by returning the entire content
        file_size = s3_client.head_object(Bucket=RESULT_BUCKET, Key=results_path)[
            "ContentLength"
        ]
        if 0 < file_size <= 5 * 10**6:
            content = read_from_s3(RESULT_BUCKET, results_path, 0, file_size)
            return bundle_response(
                200,
                {
                    "url": None,
                    "pages": {"-": 1},
                    "page": 1,
                    "content": content.decode("utf-8"),
                },
            )

        if index := get_index(index_path):
            pages = list(index.keys())
            page = int(event["queryStringParameters"].get("page", 1))

            entry = get_page(index, page)
            if not entry:
                return bad_request("Page not found.")

            content = read_from_s3(
                RESULT_BUCKET,
                results_path,
                entry["page_start_f"],
                entry["page_end_f"] - entry["page_start_f"],
            )

            page_dict = {
                page_entry: len(index[page_entry]["page_start_f"])
                for page_entry in pages
            }

            return bundle_response(
                200,
                {
                    "url": None,
                    "pages": page_dict,
                    "page": entry["page"],
                    "content": content.decode("utf-8"),
                },
            )
        else:
            # No index found, return error
            return bad_request("Index not found for this request.")

    except ValueError:
        return bad_request("Error parsing request body, Expected JSON")
    except KeyError:
        return bad_request("Invalid parameters.")
    except Exception as e:
        print("Unhandled", e)
        return bad_request(
            "Unhandled exception. Please contact admin with the jobId."
        )
