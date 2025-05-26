import csv
import io
import json
import os

from shared.utils import CheckedProcess, handle_failed_execution, LoggingClient

LOCAL_DIR = "/tmp"
DPORTAL_BUCKET = os.environ["DPORTAL_BUCKET"]
PGXFLOW_BUCKET = os.environ["PGXFLOW_BUCKET"]
REFERENCE_BUCKET = os.environ["REFERENCE_BUCKET"]
LOOKUP_REFERENCE = os.environ["LOOKUP_REFERENCE"]
PGXFLOW_GNOMAD_LAMBDA = os.environ["PGXFLOW_GNOMAD_LAMBDA"]

s3_client = LoggingClient("s3")
lambda_client = LoggingClient("lambda")


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
    dbsnp_annotated_vcf_key = event["dbsnpAnnotatedVcfKey"]

    annotated_vcf_s3_uri = f"s3://{PGXFLOW_BUCKET}/{dbsnp_annotated_vcf_key}"

    try:
        query_rsid_args = [
            "bcftools",
            "query",
            "-f",
            "%ID\t%CHROM\t%POS\t%REF\t%ALT\n",
            annotated_vcf_s3_uri,
        ]
        query_rsid_process = CheckedProcess(query_rsid_args)
        lookup_table = load_lookup()
        lookup_results = []
        for line in query_rsid_process.stdout:
            rsid, chrom, pos_s, ref, alt = line.strip().split("\t")
            for lookup_values in lookup_table.get(rsid, []):
                for allele in alt.split(","):
                    if allele == ".":
                        continue
                    lookup_results.append(
                        dict(
                            **lookup_values,
                            **{
                                "chromVcf": chrom,
                                "posVcf": int(pos_s),
                                "refVcf": ref,
                                "altVcf": allele,
                            },
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
