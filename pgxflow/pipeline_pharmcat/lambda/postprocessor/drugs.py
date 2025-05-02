import json
import os
from html.parser import HTMLParser

import ijson

from utils import is_entering_array, is_exiting_array, is_entering_map, is_exiting_map


DRUGS = os.environ["DRUGS"].strip().split(",")
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


def create_annotation_objects(current_organisation, current_drug):
    return {
        "org": current_organisation,
        "drug": current_drug,
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
                annotations = []
            if current_drug not in DRUGS:
                continue

            # Check whether processing drug annotations
            annotation_array_prefix = (
                f"drugs.{current_org}.{current_drug}.guidelines.item.annotations"
            )
            if is_entering_array(
                in_annotation_array, prefix, event, annotation_array_prefix
            ):
                in_annotation_array = True

            # Annotation processing
            if in_annotation_array:
                # Reset drug annotation object at new occurrence
                annotation_prefix = f"{annotation_array_prefix}.item"
                if is_entering_map(prefix, event, annotation_prefix):
                    annotation = create_annotation_objects(current_org, current_drug)

                # Add drug implications
                if (
                    prefix == f"{annotation_prefix}.implications.item"
                    and event == "string"
                ):
                    annotation["implications"].append(strip_html(value))

                # Add recommendations
                if (
                    prefix == f"{annotation_prefix}.drugRecommendation"
                    and event == "string"
                ):
                    annotation["recommendation"] = strip_html(value)

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

                # Retrieving alleles. Link drugs back to condensed diplotypes
                if in_annotation_diplotype_array:
                    annotation_diplotype_prefix = (
                        f"{annotation_diplotype_array_prefix}.item"
                    )

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
                        annotation[key] = value

                if is_exiting_map(prefix, event, annotation_prefix):
                    annotations.append(annotation)

                if is_exiting_array(prefix, event, annotation_array_prefix):
                    yield annotations
                    in_annotation_array = False
