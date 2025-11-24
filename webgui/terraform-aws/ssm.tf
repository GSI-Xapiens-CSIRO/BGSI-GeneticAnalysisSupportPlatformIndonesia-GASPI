resource "aws_ssm_parameter" "bui-ssm-beacon-ui-url" {
    name  = var.bui-ssm-parameter-name 
    type  = "String"
    value = "https://${aws_cloudfront_distribution.bui-s3-distribution.domain_name}"

    tags  = var.common-tags
}
