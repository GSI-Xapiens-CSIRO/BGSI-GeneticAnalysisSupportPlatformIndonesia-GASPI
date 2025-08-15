import json
import os


from shared.apiutils import bad_request, bundle_response
from shared.dynamodb import check_user_in_project, query_clinic_job
from shared.utils import LoggingClient

HUB_NAME = os.environ["HUB_NAME"]
DPORTAL_BUCKET = os.environ["DPORTAL_BUCKET"]
PIPELINE_SUFFIXES = {
    "pharmcat": "_pharmcat_results.json",
    "lookup": "_lookup_results.jsonl",
}

LOOKUP_CONFIGURATION = json.loads(os.environ.get("LOOKUP_CONFIGURATION", "{}"))
PHARMCAT_CONFIGURATION = json.loads(os.environ.get("PHARMCAT_CONFIGURATION", "{}"))

s3_client = LoggingClient("s3")


def prepare_lookup_config():
    """Prepare lookup configuration for frontend (exclude assoc_matrix_filename)"""
    if not LOOKUP_CONFIGURATION:
        return {}

    # Copy config and remove assoc_matrix_filename
    filtered_config = {
        key: value
        for key, value in LOOKUP_CONFIGURATION.items()
        if key != "assoc_matrix_filename"
    }
    return filtered_config


def lambda_handler(event, _):
    print(f"Event received: {json.dumps(event)}")

    try:
        sub = event["requestContext"]["authorizer"]["claims"]["sub"]
        request_id = event["queryStringParameters"]["request_id"]
        project_name = event["queryStringParameters"]["project_name"]
        pipeline = event["queryStringParameters"].get("pipeline")
        if pipeline not in PIPELINE_SUFFIXES:
            return bad_request("Invalid or missing pipeline.")

        suffix = PIPELINE_SUFFIXES[pipeline]
        results_path = (
            f"projects/{project_name}/clinical-workflows/{request_id}{suffix}"
        )

        check_user_in_project(sub, project_name)

        job = query_clinic_job(request_id)
        missing_to_ref = job.get("missing_to_ref", {}).get("BOOL")
        status = job.get(f"{pipeline}_status", {}).get("S")

        no_results_message = None
        no_results_message_type = None
        content = None
        if status == "pending":
            no_results_message = "The job may still be partially complete."
            no_results_message_type = "Warning"
        elif status == "failed":
            no_results_message = f"Some results are unavailable due to {str(pipeline).capitalize()} pipeline failure."
            no_results_message_type = "Error"
        else:
            response = s3_client.get_object(
                Bucket=DPORTAL_BUCKET,
                Key=results_path,
            )
            content = response["Body"].read()

        return bundle_response(
            200,
            {
                "url": None,
                "pages": {"-": 1},
                "page": 1,
                "content": content.decode("utf-8") if content else "",
                "config": {
                    "lookup": prepare_lookup_config(),  # Filtered config
                    "pharmcat": PHARMCAT_CONFIGURATION,
                },
                "missingToRef": missing_to_ref,
                "noResultsMessage": no_results_message,
                "noResultsMessageType": no_results_message_type,
            },
        )

    except ValueError:
        return bad_request("Error parsing request body, Expected JSON")
    except KeyError:
        return bad_request("Invalid parameters.")
    except Exception as e:
        print("Unhandled", e)
        return bad_request("Unhandled exception. Please contact admin with the jobId.")
