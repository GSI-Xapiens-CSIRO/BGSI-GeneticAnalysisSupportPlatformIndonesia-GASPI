import json
import os
from unittest.mock import patch

import boto3
import botocore
import pytest
from moto import mock_aws

orig = botocore.client.BaseClient._make_api_call


def mock_make_api_call(self, operation_name, kwarg):

    return orig(self, operation_name, kwarg)


def test_lookup(resources_dict):
    import lambda_function

    with patch(
        "botocore.client.BaseClient._make_api_call",
        new=mock_make_api_call,
    ):

        lambda_function.lambda_handler(
            {
                "requestId": "01JWWAZ668XYVCTYW0ZNKN26CN",
                "projectName": "ci_cd_project",
                "dbsnpAnnotatedVcfLocation": "annotated_01JWWAZ668XYVCTYW0ZNKN26CN.vcf.gz",
            },
            {},
        )

        s3_client = boto3.client("s3")
        content = (
            s3_client.get_object(
                Bucket=os.environ["PGXFLOW_BUCKET"],
                Key="01JWWAZ668XYVCTYW0ZNKN26CN_lookup.json",
            )["Body"]
            .read()
            .decode("utf-8")
        )
        actual_output = json.loads(content)
        target_output = [
            {
                "Variant": "rs7412",
                "Zygosity": "1/0",
                "chr": "chr19",
                "start": "44908822",
                "end": "44908823",
                "Description": "Test present variant 1",
                "chromVcf": "chr19",
                "posVcf": 44908822,
                "refVcf": "C",
                "altVcf": "T",
            },
            {
                "Variant": "rs7412",
                "Zygosity": "1/0",
                "chr": "chr19",
                "start": "44908822",
                "end": "44908823",
                "Description": "Test present variant 2",
                "chromVcf": "chr19",
                "posVcf": 44908822,
                "refVcf": "C",
                "altVcf": "T",
            },
            {
                "Variant": "rs7412",
                "Zygosity": "1/0",
                "chr": "chr19",
                "start": "44908822",
                "end": "44908823",
                "Description": "Test present variant 3",
                "chromVcf": "chr19",
                "posVcf": 44908822,
                "refVcf": "C",
                "altVcf": "T",
            },
        ]
        assert actual_output == target_output
