data "aws_caller_identity" "this" {}

locals {
  python_libraries_layer = module.python_libraries_layer.lambda_layer_arn
  python_modules_layer   = module.python_modules_layer.lambda_layer_arn
  binaries_layer         = "${aws_lambda_layer_version.binaries_layer.layer_arn}:${aws_lambda_layer_version.binaries_layer.version}"
  result_duration        = 86400
}

module "pipeline_pharmcat" {
  source                             = "./pipeline_pharmcat"
  region                             = var.region
  data-portal-bucket-name            = var.data-portal-bucket-name
  data-portal-bucket-arn             = var.data-portal-bucket-arn
  pgxflow-backend-bucket-name        = aws_s3_bucket.pgxflow-bucket.bucket
  pgxflow-backend-bucket-arn         = aws_s3_bucket.pgxflow-bucket.arn
  pgxflow-reference-bucket-name      = aws_s3_bucket.pgxflow-references.bucket
  pgxflow-reference-bucket-arn       = aws_s3_bucket.pgxflow-references.arn
  cognito-user-pool-arn              = var.cognito-user-pool-arn
  cognito-user-pool-id               = var.cognito-user-pool-id
  hub_name                           = var.hub_name
  pharmcat_configuration             = var.pharmcat_configuration
  dynamo-project-users-table         = var.dynamo-project-users-table
  dynamo-project-users-table-arn     = var.dynamo-project-users-table-arn
  dynamo-clinic-jobs-table           = var.dynamo-clinic-jobs-table
  dynamo-clinic-jobs-table-arn       = var.dynamo-clinic-jobs-table-arn
  dynamo-references-table            = aws_dynamodb_table.pgxflow_references.name
  dynamo-references-table-arn        = aws_dynamodb_table.pgxflow_references.arn
  send-job-email-lambda-function-arn = module.lambda-sendJobEmail.lambda_function_arn
  ec2-references-instance-role-arn   = aws_iam_role.ec2_references_instance_role.arn
  ec2-references-instance-profile    = aws_iam_instance_profile.ec2_references_instance_profile.name
  python_libraries_layer             = local.python_libraries_layer
  python_modules_layer               = local.python_modules_layer
  binaries_layer                     = local.binaries_layer

  common-tags = var.common-tags
}

module "pipeline_lookup" {
  source                             = "./pipeline_lookup"
  region                             = var.region
  data-portal-bucket-name            = var.data-portal-bucket-name
  data-portal-bucket-arn             = var.data-portal-bucket-arn
  pgxflow-backend-bucket-name        = aws_s3_bucket.pgxflow-bucket.bucket
  pgxflow-backend-bucket-arn         = aws_s3_bucket.pgxflow-bucket.arn
  pgxflow-reference-bucket-name      = aws_s3_bucket.pgxflow-references.bucket
  pgxflow-reference-bucket-arn       = aws_s3_bucket.pgxflow-references.arn
  cognito-user-pool-arn              = var.cognito-user-pool-arn
  cognito-user-pool-id               = var.cognito-user-pool-id
  hub_name                           = var.hub_name
  lookup_configuration               = var.lookup_configuration
  dynamo-project-users-table         = var.dynamo-project-users-table
  dynamo-project-users-table-arn     = var.dynamo-project-users-table-arn
  dynamo-clinic-jobs-table           = var.dynamo-clinic-jobs-table
  dynamo-clinic-jobs-table-arn       = var.dynamo-clinic-jobs-table-arn
  dynamo-references-table            = aws_dynamodb_table.pgxflow_references.name
  dynamo-references-table-arn        = aws_dynamodb_table.pgxflow_references.arn
  send-job-email-lambda-function-arn = module.lambda-sendJobEmail.lambda_function_arn
  ec2-references-instance-role-arn   = aws_iam_role.ec2_references_instance_role.arn
  ec2-references-instance-profile    = aws_iam_instance_profile.ec2_references_instance_profile.name
  python_libraries_layer             = local.python_libraries_layer
  python_modules_layer               = local.python_modules_layer
  binaries_layer                     = local.binaries_layer

  common-tags = var.common-tags
}

#
# initPgxflow Lambda Function
#
module "lambda-initFlow" {
  source = "terraform-aws-modules/lambda/aws"

  function_name       = "pgxflow-backend-initFlow"
  description         = "Initializes a PGxFlow job"
  handler             = "lambda_function.lambda_handler"
  runtime             = "python3.12"
  memory_size         = 1792
  timeout             = 28
  attach_policy_jsons = true
  policy_jsons = [
    data.aws_iam_policy_document.lambda-initFlow.json
  ]
  number_of_policy_jsons = 1
  source_path            = "${path.module}/lambda/initFlow"

  tags = var.common-tags

  environment_variables = {
    REFERENCE_BUCKET                    = aws_s3_bucket.pgxflow-references.bucket
    PHARMCAT_PREPROCESSOR_SNS_TOPIC_ARN = module.pipeline_pharmcat.preprocessor_sns_topic_arn
    LOOKUP_DBSNP_SNS_TOPIC_ARN          = module.pipeline_lookup.dbsnp_sns_topic_arn
    HUB_NAME                            = var.hub_name
    PHARMCAT_ORGANISATIONS              = jsonencode(var.pharmcat_configuration.ORGANISATIONS)
    PHARMCAT_GENES                      = join(",", var.pharmcat_configuration.GENES)
    PHARMCAT_DRUGS                      = join(",", var.pharmcat_configuration.DRUGS)
    LOOKUP_REFERENCE                    = var.lookup_configuration["assoc_matrix_filename"]
    LOOKUP_CHR_HEADER                   = var.lookup_configuration["chr_header"]
    LOOKUP_START_HEADER                 = var.lookup_configuration["start_header"]
    LOOKUP_END_HEADER                   = var.lookup_configuration["end_header"]
    DYNAMO_PROJECT_USERS_TABLE          = var.dynamo-project-users-table
    DYNAMO_CLINIC_JOBS_TABLE            = var.dynamo-clinic-jobs-table
    DYNAMO_PGXFLOW_REFERENCES_TABLE     = aws_dynamodb_table.pgxflow_references.name
    SEND_JOB_EMAIL_ARN                  = module.lambda-sendJobEmail.lambda_function_arn
    HTS_S3_HOST                         = "s3.${var.region}.amazonaws.com"
  }

  layers = [
    local.python_modules_layer,
    local.binaries_layer,
  ]
}

#
# getResultsURL Lambda Function
#
module "lambda-getResultsURL" {
  source = "terraform-aws-modules/lambda/aws"

  function_name       = "pgxflow-backend-getResultsURL"
  description         = "Returns the presigned results URL for PGxFlow results"
  handler             = "lambda_function.lambda_handler"
  runtime             = "python3.12"
  memory_size         = 1792
  timeout             = 28
  attach_policy_jsons = true
  policy_jsons = [
    data.aws_iam_policy_document.lambda-getResultsURL.json
  ]
  number_of_policy_jsons = 1
  source_path            = "${path.module}/lambda/getResultsURL"

  tags = var.common-tags

  environment_variables = {
    DPORTAL_BUCKET             = var.data-portal-bucket-name
    DYNAMO_PROJECT_USERS_TABLE = var.dynamo-project-users-table
  }

  layers = [
    local.python_modules_layer,
  ]
}
#
# sendJobEmail Lambda Function
#
module "lambda-sendJobEmail" {
  source = "terraform-aws-modules/lambda/aws"

  function_name       = "pgxflow-backend-sendJobEmail"
  description         = "Invokes sendJobEmail to send email to user"
  handler             = "lambda_function.lambda_handler"
  runtime             = "python3.12"
  memory_size         = 1792
  timeout             = 28
  attach_policy_jsons = true
  policy_jsons = [
    data.aws_iam_policy_document.lambda-sendJobEmail.json,
  ]
  number_of_policy_jsons = 1
  source_path            = "${path.module}/lambda/sendJobEmail"

  tags = var.common-tags

  environment_variables = {
    DYNAMO_CLINIC_JOBS_TABLE        = var.dynamo-clinic-jobs-table
    COGNITO_CLINIC_JOB_EMAIL_LAMBDA = var.clinic-job-email-lambda-function-arn
    USER_POOL_ID                    = var.cognito-user-pool-id
  }

  layers = [
    local.python_modules_layer,
  ]
}

#
# qcFigures Lambda Function
#
module "lambda-qcFigures" {
  source = "terraform-aws-modules/lambda/aws"

  function_name          = "pgxflow-backend-qcFigures"
  description            = "Running vcfstats for generating graphic."
  create_package         = false
  image_uri              = module.docker_image_qcFigures_lambda.image_uri
  package_type           = "Image"
  memory_size            = 3000
  timeout                = 900
  ephemeral_storage_size = 10240
  attach_policy_jsons    = true
  policy_jsons = [
    data.aws_iam_policy_document.lambda-qcFigures.json
  ]
  number_of_policy_jsons = 1
  source_path            = "${path.module}/lambda/qcFigures"
  tags                   = var.common-tags
  environment_variables = {
    FILE_LOCATION   = var.data-portal-bucket-name
    USER_POOL_ID    = var.cognito-user-pool-id
    HTS_S3_HOST     = "s3.${var.region}.amazonaws.com"
    RESULT_DURATION = local.result_duration
  }
}


#
# qcNotes Lambda Function
#
module "lambda-qcNotes" {
  source = "terraform-aws-modules/lambda/aws"

  function_name          = "pgxflow-backend-qcNotes"
  description            = "Running qcNotes API."
  runtime                = "python3.12"
  handler                = "lambda_function.lambda_handler"
  memory_size            = 128
  timeout                = 60
  source_path            = "${path.module}/lambda/qcNotes"
  attach_policy_jsons    = true
  number_of_policy_jsons = 1
  tags                   = var.common-tags

  policy_jsons = [
    data.aws_iam_policy_document.lambda-qcNotes.json
  ]

  environment_variables = {
    FILE_LOCATION = var.data-portal-bucket-name
  }

  layers = [
    local.python_modules_layer,
  ]
}
