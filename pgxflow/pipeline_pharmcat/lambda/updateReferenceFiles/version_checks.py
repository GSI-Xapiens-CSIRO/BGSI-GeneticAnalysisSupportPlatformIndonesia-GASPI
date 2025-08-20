import json

from shared.utils import fetch_remote_content, query_references_table

PHARMCAT_GITHUB_URL = "https://api.github.com/repos/PharmGKB/PharmCAT/releases/latest"


def check_pharmcat_version():
    id = "pharmcat_version"
    local_pharmcat_version = query_references_table(id)
    latest_pharmcat_version = json.loads(fetch_remote_content(PHARMCAT_GITHUB_URL)).get(
        "tag_name", "unknown"
    )
    return latest_pharmcat_version != local_pharmcat_version, latest_pharmcat_version
