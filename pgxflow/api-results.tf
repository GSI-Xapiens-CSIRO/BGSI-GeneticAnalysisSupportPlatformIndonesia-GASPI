#
# /results
#
resource "aws_api_gateway_resource" "results" {
  rest_api_id = aws_api_gateway_rest_api.PgxApi.id
  parent_id   = aws_api_gateway_rest_api.PgxApi.root_resource_id
  path_part   = "results"
}

resource "aws_api_gateway_method" "results-options" {
  rest_api_id   = aws_api_gateway_rest_api.PgxApi.id
  resource_id   = aws_api_gateway_resource.results.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method_response" "results-options" {
  rest_api_id = aws_api_gateway_method.results-options.rest_api_id
  resource_id = aws_api_gateway_method.results-options.resource_id
  http_method = aws_api_gateway_method.results-options.http_method
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

resource "aws_api_gateway_integration" "results-options" {
  rest_api_id = aws_api_gateway_method.results-options.rest_api_id
  resource_id = aws_api_gateway_method.results-options.resource_id
  http_method = aws_api_gateway_method.results-options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = <<TEMPLATE
      {
        "statusCode": 200
      }
    TEMPLATE
  }
}

resource "aws_api_gateway_integration_response" "results-options" {
  rest_api_id = aws_api_gateway_method.results-options.rest_api_id
  resource_id = aws_api_gateway_method.results-options.resource_id
  http_method = aws_api_gateway_method.results-options.http_method
  status_code = aws_api_gateway_method_response.results-options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,GET'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  response_templates = {
    "application/json" = ""
  }

  depends_on = [aws_api_gateway_integration.results-options]
}

resource "aws_api_gateway_method" "results-get" {
  rest_api_id   = aws_api_gateway_rest_api.PgxApi.id
  resource_id   = aws_api_gateway_resource.results.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.pgxflow_user_pool_authorizer.id
}

resource "aws_api_gateway_method_response" "results-get" {
  rest_api_id = aws_api_gateway_method.results-get.rest_api_id
  resource_id = aws_api_gateway_method.results-get.resource_id
  http_method = aws_api_gateway_method.results-get.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration" "results-get" {
  rest_api_id             = aws_api_gateway_method.results-get.rest_api_id
  resource_id             = aws_api_gateway_method.results-get.resource_id
  http_method             = aws_api_gateway_method.results-get.http_method
  type                    = "AWS_PROXY"
  uri                     = module.lambda-getResultsURL.lambda_function_invoke_arn
  integration_http_method = "POST"
}

resource "aws_api_gateway_integration_response" "results-get" {
  rest_api_id = aws_api_gateway_method.results-get.rest_api_id
  resource_id = aws_api_gateway_method.results-get.resource_id
  http_method = aws_api_gateway_method.results-get.http_method
  status_code = aws_api_gateway_method_response.results-get.status_code

  response_templates = {
    "application/json" = ""
  }

  depends_on = [aws_api_gateway_integration.results-get]
}

