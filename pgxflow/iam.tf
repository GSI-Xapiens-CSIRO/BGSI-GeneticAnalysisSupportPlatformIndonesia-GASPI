
#
# references EC2 Instance role - used by updateReferenceFiles
#
resource "aws_iam_instance_profile" "ec2_references_instance_profile" {
  name = "pgxflow_backend_ec2_references_instance_profile"
  role = aws_iam_role.ec2_references_instance_role.name
}

resource "aws_iam_role" "ec2_references_instance_role" {
  name               = "pgxflow_backend_ec2_references_instance_role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role_policy.json
}

data "aws_iam_policy_document" "ec2_assume_role_policy" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "ec2_references_policy" {
  name   = "pgxflow_backend_ec2_references_policy"
  role   = aws_iam_role.ec2_references_instance_role.id
  policy = data.aws_iam_policy_document.ec2_references_policy.json
}

data "aws_iam_policy_document" "ec2_references_policy" {
  statement {
    actions = [
      "s3:PutObject",
    ]
    resources = [
      "${aws_s3_bucket.pgxflow-references.arn}/*",
    ]
  }
  statement {
    actions = [
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
    ]
    resources = [
      aws_dynamodb_table.pgxflow_references.arn
    ]
  }
}

#
# vcfstatsGraphic Lambda Function
#
data "aws_iam_policy_document" "lambda-qcFigures" {
  statement {
    actions = [
      "s3:ListBucket",
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = [
      "${var.data-portal-bucket-arn}",
      "${var.data-portal-bucket-arn}/*",
    ]
  }
}

#
# qcNotes Lambda Function
#
data "aws_iam_policy_document" "lambda-qcNotes" {
  statement {
    actions = [
      "s3:ListBucket",
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = [
      "${var.data-portal-bucket-arn}",
      "${var.data-portal-bucket-arn}/*",
    ]
  }
}
