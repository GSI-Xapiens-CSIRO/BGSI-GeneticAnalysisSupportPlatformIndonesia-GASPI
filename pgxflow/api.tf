#
# API Gateway
#
resource "aws_api_gateway_rest_api" "PgxApi" {
  name        = "svep-backend-api"
  description = "API That implements the Pharmacogenomics workflow"
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# 
# /submit
# 
resource "aws_api_gateway_resource" "submit" {
  rest_api_id = aws_api_gateway_rest_api.PgxApi.id
  parent_id   = aws_api_gateway_rest_api.PgxApi.root_resource_id
  path_part   = "submit"
}

resource "aws_api_gateway_method" "submit-options" {
  rest_api_id   = aws_api_gateway_rest_api.PgxApi.id
  resource_id   = aws_api_gateway_resource.submit.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method_response" "submit-options" {
  rest_api_id = aws_api_gateway_method.submit-options.rest_api_id
  resource_id = aws_api_gateway_method.submit-options.resource_id
  http_method = aws_api_gateway_method.submit-options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration" "submit-options" {
  rest_api_id = aws_api_gateway_method.submit-options.rest_api_id
  resource_id = aws_api_gateway_method.submit-options.resource_id
  http_method = aws_api_gateway_method.submit-options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = <<TEMPLATE
      {
        "statusCode": 200
      }
    TEMPLATE
  }
}

resource "aws_api_gateway_integration_response" "submit-options" {
  rest_api_id = aws_api_gateway_method.submit-options.rest_api_id
  resource_id = aws_api_gateway_method.submit-options.resource_id
  http_method = aws_api_gateway_method.submit-options.http_method
  status_code = aws_api_gateway_method_response.submit-options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,PATCH,POST'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  response_templates = {
    "application/json" = ""
  }

  depends_on = [aws_api_gateway_integration.submit-options]
}

resource "aws_api_gateway_method" "submit-patch" {
  rest_api_id   = aws_api_gateway_rest_api.PgxApi.id
  resource_id   = aws_api_gateway_resource.submit.id
  http_method   = "PATCH"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.pgxflow_user_pool_authorizer.id
}

resource "aws_api_gateway_method_response" "submit-patch" {
  rest_api_id = aws_api_gateway_method.submit-patch.rest_api_id
  resource_id = aws_api_gateway_method.submit-patch.resource_id
  http_method = aws_api_gateway_method.submit-patch.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration" "submit-patch" {
  rest_api_id             = aws_api_gateway_method.submit-patch.rest_api_id
  resource_id             = aws_api_gateway_method.submit-patch.resource_id
  http_method             = aws_api_gateway_method.submit-patch.http_method
  type                    = "AWS_PROXY"
  uri                     = module.lambda-initFlow.lambda_function_invoke_arn
  integration_http_method = "POST"
}

resource "aws_api_gateway_integration_response" "submit-patch" {
  rest_api_id = aws_api_gateway_method.submit-patch.rest_api_id
  resource_id = aws_api_gateway_method.submit-patch.resource_id
  http_method = aws_api_gateway_method.submit-patch.http_method
  status_code = aws_api_gateway_method_response.submit-patch.status_code

  response_templates = {
    "application/json" = ""
  }

  depends_on = [aws_api_gateway_integration.submit-patch]
}

resource "aws_api_gateway_method" "submit-post" {
  rest_api_id   = aws_api_gateway_rest_api.PgxApi.id
  resource_id   = aws_api_gateway_resource.submit.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.pgxflow_user_pool_authorizer.id
}

resource "aws_api_gateway_method_response" "submit-post" {
  rest_api_id = aws_api_gateway_method.submit-post.rest_api_id
  resource_id = aws_api_gateway_method.submit-post.resource_id
  http_method = aws_api_gateway_method.submit-post.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration" "submit-post" {
  rest_api_id             = aws_api_gateway_method.submit-post.rest_api_id
  resource_id             = aws_api_gateway_method.submit-post.resource_id
  http_method             = aws_api_gateway_method.submit-post.http_method
  type                    = "AWS_PROXY"
  uri                     = module.lambda-initFlow.lambda_function_invoke_arn
  integration_http_method = "POST"
}

resource "aws_api_gateway_integration_response" "submit-post" {
  rest_api_id = aws_api_gateway_method.submit-post.rest_api_id
  resource_id = aws_api_gateway_method.submit-post.resource_id
  http_method = aws_api_gateway_method.submit-post.http_method
  status_code = aws_api_gateway_method_response.submit-post.status_code

  response_templates = {
    "application/json" = ""
  }

  depends_on = [aws_api_gateway_integration.submit-post]
}

# permit lambda invocation
resource "aws_lambda_permission" "APIInitFlow" {
  statement_id  = "AllowAPIInitFlowInvoke"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda-initFlow.lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.PgxApi.execution_arn}/*/*/${aws_api_gateway_resource.submit.path_part}"
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
  # taint deployment if any api resources change
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

