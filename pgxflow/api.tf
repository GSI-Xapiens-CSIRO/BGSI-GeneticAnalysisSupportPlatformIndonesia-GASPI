#
# API Gateway
#
resource "aws_api_gateway_rest_api" "PgxApi" {
  name        = "pgxflow-backend-api"
  description = "API That implements the Pharmacogenomics workflow"
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

locals {
  shared_api_redeployment_hash = sha1(jsonencode([
    # /vcfstats
    aws_api_gateway_method.vcfstats-options,
    aws_api_gateway_integration.vcfstats-options,
    aws_api_gateway_integration_response.vcfstats-options,
    aws_api_gateway_method_response.vcfstats-options,
    aws_api_gateway_method.vcfstats-patch,
    aws_api_gateway_integration.vcfstats-patch,
    aws_api_gateway_integration_response.vcfstats-patch,
    aws_api_gateway_method_response.vcfstats-patch,
    aws_api_gateway_method.vcfstats-post,
    aws_api_gateway_integration.vcfstats-post,
    aws_api_gateway_integration_response.vcfstats-post,
    aws_api_gateway_method_response.vcfstats-post,
  ]))
  api_redeployment_hash = sha1(jsonencode(join("", compact([
    module.pipeline_pharmcat.pipeline_pharmcat_redeployment_hash,
    module.pipeline_lookup.pipeline_lookup_redeployment_hash,
    local.shared_api_redeployment_hash,
  ]))))
}

#
# Deployment
#
resource "aws_api_gateway_deployment" "PgxApi" {
  rest_api_id = aws_api_gateway_rest_api.PgxApi.id
  # Without enabling create_before_destroy, 
  # API Gateway can return errors such as BadRequestException: 
  # Active stages pointing to this deployment must be moved or deleted on recreation.
  lifecycle {
    create_before_destroy = true
  }
  # taint deployment if either of the child module API resources change
  triggers = {
    redeployment = local.api_redeployment_hash
  }
}

resource "aws_api_gateway_stage" "PgxApi" {
  deployment_id = aws_api_gateway_deployment.PgxApi.id
  rest_api_id   = aws_api_gateway_rest_api.PgxApi.id
  stage_name    = "prod"
}

resource "aws_api_gateway_method_settings" "PgxApi" {
  rest_api_id = aws_api_gateway_rest_api.PgxApi.id
  stage_name  = aws_api_gateway_stage.PgxApi.stage_name
  method_path = "*/*"

  settings {
    throttling_burst_limit = var.method-queue-size
    throttling_rate_limit  = var.method-max-request-rate
  }
}
