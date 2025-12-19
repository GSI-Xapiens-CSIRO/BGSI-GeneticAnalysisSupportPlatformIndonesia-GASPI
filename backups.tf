# 
# Backup vault for AWS
resource "aws_backup_vault" "gaspi_backup_vault" {
  name = "gaspi_backup_vault"

  tags          = var.common-tags
  force_destroy = true
}
# 

# 
# Backup plan for AWS
#
resource "aws_backup_plan" "gaspi_backup_plan" {
  name = "gaspi_backup_plan"

  rule {
    rule_name         = "daily"
    target_vault_name = aws_backup_vault.gaspi_backup_vault.name
    schedule          = "cron(0 19 * * ? *)" # Every day at 19:00 UTC
    lifecycle {
      delete_after = 7
    }
  }

  rule {
    rule_name         = "weekly"
    target_vault_name = aws_backup_vault.gaspi_backup_vault.name
    schedule          = "cron(0 20 ? * SUN *)" # Every Sunday at 20:00 UTC
    lifecycle {
      delete_after = 30
    }
  }

  rule {
    rule_name         = "monthly"
    target_vault_name = aws_backup_vault.gaspi_backup_vault.name
    schedule          = "cron(0 21 1 * ? *)" # 1st of every month at 21:00 UTC
    lifecycle {
      delete_after = 365
    }
  }

  rule {
    rule_name         = "yearly"
    target_vault_name = aws_backup_vault.gaspi_backup_vault.name
    schedule          = "cron(0 22 1 1 ? *)" # 1st January every year at 22:00 UTC
    lifecycle {
      delete_after = 3650
    }
  }

  tags = var.common-tags
}

#
# Backup selection for AWS
#
data "aws_iam_policy_document" "gaspi_backup_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["backup.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "gaspi_backup_role" {
  name               = "gaspi_backup_role"
  assume_role_policy = data.aws_iam_policy_document.gaspi_backup_assume_role.json
}

resource "aws_iam_role_policy_attachment" "gaspi_backup_role_attachment" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
  role       = aws_iam_role.gaspi_backup_role.name
}

resource "aws_iam_role_policy_attachment" "gaspi_backup_s3_policy_attachment" {
  policy_arn = "arn:aws:iam::aws:policy/AWSBackupServiceRolePolicyForS3Backup"
  role       = aws_iam_role.gaspi_backup_role.name
}

resource "aws_iam_role_policy_attachment" "gaspi_restore_s3_policy_attachment" {
  policy_arn = "arn:aws:iam::aws:policy/AWSBackupServiceRolePolicyForS3Restore"
  role       = aws_iam_role.gaspi_backup_role.name
}

resource "aws_backup_selection" "gaspi_backup_selection" {
  iam_role_arn = aws_iam_role.gaspi_backup_role.arn
  name         = "gaspi_backup_resource_selection"
  plan_id      = aws_backup_plan.gaspi_backup_plan.id

  selection_tag {
    type  = "STRINGEQUALS"
    key   = "backup"
    value = "true"
  }
}
