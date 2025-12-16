#!/bin/bash

# Test script for Cognito migration
# Usage: ./test_migration.sh <region> <admin-email> <guest-email>

REGION=${1:-ap-southeast-3}
ADMIN_EMAIL=${2:-admin@example.com}
GUEST_EMAIL=${3:-guest@example.com}

echo "Testing Cognito migration script..."
echo "Region: $REGION"
echo "Admin email: $ADMIN_EMAIL"
echo "Guest email: $GUEST_EMAIL"

python3 migrate_cognito_users.py \
  --region "$REGION" \
  --user-pool-name "gaspi-users" \
  --admin-username "$ADMIN_EMAIL" \
  --guest-username "$GUEST_EMAIL"

echo "Migration test completed."