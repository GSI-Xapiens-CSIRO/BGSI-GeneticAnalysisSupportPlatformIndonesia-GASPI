#!/usr/bin/env python3
import argparse
import boto3
import sys
from botocore.exceptions import ClientError

def check_user_bindings(cognito_client, user_pool_id, username):
    """Check if user has bindings to other AWS resources"""
    try:
        # Get user attributes to check for identity_id
        response = cognito_client.admin_get_user(
            UserPoolId=user_pool_id,
            Username=username
        )
        
        # Check if user has identity_id attribute (indicates Cognito Identity Pool binding)
        for attr in response.get('UserAttributes', []):
            if attr['Name'] == 'identity_id' and attr['Value']:
                return True
                
        # Check if user is in any groups
        try:
            groups_response = cognito_client.admin_list_groups_for_user(
                UserPoolId=user_pool_id,
                Username=username
            )
            if groups_response.get('Groups'):
                return True
        except ClientError:
            pass
            
        return False
    except ClientError:
        return False

def safe_delete_user(cognito_client, user_pool_id, username, dry_run=False):
    """Safely delete user if no bindings exist"""
    try:
        if check_user_bindings(cognito_client, user_pool_id, username):
            print(f"User {username} has AWS resource bindings - skipping deletion")
            return False
            
        if dry_run:
            print(f"[DRY RUN] Would delete user: {username}")
        else:
            cognito_client.admin_delete_user(
                UserPoolId=user_pool_id,
                Username=username
            )
            print(f"Deleted user: {username}")
        return True
    except ClientError as e:
        if e.response['Error']['Code'] == 'UserNotFoundException':
            print(f"User {username} not found - nothing to delete")
            return True
        print(f"Error deleting user {username}: {e}")
        return False

def is_terraform_managed_pool(cognito_client, pool_id):
    """Check if pool has Terraform-managed attributes"""
    try:
        response = cognito_client.describe_user_pool(UserPoolId=pool_id)
        pool = response['UserPool']
        
        # Check for Terraform-specific schema attributes
        schema = pool.get('Schema', [])
        terraform_attrs = ['terraform', 'identity_id', 'is_medical_director']
        
        found_attrs = []
        for attr in schema:
            if attr['Name'] in terraform_attrs:
                found_attrs.append(attr['Name'])
        
        # Pool is Terraform-managed if it has our custom attributes
        is_managed = len(found_attrs) >= 2
        print(f"Pool {pool_id}: Found attributes {found_attrs} - {'Terraform managed' if is_managed else 'Not Terraform managed'}")
        return is_managed
        
    except ClientError as e:
        print(f"Error checking pool {pool_id}: {e}")
        return False

def find_user_pool(cognito_client, pool_name, dry_run=False):
    """Find correct user pool, delete incorrect duplicates"""
    paginator = cognito_client.get_paginator('list_user_pools')
    matching_pools = []
    
    for page in paginator.paginate(MaxResults=60):
        for pool in page['UserPools']:
            if pool['Name'] == pool_name:
                matching_pools.append(pool)
    
    if len(matching_pools) == 0:
        print(f"No existing pools named '{pool_name}' found")
        return None
    elif len(matching_pools) == 1:
        print(f"Found existing user pool: {matching_pools[0]['Id']}")
        return matching_pools[0]['Id']
    else:
        print(f"Found {len(matching_pools)} duplicate pools with name '{pool_name}'")
        
        # Find Terraform-managed pools
        terraform_pools = []
        for pool in matching_pools:
            if is_terraform_managed_pool(cognito_client, pool['Id']):
                terraform_pools.append(pool)
        
        if len(terraform_pools) == 1:
            # Keep the Terraform-managed pool, delete others
            correct_pool = terraform_pools[0]
            incorrect_pools = [p for p in matching_pools if p['Id'] != correct_pool['Id']]
            
            print(f"Keeping Terraform-managed pool: {correct_pool['Id']}")
            
            for pool in incorrect_pools:
                try:
                    if dry_run:
                        print(f"[DRY RUN] Would delete incorrect pool: {pool['Id']}")
                    else:
                        print(f"Deleting incorrect pool: {pool['Id']}")
                        cognito_client.delete_user_pool(UserPoolId=pool['Id'])
                except ClientError as e:
                    print(f"Warning: Could not delete pool {pool['Id']}: {e}")
            
            return correct_pool['Id']
        elif len(terraform_pools) == 0:
            # No Terraform pools found - keep newest, delete others
            print("No Terraform-managed pools found - keeping newest pool")
            newest_pool = max(matching_pools, key=lambda p: p['CreationDate'])
            older_pools = [p for p in matching_pools if p['Id'] != newest_pool['Id']]
            
            print(f"Keeping newest pool: {newest_pool['Id']} (created: {newest_pool['CreationDate']})")
            
            for pool in older_pools:
                try:
                    if dry_run:
                        print(f"[DRY RUN] Would delete older pool: {pool['Id']}")
                    else:
                        print(f"Deleting older pool: {pool['Id']}")
                        cognito_client.delete_user_pool(UserPoolId=pool['Id'])
                except ClientError as e:
                    print(f"Warning: Could not delete pool {pool['Id']}: {e}")
            
            return newest_pool['Id']
        else:
            # Multiple Terraform pools found - require manual cleanup
            print(f"ERROR: Found {len(terraform_pools)} Terraform-managed pools (expected 1)")
            print("Please manually delete duplicate pools before running Terraform:")
            for pool in matching_pools:
                managed = "(Terraform)" if pool in terraform_pools else "(Manual)"
                print(f"  - Pool ID: {pool['Id']} {managed} (created: {pool['CreationDate']})")
            raise Exception("Multiple Terraform pools found - manual cleanup required")

def main():
    parser = argparse.ArgumentParser(description='Migrate Cognito users safely')
    parser.add_argument('--region', required=True, help='AWS region')
    parser.add_argument('--user-pool-name', required=True, help='Cognito User Pool name')
    parser.add_argument('--admin-username', required=True, help='Admin username')
    parser.add_argument('--guest-username', required=True, help='Guest username')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be done without making changes')
    
    args = parser.parse_args()
    
    if args.dry_run:
        print("=== DRY RUN MODE - No changes will be made ===")
    
    try:
        cognito_client = boto3.client('cognito-idp', region_name=args.region)
        
        # Find existing user pool (fail if duplicates)
        user_pool_id = find_user_pool(cognito_client, args.user_pool_name, args.dry_run)
        
        if not user_pool_id:
            print(f"No existing pools found - proceeding with creation")
            sys.exit(0)
        
        # Check and handle existing users in the remaining pool
        users_to_check = [args.admin_username, args.guest_username]
        
        for username in users_to_check:
            safe_delete_user(cognito_client, user_pool_id, username, args.dry_run)
        
        if args.dry_run:
            print("=== DRY RUN COMPLETE - Run without --dry-run to apply changes ===")
        else:
            print("Migration completed successfully")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()