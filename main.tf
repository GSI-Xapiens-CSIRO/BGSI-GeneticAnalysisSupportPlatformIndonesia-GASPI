module "cognito" {
  source                   = "./cognito"
  region                   = var.region
  gaspi-guest-username     = var.gaspi-guest-username
  gaspi-guest-password     = var.gaspi-guest-password
  gaspi-admin-username     = var.gaspi-admin-username
  gaspi-admin-password     = var.gaspi-admin-password
  dataportal-bucket-prefix = var.dataportal-bucket-prefix

  common-tags = merge(var.common-tags, {
    "NAME" = "cognito-infrastructure"
  })
}

module "sbeacon" {
  source                      = "./sbeacon"
  region                      = var.region
  variants-bucket-prefix      = var.variants-bucket-prefix
  metadata-bucket-prefix      = var.metadata-bucket-prefix
  lambda-layers-bucket-prefix = var.lambda-layers-bucket-prefix
  dataportal-bucket-prefix    = var.dataportal-bucket-prefix
  ses-source-email            = var.ses-source-email
  beacon-ui-url               = module.webgui.cloudfront-url
  cognito-user-pool-arn       = module.cognito.cognito_user_pool_arn
  cognito-user-pool-id        = module.cognito.cognito_user_pool_id

  common-tags = merge(var.common-tags, {
    "NAME" = "sbeacon-backend"
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
  api_endpoint_sbeacon    = "${module.sbeacon.api_url}${module.sbeacon.api_stage}/"
  api_endpoint_svep       = ""

  common-tags = merge(var.common-tags, {
    "NAME" = "portal-frontend"
  })
}
