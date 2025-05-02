output "pipeline_lookup_redeployment_hash" {
  value = sha1(jsonencode([
    # /submit
    aws_api_gateway_method.submit-options,
    aws_api_gateway_integration.submit-options,
    aws_api_gateway_integration_response.submit-options,
    aws_api_gateway_method_response.submit-options,
    aws_api_gateway_method.submit-patch,
    aws_api_gateway_integration.submit-patch,
    aws_api_gateway_integration_response.submit-patch,
    aws_api_gateway_method_response.submit-patch,
    aws_api_gateway_method.submit-post,
    aws_api_gateway_integration.submit-post,
    aws_api_gateway_integration_response.submit-post,
    aws_api_gateway_method_response.submit-post,
    # /results
    aws_api_gateway_method.results-options,
    aws_api_gateway_integration.results-options,
    aws_api_gateway_integration_response.results-options,
    aws_api_gateway_method_response.results-options,
    aws_api_gateway_method.results-get,
    aws_api_gateway_integration.results-get,
    aws_api_gateway_integration_response.results-get,
    aws_api_gateway_method_response.results-get,
  ]))
}

