import os

from shared.dynamodb import query_clinic_job, update_clinic_job

def handle_failed_execution(job_id, error_message):
    print(error_message)
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
