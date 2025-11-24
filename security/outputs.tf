output "web_acl_arn" {
  value       = aws_wafv2_web_acl.security-all-cloudfront.arn
  description = "arn of the all-cloudfronts web acl."
}
