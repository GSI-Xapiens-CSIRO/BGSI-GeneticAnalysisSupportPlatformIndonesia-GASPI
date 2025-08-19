#
# batchSubmit
#
resource "aws_api_gateway_resource" "batch-submit" {
  rest_api_id = aws_api_gateway_rest_api.PgxApi.id
  parent_id   = aws_api_gateway_rest_api.PgxApi.root_resource_id
  path_part   = "batch-submit"
}

resource "aws_api_gateway_method" "batch-submit-post" {
  rest_api_id   = aws_api_gateway_rest_api.PgxApi.id
  resource_id   = aws_api_gateway_resource.batch-submit.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.pgxflow_user_pool_authorizer.id
}

resource "aws_api_gateway_method_response" "batch-submit-post" {
  rest_api_id = aws_api_gateway_method.batch-submit-post.rest_api_id
  resource_id = aws_api_gateway_method.batch-submit-post.resource_id
  http_method = aws_api_gateway_method.batch-submit-post.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration" "batch-submit-post" {
  rest_api_id             = aws_api_gateway_method.batch-submit-post.rest_api_id
  resource_id             = aws_api_gateway_method.batch-submit-post.resource_id
  http_method             = aws_api_gateway_method.batch-submit-post.http_method
  type                    = "AWS_PROXY"
  uri                     = module.lambda-batchSubmit.lambda_function_invoke_arn
  integration_http_method = "POST"
}

resource "aws_api_gateway_integration_response" "batch-submit-post" {
  rest_api_id = aws_api_gateway_method.batch-submit-post.rest_api_id
  resource_id = aws_api_gateway_method.batch-submit-post.resource_id
  http_method = aws_api_gateway_method.batch-submit-post.http_method
  status_code = aws_api_gateway_method_response.batch-submit-post.status_code

  response_templates = {
    "application/json" = ""
  }

  depends_on = [aws_api_gateway_integration.batch-submit-post]
}

resource "aws_api_gateway_method" "batch-submit-options" {
  rest_api_id   = aws_api_gateway_rest_api.PgxApi.id
  resource_id   = aws_api_gateway_resource.batch-submit.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method_response" "batch-submit-options" {
  rest_api_id = aws_api_gateway_method.batch-submit-options.rest_api_id
  resource_id = aws_api_gateway_method.batch-submit-options.resource_id
  http_method = aws_api_gateway_method.batch-submit-options.http_method
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

resource "aws_api_gateway_integration" "batch-submit-options" {
  rest_api_id = aws_api_gateway_method.batch-submit-options.rest_api_id
  resource_id = aws_api_gateway_method.batch-submit-options.resource_id
  http_method = aws_api_gateway_method.batch-submit-options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = <<TEMPLATE
      {
        "statusCode": 200
      }
    TEMPLATE
  }
}

resource "aws_api_gateway_integration_response" "batch-submit-options" {
  rest_api_id = aws_api_gateway_method.batch-submit-options.rest_api_id
  resource_id = aws_api_gateway_method.batch-submit-options.resource_id
  http_method = aws_api_gateway_method.batch-submit-options.http_method
  status_code = aws_api_gateway_method_response.batch-submit-options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,PATCH,POST'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  response_templates = {
    "application/json" = ""
  }

  depends_on = [aws_api_gateway_integration.batch-submit-options]
}
