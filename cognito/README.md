# GASPI Cognito Module

## Quick Start

```bash
# Deploy with automatic migration
terraform apply

# Test migration manually
cd scripts && ./test_migration.sh ap-southeast-3 admin@example.com guest@example.com
```

## Features

- ✅ **Idempotent Deployments**: Handles existing Cognito users safely
- ✅ **Resource Binding Detection**: Preserves users with AWS connections
- ✅ **Automatic Migration**: Runs before Terraform resource creation
- ✅ **Safe Deletion**: Only removes unbound users

## Architecture

### Components
- **User Pool**: Authentication service
- **Identity Pool**: AWS resource access
- **Groups**: Admin and Manager roles with S3 permissions
- **Lambda Triggers**: Custom email messaging
- **SES Integration**: Email delivery with tracking

### Migration System
- **Pre-deployment Check**: Scans existing users
- **Binding Detection**: Identifies AWS resource connections
- **Safe Cleanup**: Removes only unbound users

## Documentation

- [Migration Guide](./MIGRATION_GUIDE.md) - Detailed migration process
- [Process Diagrams](./PROCESS_DIAGRAM.md) - Visual flow charts

## Files

```
cognito/
├── README.md                 # This file
├── MIGRATION_GUIDE.md        # Detailed migration docs
├── PROCESS_DIAGRAM.md        # Mermaid diagrams
├── migration.tf              # Migration orchestration
├── cognito.tf               # User pool client & groups
├── cognito-idp.tf           # Identity pool & roles
├── lambda.tf                # Lambda functions
├── ses.tf                   # Email configuration
└── scripts/
    ├── migrate_cognito_users.py  # Migration script
    └── test_migration.sh         # Test script
```

## Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `gaspi-admin-username` | Admin email | `admin@example.com` |
| `gaspi-guest-username` | Guest email | `guest@example.com` |
| `region` | AWS region | `ap-southeast-3` |
| `ses-source-email` | Email sender | `noreply@example.com` |

## Outputs

| Output | Description |
|--------|-------------|
| `cognito_user_pool_id` | User pool identifier |
| `cognito_client_id` | Client application ID |
| `cognito_identity_pool_id` | Identity pool ID |
| `admin_login_command` | CLI command for admin login |