import json
import os


from shared.apiutils import bad_request, bundle_response
from shared.dynamodb import check_user_in_project
from shared.utils import LoggingClient

DPORTAL_BUCKET = os.environ["DPORTAL_BUCKET"]
RESULT_SUFFIX = os.environ["RESULT_SUFFIX"]

s3_client = LoggingClient("s3")


def lambda_handler(event, _):
    print(f"Event received: {json.dumps(event)}")

    try:
        sub = event["requestContext"]["authorizer"]["claims"]["sub"]
        request_id = event["queryStringParameters"]["request_id"]
        project_name = event["queryStringParameters"]["project_name"]
        results_path = (
            f"projects/{project_name}/clinical-workflows/{request_id}{RESULT_SUFFIX}"
        )

        check_user_in_project(sub, project_name)

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
                "content": content.decode("utf-8"),
            },
        )

    except ValueError:
        return bad_request("Error parsing request body, Expected JSON")
    except KeyError:
        return bad_request("Invalid parameters.")
    except Exception as e:
        print("Unhandled", e)
        return bad_request("Unhandled exception. Please contact admin with the jobId.")
