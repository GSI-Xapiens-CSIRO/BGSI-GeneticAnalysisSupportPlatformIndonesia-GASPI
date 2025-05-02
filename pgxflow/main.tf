data "aws_caller_identity" "this" {}

locals {
  python_libraries_layer = module.python_libraries_layer.lambda_layer_arn
  python_modules_layer   = module.python_modules_layer.lambda_layer_arn
  binaries_layer         = "${aws_lambda_layer_version.binaries_layer.layer_arn}:${aws_lambda_layer_version.binaries_layer.version}"
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
  pgxflow-api-gateway-id               = aws_api_gateway_rest_api.PgxApi.id
  pgxflow-api-gateway-root-resource-id = aws_api_gateway_rest_api.PgxApi.root_resource_id
  pgxflow-api-gateway-execution-arn    = aws_api_gateway_rest_api.PgxApi.execution_arn
  pgxflow-user-pool-authorizer-id      = aws_api_gateway_authorizer.pgxflow_user_pool_authorizer.id
  hub_name                             = var.hub_name
  pgxflow_configuration                = var.pgxflow_configuration
  dynamo-project-users-table           = var.dynamo-project-users-table
  dynamo-project-users-table-arn       = var.dynamo-project-users-table-arn
  dynamo-clinic-jobs-table             = var.dynamo-clinic-jobs-table
  dynamo-clinic-jobs-table-arn         = var.dynamo-clinic-jobs-table-arn
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
  pgxflow-api-gateway-id               = aws_api_gateway_rest_api.PgxApi.id
  pgxflow-api-gateway-root-resource-id = aws_api_gateway_rest_api.PgxApi.root_resource_id
  pgxflow-api-gateway-execution-arn    = aws_api_gateway_rest_api.PgxApi.execution_arn
  pgxflow-user-pool-authorizer-id      = aws_api_gateway_authorizer.pgxflow_user_pool_authorizer.id
  hub_name                             = var.hub_name
  dynamo-project-users-table           = var.dynamo-project-users-table
  dynamo-project-users-table-arn       = var.dynamo-project-users-table-arn
  dynamo-clinic-jobs-table             = var.dynamo-clinic-jobs-table
  dynamo-clinic-jobs-table-arn         = var.dynamo-clinic-jobs-table-arn
  python_libraries_layer               = local.python_libraries_layer
  python_modules_layer                 = local.python_modules_layer
  binaries_layer                       = local.binaries_layer

  common-tags = var.common-tags
}
