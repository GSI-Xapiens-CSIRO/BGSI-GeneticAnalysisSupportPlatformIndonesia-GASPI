#
# initLookup -> dbsnp
#
resource "aws_lambda_permission" "LambdaDbsnp" {
  statement_id  = "PGxFlowBackendAllowDbsnpInvoke"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda-dbsnp.lambda_function_arn
  principal     = "lambda.amazonaws.com"
  source_arn    = module.lambda-initLookup.lambda_function_arn
}
