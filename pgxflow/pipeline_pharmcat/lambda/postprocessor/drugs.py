from copy import deepcopy
import json
import os
from html.parser import HTMLParser

import ijson

from utils import is_entering_array, is_exiting_array, is_entering_map, is_exiting_map


DRUGS = os.environ["DRUGS"].strip().split(",")
GENES = os.environ["GENES"].strip().split(",")
ORGANISATIONS = json.loads(os.environ["ORGANISATIONS"])


class HTMLStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.reset()
        self.fed = []

    def handle_data(self, d):
        self.fed.append(d)

    def get_data(self):
        return "".join(self.fed)


def strip_html(string):
    stripper = HTMLStripper()
    stripper.feed(string)
    return stripper.get_data()


def create_annotation_objects(current_organisation, current_drug, pmids):
    return {
        "org": current_organisation,
        "drug": current_drug,
        "pmids": pmids,
        "gene": "",
        "alleles": [],
        "implications": [],
        "recommendation": "",
        "dosingInformation": None,
        "alternateDrugAvailable": None,
        "otherPrescribingGuidance": None,
    }


def yield_drugs(pharmcat_output_json):
    with open(pharmcat_output_json, "rb") as f:
        parser = ijson.parse(f)

        DRUG_ORGS = {entry["drug"] for entry in ORGANISATIONS}
        current_org = None
        current_drug = None
        in_citation_array = False
        in_annotation_array = False
        in_annotation_diplotype_array = False

        for prefix, event, value in parser:
            # Filter by organisation
            if prefix == "drugs" and event == "map_key":
                current_org = value
            if current_org not in DRUG_ORGS:
                continue

            # Filter by drug and accumulated drug info for each new drug
            if prefix == f"drugs.{current_org}" and event == "map_key":
                current_drug = value
                # Reset annotations for each new drug
                annotation_chunk = []
            if current_drug not in DRUGS:
                continue

            # Check whether processing citations
            citation_array_prefix = f"drugs.{current_org}.{current_drug}.citations"
            if is_entering_array(
                in_citation_array, prefix, event, citation_array_prefix
            ):
                # Reset pmids
                pmids = []
                in_citation_array = True

            # Citation processing
            if in_citation_array:
                citation_prefix = f"{citation_array_prefix}.item"

                # Store pmids in array to be added to annotation
                if prefix == f"{citation_prefix}.pmid" and event == "string":
                    pmids.append(value)

                if is_exiting_array(prefix, event, citation_array_prefix):
                    in_citation_array = False

            # Check whether processing drug annotations
            annotation_array_prefix = (
                f"drugs.{current_org}.{current_drug}.guidelines.item.annotations"
            )
            if is_entering_array(
                in_annotation_array, prefix, event, annotation_array_prefix
            ):
                annotations = []
                in_annotation_array = True

            # Annotation processing
            if in_annotation_array:
                # Reset drug annotation object at new occurrence
                annotation_prefix = f"{annotation_array_prefix}.item"
                if is_entering_map(prefix, event, annotation_prefix):
                    base_annotation = create_annotation_objects(
                        current_org, current_drug, pmids
                    )

                # Add drug implications
                if (
                    prefix == f"{annotation_prefix}.implications.item"
                    and event == "string"
                ):
                    base_annotation["implications"].append(strip_html(value))

                # Add recommendations
                if (
                    prefix == f"{annotation_prefix}.drugRecommendation"
                    and event == "string"
                ):
                    base_annotation["recommendation"] = strip_html(value)

                annotation_diplotype_array_prefix = (
                    f"{annotation_prefix}.genotypes.item.diplotypes"
                )
                if is_entering_array(
                    in_annotation_diplotype_array,
                    prefix,
                    event,
                    annotation_diplotype_array_prefix,
                ):
                    in_annotation_diplotype_array = True

                # Retrieving alleles - used to link drugs back to condensed diplotypes
                if in_annotation_diplotype_array:
                    annotation_diplotype_prefix = (
                        f"{annotation_diplotype_array_prefix}.item"
                    )
                    
                    if is_entering_map(prefix, event, annotation_diplotype_prefix):
                        annotation = deepcopy(base_annotation)

                    if (
                        prefix == f"{annotation_diplotype_prefix}.gene"
                        and event == "string"
                    ):
                        annotation["gene"] = value

                    for allele in ["allele1", "allele2"]:
                        if (
                            prefix == f"{annotation_diplotype_prefix}.{allele}.name"
                            and event == "string"
                        ):
                            annotation["alleles"].append(value)
                            
                    if is_exiting_map(prefix, event, annotation_diplotype_prefix) and annotation.get("gene") in GENES:
                        annotations.append(annotation)

                    if (
                        prefix == annotation_diplotype_array_prefix
                        and event == "end_array"
                    ):
                        in_annotation_diplotype_array = False

                # Update generically structured properties of drug annotations
                for key in [
                    ("dosingInformation"),
                    ("alternateDrugAvailable"),
                    ("otherPrescribingGuidance"),
                ]:
                    if prefix == f"{annotation_prefix}.{key}":
                        for annotation in annotations:
                            annotation[key] = value

                if is_exiting_map(prefix, event, annotation_prefix):
                    annotation_chunk.extend(annotations)

                if is_exiting_array(prefix, event, annotation_array_prefix):
                    yield annotations
                    in_annotation_array = False
