import json
import os
import subprocess
import traceback

from shared.dynamodb import query_clinic_job, update_clinic_job


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
