resource "aws_s3_bucket" "pgxflow-bucket" {
  bucket_prefix = "pgxflow-backend-"
  force_destroy = true
  tags          = var.common-tags
}

resource "aws_s3_bucket" "lambda-layers-bucket" {
  bucket_prefix = "pgxflow-backend-layers-"
  force_destroy = true
  tags          = var.common-tags
}
