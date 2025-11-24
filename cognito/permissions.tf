#
# customMessageLambdaTrigger Lambda Function
#
resource "aws_lambda_permission" "customMessageLambdaTrigger" {
  statement_id  = "SBeaconBackendAllowCustomMessageLambdaTriggerInvoke"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda-customMessageLambdaTrigger.lambda_function_arn
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.gaspi_user_pool.arn
}
