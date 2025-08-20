resource "aws_sns_topic" "initFlow" {
  name = "pgxflow-backend-initFlow"
}

resource "aws_sns_topic_subscription" "initFlow" {
  topic_arn = aws_sns_topic.initFlow.arn
  protocol  = "lambda"
  endpoint  = module.lambda-initFlow.lambda_function_arn
}
