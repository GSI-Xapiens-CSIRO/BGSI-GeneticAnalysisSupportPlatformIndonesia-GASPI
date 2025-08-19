import json
import os

from shared.utils import LoggingClient

EC2_IAM_INSTANCE_PROFILE = os.environ["EC2_IAM_INSTANCE_PROFILE"]
REFERENCE_LOCATION = os.environ["REFERENCE_LOCATION"]
AWS_REGION = os.environ["AWS_REGION"]
FUNCTION_NAME = os.environ["AWS_LAMBDA_FUNCTION_NAME"]
DYNAMO_PGXFLOW_REFERENCES_TABLE = os.environ["DYNAMO_PGXFLOW_REFERENCES_TABLE"]

REGION_AMI_MAP = {
    "ap-southeast-2": "ami-0822a7a2356687b0f",
    "ap-southeast-3": "ami-0f6fd501d5bfeb733",
}


def update_pharmcat(pharmcat_version):
    ec2_client = LoggingClient("ec2")
    ami = REGION_AMI_MAP[AWS_REGION]
    device_name = ec2_client.describe_images(ImageIds=[ami])["Images"][0][
        "RootDeviceName"
    ]

    pharmcat_version_number = pharmcat_version.lstrip("v")
    with open("pharmcat.sh") as user_data_file:
        ec2_startup = (
            user_data_file.read()
            .replace("__REGION__", AWS_REGION)
            .replace("__TABLE__", DYNAMO_PGXFLOW_REFERENCES_TABLE)
            .replace("__PHARMCAT_ID__", "pharmcat_version")
            .replace("__PHARMCAT_VERSION__", pharmcat_version)
            .replace("__PHARMCAT_VERSION_NO__", pharmcat_version_number)
            .replace("__PHARMGKB_ID__", "pharmgkb_version")
            .replace("__REFERENCE_LOCATION__", REFERENCE_LOCATION)
        )
    try:
        response = ec2_client.run_instances(
            ImageId=REGION_AMI_MAP[AWS_REGION],
            InstanceType="t3.medium",
            MinCount=1,
            MaxCount=1,
            BlockDeviceMappings=[
                {
                    "DeviceName": device_name,
                    "Ebs": {
                        "DeleteOnTermination": True,
                        "VolumeSize": 10,
                        "VolumeType": "gp3",
                        "Encrypted": True,
                    },
                },
            ],
            UserData=ec2_startup,
            InstanceInitiatedShutdownBehavior="terminate",
            TagSpecifications=[
                {
                    "ResourceType": "instance",
                    "Tags": [{"Key": "Name", "Value": f"{FUNCTION_NAME}"}],
                }
            ],
            IamInstanceProfile={"Name": EC2_IAM_INSTANCE_PROFILE},
        )
        instance_id = response["Instances"][0]["InstanceId"]
    except Exception as e:
        print(f"Error launching EC2 instance: {str(e)}")
        return {"statusCode": 500, "body": json.dump("Error launching EC2 instance")}
    print(
        f"Launched EC2 instance {instance_id} to retrieve pharmcat references and software versions"
    )
    return {
        "StatusCode": 200,
        "body": json.dumps(f"Launched EC2 instance {instance_id}"),
    }
