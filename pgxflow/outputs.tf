output "api_url" {
  value       = "https://${aws_cloudfront_distribution.api_distribution.domain_name}/${aws_api_gateway_stage.PgxApi.stage_name}/"
  description = "URL used to invoke the API."
}

output "backend-bucket-name" {
  value       = aws_s3_bucket.pgxflow-bucket.bucket
  description = "Temporary bucket name"
}

output "backend-bucket-arn" {
  value       = aws_s3_bucket.pgxflow-bucket.arn
  description = "Temporary bucket ARN"
}
