resource "aws_cognito_identity_pool" "gaspi_identity_pool" {
  identity_pool_name               = "gaspi-users"
  allow_unauthenticated_identities = false
  tags                             = var.common-tags

  cognito_identity_providers {
    client_id     = aws_cognito_user_pool_client.gaspi_user_pool_client.id
    provider_name = aws_cognito_user_pool.gaspi_user_pool.endpoint
  }
}

# authenticated role
data "aws_iam_policy_document" "gaspi_authenticated" {
  statement {
    effect = "Allow"

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

resource "aws_iam_role" "gaspi_authenticated" {
  name               = "gaspi_authenticated"
  assume_role_policy = data.aws_iam_policy_document.gaspi_authenticated.json
}

# this is the defauly policy for the authenticated role
data "aws_iam_policy_document" "gaspi_authenticated_role_policy" {
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

resource "aws_iam_role_policy" "gaspi_authenticated" {
  name   = "authenticated_policy"
  role   = aws_iam_role.gaspi_authenticated.id
  policy = data.aws_iam_policy_document.gaspi_authenticated_role_policy.json
}

# unauthenticated role
data "aws_iam_policy_document" "gaspi_unauthenticated" {
  statement {
    effect = "Allow"

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
      values   = ["unauthenticated"]
    }
  }
}

resource "aws_iam_role" "gaspi_unauthenticated" {
  name               = "gaspi_unauthenticated"
  assume_role_policy = data.aws_iam_policy_document.gaspi_unauthenticated.json
}

data "aws_iam_policy_document" "gaspi_unauthenticated_role_policy" {
  statement {
    effect = "Deny"

    actions = [
      "*"
    ]

    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "gaspi_unauthenticated" {
  name   = "unauthenticated_policy"
  role   = aws_iam_role.gaspi_unauthenticated.id
  policy = data.aws_iam_policy_document.gaspi_unauthenticated_role_policy.json
}


resource "aws_cognito_identity_pool_roles_attachment" "gaspi_cognito_roles" {
  identity_pool_id = aws_cognito_identity_pool.gaspi_identity_pool.id

  role_mapping {
    identity_provider         = "${aws_cognito_user_pool.gaspi_user_pool.endpoint}:${aws_cognito_user_pool_client.gaspi_user_pool_client.id}"
    type                      = "Token"
    ambiguous_role_resolution = "AuthenticatedRole"
  }

  roles = {
    "authenticated"   = aws_iam_role.gaspi_authenticated.arn
    "unauthenticated" = aws_iam_role.gaspi_unauthenticated.arn
  }
}

