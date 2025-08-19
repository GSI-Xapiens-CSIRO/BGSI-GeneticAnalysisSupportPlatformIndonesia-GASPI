# 
# authorizers
# 
resource "aws_api_gateway_authorizer" "pgxflow_user_pool_authorizer" {
  name          = "pgxflow-userpool-authorizer"
  type          = "COGNITO_USER_POOLS"
  rest_api_id   = aws_api_gateway_rest_api.PgxApi.id
  provider_arns = [var.cognito-user-pool-arn]

  depends_on = [aws_api_gateway_rest_api.PgxApi]
}

