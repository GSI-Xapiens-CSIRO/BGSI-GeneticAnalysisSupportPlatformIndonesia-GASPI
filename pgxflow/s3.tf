resource "aws_s3_bucket" "pgxflow-bucket" {
  bucket_prefix = "pgxflow-backend-"
  tags          = var.common-tags
}
