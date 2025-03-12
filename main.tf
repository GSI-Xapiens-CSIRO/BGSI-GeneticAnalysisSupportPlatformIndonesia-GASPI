provider "aws" {
  region = var.region
}

data "aws_caller_identity" "this" {}


module "cognito" {
  source                   = "./cognito"
  region                   = var.region
  gaspi-guest-username     = var.gaspi-guest-username
  gaspi-guest-password     = var.gaspi-guest-password
  gaspi-admin-username     = var.gaspi-admin-username
  gaspi-admin-password     = var.gaspi-admin-password
  dataportal-bucket-prefix = var.dataportal-bucket-prefix
  bui-ssm-parameter-name   = var.bui-ssm-parameter-name
  ses-source-email         = var.ses-source-email

  common-tags = merge(var.common-tags, {
    "NAME" = "cognito-infrastructure"
  })
}

module "security" {
  source                     = "./security"
  region                     = var.region
  ses-source-email           = var.ses-source-email
  gaspi-admin-email          = var.gaspi-admin-email
  enable-inspector           = var.enable-inspector
  max-request-rate-per-5mins = var.max-request-rate-per-5mins

  common-tags = merge(var.common-tags, {
    "NAME" = "security-infrastructure"
  })
}

module "sbeacon" {
  source                                 = "./sbeacon"
  region                                 = var.region
  variants-bucket-prefix                 = var.variants-bucket-prefix
  metadata-bucket-prefix                 = var.metadata-bucket-prefix
  lambda-layers-bucket-prefix            = var.lambda-layers-bucket-prefix
  dataportal-bucket-prefix               = var.dataportal-bucket-prefix
  cognito-user-pool-arn                  = module.cognito.cognito_user_pool_arn
  cognito-user-pool-id                   = module.cognito.cognito_user_pool_id
  cognito-admin-group-name               = module.cognito.cognito_admin_group_name
  cognito-manager-group-name             = module.cognito.cognito_manager_group_name
  registration-email-lambda-function-arn = module.cognito.registration_email_lambda_function_arn
  method-max-request-rate                = var.sbeacon-method-max-request-rate
  method-queue-size                      = var.sbeacon-method-queue-size
  web_acl_arn                            = module.security.web_acl_arn

  common-tags = merge(var.common-tags, {
    "NAME" = "sbeacon-backend"
  })
}

module "svep" {
  source                                = "./svep"
  region                                = var.region
  data_portal_bucket_name               = module.sbeacon.data-portal-bucket
  data_portal_bucket_arn                = module.sbeacon.data-portal-bucket-arn
  method-max-request-rate               = var.svep-method-max-request-rate
  method-queue-size                     = var.svep-method-queue-size
  web_acl_arn                           = module.security.web_acl_arn
  cognito-user-pool-arn                 = module.cognito.cognito_user_pool_arn
  dynamo-project-users-table            = module.sbeacon.dynamo-project-users-table
  dynamo-project-users-table-arn        = module.sbeacon.dynamo-project-users-table-arn
  dynamo-clinic-jobs-table              = module.sbeacon.dynamo-clinic-jobs-table
  dynamo-clinic-jobs-table-arn          = module.sbeacon.dynamo-clinic-jobs-table-arn
  dynamo-clinic-jobs-stream-arn         = module.sbeacon.dynamo-clinic-jobs-stream-arn

  common-tags = merge(var.common-tags, {
    "NAME" = "svep-backend"
  })
}

module "webgui" {
  source                  = "./webgui/terraform-aws"
  region                  = var.region
  base_range              = 5000
  user_pool_id            = module.cognito.cognito_user_pool_id
  identity_pool_id        = module.cognito.cognito_identity_pool_id
  user_pool_web_client_id = module.cognito.cognito_client_id
  data_portal_bucket      = module.sbeacon.data-portal-bucket
  api_endpoint_sbeacon    = module.sbeacon.api_url
  api_endpoint_svep       = module.svep.api_url
  bui-ssm-parameter-name  = var.bui-ssm-parameter-name
  web_acl_arn             = module.security.web_acl_arn

  common-tags = merge(var.common-tags, {
    "NAME" = "portal-frontend"
  })
}

