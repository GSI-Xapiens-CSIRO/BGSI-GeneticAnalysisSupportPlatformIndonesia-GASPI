data "aws_caller_identity" "this" {}

locals {
  python_libraries_layer = module.python_libraries_layer.lambda_layer_arn
  python_modules_layer   = module.python_modules_layer.lambda_layer_arn
  binaries_layer         = "${aws_lambda_layer_version.binaries_layer.layer_arn}:${aws_lambda_layer_version.binaries_layer.version}"
  result_duration        = 86400
}

module "pipeline_pharmcat" {
  source                               = "./pipeline_pharmcat"
  region                               = var.region
  data-portal-bucket-name              = var.data-portal-bucket-name
  data-portal-bucket-arn               = var.data-portal-bucket-arn
  pgxflow-backend-bucket-name          = aws_s3_bucket.pgxflow-bucket.bucket
  pgxflow-backend-bucket-arn           = aws_s3_bucket.pgxflow-bucket.arn
  pgxflow-reference-bucket-name        = aws_s3_bucket.pgxflow-references.bucket
  pgxflow-reference-bucket-arn         = aws_s3_bucket.pgxflow-references.arn
  cognito-user-pool-arn                = var.cognito-user-pool-arn
  cognito-user-pool-id                 = var.cognito-user-pool-id
  pgxflow-api-gateway-id               = aws_api_gateway_rest_api.PgxApi.id
  pgxflow-api-gateway-root-resource-id = aws_api_gateway_rest_api.PgxApi.root_resource_id
  pgxflow-api-gateway-execution-arn    = aws_api_gateway_rest_api.PgxApi.execution_arn
  pgxflow-user-pool-authorizer-id      = aws_api_gateway_authorizer.pgxflow_user_pool_authorizer.id
  hub_name                             = var.hub_name
  pharmcat_configuration               = var.pharmcat_configuration
  dynamo-project-users-table           = var.dynamo-project-users-table
  dynamo-project-users-table-arn       = var.dynamo-project-users-table-arn
  dynamo-clinic-jobs-table             = var.dynamo-clinic-jobs-table
  dynamo-clinic-jobs-table-arn         = var.dynamo-clinic-jobs-table-arn
  dynamo-references-table              = aws_dynamodb_table.pgxflow_references.name
  dynamo-references-table-arn          = aws_dynamodb_table.pgxflow_references.arn
  clinic-job-email-lambda-function-arn = var.clinic-job-email-lambda-function-arn
  ec2-references-instance-role-arn     = aws_iam_role.ec2_references_instance_role.arn
  ec2-references-instance-profile      = aws_iam_instance_profile.ec2_references_instance_profile.name
  python_libraries_layer               = local.python_libraries_layer
  python_modules_layer                 = local.python_modules_layer
  binaries_layer                       = local.binaries_layer

  common-tags = var.common-tags
}

module "pipeline_lookup" {
  source                               = "./pipeline_lookup"
  region                               = var.region
  data-portal-bucket-name              = var.data-portal-bucket-name
  data-portal-bucket-arn               = var.data-portal-bucket-arn
  pgxflow-backend-bucket-name          = aws_s3_bucket.pgxflow-bucket.bucket
  pgxflow-backend-bucket-arn           = aws_s3_bucket.pgxflow-bucket.arn
  pgxflow-reference-bucket-name        = aws_s3_bucket.pgxflow-references.bucket
  pgxflow-reference-bucket-arn         = aws_s3_bucket.pgxflow-references.arn
  cognito-user-pool-arn                = var.cognito-user-pool-arn
  cognito-user-pool-id                 = var.cognito-user-pool-id
  pgxflow-api-gateway-id               = aws_api_gateway_rest_api.PgxApi.id
  pgxflow-api-gateway-root-resource-id = aws_api_gateway_rest_api.PgxApi.root_resource_id
  pgxflow-api-gateway-execution-arn    = aws_api_gateway_rest_api.PgxApi.execution_arn
  pgxflow-user-pool-authorizer-id      = aws_api_gateway_authorizer.pgxflow_user_pool_authorizer.id
  hub_name                             = var.hub_name
  lookup_configuration                 = var.lookup_configuration
  dynamo-project-users-table           = var.dynamo-project-users-table
  dynamo-project-users-table-arn       = var.dynamo-project-users-table-arn
  dynamo-clinic-jobs-table             = var.dynamo-clinic-jobs-table
  dynamo-clinic-jobs-table-arn         = var.dynamo-clinic-jobs-table-arn
  dynamo-references-table              = aws_dynamodb_table.pgxflow_references.name
  dynamo-references-table-arn          = aws_dynamodb_table.pgxflow_references.arn
  clinic-job-email-lambda-function-arn = var.clinic-job-email-lambda-function-arn
  ec2-references-instance-role-arn     = aws_iam_role.ec2_references_instance_role.arn
  ec2-references-instance-profile      = aws_iam_instance_profile.ec2_references_instance_profile.name
  python_libraries_layer               = local.python_libraries_layer
  python_modules_layer                 = local.python_modules_layer
  binaries_layer                       = local.binaries_layer

  common-tags = var.common-tags
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
    FILE_LOCATION   = var.data-portal-bucket-name
  }

  layers = [
    local.python_modules_layer,
  ]
}
