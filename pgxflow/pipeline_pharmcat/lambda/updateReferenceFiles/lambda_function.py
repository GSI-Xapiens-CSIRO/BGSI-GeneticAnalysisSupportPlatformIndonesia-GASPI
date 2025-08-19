from version_checks import check_pharmcat_version
from pharmcat import update_pharmcat


def lambda_handler(event, context):
    if event.get("source") == "aws.events":
        pharmcat_outdated, pharmcat_version = check_pharmcat_version()

        if pharmcat_outdated:
            update_pharmcat(pharmcat_version)
