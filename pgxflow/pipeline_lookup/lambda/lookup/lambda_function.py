import csv
import io
import json
import os
from urllib.parse import urlparse

from shared.utils import CheckedProcess, handle_failed_execution, LoggingClient

LOCAL_DIR = os.environ.get("LOCAL_DIR", "/tmp")
DPORTAL_BUCKET = os.environ["DPORTAL_BUCKET"]
PGXFLOW_BUCKET = os.environ["PGXFLOW_BUCKET"]
REFERENCE_BUCKET = os.environ["REFERENCE_BUCKET"]
LOOKUP_REFERENCE = os.environ["LOOKUP_REFERENCE"]
PGXFLOW_GNOMAD_LAMBDA = os.environ["PGXFLOW_GNOMAD_LAMBDA"]

s3_client = LoggingClient("s3")
lambda_client = LoggingClient("lambda")


REQUESTED_FIELDS = {
    "_rsid": "%ID",
    "chromVcf": "%CHROM",
    "posVcf": "%POS",
    "refVcf": "%REF",
    "_alts": "%ALT",
    "qual": "%QUAL",
    "filter": "%FILTER",
}

REQUESTED_FORMAT_TAGS = {
    "dp": "DP",
    "gq": "GQ",
    "mq": "MQ",
    "qd": "QD",
}


def get_format_tags(location):
    args = [
        "bcftools",
        "head",
        location,
    ]
    process = CheckedProcess(args)
    format_tags = {
        line.split("ID=")[1].split(",")[0]
        for line in process.stdout
        if line.startswith("##FORMAT=<ID=")
    }
    process.check()
    print("Found FORMAT tags:", format_tags)
    return format_tags


def get_query_fields(location):
    format_tags = get_format_tags(location)
    return {
        **REQUESTED_FIELDS,
        **{
            field: f"[%{tag}]" if tag in format_tags else "."
            for field, tag in REQUESTED_FORMAT_TAGS.items()
        },
    }


def load_lookup():
    response = s3_client.get_object(
        Bucket=REFERENCE_BUCKET,
        Key=LOOKUP_REFERENCE,
    )
    body = response["Body"]
    csvfile = io.StringIO(body.read().decode("utf-8-sig"))
    reader = csv.DictReader(csvfile)
    lookup_table = {}
    for row in reader:
        rsid = row["Variant"]
        values = {key: row[key] for key in row}
        if rsid in lookup_table:
            lookup_table[rsid].append(values)
        else:
            lookup_table[rsid] = [values]
    return lookup_table


def lambda_handler(event, context):
    print(f"Event received: {json.dumps(event)}")
    request_id = event["requestId"]
    project_name = event["projectName"]
    dbsnp_annotated_vcf_location = event["dbsnpAnnotatedVcfLocation"]
    dbsnp_annotated_vcf_parsed = urlparse(dbsnp_annotated_vcf_location)
    dbsnp_annotated_vcf_key = dbsnp_annotated_vcf_parsed.path.lstrip("/")
    fields = get_query_fields(dbsnp_annotated_vcf_location)

    try:
        query_rsid_args = [
            "bcftools",
            "query",
            "-f",
            "\t".join(fields.values()) + "\n",
            dbsnp_annotated_vcf_location,
        ]
        query_rsid_process = CheckedProcess(query_rsid_args, cwd=LOCAL_DIR)
        lookup_table = load_lookup()
        lookup_results = []
        for line in query_rsid_process.stdout:
            line_fields = {
                key: value
                for key, value in zip(fields.keys(), line.strip().split("\t"))
            }
            rsid = line_fields.pop("_rsid")
            alts = line_fields.pop("_alts")
            line_fields["posVcf"] = int(line_fields["posVcf"])
            for lookup_values in lookup_table.get(rsid, []):
                for allele in alts.split(","):
                    if allele == ".":
                        continue
                    lookup_results.append(
                        dict(
                            altVcf=allele,
                            **lookup_values,
                            **line_fields,
                        )
                    )
        query_rsid_process.check()

        s3_output_key = f"{request_id}_lookup.json"
        s3_client.put_object(
            Bucket=PGXFLOW_BUCKET,
            Key=s3_output_key,
            Body=json.dumps(lookup_results).encode(),
        )

        s3_client.delete_object(
            Bucket=PGXFLOW_BUCKET,
            Key=dbsnp_annotated_vcf_key,
        )

        s3_client.delete_object(
            Bucket=PGXFLOW_BUCKET,
            Key=f"{dbsnp_annotated_vcf_key}.csi",
        )

        lambda_client.invoke(
            FunctionName=PGXFLOW_GNOMAD_LAMBDA,
            InvocationType="Event",
            Payload=json.dumps(
                {
                    "requestId": request_id,
                    "projectName": project_name,
                    "inputDataKey": s3_output_key,
                }
            ),
        )
    except Exception as e:
        handle_failed_execution(request_id, e)
