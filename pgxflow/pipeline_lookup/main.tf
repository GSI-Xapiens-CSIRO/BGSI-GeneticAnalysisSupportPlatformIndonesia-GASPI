data "aws_caller_identity" "this" {}

locals {
  result_suffix = "_lookup_results.jsonl"
}

#
# initLookup lambda function
#
module "lambda-initLookup" {
  source = "terraform-aws-modules/lambda/aws"

  function_name       = "pgxflow-backend-initLookup"
  description         = "Inititializes a PGxFlow lookup table job"
  handler             = "lambda_function.lambda_handler"
  runtime             = "python3.12"
  memory_size         = 1792
  timeout             = 28
  attach_policy_jsons = true
  policy_jsons = [
    data.aws_iam_policy_document.lambda-initLookup.json
  ]
  number_of_policy_jsons = 1
  source_path            = "${path.module}/lambda/initLookup"

  tags = var.common-tags

  environment_variables = {
    PGXFLOW_DBSNP_LAMBDA       = module.lambda-dbsnp.lambda_function_arn
    HTS_S3_HOST                = "s3.${var.region}.amazonaws.com"
    DYNAMO_PROJECT_USERS_TABLE = var.dynamo-project-users-table
    DYNAMO_CLINIC_JOBS_TABLE   = var.dynamo-clinic-jobs-table
  }

  layers = [
    var.python_modules_layer,
    var.binaries_layer,
  ]
}

#
# dbSNP lambda function
#
module "lambda-dbsnp" {
  source = "terraform-aws-modules/lambda/aws"

  function_name       = "pgxflow-backend-dbsnp"
  description         = "Gets RSIDs for variants in a VCF"
  handler             = "lambda_function.lambda_handler"
  runtime             = "python3.12"
  memory_size         = 1792
  timeout             = 600
  attach_policy_jsons = true
  policy_jsons = [
    data.aws_iam_policy_document.lambda-dbsnp.json
  ]
  number_of_policy_jsons = 1
  source_path            = "${path.module}/lambda/dbsnp"

  tags = var.common-tags

  environment_variables = {
    PGXFLOW_BUCKET           = var.pgxflow-backend-bucket-name
    DPORTAL_BUCKET           = var.data-portal-bucket-name
    REFERENCE_BUCKET         = var.pgxflow-reference-bucket-name
    PGXFLOW_LOOKUP_LAMBDA    = module.lambda-lookup.lambda_function_arn
    DBSNP_REFERENCE          = var.dbsnp_reference
    LOOKUP_REFERENCE         = var.lookup_reference
    DYNAMO_CLINIC_JOBS_TABLE = var.dynamo-clinic-jobs-table
    HTS_S3_HOST              = "s3.${var.region}.amazonaws.com"
  }

  layers = [
    var.python_modules_layer,
    var.binaries_layer,
  ]
}

#
# lookup lambda function
#
module "lambda-lookup" {
  source = "terraform-aws-modules/lambda/aws"

  function_name       = "pgxflow-backend-lookup"
  description         = "Performs a lookup on custom association matrix to retrieve annotations"
  handler             = "lambda_function.lambda_handler"
  runtime             = "python3.12"
  memory_size         = 1792
  timeout             = 600
  attach_policy_jsons = true
  policy_jsons = [
    data.aws_iam_policy_document.lambda-lookup.json
  ]
  number_of_policy_jsons = 1
  source_path            = "${path.module}/lambda/lookup"

  tags = var.common-tags

  environment_variables = {
    RESULT_SUFFIX            = local.result_suffix
    PGXFLOW_BUCKET           = var.pgxflow-backend-bucket-name
    DPORTAL_BUCKET           = var.data-portal-bucket-name
    REFERENCE_BUCKET         = var.pgxflow-reference-bucket-name
    LOOKUP_REFERENCE         = var.lookup_reference
    DYNAMO_CLINIC_JOBS_TABLE = var.dynamo-clinic-jobs-table
    HTS_S3_HOST              = "s3.${var.region}.amazonaws.com"
  }

  layers = [
    var.python_modules_layer,
    var.binaries_layer,
  ]
}

#
# getResultsURL lambda function
#
module "lambda-getResultsURL" {
  source = "terraform-aws-modules/lambda/aws"

  function_name       = "pgxflow-backend-lookup-getResultsURL"
  description         = "Returns presigned results URL for PGxFlow lookup results"
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
    DPORTAL_BUCKET             = var.data-portal-bucket-name
    DYNAMO_PROJECT_USERS_TABLE = var.dynamo-project-users-table
  }

  layers = [
    var.python_modules_layer
  ]
}
