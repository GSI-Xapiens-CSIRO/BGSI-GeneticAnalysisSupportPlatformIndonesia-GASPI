import json
import os
import io
import shutil
import sys
from unittest.mock import patch

import boto3
import botocore
import ijson
import pytest
from moto import mock_aws

orig = botocore.client.BaseClient._make_api_call

TEST_OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "test_output")


def setup_test_output_dir():
    if os.path.exists(TEST_OUTPUT_DIR):
        shutil.rmtree(TEST_OUTPUT_DIR)
    os.makedirs(TEST_OUTPUT_DIR, exist_ok=True)


def mock_make_api_call(self, operation_name, kwarg):

    return orig(self, operation_name, kwarg)


def test_pharmcat(resources_dict):
    import lambda_function

    setup_test_output_dir()

    with patch(
        "botocore.client.BaseClient._make_api_call",
        new=mock_make_api_call,
    ):

        lambda_function.lambda_handler(
            {
                "requestId": "01JWWAZ668XYVCTYW0ZNKN26CN",
                "projectName": "ci_cd_project",
                "s3Keys": ["preprocessed_01JWWAZ668XYVCTYW0ZNKN26CN.vcf.gz"],
                "sourceVcfKey": "projects/testintegration/project-files/integration_test.vcf.gz",
                "missingToRef": False,
            },
            {},
        )

    with open(
        os.path.join(TEST_OUTPUT_DIR, "01JWWAZ668XYVCTYW0ZNKN26CN.report.json"),
        "r",
    ) as f:
        allele1_targets, allele2_targets = (
            {"*1"},
            {"*5", "*15", "*40", "*46", "*47"},
        )
        allele1_values, allele2_values = set(), set()

        parser = ijson.parse(f)
        for prefix, _, value in parser:
            if prefix == "genes.CPIC.SLCO1B1.sourceDiplotypes.item.allele1.name":
                allele1_values.add(value)
            elif prefix == "genes.CPIC.SLCO1B1.sourceDiplotypes.item.allele2.name":
                allele2_values.add(value)

        assert (
            allele1_values == allele1_targets and allele2_values == allele2_targets
        ), (
            f"Allele1 values: {allele1_values}, expected: {allele1_targets}. "
            f"Allele2 values: {allele2_values}, expected: {allele2_targets}."
        )
