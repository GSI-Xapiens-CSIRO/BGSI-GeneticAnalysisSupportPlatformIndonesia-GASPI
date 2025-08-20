resource "aws_cloudwatch_event_rule" "batch_starter_trigger" {
  name                = "pgxflow-backend-batchStarterTrigger"
  description         = "Trigger for initation of queued batch job submissions."
  schedule_expression = "rate(2 minutes)"
}

resource "aws_cloudwatch_event_target" "batch_starter_trigger" {
  rule      = aws_cloudwatch_event_rule.batch_starter_trigger.name
  target_id = "lambda-batchStarter"
  arn       = module.lambda-batchStarter.lambda_function_arn
}
