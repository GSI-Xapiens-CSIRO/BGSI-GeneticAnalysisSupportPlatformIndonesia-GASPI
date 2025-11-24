data "aws_iam_policy_document" "lambda-sendSecurityAlert" {
  statement {
    actions = [
      "ses:SendEmail"
    ]
    resources = [
      "arn:aws:ses:${var.region}:${data.aws_caller_identity.this.account_id}:identity/*",
    ]
  }
}
