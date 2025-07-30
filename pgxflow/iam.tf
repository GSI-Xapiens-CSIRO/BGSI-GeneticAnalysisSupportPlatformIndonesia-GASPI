
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
# initFlow Lambda Function
#
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
      "${aws_s3_bucket.pgxflow-references.arn}/*",
    ]
  }
  statement {
    actions = [
      "dynamodb:GetItem",
    ]
    resources = [
      var.dynamo-project-users-table-arn,
      aws_dynamodb_table.pgxflow_references.arn,
    ]
  }
  statement {
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:Query",
    ]
    resources = [
      var.dynamo-clinic-jobs-table-arn,
      "${var.dynamo-clinic-jobs-table-arn}/index/${local.clinic_jobs_project_name_index}",
    ]
  }
  statement {
    actions = [
      "sns:Publish"
    ]
    resources = [
      module.pipeline_lookup.dbsnp_sns_topic_arn,
      module.pipeline_pharmcat.preprocessor_sns_topic_arn,
    ]
  }
  statement {
    actions = [
      "lambda:InvokeFunction"
    ]
    resources = [
      module.lambda-sendJobEmail.lambda_function_arn,
    ]
  }
}


#
# getResultsURL Lambda Function
#
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
      "dynamodb:Query",
    ]
    resources = [
      var.dynamo-project-users-table-arn,
      var.dynamo-clinic-jobs-table-arn,
    ]
  }
}

#
# sendJobEmail Lambda Function
#
data "aws_iam_policy_document" "lambda-sendJobEmail" {
  statement {
    actions = [
      "lambda:InvokeFunction",
    ]
    resources = [
      var.clinic-job-email-lambda-function-arn,
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
      "cognito-idp:ListUsers",
    ]
    resources = [
      var.cognito-user-pool-arn,
    ]
  }
}

#
# batchSubmit Lambda Function
#
data "aws_iam_policy_document" "lambda-batchSubmit" {
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
      "dynamodb:Query",
    ]
    resources = [
      var.dynamo-clinic-jobs-table-arn,
      "${var.dynamo-clinic-jobs-table-arn}/index/${local.clinic_jobs_project_name_index}",
    ]
  }
  statement {
    actions = [
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
    ]
    resources = [
      var.dynamo-clinic-jobs-table-arn,
    ]
  }
  statement {
    actions = [
      "sqs:SendMessage",
      "sqs:SendMessageBatch",
    ]
    resources = [
      aws_sqs_queue.batch_submit_queue.arn,
    ]
  }
}

#
# batchStarter Lambda Function
#
data "aws_iam_policy_document" "lambda-batchStarter" {
  statement {
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
    ]
    resources = [
      aws_sqs_queue.batch_submit_queue.arn,
    ]
  }
  statement {
    actions = [
      "sns:Publish",
    ]
    resources = [
      aws_sns_topic.initFlow.arn,
    ]
  }
  statement {
    actions = [
      "lambda:GetAccountSettings",
    ]
    resources = [
      "*",
    ]
  }
  statement {
    actions = [
      "cloudwatch:GetMetricStatistics",
    ]
    resources = [
      "*",
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
