import json
import os
import re

import ijson

from shared.utils import CheckedProcess, get_chromosome_mapping, match_chromosome_name
from utils import (
    is_entering_array,
    is_exiting_array,
    is_entering_map,
    is_exiting_map,
    create_b64_id,
)


DPORTAL_BUCKET = os.environ["DPORTAL_BUCKET"]
GENES = os.environ["GENES"].strip().split(",")
ORGANISATIONS = json.loads(os.environ["ORGANISATIONS"])


def query_variant_zygosity(chrom_mapping, vcf_s3_location, chrom, pos):
    reversed_chrom_mapping = {v: k for k, v in chrom_mapping.items()}
    chrom = reversed_chrom_mapping[match_chromosome_name(chrom)]
    args = [
        "bcftools",
        "query",
        "-f",
        "%POS\t%REF\t%ALT\t[%GT]\n",
        vcf_s3_location,
        "-r",
        f"{chrom}:{pos}-{pos}",
    ]
    query_process = CheckedProcess(args)
    query_output = query_process.check()
    if not query_output:
        return {
            "chromRef": chrom_mapping[chrom],
            "posVcf": int(pos),
            "refVcf": ".",
            "altsVcf": [".", "."],
            "zygosity": "0|0",
        }
    pos_vcf, ref_vcf, alt_vcf, gt = query_output.strip().split("\t")
    alts = [ref_vcf] + alt_vcf.split(",")
    alts_vcf = [alts[int(i)] if i.isdigit() else "." for i in re.split(r"[|/]", gt)]
    return {
        "chromRef": chrom_mapping[chrom],
        "posVcf": int(pos_vcf),
        "refVcf": ref_vcf,
        "altsVcf": alts_vcf,
        "zygosity": gt,
    }


def create_diplotype(current_org, current_gene):
    return {
        "org": current_org,
        "gene": current_gene,
        "drug": "",
        "alleles": [],
        "phenotypes": [],
        "variants": [],
        "mapping": [],
    }


def create_variant(current_org):
    return {
        "org": current_org,
        "chr": "",
        "pos": "",
        "rsid": "",
        "call": "",
        "alleles": [],
        "mapping": "",
    }


def yield_genes(pharmcat_output_json, source_vcf):
    """
    Parse PharmCAT output JSON and yield gene information with diplotypes and variants.

    Args:
        pharmcat_output_json (str): Path to the PharmCAT output JSON file
        source_vcf (str): Path to the source VCF file

    Yields:
        tuple: (diplotypes, diplotypeIds, variants) for each gene
    """
    input_vcf_s3_uri = f"s3://{DPORTAL_BUCKET}/{source_vcf}"
    chrom_mapping = get_chromosome_mapping(input_vcf_s3_uri)
    with open(pharmcat_output_json, "rb") as f:
        parser = ijson.parse(f)

        GENE_ORGS = {entry["gene"] for entry in ORGANISATIONS}
        current_org = None
        current_gene = None
        in_diplotype_array = False
        in_variant_array = False

        for prefix, event, value in parser:
            # Filter by organisation
            if prefix == "genes" and event == "map_key":
                current_org = value
            if current_org not in GENE_ORGS:
                continue

            # Filter by gene and reset the list of diplotypes for each new gene
            if prefix == f"genes.{current_org}" and event == "map_key":
                current_gene = value
                diplotypes = []
                diplotype_ids = []
                variants = []
            if current_gene not in GENES:
                continue

            # Check whether processing diplotypes
            diplotype_array_prefix = (
                f"genes.{current_org}.{current_gene}.sourceDiplotypes"
            )
            if is_entering_array(
                in_diplotype_array, prefix, event, diplotype_array_prefix
            ):
                in_diplotype_array = True

            # Diplotype preocessing
            if in_diplotype_array:
                # Reset diplotype object at new occurence
                diplotype_prefix = f"{diplotype_array_prefix}.item"
                if is_entering_map(prefix, event, diplotype_prefix):
                    diplotype = create_diplotype(current_org, current_gene)

                for allele in ["allele1", "allele2"]:
                    if (
                        prefix == f"{diplotype_prefix}.{allele}.name"
                        and event == "string"
                    ):
                        diplotype["alleles"].append(value)

                if (
                    prefix == f"{diplotype_prefix}.phenotypes.item"
                    and event == "string"
                ):
                    diplotype["phenotypes"].append(value)

                if is_exiting_map(prefix, event, diplotype_prefix):
                    diplotypes.append(diplotype)
                    # Create an ID to map between diplotypes and drugs
                    diplotype_b64_id = create_b64_id(
                        diplotype["org"], diplotype["gene"], diplotype["alleles"]
                    )
                    diplotype_ids.append(diplotype_b64_id)

                if is_exiting_array(prefix, event, diplotype_array_prefix):
                    in_diplotype_array = False

            variant_array_prefix = f"genes.{current_org}.{current_gene}.variants"
            if is_entering_array(in_variant_array, prefix, event, variant_array_prefix):
                in_variant_array = True

            if in_variant_array:
                variant_prefix = f"{variant_array_prefix}.item"
                if is_entering_map(prefix, event, variant_prefix):
                    variant = create_variant(current_org)

                # Update generically structured properties of variants
                for property, key in [
                    ("chromosome", "chr"),
                    ("position", "pos"),
                    ("dbSnpId", "rsid"),
                    ("call", "call"),
                ]:
                    if prefix == f"{variant_prefix}.{property}":
                        variant[key] = value

                # Update the list of alleles associated with a variant
                if prefix == f"{variant_prefix}.alleles.item":
                    variant["alleles"].append(value)

                if (
                    prefix == variant_prefix
                    and event == "end_map"
                    and variant["call"] is not None
                ):
                    # Add zygosity and pos/ref/alt using the source VCF
                    zygosity = query_variant_zygosity(
                        chrom_mapping,
                        input_vcf_s3_uri,
                        variant["chr"],
                        variant["pos"],
                    )
                    if not zygosity:
                        continue
                    variant.update(zygosity)

                    # Create an ID to uniquely identify variants - eliminiates duplicate variants
                    variant_b64_id = create_b64_id(
                        variant["org"],
                        variant["rsid"],
                        variant["call"],
                        variant["zygosity"],
                    )
                    variant["mapping"] = variant_b64_id

                    variants.append(variant)

                    # Store the variant's rsid and mapping ID to associated diplotypes
                    for diplotype in diplotypes:
                        if set(diplotype["alleles"]) & set(variant["alleles"]):
                            diplotype["variants"].append(variant["rsid"])
                            diplotype["mapping"].append(variant["mapping"])

                # Yield the diplotype and associated variants at the end of the chunk
                if is_exiting_array(prefix, event, variant_array_prefix):
                    yield (diplotypes, diplotype_ids, variants)
                    in_variant_array = False

            else:
                continue
