import gzip
import json
import os
import subprocess
from urllib.parse import urlparse
from collections import defaultdict

import boto3
import ijson

from shared.utils import handle_failed_execution
from shared.dynamodb import update_clinic_job

s3_client = boto3.client("s3")

LOCAL_DIR = "/tmp"
RESULT_SUFFIX = os.environ["RESULT_SUFFIX"]
PGXFLOW_BUCKET = os.environ["PGXFLOW_BUCKET"]
DPORTAL_BUCKET = os.environ["DPORTAL_BUCKET"]
GENE_ORGANISATIONS = os.environ["GENE_ORGANISATIONS"].strip().split(",")
GENES = os.environ["GENES"].strip().split(",")


def query_zygosity(input_vcf=None, chrom=None, pos=None):
    args = [
        "bcftools",
        "query",
        "-f",
        "[%GT]\n",
        input_vcf,
        "-r",
        f"{chrom}:{pos}-{pos}",
    ]
    try:
        bcftools_output = subprocess.check_output(
            args=args, cwd="/tmp", encoding="utf-8"
        )
        return bcftools_output.strip()
    except subprocess.CalledProcessError as e:
        print(
            f"cmd {e.cmd} returned non-zero error code {e.returncode}. stderr:\n{e.stderr}"
        )


def yield_genes(pharmcat_output_json, source_vcf):
    with open(pharmcat_output_json, "rb") as f:
        parser = ijson.parse(f)

        current_organisation = None
        current_gene = None
        in_diplotype_array = False
        in_variant_array = False

        for prefix, event, value in parser:
            if prefix == "genes" and event == "map_key":
                current_organisation = value

            if current_organisation not in GENE_ORGANISATIONS:
                continue

            if prefix == f"genes.{current_organisation}" and event == "map_key":
                current_gene = value
                diplotypes = []
                condensed_diplotypes = []
            if current_gene not in GENES:
                continue

            if (
                not in_diplotype_array
                and prefix
                == f"genes.{current_organisation}.{current_gene}.sourceDiplotypes"
                and event == "start_array"
            ):
                in_diplotype_array = True

            if (
                not in_variant_array
                and prefix == f"genes.{current_organisation}.{current_gene}.variants"
                and event == "start_array"
            ):
                in_variant_array = True

            if in_diplotype_array:
                if (
                    prefix
                    == f"genes.{current_organisation}.{current_gene}.sourceDiplotypes.item"
                    and event == "start_map"
                ):
                    diplotype = {
                        "organisation": current_organisation,
                        "gene": current_gene,
                        "alleles": [],
                        "phenotypes": [],
                        "variants": {},
                    }
                    condensed_diplotype = {
                        "organisation": current_organisation,
                        "gene": current_gene,
                        "alleles": [],
                    }

                for allele in ["allele1", "allele2"]:
                    if (
                        prefix
                        == f"genes.{current_organisation}.{current_gene}.sourceDiplotypes.item.{allele}.name"
                        and event == "string"
                    ):
                        diplotype["alleles"].append(value)
                        condensed_diplotype["alleles"].append(value)

                if (
                    prefix
                    == f"genes.{current_organisation}.{current_gene}.sourceDiplotypes.item.phenotypes.item"
                ):
                    diplotype["phenotypes"].append(value)

                if (
                    prefix
                    == f"genes.{current_organisation}.{current_gene}.sourceDiplotypes.item"
                    and event == "end_map"
                ):
                    diplotypes.append(diplotype)
                    condensed_diplotypes.append(condensed_diplotype)

                if (
                    prefix
                    == f"genes.{current_organisation}.{current_gene}.sourceDiplotypes"
                    and event == "end_array"
                ):
                    in_diplotype_array = False

            elif in_variant_array:
                if (
                    prefix
                    == f"genes.{current_organisation}.{current_gene}.variants.item"
                    and event == "start_map"
                ):
                    variant = {
                        "chr": "",
                        "pos": "",
                        "rsid": "",
                        "call": "",
                        "alleles": [],
                    }

                for property, key in [
                    ("chromosome", "chr"),
                    ("position", "pos"),
                    ("dbSnpId", "rsid"),
                    ("call", "call"),
                ]:
                    if (
                        prefix
                        == f"genes.{current_organisation}.{current_gene}.variants.item.{property}"
                    ):
                        variant[key] = value

                if (
                    prefix
                    == f"genes.{current_organisation}.{current_gene}.variants.item.alleles.item"
                ):
                    variant["alleles"].append(value)

                if (
                    prefix
                    == f"genes.{current_organisation}.{current_gene}.variants.item"
                    and event == "end_map"
                    and variant["call"] is not None
                ):
                    rsid = variant.pop("rsid")
                    variant["zygosity"] = query_zygosity(
                        source_vcf, variant["chr"], variant["pos"]
                    )
                    for diplotype in diplotypes:
                        if set(diplotype["alleles"]) & set(variant["alleles"]):
                            diplotype["variants"][rsid] = variant

                if (
                    prefix == f"genes.{current_organisation}.{current_gene}.variants"
                    and event == "end_array"
                ):
                    yield (diplotypes, condensed_diplotypes)
                    in_variant_array = False

            else:
                continue


def lambda_handler(event, context):
    print(f"Event received: {json.dumps(event)}")
    request_id = event["requestId"]
    location = event["location"]
    project = event["projectName"]
    source_vcf_location = event["sourceVcfLocation"]

    try:
        s3_path = urlparse(location).path
        processed_json = f"{request_id}.pharmcat.json"

        local_input_path = os.path.join(LOCAL_DIR, processed_json)
        s3_client.download_file(
            Bucket=PGXFLOW_BUCKET,
            Key=s3_path.lstrip("/"),
            Filename=local_input_path,
        )

        index = defaultdict(lambda: defaultdict(list))
        max_lines_per_page = 10_000
        max_size_per_page = 10 * 10**6

        postprocessed_jsonl = f"{request_id}.postprocessed.jsonl"
        local_output_path = f"{LOCAL_DIR}/{postprocessed_jsonl}"

        with open(local_output_path, "w") as f:
            lines_read = 0
            size_read = 0
            page_start_offset = 0
            page_num = 1

            for diplotype_chunk, condensed_diplotype_chunk in yield_genes(
                local_input_path, source_vcf_location
            ):
                for i in range(len(diplotype_chunk)):
                    offset = f.tell()
                    diplotype = diplotype_chunk[i]

                    json_string = json.dumps(diplotype)
                    f.write(json_string + "\n")

                    record_size = len(json_string) + 1

                    if lines_read >= max_lines_per_page or size_read >= max_size_per_page:
                        index[page_num]["page_start_f"].append(page_start_offset)
                        index[page_num]["page_end_f"].append(offset + record_size)
                        page_num += 1
                        page_start_offset = offset + record_size
                        lines_read = 0
                        size_read = 0

                    lines_read += 1
                    size_read += record_size

            final_offset = f.tell()
            if not index.get(page_num, {}).get("page_start_f", None):
                index[page_num]["page_start_f"].append(page_start_offset)
                index[page_num]["page_end_f"].append(final_offset + record_size)

        output_key = f"projects/{project}/clinical-workflows/{request_id}{RESULT_SUFFIX}"
        s3_client.upload_file(
            Filename=local_output_path,
            Bucket=DPORTAL_BUCKET,
            Key=output_key,
        )

        index = json.dumps(index).encode()
        index = gzip.compress(index)
        index_key = f"{output_key}.index.json.gz"
        s3_client.put_object(
            Bucket=DPORTAL_BUCKET,
            Key=index_key,
            Body=index,
        )

        s3_client.delete_object(
            Bucket=PGXFLOW_BUCKET,
            Key=s3_path.lstrip("/"),
        )

        update_clinic_job(request_id, job_status="completed")
    except Exception as e:
        handle_failed_execution(request_id, e)
