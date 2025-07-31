# bucket definition
resource "aws_s3_bucket" "bui-hosted-bucket" {
  bucket_prefix = "webgui-bucket-"
  force_destroy = true
  tags          = var.common-tags
}

# allow cloudfront to access s3
resource "aws_s3_bucket_policy" "s3_access_from_cloudfront" {
  bucket = aws_s3_bucket.bui-hosted-bucket.id
  policy = data.aws_iam_policy_document.s3_access_from_cloudfront.json
}

# iam policy
data "aws_iam_policy_document" "s3_access_from_cloudfront" {
  statement {
    principals {
      type = "Service"
      identifiers = [
        "cloudfront.amazonaws.com"
      ]
    }

    actions = [
      "s3:GetObject"
    ]

    resources = [
      "${aws_s3_bucket.bui-hosted-bucket.arn}/*"
    ]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values = [
        aws_cloudfront_distribution.bui-s3-distribution.arn
      ]
    }
  }
}


data "external" "version" {
  program     = ["bash", "${path.module}/get_version.sh"]
  working_dir = path.root
}


resource "aws_s3_object" "version" {
  bucket  = aws_s3_bucket.bui-hosted-bucket.id
  key     = "version.txt"
  content = data.external.version.result.version

}


resource "terraform_data" "cloudfront-version-invalidate" {
  triggers_replace = [
    aws_s3_object.version.content
  ]

  provisioner "local-exec" {
    command = "aws cloudfront create-invalidation --distribution-id ${aws_cloudfront_distribution.bui-s3-distribution.id} --paths '/${aws_s3_object.version.key}'"
  }
}
