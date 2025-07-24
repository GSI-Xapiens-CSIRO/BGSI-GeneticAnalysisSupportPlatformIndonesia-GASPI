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
  triggers = {
    redeployment = sha1(jsonencode([
      # /submit
      aws_api_gateway_method.submit-options,
      aws_api_gateway_integration.submit-options,
      aws_api_gateway_integration_response.submit-options,
      aws_api_gateway_method_response.submit-options,
      aws_api_gateway_method.submit-patch,
      aws_api_gateway_integration.submit-patch,
      aws_api_gateway_integration_response.submit-patch,
      aws_api_gateway_method_response.submit-patch,
      aws_api_gateway_method.submit-post,
      aws_api_gateway_integration.submit-post,
      aws_api_gateway_integration_response.submit-post,
      aws_api_gateway_method_response.submit-post,
      # /results
      aws_api_gateway_method.results-options,
      aws_api_gateway_integration.results-options,
      aws_api_gateway_integration_response.results-options,
      aws_api_gateway_method_response.results-options,
      aws_api_gateway_method.results-get,
      aws_api_gateway_integration.results-get,
      aws_api_gateway_integration_response.results-get,
      aws_api_gateway_method_response.results-get,
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
      # /qcnotes
      aws_api_gateway_method.qcnotes-options,
      aws_api_gateway_integration.qcnotes-options,
      aws_api_gateway_integration_response.qcnotes-options,
      aws_api_gateway_method_response.qcnotes-options,
      aws_api_gateway_method.qcnotes-post,
      aws_api_gateway_integration.qcnotes-post,
      aws_api_gateway_integration_response.qcnotes-post,
      aws_api_gateway_method_response.qcnotes-post,
      aws_api_gateway_method.qcnotes-get,
      aws_api_gateway_integration.qcnotes-get,
      aws_api_gateway_integration_response.qcnotes-get,
      aws_api_gateway_method_response.qcnotes-get,
    ]))
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
