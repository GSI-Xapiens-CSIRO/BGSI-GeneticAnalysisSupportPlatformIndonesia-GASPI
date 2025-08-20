import os

keys = {
    # aws
    "AWS_DEFAULT_REGION": "ap-southeast-2",
    # cognito
    "COGNITO_USER_POOL_ID": "COGNITO_USER_POOL_ID",
    "COGNITO_ADMIN_GROUP_NAME": "administrators",
    "COGNITO_REGISTRATION_EMAIL_LAMBDA": "COGNITO_REGISTRATION_EMAIL_LAMBDA",
    # s3
    "DPORTAL_BUCKET": "data-portal-bucket",
    "PGXFLOW_BUCKET": "pgxflow-bucket",
    "REFERENCE_BUCKET": "reference-bucket",
    "LOOKUP_REFERENCE": "test_association_matrix.csv",
    # lambda
    "PGXFLOW_GNOMAD_LAMBDA": "PGXFLOW_GNOMAD_LAMBDA",
    "LOCAL_DIR": "test_lookup",
}

# Set environment variables for testing
for key, value in keys.items():
    os.environ[key] = value
