provider "aws" {
  region = var.region
  default_tags {
    tags = var.common-tags
  }
}

provider "aws" {
  region = "us-east-1"
  alias  = "us-east-1"
  default_tags {
    tags = var.common-tags
  }
}

data "aws_caller_identity" "this" {}

resource "aws_inspector2_enabler" "gaspi-inspector-enabler" {
  count = var.enable-inspector ? 1 : 0

  account_ids    = [data.aws_caller_identity.this.account_id]
  resource_types = var.inspector-enabled-resource-types
}

#
# security alert lambda function 
#
module "lambda-sendSecurityAlert" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "security-sendSecurityAlert"
  description   = "Logs and alerts of any Inspector/CodeGuru findings"
  runtime       = "python3.12"
  handler       = "lambda_function.lambda_handler"
  memory_size   = 512
  timeout       = 24
  source_path   = "${path.module}/lambda/sendSecurityAlert"
  tags          = var.common-tags

  attach_policy_jsons = true
  policy_jsons = [
    data.aws_iam_policy_document.lambda-sendSecurityAlert.json
  ]
  number_of_policy_jsons = 1

  environment_variables = {
    SES_SOURCE_EMAIL  = var.ses-source-email
    GASPI_ADMIN_EMAIL = var.gaspi-admin-email
  }
}
