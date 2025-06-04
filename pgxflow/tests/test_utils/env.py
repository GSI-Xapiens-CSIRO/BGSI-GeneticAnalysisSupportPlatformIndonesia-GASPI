import os

keys = {
    # aws
    "AWS_DEFAULT_REGION": "ap-southeast-2",
    # cognito
    "COGNITO_USER_POOL_ID": "COGNITO_USER_POOL_ID",
    "COGNITO_ADMIN_GROUP_NAME": "administrators",
    "COGNITO_REGISTRATION_EMAIL_LAMBDA": "COGNITO_REGISTRATION_EMAIL_LAMBDA",
    # s3
    "PGXFLOW_BUCKET": "pgxflow-bucket",
    # lambda
    "PGXFLOW_PHARMCAT_POSTPROCESSOR_LAMBDA": "PGXFLOW_PHARMCAT_POSTPROCESSOR_LAMBDA",
}

# Set environment variables for testing
for key, value in keys.items():
    os.environ[key] = value
