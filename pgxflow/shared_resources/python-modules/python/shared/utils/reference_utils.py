import json
import os
import urllib

import boto3
from botocore.exceptions import ClientError

DYNAMO_PGXFLOW_REFERENCES_TABLE = os.environ.get("DYNAMO_PGXFLOW_REFERENCES_TABLE")

s3 = boto3.resource("s3")
dynamodb = boto3.client("dynamodb")

from shared.utils import CheckedProcess


# Web fetching, downloading
def fetch_remote_content(url):
    with urllib.request.urlopen(url) as response:
        return response.read()


# dynamodb actions
def query_references_table(id):
    kwargs = {
        "TableName": DYNAMO_PGXFLOW_REFERENCES_TABLE,
        "Key": {
            "id": {
                "S": id,
            },
        },
    }

    print(f"Calling dynamodb.get_item with kwargs: {json.dumps(kwargs)}")
    try:
        response = dynamodb.get_item(**kwargs)
    except ClientError as e:
        print(f"Received unexpected ClientError: {json.dumps(e.response, default=str)}")
        raise e
    print(f"Received response: {json.dumps(response, default=str)}")
    return response.get("Item", {}).get("version", {}).get("S")


def sort(output_file, input_file, chr_index, start_index):
    sort_args = [
        "sort",
        "-t$'\t'",
        f"-k{chr_index},{chr_index}n",
        f"-k{start_index},n{start_index}",
        input_file,
        ">",
        output_file,
    ]
    sort_process = CheckedProcess(sort_args)
    sort_process.check()


def bgzip(input_file):
    bgzip_args = ["bgzip", input_file]
    bgzip_process = CheckedProcess(bgzip_args)
    bgzip_process.check()


def tabix_index(input_file, chr_index, start_index, end_index):
    tabix_args = [
        "tabix",
        "-f",
        f"-s {chr_index}",
        f"-b {start_index}",
        f"-e {end_index}",
        "-S 1",
        input_file,
    ]
    tabix_process = CheckedProcess(tabix_args)
    tabix_process.check()
