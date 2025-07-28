# 
# Pool and client
# 
resource "aws_cognito_user_pool" "gaspi_user_pool" {
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

resource "aws_cognito_user_pool_client" "gaspi_user_pool_client" {
  name = "gaspi-users-client"

  user_pool_id = aws_cognito_user_pool.gaspi_user_pool.id

  explicit_auth_flows = [
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_ADMIN_USER_PASSWORD_AUTH",
    "ALLOW_USER_PASSWORD_AUTH"
  ]

  access_token_validity  = 5
  auth_session_validity  = 3
  refresh_token_validity = 2
  id_token_validity      = 5

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "hours"
  }
}

# 
# groups
# 

# admin group
resource "aws_cognito_user_group" "admin_group" {
  name         = "administrators"
  user_pool_id = aws_cognito_user_pool.gaspi_user_pool.id
  description  = "Group of users who can has admin privileges"
  role_arn     = aws_iam_role.admin_group_role.arn
  precedence   = 1
}

data "aws_iam_policy_document" "admin_group_assume_role_policy" {
  statement {
    principals {
      type        = "Federated"
      identifiers = ["cognito-identity.amazonaws.com"]
    }

    actions = ["sts:AssumeRoleWithWebIdentity"]

    condition {
      test     = "StringEquals"
      variable = "cognito-identity.amazonaws.com:aud"
      values   = [aws_cognito_identity_pool.gaspi_identity_pool.id]
    }

    condition {
      test     = "ForAnyValue:StringLike"
      variable = "cognito-identity.amazonaws.com:amr"
      values   = ["authenticated"]
    }
  }
}

resource "aws_iam_role" "admin_group_role" {
  name               = "gaspi-admin-group-role"
  assume_role_policy = data.aws_iam_policy_document.admin_group_assume_role_policy.json
}

data "aws_iam_policy_document" "admin_group_role_policy" {
  # project access
  statement {
    actions = [
      "s3:*"
    ]
    resources = [
      "arn:aws:s3:::${var.dataportal-bucket-prefix}*/projects/*",
    ]
  }

  # private access
  statement {
    effect = "Allow"

    actions = [
      "s3:ListBucket",
    ]

    resources = [
      "arn:aws:s3:::${var.dataportal-bucket-prefix}*",
    ]

    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values = [
        "private/$${cognito-identity.amazonaws.com:sub}/",
        "private/$${cognito-identity.amazonaws.com:sub}/*",
      ]
    }
  }

  # private access
  statement {
    effect = "Allow"

    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]

    resources = [
      "arn:aws:s3:::${var.dataportal-bucket-prefix}*/private/$${cognito-identity.amazonaws.com:sub}/*",
    ]
  }
}

resource "aws_iam_policy" "admin_group_role_policy" {
  name        = "gaspi-admin-group-role-policy"
  description = "admin group permissions"
  policy      = data.aws_iam_policy_document.admin_group_role_policy.json

}

resource "aws_iam_role_policy_attachment" "admin_group_role_policy_attachment" {
  role       = aws_iam_role.admin_group_role.name
  policy_arn = aws_iam_policy.admin_group_role_policy.arn
}

# manager group
resource "aws_cognito_user_group" "manager_group" {
  name         = "managers"
  user_pool_id = aws_cognito_user_pool.gaspi_user_pool.id
  description  = "Group of users who can has management privileges"
  role_arn     = aws_iam_role.manager_group_role.arn
  precedence   = 2
}

data "aws_iam_policy_document" "manager_group_assume_role_policy" {
  statement {
    principals {
      type        = "Federated"
      identifiers = ["cognito-identity.amazonaws.com"]
    }

    actions = ["sts:AssumeRoleWithWebIdentity"]

    condition {
      test     = "StringEquals"
      variable = "cognito-identity.amazonaws.com:aud"
      values   = [aws_cognito_identity_pool.gaspi_identity_pool.id]
    }

    condition {
      test     = "ForAnyValue:StringLike"
      variable = "cognito-identity.amazonaws.com:amr"
      values   = ["authenticated"]
    }
  }
}

resource "aws_iam_role" "manager_group_role" {
  name               = "gaspi-manager-group-role"
  assume_role_policy = data.aws_iam_policy_document.manager_group_assume_role_policy.json
}

data "aws_iam_policy_document" "manager_group_role_policy" {
  # project access
  statement {
    actions = [
      "s3:*"
    ]
    resources = [
      "arn:aws:s3:::${var.dataportal-bucket-prefix}*/projects/*",
    ]
  }

  # private access
  statement {
    effect = "Allow"

    actions = [
      "s3:ListBucket",
    ]

    resources = [
      "arn:aws:s3:::${var.dataportal-bucket-prefix}*",
    ]

    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values = [
        "private/$${cognito-identity.amazonaws.com:sub}/",
        "private/$${cognito-identity.amazonaws.com:sub}/*",
      ]
    }
  }

  # private access
  statement {
    effect = "Allow"

    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]

    resources = [
      "arn:aws:s3:::${var.dataportal-bucket-prefix}*/private/$${cognito-identity.amazonaws.com:sub}/*",
    ]
  }

  # Allow access to AWS Pricing API
  statement {
    effect = "Allow"

    actions = [
      "pricing:*",
    ]

    resources = ["*"]
  }
}

resource "aws_iam_policy" "manager_group_role_policy" {
  name        = "gaspi-manager-group-role-policy"
  description = "manager group permissions"
  policy      = data.aws_iam_policy_document.manager_group_role_policy.json

}

resource "aws_iam_role_policy_attachment" "manager_group_role_policy_attachment" {
  role       = aws_iam_role.manager_group_role.name
  policy_arn = aws_iam_policy.manager_group_role_policy.arn
}

# 
# default users
# 
resource "aws_cognito_user" "guest" {
  user_pool_id = aws_cognito_user_pool.gaspi_user_pool.id
  username     = var.gaspi-guest-username
  password     = var.gaspi-guest-password

  attributes = {
    terraform      = true
    email          = var.gaspi-guest-username
    email_verified = true
    given_name     = "Guest"
    family_name    = "Guest"
  }

  lifecycle {
    ignore_changes = [
      password,
      attributes["identity_id"],
      attributes["is_medical_director"],
    ]
  }
}

resource "aws_cognito_user" "admin" {
  user_pool_id = aws_cognito_user_pool.gaspi_user_pool.id
  username     = var.gaspi-admin-username
  password     = var.gaspi-admin-password

  attributes = {
    terraform      = true
    given_name     = "Admin"
    family_name    = "Admin"
    email          = var.gaspi-admin-username
    email_verified = true
  }

  lifecycle {
    ignore_changes = [
      password,
      attributes["identity_id"],
      attributes["is_medical_director"],
    ]
  }
}

# 
# group assignments
# 
# admin
resource "aws_cognito_user_in_group" "admin_in_admin_group" {
  user_pool_id = aws_cognito_user_pool.gaspi_user_pool.id
  group_name   = aws_cognito_user_group.admin_group.name
  username     = aws_cognito_user.admin.username
}
