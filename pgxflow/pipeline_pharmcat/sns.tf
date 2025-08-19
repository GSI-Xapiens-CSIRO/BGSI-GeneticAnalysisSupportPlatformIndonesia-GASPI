resource "aws_sns_topic" "preprocessor" {
    name = "pgxflow-backend-preprocessor"
}

resource "aws_sns_topic_subscription" "preprocessor" {
    topic_arn = aws_sns_topic.preprocessor.arn
    protocol = "lambda"
    endpoint = module.lambda-preprocessor.lambda_function_arn
}