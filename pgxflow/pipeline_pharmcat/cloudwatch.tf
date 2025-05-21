#
# Cloudwatch trigger for updating references
#
resource "aws_cloudwatch_event_rule" "update_references_trigger" {
  name                = "pharmcat_update_references_trigger"
  description         = "A scheduled trigger that checks for changes to and updates reference files used by PGxFlow's PharmCAT pipeline."
  schedule_expression = "rate(1 day)"
}

resource "aws_cloudwatch_event_target" "update_references_trigger" {
  rule      = aws_cloudwatch_event_rule.update_references_trigger.name
  target_id = "lambda-pharmcat-updateReferenceFiles"
  arn       = module.lambda-updateReferenceFiles.lambda_function_arn
}
