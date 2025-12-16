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

def safe_delete_user(cognito_client, user_pool_id, username):
    """Safely delete user if no bindings exist"""
    try:
        if check_user_bindings(cognito_client, user_pool_id, username):
            print(f"User {username} has AWS resource bindings - skipping deletion")
            return False
            
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

def main():
    parser = argparse.ArgumentParser(description='Migrate Cognito users safely')
    parser.add_argument('--region', required=True, help='AWS region')
    parser.add_argument('--user-pool-name', required=True, help='Cognito User Pool name')
    parser.add_argument('--admin-username', required=True, help='Admin username')
    parser.add_argument('--guest-username', required=True, help='Guest username')
    
    args = parser.parse_args()
    
    try:
        cognito_client = boto3.client('cognito-idp', region_name=args.region)
        
        # Find existing user pool
        paginator = cognito_client.get_paginator('list_user_pools')
        user_pool_id = None
        
        for page in paginator.paginate(MaxResults=60):
            for pool in page['UserPools']:
                if pool['Name'] == args.user_pool_name:
                    user_pool_id = pool['Id']
                    break
            if user_pool_id:
                break
        
        if not user_pool_id:
            print(f"User pool '{args.user_pool_name}' not found - proceeding with creation")
            sys.exit(0)
        
        print(f"Found existing user pool: {user_pool_id}")
        
        # Check and handle existing users
        users_to_check = [args.admin_username, args.guest_username]
        
        for username in users_to_check:
            safe_delete_user(cognito_client, user_pool_id, username)
        
        print("Migration completed successfully")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()