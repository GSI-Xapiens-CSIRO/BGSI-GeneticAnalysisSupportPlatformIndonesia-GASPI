data "aws_caller_identity" "this" {}

locals {
  result_suffix          = "_results.jsonl"
  python_libraries_layer = module.python_libraries_layer.lambda_layer_arn
  python_modules_layer   = module.python_modules_layer.lambda_layer_arn
  binaries_layer         = "${aws_lambda_layer_version.binaries_layer.layer_arn}:${aws_lambda_layer_version.binaries_layer.version}"
}

#
# initFlow lambda function
#
module "lambda-initFlow" {
  source = "terraform-aws-modules/lambda/aws"

  function_name       = "pgxflow-backend-initFlow"
  description         = "Initializes a PGxFlow run"
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
    PGXFLOW_PHARMCAT_PREPROCESSOR_LAMBDA = module.lambda-preprocessor.lambda_function_arn
    HTS_S3_HOST                          = "s3.${var.region}.amazonaws.com"
    DYNAMO_PROJECT_USERS_TABLE           = var.dynamo-project-users-table
    DYNAMO_CLINIC_JOBS_TABLE             = var.dynamo-clinic-jobs-table
  }

  layers = [
    local.python_modules_layer,
    local.python_libraries_layer,
    local.binaries_layer,
  ]
}

#
# preprocessor lambda function
#
module "lambda-preprocessor" {
  source = "terraform-aws-modules/lambda/aws"

  function_name          = "pgxflow-backend-preprocessor"
  description            = "Preprocesses VCFs for Pharmcat"
  create_package         = false
  image_uri              = module.docker_image_preprocessor_lambda.image_uri
  package_type           = "Image"
  memory_size            = 2048
  ephemeral_storage_size = 8192
  timeout                = 60
  attach_policy_jsons    = true
  policy_jsons = [
    data.aws_iam_policy_document.lambda-preprocessor.json
  ]
  number_of_policy_jsons = 1
  source_path            = "${path.module}/lambda/preprocessor"
  tags                   = var.common-tags
  environment_variables = {
    DPORTAL_BUCKET           = var.data-portal-bucket-name
    PGXFLOW_BUCKET           = aws_s3_bucket.pgxflow-bucket.bucket
    PGXFLOW_PHARMCAT_LAMBDA  = module.lambda-pharmcat.lambda_function_arn
    DYNAMO_CLINIC_JOBS_TABLE = var.dynamo-clinic-jobs-table
    HTS_S3_HOST              = "s3.${var.region}.amazonaws.com"
  }
}

#
# pharmcat lambda function
#
module "lambda-pharmcat" {
  source = "terraform-aws-modules/lambda/aws"

  function_name       = "pgxflow-backend-pharmcat"
  create_package      = false
  image_uri           = module.docker_image_pharmcat_lambda.image_uri
  package_type        = "Image"
  memory_size         = 2048
  timeout             = 60
  attach_policy_jsons = true
  policy_jsons = [
    data.aws_iam_policy_document.lambda-pharmcat.json
  ]
  number_of_policy_jsons = 1
  source_path            = "${path.module}/lambda/pharmcat"
  tags                   = var.common-tags
  environment_variables = {
    PGXFLOW_BUCKET                        = aws_s3_bucket.pgxflow-bucket.bucket
    PGXFLOW_PHARMCAT_POSTPROCESSOR_LAMBDA = module.lambda-postprocessor.lambda_function_arn
    DYNAMO_CLINIC_JOBS_TABLE              = var.dynamo-clinic-jobs-table
  }
}

#
# pharmcat postprocessor lambda
#
module "lambda-postprocessor" {
  source = "terraform-aws-modules/lambda/aws"

  function_name       = "pgxflow-backend-postprocessor"
  description         = "Filters, sorts, and indexes the results of pharmcat"
  handler             = "lambda_function.lambda_handler"
  runtime             = "python3.12"
  memory_size         = 1792
  timeout             = 28
  attach_policy_jsons = true
  policy_jsons = [
    data.aws_iam_policy_document.lambda-postprocessor.json
  ]
  number_of_policy_jsons = 1
  source_path            = "${path.module}/lambda/postprocessor"

  tags = var.common-tags

  environment_variables = {
    RESULT_SUFFIX            = local.result_suffix
    PGXFLOW_BUCKET           = aws_s3_bucket.pgxflow-bucket.bucket
    DPORTAL_BUCKET           = var.data-portal-bucket-name
    GENE_ORGANISATIONS       = join(",", var.pgxflow-configuration["gene_organisations"])
    GENES                    = join(",", var.pgxflow-configuration["genes"])
    DYNAMO_CLINIC_JOBS_TABLE = var.dynamo-clinic-jobs-table
    HTS_S3_HOST              = "s3.${var.region}.amazonaws.com"
  }

  layers = [
    local.python_modules_layer,
    local.python_libraries_layer,
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
    RESULT_SUFFIX              = local.result_suffix
    RESULT_BUCKET              = var.data-portal-bucket-name
    DYNAMO_PROJECT_USERS_TABLE = var.dynamo-project-users-table
    HTS_S3_HOST                = "s3.${var.region}.amazonaws.com"
  }

  layers = [
    local.python_modules_layer,
  ]
}
