import json
import math
import os
import subprocess
import traceback

import boto3
from botocore.config import Config

from shared.dynamodb import query_clinic_job, update_clinic_job

REGION = os.environ.get("REGION")
MAX_PRINT_LENGTH = 1024

s3_client = boto3.client(
    "s3",
    region_name=REGION,
    config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}),
)


class ProcessError(Exception):
    def __init__(self, message, stdout, stderr, returncode, process_args):
        self.message = message
        self.stdout = stdout
        self.stderr = stderr
        self.returncode = returncode
        self.process_args = process_args
        super().__init__(message)

    def __str__(self):
        return f"{self.message}\nProcess args: {self.process_args}\nstderr:\n{self.stderr}\nreturncode: {self.returncode}"


class CheckedProcess:
    def __init__(self, args, error_message=None, **kwargs):
        defaults = {
            "args": args,
            "stderr": subprocess.PIPE,
            "stdout": subprocess.PIPE,
            "cwd": "/tmp",
            "encoding": "utf-8",
        }
        kwargs.update({k: v for k, v in defaults.items() if k not in kwargs})
        print(
            f"Running subprocess.Popen with kwargs: {json.dumps(kwargs, default=str)}"
        )
        self.process = subprocess.Popen(**kwargs)
        self.error_message = error_message or f"Error running {args[0]}"
        self.stdout = self.process.stdout
        self.stdin = self.process.stdin

    def check(self):
        stdout, stderr = self.process.communicate()
        returncode = self.process.returncode
        if returncode != 0:
            raise ProcessError(
                self.error_message, stdout, stderr, returncode, self.process.args
            )
        return stdout


def handle_failed_execution(job_id, error_message, pipeline_names):
    traceback.print_exc()
    job = query_clinic_job(job_id)
    job_status = "failed"
    failed_step = os.environ.get("AWS_LAMBDA_FUNCTION_NAME", "unknown")
    pipelines_to_update = []
    for name in pipeline_names:
        if job.get(f"{name}_status").get("S") != "failed":
            pipelines_to_update.append(name)
    update_clinic_job(
        job_id,
        job_status=job_status,
        failed_step=failed_step,
        error_message=str(error_message),
        pipeline_names=pipelines_to_update,
    )


def generate_presigned_get_url(bucket, key, expires=3600):
    kwargs = {
        "ClientMethod": "get_object",
        "Params": {
            "Bucket": bucket,
            "Key": key,
        },
        "ExpiresIn": expires,
    }
    print(f"Calling s3.generate_presigned_url with kwargs: {json.dumps(kwargs)}")
    response = s3_client.generate_presigned_url(**kwargs)
    print(f"Received response: {json.dumps(response, default=str)}")
    return response


### Client actions with logging


def _truncate_string(string, max_length=MAX_PRINT_LENGTH):
    length = len(string)

    if (max_length is None) or (length <= max_length):
        return string

    excess_bytes = length - max_length
    # Excess bytes + 9 for the smallest possible placeholder
    min_removed = excess_bytes + 9
    placeholder_chars = 8 + math.ceil(math.log(min_removed, 10))
    removed_chars = excess_bytes + placeholder_chars
    while True:
        placeholder = f"<{removed_chars} bytes>"
        # Handle edge cases where the placeholder gets larger
        # when characters are removed.
        total_reduction = removed_chars - len(placeholder)
        if total_reduction < excess_bytes:
            removed_chars += 1
        else:
            break
    if removed_chars > length:
        # Handle edge cases where the placeholder is larger than
        # maximum length. In this case, just truncate the string.
        return string[:max_length]
    snip_start = (length - removed_chars) // 2
    snip_end = snip_start + removed_chars
    # Cut out the middle of the string and replace it with the
    # placeholder.
    return f"{string[:snip_start]}{placeholder}{string[snip_end:]}"


def short_json(obj, max_length=MAX_PRINT_LENGTH):
    return _truncate_string(json.dumps(obj, default=str), max_length)


class LoggingClient:
    def __init__(self, client):
        self.client = boto3.client(client)
        self.client_name = client

    def __getattr__(self, function_name):
        return lambda *args, **kwargs: self.aws_api_call(function_name, args, kwargs)

    def aws_api_call(self, function_name, args, kwargs):
        function = getattr(self.client, function_name)
        call_name = f"{self.client_name}.{function_name}"
        print(
            f"Calling {call_name} with args: {short_json(args)} kwargs: {short_json(kwargs)}"
        )
        response = function(*args, **kwargs)
        print(f"Received response from {call_name}: {short_json(response)}")
        return response
