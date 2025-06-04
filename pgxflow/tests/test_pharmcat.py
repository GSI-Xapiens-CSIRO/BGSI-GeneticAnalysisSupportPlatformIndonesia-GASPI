import json
import os
import io
import sys
from unittest.mock import patch

import boto3
import botocore
import pytest
from moto import mock_aws

orig = botocore.client.BaseClient._make_api_call


def mock_make_api_call(self, operation_name, kwarg):
    
    return orig(self, operation_name, kwarg)


def test_pharmcat(resources_dict):
    import lambda_function

    with patch(
        "botocore.client.BaseClient._make_api_call",
        new=mock_make_api_call,
    ):

        lambda_function.lambda_handler(
            {
                "requestId": "01JWWAZ668XYVCTYW0ZNKN26CN",
                "projectName": "ci_cd_project",
                "s3Key": "preprocessed_01JWWAZ668XYVCTYW0ZNKN26CN.vcf.gz",
                "sourceVcfKey": "projects/testintegration/project-files/integration_test.vcf.gz",
            },
            {},
        )
    
