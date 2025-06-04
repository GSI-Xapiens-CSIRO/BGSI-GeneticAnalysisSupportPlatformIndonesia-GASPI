import os
import sys
import io
import zipfile

import pytest
from moto import mock_aws
import boto3

from test_utils.mock_resources import setup_resources

sys.path.append(
    os.path.abspath(
        os.path.join(os.path.dirname(__file__), "../pipeline_pharmcat/lambda/pharmcat")
    )
)
sys.path.append(
    os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            "../pgxflow/shared_resources/python-modules/python",
        )
    )
)


def create_lambda_zip():
    # A simple lambda_function.py file
    lambda_code = """
def lambda_handler(event, context):
    return "hello from lambda"
"""
    # Create a zip in memory
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("lambda_function.py", lambda_code)
    buf.seek(0)
    return buf.read()


@pytest.fixture(autouse=True, scope="session")
def resources_dict():
    with mock_aws():
        s3_client = boto3.client("s3")
        lambda_client = boto3.client("lambda")
        iam = boto3.client("iam")

        s3_client.create_bucket(
            Bucket=os.environ["PGXFLOW_BUCKET"],
            CreateBucketConfiguration={
                "LocationConstraint": os.environ["AWS_DEFAULT_REGION"],
            },
        )
        s3_client.upload_file(
            "./preprocessed_01JWWAZ668XYVCTYW0ZNKN26CN.vcf.gz",
            os.environ["PGXFLOW_BUCKET"],
            "preprocessed_01JWWAZ668XYVCTYW0ZNKN26CN.vcf.gz",
        )

        role_response = iam.create_role(
            RoleName="test-role",
            AssumeRolePolicyDocument="""{
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Allow",
                "Principal": {"Service": "lambda.amazonaws.com"},
                "Action": "sts:AssumeRole"
            }]
        }""",
        )

        lambda_client.create_function(
            FunctionName=os.environ["PGXFLOW_PHARMCAT_POSTPROCESSOR_LAMBDA"],
            Runtime="python3.11",
            Role=role_response['Role']['Arn'],
            Handler="lambda_function.lambda_handler",
            Code={"ZipFile": create_lambda_zip()},
            Description="Mock lambda function for testing",
            Timeout=15,
            MemorySize=128,
            Publish=True,
        )
        yield setup_resources()
