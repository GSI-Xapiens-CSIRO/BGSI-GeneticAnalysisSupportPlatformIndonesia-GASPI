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

#
# lookup-updateReferenceFiles Lambda Function
#
resource "aws_lambda_permission" "cloudwatch_lookup_reference_update_permission" {
  statement_id  = "CloudwatchLookupReferenceUpdateAllowInvoke"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda-updateReferenceFiles.lambda_function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.update_references_trigger.arn
}
