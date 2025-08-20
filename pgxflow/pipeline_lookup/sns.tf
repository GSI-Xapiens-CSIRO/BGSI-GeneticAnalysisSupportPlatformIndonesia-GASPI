resource "aws_sns_topic" "dbsnp" {
  name = "pgxflow-backend-dbsnp"
}

resource "aws_sns_topic_subscription" "dbsnp" {
  topic_arn = aws_sns_topic.dbsnp.arn
  protocol  = "lambda"
  endpoint  = module.lambda-dbsnp.lambda_function_arn
}
