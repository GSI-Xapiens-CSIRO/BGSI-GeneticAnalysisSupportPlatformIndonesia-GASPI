#
# initFlow -> preprocessor
#
resource "aws_lambda_permission" "LambdaPreprocessor" {
    statement_id  = "PGxFlowBackendAllowLambdaPreprocessorInvoke"
    action        = "lambda:InvokeFunction"
    function_name = module.lambda-preprocessor.lambda_function_arn
    principal     = "lambda.amazonaws.com"
    source_arn    = module.lambda-initFlow.lambda_function_arn
}

#
# preprocessor -> pharmcat
#
resource "aws_lambda_permission" "LambdaPharmcat" {
    statement_id  = "PGxFlowBackendAllowLambdaPharmcatInvoke"
    action        = "lambda:InvokeFunction"
    function_name = module.lambda-pharmcat.lambda_function_arn
    principal     = "lambda.amazonaws.com"
    source_arn    = module.lambda-preprocessor.lambda_function_arn
}