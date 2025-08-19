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

resource "aws_s3_bucket" "pgxflow-references" {
  bucket_prefix = "pgxflow-backend-references-"
  force_destroy = true
  tags          = var.common-tags
}

resource "aws_s3_bucket_versioning" "pgxflow-references" {
  bucket = aws_s3_bucket.pgxflow-references.id
  versioning_configuration {
    status = "Enabled"
  }
}
