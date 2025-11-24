#
#  Lambda Function
#
resource "aws_lambda_permission" "inspectorFindingLambdaTrigger" {
  count         = var.enable-inspector ? 1 : 0
  statement_id  = "SecurityAllowInspectorFindingLambdaTriggerInvoke"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda-sendSecurityAlert.lambda_function_arn
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.gaspi-inspector-findings[0].arn 
}
