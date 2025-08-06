import json
import os
import subprocess

from shared.utils import handle_failed_execution, LoggingClient

lambda_client = LoggingClient("lambda")
s3_client = LoggingClient("s3")

LOCAL_DIR = "/tmp"
DPORTAL_BUCKET = os.environ["DPORTAL_BUCKET"]
PGXFLOW_BUCKET = os.environ["PGXFLOW_BUCKET"]
REFERENCE_BUCKET = os.environ["REFERENCE_BUCKET"]
PGXFLOW_PHARMCAT_LAMBDA = os.environ["PGXFLOW_PHARMCAT_LAMBDA"]
PHARMCAT_REFERENCES = [
    "pharmcat_positions.vcf.bgz",
    "pharmcat_positions.vcf.bgz.csi",
    "pharmcat_positions.uniallelic.vcf.bgz",
    "pharmcat_positions.uniallelic.vcf.bgz.csi",
    "reference.fna.bgz",
    "reference.fna.bgz.fai",
    "reference.fna.bgz.gzi",
    "pharmcat_regions.bed",
]


def run_preprocessor(input_path, vcf, reference_fna, reference_vcf, missing_to_ref):
    """Run the PharmCAT VCF preprocessor."""
    cmd = [
        "python3",
        "/opt/preprocessor/pharmcat_vcf_preprocessor.py",
        "--vcf",
        input_path,
        "--output-dir",
        LOCAL_DIR,
        "--base-filename",
        vcf,
        "-refFna",
        reference_fna,
        "-refVcf",
        reference_vcf,
    ]
    if missing_to_ref:
        cmd.append("--missing-to-ref")
    subprocess.run(cmd, check=True)


def lambda_handler(event, context):
    print(f"Event received: {json.dumps(event)}")
    message = json.loads(event["Records"][0]["Sns"]["Message"])
    request_id = message["requestId"]
    source_vcf_key = message["sourceVcfKey"]
    project = message["projectName"]
    missing_to_ref = message["missingToRef"]

    try:
        vcf = f"{request_id}.vcf.gz"
        local_input_path = os.path.join(LOCAL_DIR, vcf)

        s3_client.download_file(
            Bucket=DPORTAL_BUCKET,
            Key=source_vcf_key,
            Filename=local_input_path,
        )

        local_reference_dir = os.path.join(LOCAL_DIR, "preprocessor_refs")
        os.makedirs(local_reference_dir, exist_ok=True)

        local_references = [
            os.path.join(local_reference_dir, reference_file)
            for reference_file in PHARMCAT_REFERENCES
        ]
        for local_reference_path in local_references:
            # Skip download if file exists to leverage warm starts
            if os.path.exists(local_reference_path):
                print(
                    f"Skipping download of {local_reference_path} as it already exists."
                )
                continue
            local_reference_path = os.path.join(
                local_reference_dir, local_reference_path
            )
            s3_client.download_file(
                Bucket=REFERENCE_BUCKET,
                Key=f"pharmcat-preprocessor/{os.path.basename(local_reference_path)}",
                Filename=local_reference_path,
            )

        reference_vcf = os.path.join(local_reference_dir, PHARMCAT_REFERENCES[0])
        reference_fna = os.path.join(local_reference_dir, PHARMCAT_REFERENCES[4])

        if missing_to_ref:
            preprocessor_configs = [
                {
                    "flag": "",
                    "key": f"{request_id}.preprocessed.nonref.vcf.bgz",
                },
                {
                    "flag": "--missing-to-ref",
                    "key": f"{request_id}.preprocessed.ref.vcf.bgz",
                },
            ]
        else:
            preprocessor_configs = [
                {
                    "flag": "",
                    "key": f"{request_id}.preprocessed.vcf.bgz",
                }
            ]

        s3_output_keys = []

        for config in preprocessor_configs:
            flag = config["flag"]
            run_preprocessor(
                local_input_path,
                request_id,
                reference_fna,
                reference_vcf,
                missing_to_ref=flag,
            )
            preprocessed_vcf = f"{request_id}.preprocessed.vcf.bgz"

            s3_output_key = config["key"]
            s3_client.upload_file(
                Bucket=PGXFLOW_BUCKET,
                Key=s3_output_key,
                Filename=os.path.join(LOCAL_DIR, preprocessed_vcf),
            )
            s3_output_keys.append(s3_output_key)

        lambda_client.invoke(
            FunctionName=PGXFLOW_PHARMCAT_LAMBDA,
            InvocationType="Event",
            Payload=json.dumps(
                {
                    "requestId": request_id,
                    "projectName": project,
                    "s3Keys": s3_output_keys,
                    "sourceVcfKey": source_vcf_key,
                    "missingToRef": missing_to_ref,
                }
            ),
        )
    except Exception as e:
        handle_failed_execution(request_id, e, ["pharmcat"])
