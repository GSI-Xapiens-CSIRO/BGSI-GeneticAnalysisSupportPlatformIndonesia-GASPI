data "aws_caller_identity" "this" {}

#
# initFlow lambda function
#
module "lambda-initFlow" {
  source = "terraform-aws-modules/lambda/aws"

  function_name       = "pgxflow-backend-initFlow"
  description         = "Initializes a PGxFlow run"
  create_package      = false
  image_uri           = module.docker_image_initflow_lambda.image_uri
  package_type        = "Image"
  memory_size         = 2048
  timeout             = 60
  attach_policy_jsons = true
  policy_jsons = [
    data.aws_iam_policy_document.lambda-initFlow.json
  ]
  number_of_policy_jsons = 1
  source_path            = "${path.module}/lambda/initFlow"
  tags                   = var.common-tags
  environment_variables = {
    PGXFLOW_PREPROCESSOR_LAMBDA = module.lambda-preprocessor.lambda_function_arn
    HTS_S3_HOST                 = "s3.${var.region}.amazonaws.com"
  }
}

#
# preprocessor lambda function
#
module "lambda-preprocessor" {
  source = "terraform-aws-modules/lambda/aws"

  function_name       = "pgxflow-backend-preprocessor"
  description         = "Preprocesses VCFs for Pharmcat"
  create_package      = false
  image_uri           = module.docker_image_preprocessor_lambda.image_uri
  package_type        = "Image"
  memory_size         = 2048
  timeout             = 60
  attach_policy_jsons = true
  policy_jsons = [
    data.aws_iam_policy_document.lambda-preprocessor.json
  ]
  number_of_policy_jsons = 1
  source_path            = "${path.module}/lambda/preprocessor"
  tags                   = var.common-tags
  environment_variables = {
    DPORTAL_BUCKET = var.data-portal-bucket-name
    PGXFLOW_BUCKET = aws_s3_bucket.pgxflow-bucket.bucket
    HTS_S3_HOST    = "s3.${var.region}.amazonaws.com"
    PGXFLOW_PHARMCAT_LAMBDA = module.lambda-pharmcat.lambda_function_arn 
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
  memory_size = 2048
  timeout = 60
  attach_policy_jsons = true
  policy_jsons = [
    data.aws_iam_policy_document.lambda-pharmcat.json
  ]
  number_of_policy_jsons = 1
  source_path            = "${path.module}/lambda/pharmcat"
  tags                   = var.common-tags
  environment_variables = {
    PGXFLOW_BUCKET = aws_s3_bucket.pgxflow-bucket.bucket
    # PGXFLOW_POSTPROCESSOR_LAMBDA = module.lambda-postprocessor.lambda_function_arn
  }
}
