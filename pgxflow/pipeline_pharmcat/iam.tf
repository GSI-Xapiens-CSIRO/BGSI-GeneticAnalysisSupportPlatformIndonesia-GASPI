data "aws_iam_policy_document" "lambda-initPharmcat" {
  statement {
    actions = [
      "s3:ListBucket",
    ]
    resources = [
      var.data-portal-bucket-arn,
    ]
    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values = [
        "projects/*/project-files/*",
      ]
    }
  }
  statement {
    actions = [
      "s3:GetObject",
    ]
    resources = [
      "${var.data-portal-bucket-arn}/projects/*/project-files/*",
    ]
  }
  statement {
    actions = [
      "dynamodb:GetItem",
    ]
    resources = [
      var.dynamo-project-users-table-arn,
    ]
  }
  statement {
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
    ]
    resources = [
      var.dynamo-clinic-jobs-table-arn,
    ]
  }
  statement {
    actions = [
      "lambda:InvokeFunction"
    ]
    resources = [
      module.lambda-preprocessor.lambda_function_arn,
    ]
  }
}

data "aws_iam_policy_document" "lambda-preprocessor" {
  statement {
    actions = [
      "s3:ListBucket",
    ]
    resources = [
      var.data-portal-bucket-arn,
    ]
    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values = [
        "projects/*/project-files/*",
      ]
    }
  }
  statement {
    actions = [
      "s3:GetObject",
    ]
    resources = [
      "${var.data-portal-bucket-arn}/projects/*/project-files/*",
      "${var.pgxflow-reference-bucket-arn}/preprocessor/*",
    ]
  }
  statement {
    actions = [
      "s3:PutObject",
    ]
    resources = [
      "${var.pgxflow-backend-bucket-arn}/*",
    ]
  }
  statement {
    actions = [
      "dynamodb:GetItem",
      "dynamodb:UpdateItem",
    ]
    resources = [
      var.dynamo-clinic-jobs-table-arn,
    ]
  }
  statement {
    actions = [
      "lambda:InvokeFunction",
    ]
    resources = [
      module.lambda-pharmcat.lambda_function_arn,
    ]
  }
}

data "aws_iam_policy_document" "lambda-pharmcat" {
  statement {
    actions = [
      "s3:ListBucket",
    ]
    resources = [
      var.pgxflow-backend-bucket-arn,
    ]
  }
  statement {
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = [
      "${var.pgxflow-backend-bucket-arn}/*"
    ]
  }
  statement {
    actions = [
      "dynamodb:GetItem",
      "dynamodb:UpdateItem",
    ]
    resources = [
      var.dynamo-clinic-jobs-table-arn,
    ]
  }
  statement {
    actions = [
      "lambda:InvokeFunction",
    ]
    resources = [
      module.lambda-postprocessor.lambda_function_arn,
    ]
  }
}

data "aws_iam_policy_document" "lambda-postprocessor" {
  statement {
    actions = [
      "s3:ListBucket",
    ]
    resources = [
      var.pgxflow-backend-bucket-arn,
      var.data-portal-bucket-arn,
    ]
  }
  statement {
    actions = [
      "s3:GetObject",
      "s3:DeleteObject",
    ]
    resources = [
      "${var.pgxflow-backend-bucket-arn}/*"
    ]
  }
  statement {
    actions = [
      "s3:GetObject",
    ]
    resources = [
      "${var.data-portal-bucket-arn}/projects/*/project-files/*"
    ]
  }
  statement {
    actions = [
      "s3:PutObject",
    ]
    resources = [
      "${var.data-portal-bucket-arn}/projects/*/clinical-workflows/*"
    ]
  }
  statement {
    actions = [
      "dynamodb:GetItem",
      "dynamodb:UpdateItem",
    ]
    resources = [
      var.dynamo-clinic-jobs-table-arn,
    ]
  }
}

data "aws_iam_policy_document" "lambda-getResultsURL" {
  statement {
    actions = [
      "s3:GetObject",
    ]
    resources = [
      "${var.data-portal-bucket-arn}/projects/*/clinical-workflows/*"
    ]
  }
  statement {
    actions = [
      "s3:ListBucket",
    ]
    resources = [
      var.data-portal-bucket-arn
    ]
  }
  statement {
    actions = [
      "dynamodb:GetItem",
    ]
    resources = [
      var.dynamo-project-users-table-arn,
    ]
  }
}

#
# updateReferenceFiles Lambda Function
#
data "aws_iam_policy_document" "lambda-updateReferenceFiles" {
  statement {
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = [
      "${var.pgxflow-reference-bucket-arn}/*",
    ]
  }

  statement {
    actions = [
      "s3:ListBucket"
    ]
    resources = [
      var.pgxflow-reference-bucket-arn,
    ]
  }

  statement {
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DescribeTable",
    ]
    resources = [
      var.dynamo-references-table-arn
    ]
  }
  statement {
    actions = [
      "ec2:RunInstances",
      "ec2:DescribeInstances",
      "ec2:CreateTags",
      "ec2:DescribeImages",
    ]
    resources = [
      "*",
    ]
  }

  statement {
    actions = [
      "iam:PassRole",
    ]
    resources = [
      aws_iam_role.ec2_references_instance_role.arn,
    ]
  }
}

#
# references EC2 Instance role - used by updateReferenceFiles
#
resource "aws_iam_instance_profile" "ec2_references_instance_profile" {
  name = "pgxflow_backend_ec2_references_instance_profile"
  role = aws_iam_role.ec2_references_instance_role.name
}

resource "aws_iam_role" "ec2_references_instance_role" {
  name               = "svep_backend_ec2_references_instance_role"
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
      "${var.pgxflow-reference-bucket-arn}/*",
    ]
  }
  statement {
    actions = [
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
    ]
    resources = [
      var.dynamo-references-table-arn,
    ]
  }
}
