data "aws_caller_identity" "this" {}

locals {
  result_suffix = "_pharmcat_results.json"
}

#
# initPharmcat lambda function
#
module "lambda-initPharmcat" {
  source = "terraform-aws-modules/lambda/aws"

  function_name       = "pgxflow-backend-initPharmcat"
  description         = "Initializes a PGxFlow PharmCat run"
  handler             = "lambda_function.lambda_handler"
  runtime             = "python3.12"
  memory_size         = 1792
  timeout             = 28
  attach_policy_jsons = true
  policy_jsons = [
    data.aws_iam_policy_document.lambda-initPharmcat.json
  ]
  number_of_policy_jsons = 1
  source_path            = "${path.module}/lambda/initPharmcat"

  tags = var.common-tags

  environment_variables = {
    PGXFLOW_PHARMCAT_PREPROCESSOR_LAMBDA = module.lambda-preprocessor.lambda_function_arn
    ORGANISATIONS                        = jsonencode(var.pharmcat_configuration.ORGANISATIONS)
    GENES                                = join(",", var.pharmcat_configuration.GENES)
    DRUGS                                = join(",", var.pharmcat_configuration.DRUGS)
    DYNAMO_PROJECT_USERS_TABLE           = var.dynamo-project-users-table
    DYNAMO_CLINIC_JOBS_TABLE             = var.dynamo-clinic-jobs-table
    HTS_S3_HOST                          = "s3.${var.region}.amazonaws.com"
  }

  layers = [
    var.python_modules_layer,
    var.binaries_layer,
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
    PGXFLOW_BUCKET           = var.pgxflow-backend-bucket-name
    REFERENCE_BUCKET         = var.pgxflow-reference-bucket-name
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
    PGXFLOW_BUCKET                        = var.pgxflow-backend-bucket-name
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
    RESULT_SUFFIX                  = local.result_suffix
    PGXFLOW_BUCKET                 = var.pgxflow-backend-bucket-name
    DPORTAL_BUCKET                 = var.data-portal-bucket-name
    PGXFLOW_PHARMCAT_GNOMAD_LAMBDA = module.lambda-gnomad.lambda_function_arn
    ORGANISATIONS                  = jsonencode(var.pharmcat_configuration.ORGANISATIONS)
    GENES                          = join(",", var.pharmcat_configuration.GENES)
    DRUGS                          = join(",", var.pharmcat_configuration.DRUGS)
    DYNAMO_CLINIC_JOBS_TABLE       = var.dynamo-clinic-jobs-table
    HTS_S3_HOST                    = "s3.${var.region}.amazonaws.com"
  }

  layers = [
    var.python_modules_layer,
    var.python_libraries_layer,
    var.binaries_layer,
  ]
}

#
# gnomad lambda function
#
module "lambda-gnomad" {
  source = "terraform-aws-modules/lambda/aws"

  function_name       = "pgxflow-backend-pharmcat-gnomad"
  description         = "Adds data from gnomAD to the pharmcat results"
  handler             = "lambda_function.lambda_handler"
  runtime             = "python3.12"
  memory_size         = 1792
  timeout             = 600
  attach_policy_jsons = true
  policy_jsons = [
    data.aws_iam_policy_document.lambda-gnomad.json
  ]
  number_of_policy_jsons = 1
  source_path            = "${path.module}/lambda/gnomad"

  tags = var.common-tags

  environment_variables = {
    DPORTAL_BUCKET           = var.data-portal-bucket-name
    PGXFLOW_BUCKET           = var.pgxflow-backend-bucket-name
    RESULT_SUFFIX            = local.result_suffix
    DYNAMO_CLINIC_JOBS_TABLE = var.dynamo-clinic-jobs-table
  }

  layers = [
    var.python_modules_layer,
    var.binaries_layer,
  ]
}

#
# getResultsURL Lambda Function
#
module "lambda-getResultsURL" {
  source = "terraform-aws-modules/lambda/aws"

  function_name       = "pgxflow-backend-pharmcat-getResultsURL"
  description         = "Returns the presigned results URL for PGxFlow pharmcat results"
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
    var.python_modules_layer,
  ]
}

#
# updateReferenceFiles Lambda Function
#
module "lambda-updateReferenceFiles" {
  source = "terraform-aws-modules/lambda/aws"

  function_name       = "pgxflow-backend-pharmcat-updateReferenceFiles"
  description         = "Updates PharmCAT references and logs software versions"
  handler             = "lambda_function.lambda_handler"
  runtime             = "python3.12"
  memory_size         = 1792
  timeout             = 28
  attach_policy_jsons = true
  policy_jsons = [
    data.aws_iam_policy_document.lambda-updateReferenceFiles.json,
  ]
  number_of_policy_jsons = 1
  source_path            = "${path.module}/lambda/updateReferenceFiles"

  tags = var.common-tags

  environment_variables = {
    REFERENCE_LOCATION              = var.pgxflow-reference-bucket-name
    DYNAMO_PGXFLOW_REFERENCES_TABLE = var.dynamo-references-table
    EC2_IAM_INSTANCE_PROFILE        = var.ec2-references-instance-profile
  }

  layers = [
    var.python_modules_layer
  ]
}
