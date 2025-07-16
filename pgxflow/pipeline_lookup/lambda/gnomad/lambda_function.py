from collections import defaultdict
import json
import os

from shared.utils import CheckedProcess, handle_failed_execution, LoggingClient
from shared.dynamodb import update_clinic_job

LOCAL_DIR = "/tmp"
RESULT_SUFFIX = os.environ["RESULT_SUFFIX"]
DPORTAL_BUCKET = os.environ["DPORTAL_BUCKET"]
PGXFLOW_BUCKET = os.environ["PGXFLOW_BUCKET"]
GNOMAD_S3_PREFIX = "https://gnomad-public-us-east-1.s3.amazonaws.com/release/4.1/vcf/genomes/gnomad.genomes.v4.1.sites."
GNOMAD_S3_SUFFIX = ".vcf.bgz"
MAX_REGIONS_PER_QUERY = 20
# Just the columns after the identifying columns
GNOMAD_COLUMNS = {
    "afAfr": "INFO/AF_afr",
    "afEas": "INFO/AF_eas",
    "afFin": "INFO/AF_fin",
    "afNfe": "INFO/AF_nfe",
    "afSas": "INFO/AF_sas",
    "afAmr": "INFO/AF_amr",
    "af": "INFO/AF",
    "ac": "INFO/AC",
    "an": "INFO/AN",
    "siftMax": "INFO/sift_max",
}

s3_client = LoggingClient("s3")


def get_query_process(regions, ref_chrom):
    chrom = f"chr{ref_chrom}"
    args = [
        "bcftools",
        "query",
        "--regions",
        ",".join(f"{chrom}:{pos}" for pos, _, _ in regions),
        "--format",
        f"%POS\t%REF\t%ALT\t{'\\t'.join("%" + val for val in GNOMAD_COLUMNS.values())}\n",
        f"{GNOMAD_S3_PREFIX}{chrom}{GNOMAD_S3_SUFFIX}",
    ]
    return CheckedProcess(args, error_message="bcftools error querying gnomAD")


def convert_to_region_lines(input_data):
    regions_data = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    for data in input_data:
        regions_data[data["chromVcf"]][data["posVcf"]][
            (data["refVcf"], data["altVcf"])
        ].append(data)
    # Split into chunks of MAX_REGIONS_PER_QUERY
    region_query_lines = []
    for chrom, pos_lines in regions_data.items():
        pos_list = sorted(list(pos_lines.keys()))
        region_chunks = [
            pos_list[i : i + MAX_REGIONS_PER_QUERY]
            for i in range(0, len(pos_list), MAX_REGIONS_PER_QUERY)
        ]
        region_query_lines.extend(
            [
                (
                    chrom,
                    {
                        (pos, ref, alt): data_value
                        for pos in region_chunk
                        for (ref, alt), data_value in regions_data[chrom][pos].items()
                    },
                )
                for region_chunk in region_chunks
            ]
        )
    return region_query_lines


def convert_scientific_to_string_decimal(record):
    fields_to_convert = [
        "afAfr",
        "afEas",
        "afFin",
        "afNfe",
        "afSas",
        "afAmr",
        "af",
    ]
    for key in fields_to_convert:
        val = record.get(key)
        if isinstance(val, str) and "e-" in val:
            try:
                decimal_value = float(val)
                record[key] = f"{decimal_value:.10f}"
            except ValueError:
                pass
    return record


def add_gnomad_data(input_data):
    region_queries_lines = convert_to_region_lines(input_data)
    query_processes = [
        get_query_process(query_region.keys(), chrom)
        for chrom, query_region in region_queries_lines
    ]
    lines_updated = 0
    for query_process, (_, regions_data) in zip(query_processes, region_queries_lines):
        for line in query_process.stdout:
            line = line.strip()
            if not line:
                continue
            pos_s, ref, alt, *query_data = line.split("\t")
            pos = int(pos_s)
            for data in regions_data.get((pos, ref, alt), []):
                data.update(
                    {
                        col_name: gnomad_datum
                        for col_name, gnomad_datum in zip(
                            list(GNOMAD_COLUMNS.keys()), query_data
                        )
                    }
                )
                # convert scientific notation to string decimal
                convert_scientific_to_string_decimal(data)
                lines_updated += 1
        query_process.check()
    print(f"Updated {lines_updated}/{len(input_data)} rows with gnomad data")


def lambda_handler(event, context):
    print(f"Event received: {json.dumps(event)}")
    request_id = event["requestId"]
    project_name = event["projectName"]
    input_data_key = event["inputDataKey"]
    try:
        response = s3_client.get_object(
            Bucket=PGXFLOW_BUCKET,
            Key=input_data_key,
        )
        input_data = json.loads(response["Body"].read().decode("utf-8"))
        add_gnomad_data(input_data)
        local_output_path = os.path.join(LOCAL_DIR, f"results.jsonl")
        with open(local_output_path, "w") as output_file:
            for line in input_data:
                json.dump(line, output_file)
                output_file.write("\n")

        s3_output_key = (
            f"projects/{project_name}/clinical-workflows/{request_id}{RESULT_SUFFIX}"
        )

        s3_client.upload_file(
            Bucket=DPORTAL_BUCKET,
            Key=s3_output_key,
            Filename=local_output_path,
        )

        s3_client.delete_object(
            Bucket=PGXFLOW_BUCKET,
            Key=input_data_key,
        )

        update_clinic_job(request_id, job_status="completed")
    except Exception as e:
        handle_failed_execution(request_id, e)
