import json
import math
import os
import subprocess
import traceback

import boto3

from shared.dynamodb import query_clinic_job, update_clinic_job

MAX_PRINT_LENGTH = 1024


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


def handle_failed_execution(job_id, error_message):
    traceback.print_exc()
    job = query_clinic_job(job_id)
    if job.get("job_status").get("S") == "failed":
        return
    job_status = "failed"
    failed_step = os.environ.get("AWS_LAMBDA_FUNCTION_NAME", "unknown")

    update_clinic_job(
        job_id,
        job_status=job_status,
        failed_step=failed_step,
        error_message=str(error_message),
        project_name=job.get("project_name", {}).get("S"),
        input_vcf=job.get("input_vcf", {}).get("S"),
        user_id=job.get("uid", {}).get("S"),
        is_from_failed_execution=True,
    )


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


class LoggingClient:
    def __init__(self, client):
        self.client = boto3.client(client)
        self.client_name = client

    def __getattr__(self, function_name):
        return lambda **kwargs: self.aws_api_call(function_name, kwargs)

    def aws_api_call(self, function_name, kwargs):
        function = getattr(self.client, function_name)
        kwargs_string = _truncate_string(json.dumps(kwargs, default=str))
        print(
            f"Calling {self.client_name}.{function_name} with kwargs: {kwargs_string}"
        )
        return function(**kwargs)
