resource "aws_sns_topic" "sesDeliveryLogger" {
  name = "sesDeliveryLogger"
}

resource "aws_sns_topic_subscription" "sesDeliveryLogger" {
  topic_arn = aws_sns_topic.sesDeliveryLogger.arn
  protocol  = "lambda"
  endpoint  = module.lambda-logEmailDelivery.lambda_function_arn
}

resource "aws_sns_topic_policy" "sesDeliveryLogger" {
  arn    = aws_sns_topic.sesDeliveryLogger.arn
  policy = data.aws_iam_policy_document.ses-sns-access.json
}
