data "aws_iam_policy_document" "lambda-sendRegistrationEmail" {
  statement {
    actions = [
      "ses:SendEmail"
    ]
    resources = [
      "arn:aws:ses:${var.region}:${data.aws_caller_identity.this.account_id}:identity/*",
      aws_ses_configuration_set.ses_feedback_config.arn,
    ]
  }
  statement {
    actions = [
      "ssm:GetParameter"
    ]
    resources = [
      "arn:aws:ssm:${var.region}:${data.aws_caller_identity.this.account_id}:parameter/${var.bui-ssm-parameter-name}"
    ]
  }
}

data "aws_iam_policy_document" "lambda-sendClinicJobEmail" {
  statement {
    actions = [
      "ses:SendEmail"
    ]
    resources = [
      "arn:aws:ses:${var.region}:${data.aws_caller_identity.this.account_id}:identity/*",
      aws_ses_configuration_set.ses_feedback_config.arn,
    ]
  }
  statement {
    actions = [
      "ssm:GetParameter"
    ]
    resources = [
      "arn:aws:ssm:${var.region}:${data.aws_caller_identity.this.account_id}:parameter/${var.bui-ssm-parameter-name}"
    ]
  }
}

# SES Email Notification Logging
data "aws_iam_policy_document" "ses-sns-access" {
  statement {
    sid    = "AllowSESToPublishToSNS"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["ses.amazonaws.com"]
    }

    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.sesDeliveryLogger.arn]

    # Removing specific conditions to see if that fixes the permission issue
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.this.account_id]
    }
  }
}
