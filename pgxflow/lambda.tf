#
# vcfstatsGraphic Lambda Function
#
resource "aws_lambda_permission" "vcfstats_graphic_invoke_permission" {
  statement_id  = "APIVcfstatsAllowInvoke"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda-qcFigures.lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.PgxApi.execution_arn}/*/*/${aws_api_gateway_resource.vcfstats.path_part}"
}

#
# qcNotes Lambda Function
#
resource "aws_lambda_permission" "qcnotes_invoke_permission" {
  statement_id  = "APIQcnotesAllowInvoke"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda-qcNotes.lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.PgxApi.execution_arn}/*/*/${aws_api_gateway_resource.qcnotes.path_part}"
}
