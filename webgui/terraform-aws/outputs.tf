output "cloudfront-url" {
  value = "https://${aws_cloudfront_distribution.bui-s3-distribution.domain_name}"
}

output "bui-ssm-parameter-name" {
  value = aws_ssm_parameter.bui-ssm-beacon-ui-url.name
}
