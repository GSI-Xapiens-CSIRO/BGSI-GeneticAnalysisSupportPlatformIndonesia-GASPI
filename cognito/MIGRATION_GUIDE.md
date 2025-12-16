# Cognito Migration Guide

## Overview

This migration system ensures idempotent Terraform deployments by safely handling existing Cognito users before resource creation.

## Problem Solved

- **Issue**: Terraform fails when Cognito users already exist
- **Solution**: Pre-deployment migration script that safely removes unbound users
- **Result**: Idempotent deployments that preserve users with AWS resource bindings

## Architecture

### Files Structure
```
cognito/
├── migration.tf                  # Terraform migration orchestration
├── scripts/
│   ├── migrate_cognito_users.py  # Main migration script
│   └── test_migration.sh         # Test script
└── cognito.tf                    # User pool client and groups
```

## Migration Logic

### Safety Checks
The migration script performs multiple safety checks:

1. **Duplicate Pool Detection**: Identifies Terraform-managed pools by schema attributes
2. **Identity Pool Binding**: Checks for `identity_id` attribute
3. **Group Membership**: Verifies user group associations
4. **Safe Deletion**: Only removes users without bindings

### Pool and User States
- **No Pools**: No action needed → **CONTINUE**
- **Single Pool**: Use existing pool → **MIGRATE USERS**
- **Single Terraform Pool**: Keep Terraform pool, delete others → **MIGRATE USERS**
- **Multiple/No Terraform Pools**: Error - manual cleanup required → **TERRAFORM FAILS**
- **Bound Users**: Have `identity_id` or group memberships → **PRESERVED**
- **Unbound Users**: No AWS resource connections → **SAFELY DELETED**
- **Non-existent Users**: No action needed → **CONTINUE**

## Usage

### Automatic (Recommended)
```bash
terraform apply
```
Migration runs automatically via `null_resource` dependency.

### Manual Testing
```bash
# Dry run (safe preview)
cd cognito/scripts
./test_migration.sh ap-southeast-3 admin@example.com guest@example.com --dry-run

# Live run (applies changes)
./test_migration.sh ap-southeast-3 admin@example.com guest@example.com
```

### Direct Script Execution
```bash
# Dry run to preview changes
python3 migrate_cognito_users.py \
  --region ap-southeast-3 \
  --user-pool-name "gaspi-users" \
  --admin-username "admin@example.com" \
  --guest-username "guest@example.com" \
  --dry-run

# Live run to apply changes
python3 migrate_cognito_users.py \
  --region ap-southeast-3 \
  --user-pool-name "gaspi-users" \
  --admin-username "admin@example.com" \
  --guest-username "guest@example.com"
```

## Configuration

### Required Variables
- `gaspi-admin-username`: Admin user email
- `gaspi-guest-username`: Guest user email
- `region`: AWS region

### Dependencies
- Python 3.x
- boto3 library
- AWS credentials configured

## Error Handling

### Common Scenarios
1. **User Pool Not Found**: Script exits gracefully, allows Terraform to create new pool
2. **User Not Found**: Logs message, continues with other users
3. **Permission Errors**: Fails with descriptive error message
4. **Binding Detection**: Preserves users with any AWS resource connections

### Exit Codes
- `0`: Success or no action needed
- `1`: Critical error occurred

## Monitoring

### Log Output
```
Found existing user pool: ap-southeast-3_ABC123DEF
User admin@example.com has AWS resource bindings - skipping deletion
Deleted user: guest@example.com
Migration completed successfully
```

## Best Practices

1. **Always Test**: Use `--dry-run` first to preview changes, then test script before production
2. **Backup Strategy**: Consider exporting user data before migration
3. **Monitoring**: Review migration logs for any skipped users
4. **Rollback Plan**: Keep user export for emergency restoration

## Troubleshooting

### Migration Fails
- Check AWS credentials and permissions
- Verify Python dependencies installed
- Ensure user pool name matches configuration

### Users Not Deleted
- Check if users have `identity_id` attribute
- Verify group memberships
- Review IAM permissions for Cognito operations

### Duplicate Pools Found
- Script automatically identifies Terraform-managed pools by schema attributes
- Keeps pools with `terraform`, `identity_id`, `is_medical_director` attributes
- Deletes pools without Terraform schema (manually created)
- Only requires manual cleanup if multiple Terraform pools exist