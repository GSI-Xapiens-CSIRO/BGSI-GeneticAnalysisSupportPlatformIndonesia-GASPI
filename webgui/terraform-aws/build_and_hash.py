import os
import hashlib
import sys
import subprocess
import json


ENVIRONMENT = """export const environment = {{
  production: {production},
  config_max_variant_search_base_range: {base_range},
  auth: {{
    region: '{region}',
    userPoolId: '{user_pool_id}',
    userPoolWebClientId: '{user_pool_web_client_id}',
    identityPoolId: '{identity_pool_id}',
    authenticationFlowType: 'USER_PASSWORD_AUTH',
  }},
  storage: {{
    dataPortalBucket: '{data_portal_bucket}',
  }},
  api_endpoint_sbeacon: {{
    name: 'sbeacon',
    endpoint: '{api_endpoint_sbeacon}',
    region: '{region}',
  }},
  api_endpoint_clinic: {{
    name: '{clinic_mode}',
    endpoint: '{api_endpoint_clinic}',
    region: '{region}',
  }},
  clinic_mode: '{clinic_mode}',
  hub_name: '{hub_name}',
}};"""


# docs - https://stackoverflow.com/questions/36204248/creating-unique-hash-for-directory-in-python
def sha1_of_file(filepath: str):
    sha = hashlib.sha1()
    sha.update(filepath.encode())

    with open(filepath, "rb") as f:
        for block in iter(lambda: f.read(2**10), b""):
            sha.update(block)
        return sha.hexdigest()


def hash_dir(dir_path: str):
    sha = hashlib.sha1()

    for path, _, files in os.walk(dir_path):
        # we sort to guarantee that files will always go in the same order
        for file in sorted(files):
            file_hash = sha1_of_file(os.path.join(path, file))
            sha.update(file_hash.encode())

    return sha.hexdigest()


def npm_install(cmd: str, dir: str):
    out = subprocess.Popen(
        cmd.split(),
        cwd=dir,
        encoding="ascii",
        stdout=sys.stderr,
    )
    code = out.wait()
    assert code == 0, "ERROR: npm install returned non-zero exit"


def build(cmd: str, dir: str):
    out = subprocess.Popen(
        cmd.split(),
        cwd=dir,
        stdout=sys.stderr,
    )
    code = out.wait()
    assert code == 0, "ERROR: ng build returned non-zero exit" + cmd + "\n" + dir


def setup_env(
    base_range: str,
    region: str,
    user_pool_id: str,
    identity_pool_id: str,
    user_pool_web_client_id: str,
    data_portal_bucket: str,
    api_endpoint_sbeacon: str,
    api_endpoint_clinic: str,
    dir: str,
    hub_name: str,
    clinic_mode: str,
):
    with open(
        os.path.join(dir, "src/environments/environment.development.ts"), "w"
    ) as f:
        f.write(
            ENVIRONMENT.format(
                production="false",
                base_range=base_range,
                region=region,
                user_pool_id=user_pool_id,
                identity_pool_id=identity_pool_id,
                data_portal_bucket=data_portal_bucket,
                user_pool_web_client_id=user_pool_web_client_id,
                api_endpoint_sbeacon=api_endpoint_sbeacon,
                api_endpoint_clinic=api_endpoint_clinic,
                hub_name=hub_name,
                clinic_mode=clinic_mode,
            )
        )
    with open(os.path.join(dir, "src/environments/environment.ts"), "w") as f:
        f.write(
            ENVIRONMENT.format(
                production="true",
                base_range=base_range,
                region=region,
                user_pool_id=user_pool_id,
                identity_pool_id=identity_pool_id,
                data_portal_bucket=data_portal_bucket,
                user_pool_web_client_id=user_pool_web_client_id,
                api_endpoint_sbeacon=api_endpoint_sbeacon,
                api_endpoint_clinic=api_endpoint_clinic,
                hub_name=hub_name,
                clinic_mode=clinic_mode,
            )
        )


if __name__ == "__main__":
    args = json.loads(sys.stdin.read())
    build_cmd = args["build_command"]
    install_cmd = args["install_command"]
    webapp_dir = args["webapp_dir"]
    build_destiation = args["build_destiation"]
    base_range = args["base_range"]
    region = args["region"]
    user_pool_id = args["user_pool_id"]
    identity_pool_id = args["identity_pool_id"]
    user_pool_web_client_id = args["user_pool_web_client_id"]
    api_endpoint_sbeacon = args["api_endpoint_sbeacon"]
    api_endpoint_clinic = args["api_endpoint_clinic"]
    data_portal_bucket = args["data_portal_bucket"]
    hub_name = args["hub_name"]
    clinic_mode = args["clinic_mode"]

    setup_env(
        base_range,
        region,
        user_pool_id,
        identity_pool_id,
        user_pool_web_client_id,
        data_portal_bucket,
        api_endpoint_sbeacon,
        api_endpoint_clinic,
        webapp_dir,
        hub_name,
        clinic_mode,
    )
    npm_install(install_cmd, webapp_dir)
    build(build_cmd, webapp_dir)
    print(f""" {{ "hash": "{hash_dir(build_destiation)}" }} """)
