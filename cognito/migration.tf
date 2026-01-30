# Migration script to handle existing Cognito users
resource "null_resource" "cognito_migration" {
  triggers = {
    user_pool_name = "gaspi-users"
    admin_username = var.gaspi-admin-username
    guest_username = var.gaspi-guest-username
  }

  provisioner "local-exec" {
    command = <<-EOT
      python3 ${path.module}/scripts/migrate_cognito_users.py \
        --region ${var.region} \
        --user-pool-name "gaspi-users" \
        --admin-username "${var.gaspi-admin-username}" \
        --guest-username "${var.gaspi-guest-username}"
    EOT
  }
}

# Ensure migration runs before creating Cognito resources
resource "aws_cognito_user_pool" "gaspi_user_pool" {
  depends_on = [null_resource.cognito_migration]

  name = "gaspi-users"
  tags = var.common-tags

  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  mfa_configuration = "OPTIONAL"

  software_token_mfa_configuration {
    enabled = true
  }

  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 7
  }

  schema {
    name                     = "terraform"
    attribute_data_type      = "Boolean"
    developer_only_attribute = false
    mutable                  = false
    required                 = false
  }

  schema {
    name                     = "identity_id"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false

    string_attribute_constraints {}
  }

  schema {
    name                     = "is_medical_director"
    attribute_data_type      = "Boolean"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
  }

  email_configuration {
    configuration_set     = aws_ses_configuration_set.ses_feedback_config.name
    email_sending_account = "DEVELOPER"
    from_email_address    = var.ses-source-email
    source_arn            = data.aws_ses_email_identity.ses_source_email.arn
  }

  lambda_config {
    custom_message = module.lambda-customMessageLambdaTrigger.lambda_function_arn
  }
}