data "aws_iam_policy_document" "lambda-initFlow" {
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
      "${aws_s3_bucket.pgxflow-references.arn}/preprocessor/*",
    ]
  }
  statement {
    actions = [
      "s3:PutObject",
    ]
    resources = [
      "${aws_s3_bucket.pgxflow-bucket.arn}/*",
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
      aws_s3_bucket.pgxflow-bucket.arn,
    ]
  }
  statement {
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = [
      "${aws_s3_bucket.pgxflow-bucket.arn}/*"
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
      aws_s3_bucket.pgxflow-bucket.arn,
      var.data-portal-bucket-arn,
    ]
  }
  statement {
    actions = [
      "s3:GetObject",
      "s3:DeleteObject",
    ]
    resources = [
      "${aws_s3_bucket.pgxflow-bucket.arn}/*"
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
