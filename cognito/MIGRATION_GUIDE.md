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
The migration script checks for AWS resource bindings before deletion:

1. **Identity Pool Binding**: Checks for `identity_id` attribute
2. **Group Membership**: Verifies user group associations
3. **Safe Deletion**: Only removes users without bindings

### User States
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
cd cognito/scripts
./test_migration.sh ap-southeast-3 admin@example.com guest@example.com
```

### Direct Script Execution
```bash
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

1. **Always Test**: Use test script before production deployment
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