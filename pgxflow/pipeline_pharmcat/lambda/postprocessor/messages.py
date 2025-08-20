import json
import os

import ijson

from utils import (
    is_entering_array,
    is_exiting_array,
    is_entering_map,
    is_exiting_map,
)

ORGANISATIONS = json.loads(os.environ["ORGANISATIONS"])
GENES = os.environ["GENES"].strip().split(",")


def create_message(current_org, current_gene):
    return {
        "org": current_org,
        "gene": current_gene,
        "name": "",
        "message": "",
    }


def yield_messages(pharmcat_output_json):
    """
    Parse PharmCAT output JSON and yield messages.

    Args:
        pharmcat_output_json (str): Path to the PharmCAT output JSON file

    Yields:
        messages (list[dict]): Messages from the PharmCAT output
    """
    with open(pharmcat_output_json, "rb") as f:
        parser = ijson.parse(f)

        GENE_ORGS = {entry["gene"] for entry in ORGANISATIONS}
        current_org = None
        current_gene = None
        in_messages_array = False

        for prefix, event, value in parser:
            if prefix == "genes" and event == "map_key":
                current_org = value
            if current_org not in GENE_ORGS:
                continue

            if prefix == f"genes.{current_org}" and event == "map_key":
                current_gene = value
                messages = []
            if current_gene not in GENES:
                continue

            messages_array_prefix = f"genes.{current_org}.{current_gene}.messages"
            if is_entering_array(
                in_messages_array, prefix, event, messages_array_prefix
            ):
                in_messages_array = True

            # Message processing
            if in_messages_array:
                # Reset message object at new occurence
                message_prefix = f"{messages_array_prefix}.item"
                if is_entering_map(prefix, event, message_prefix):
                    message = create_message(current_org, current_gene)

                if prefix == f"{message_prefix}.rule_name" and event == "string":
                    message["name"] = value

                if prefix == f"{message_prefix}.message" and event == "string":
                    message["message"] = value

                if is_exiting_map(prefix, event, message_prefix):
                    messages.append(message)

                if is_exiting_array(prefix, event, messages_array_prefix):
                    yield messages
                    in_messages_array = False
