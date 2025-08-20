import csv
from io import StringIO
import os
import traceback

from shared.utils import LoggingClient

s3_client = LoggingClient("s3")

REFERENCE_BUCKET = os.environ["REFERENCE_BUCKET"]
LOOKUP_REFERENCE = os.environ["LOOKUP_REFERENCE"]
CHR_HEADER = os.environ["LOOKUP_CHR_HEADER"]
START_HEADER = os.environ["LOOKUP_START_HEADER"]
END_HEADER = os.environ["LOOKUP_END_HEADER"]
REFERENCE_IDS = ["dbsnp_version", "lookup_version"]


def check_assoc_matrix():
    try:
        response = s3_client.get_object(Bucket=REFERENCE_BUCKET, Key=LOOKUP_REFERENCE)
    except Exception as e:
        traceback.print_exc()
        return (
            False,
            f"Unable to access association matrix at s3://{REFERENCE_BUCKET}/{LOOKUP_REFERENCE}. Please contact an AWS administrator.",
        )

    required_columns = [CHR_HEADER, START_HEADER, END_HEADER]
    try:
        body = response["Body"].read().decode("utf-8")
        reader = csv.DictReader(StringIO(body))
    except Exception as e:
        traceback.print_exc()
        return (
            False,
            "Unable to read the association matrix file. Please contact an AWS administrator.",
        )
    missing_columns = [col for col in required_columns if col not in reader.fieldnames]
    if missing_columns:
        return (
            False,
            f"Missing required column(s) in association matrix: {', '.join(missing_columns)}. Please contact an AWS administrator.",
        )

    return True, None
