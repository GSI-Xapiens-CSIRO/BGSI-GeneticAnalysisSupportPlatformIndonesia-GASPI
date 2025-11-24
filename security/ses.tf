data "aws_ses_email_identity" "ses_source_email" {
  email = var.ses-source-email
}
