from collections import defaultdict
import json
import os

from shared.utils import CheckedProcess, handle_failed_execution, LoggingClient
from shared.dynamodb import update_clinic_job

DPORTAL_BUCKET = os.environ["DPORTAL_BUCKET"]
PGXFLOW_BUCKET = os.environ["PGXFLOW_BUCKET"]
RESULT_SUFFIX = os.environ["RESULT_SUFFIX"]
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
KEYS_TO_REMOVE = [
    "chromRef",
    "posVcf",
    "refVcf",
    "altsVcf",
    "per_alt",
]

s3_client = LoggingClient("s3")
lambda_client = LoggingClient("lambda")


def get_query_process(regions, ref_chrom):
    chrom = f"chr{ref_chrom}"
    args = [
        "bcftools",
        "query",
        "--regions",
        ",".join(f"{chrom}:{pos}" for pos, _ in regions),
        "--format",
        f"%POS\t%REF\t%ALT\t{'\\t'.join("%" + val for val in GNOMAD_COLUMNS.values())}\n",
        f"{GNOMAD_S3_PREFIX}{chrom}{GNOMAD_S3_SUFFIX}",
    ]
    return CheckedProcess(args, error_message="bcftools error querying gnomAD")


def convert_to_region_lines(input_data):
    regions_data = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    for data in input_data:
        regions_data[data["chromRef"]][data["posVcf"]][data["refVcf"]].append(data)
        data["per_alt"] = {}
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
                        (pos, ref): data_value
                        for pos in region_chunk
                        for ref, data_value in regions_data[chrom][pos].items()
                    },
                )
                for region_chunk in region_chunks
            ]
        )
    return region_query_lines


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
            for data in regions_data.get((pos, ref), []):
                if alt in data["altsVcf"]:
                    data["per_alt"][alt] = {
                        col_name: gnomad_datum
                        for col_name, gnomad_datum in zip(
                            list(GNOMAD_COLUMNS.keys()), query_data
                        )
                    }
                lines_updated += 1
        query_process.check()
    for data in input_data:
        data_per_alt = data["per_alt"]
        for col_name in GNOMAD_COLUMNS:
            vals = []
            for alt in data["altsVcf"]:
                vals.append(data_per_alt.get(alt, {}).get(col_name, "."))
            data[col_name] = "/".join(vals)
        for key in KEYS_TO_REMOVE:
            del data[key]


def lambda_handler(event, context):
    print(f"Event received: {json.dumps(event)}")
    request_id = event["requestId"]
    s3_key = event["s3Key"]
    project = event["projectName"]
    try:
        response = s3_client.get_object(
            Bucket=PGXFLOW_BUCKET,
            Key=s3_key,
        )
        input_data = json.loads(response["Body"].read().decode("utf-8"))
        add_gnomad_data(input_data["variants"])

        s3_client.put_object(
            Bucket=DPORTAL_BUCKET,
            Key=f"projects/{project}/clinical-workflows/{request_id}{RESULT_SUFFIX}",
            Body=json.dumps(input_data, indent=4).encode(),
        )
        s3_client.delete_object(
            Bucket=PGXFLOW_BUCKET,
            Key=s3_key,
        )
        update_clinic_job(request_id, job_status="completed")
    except Exception as e:
        handle_failed_execution(request_id, e)
