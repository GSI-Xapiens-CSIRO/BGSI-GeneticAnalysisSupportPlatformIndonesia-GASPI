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

#
# dbsnp Lambda Function
#
resource "aws_lambda_permission" "dbsnp_invoke_permission" {
  statement_id  = "SNSDbsnpAllowInvoke"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda-dbsnp.lambda_function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.dbsnp.arn
}
