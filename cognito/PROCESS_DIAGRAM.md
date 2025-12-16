# Cognito Migration Process Diagram

## Migration Flow

**Purpose**: Shows the complete migration process from Terraform execution to resource creation.

**Key Points**:
- Migration runs automatically before Cognito resources are created
- Script safely handles both existing and non-existing user pools
- Users with AWS bindings are preserved, unbound users are deleted
- Process is idempotent - safe to run multiple times

```mermaid
flowchart TD
    A[Terraform Apply] --> B[null_resource: cognito_migration]
    B --> C[Execute migrate_cognito_users.py]
    C --> D{User Pool Exists?}
    
    D -->|No| E[Log: Pool not found]
    E --> F[Exit 0 - Continue Terraform]
    
    D -->|Yes| G[Found existing pool]
    G --> H[Check Admin User]
    H --> I{Admin User Exists?}
    
    I -->|No| J[Log: Admin not found]
    I -->|Yes| K{Admin Has Bindings?}
    
    K -->|Yes| L[Log: Admin has bindings - Skip]
    K -->|No| M[Delete Admin User]
    
    J --> N[Check Guest User]
    L --> N
    M --> N
    
    N --> O{Guest User Exists?}
    O -->|No| P[Log: Guest not found]
    O -->|Yes| Q{Guest Has Bindings?}
    
    Q -->|Yes| R[Log: Guest has bindings - Skip]
    Q -->|No| S[Delete Guest User]
    
    P --> T[Migration Complete]
    R --> T
    S --> T
    
    T --> U[Terraform Creates User Pool]
    U --> V[Create User Pool Client]
    V --> W[Create Groups & Users]
    
    F --> U
```

## Binding Detection Logic

**Purpose**: Illustrates how the script determines if a user has AWS resource connections.

**Safety Checks**:
1. **Identity Pool Binding**: Users with `identity_id` attribute are connected to Cognito Identity Pool
2. **Group Membership**: Users in groups have role-based AWS permissions
3. **Decision**: Only users without any bindings are safe to delete

```mermaid
flowchart TD
    A[Check User Bindings] --> B[Get User Attributes]
    B --> C{Has identity_id?}
    
    C -->|Yes & Not Empty| D[User Has Identity Pool Binding]
    C -->|No/Empty| E[Check Group Memberships]
    
    E --> F{In Any Groups?}
    F -->|Yes| G[User Has Group Bindings]
    F -->|No| H[User Has No Bindings]
    
    D --> I[PRESERVE USER]
    G --> I
    H --> J[SAFE TO DELETE]
```

## Deployment States

**Purpose**: State diagram showing different user scenarios during migration.

**User Categories**:
- **Bound Users**: Have identity_id or group memberships → **PRESERVED**
- **Unbound Users**: No AWS connections → **SAFELY DELETED**
- **Non-existent Users**: Don't exist → **NO ACTION NEEDED**

**Outcome**: All paths lead to successful Terraform deployment

```mermaid
stateDiagram-v2
    [*] --> CheckPool: Start Migration
    
    CheckPool --> PoolNotFound: No existing pool
    CheckPool --> PoolFound: Pool exists
    
    PoolNotFound --> CreatePool: Continue deployment
    
    PoolFound --> CheckUsers: Scan existing users
    CheckUsers --> BoundUser: User has bindings
    CheckUsers --> UnboundUser: User has no bindings
    CheckUsers --> NoUser: User doesn't exist
    
    BoundUser --> PreserveUser: Skip deletion
    UnboundUser --> DeleteUser: Safe to remove
    NoUser --> Continue: Nothing to do
    
    PreserveUser --> CreatePool
    DeleteUser --> CreatePool
    Continue --> CreatePool
    
    CreatePool --> [*]: Deployment complete
```

## Error Handling Flow

**Purpose**: Shows error scenarios and their impact on Terraform deployment.

**Error Types**:
- **Authentication Errors**: Invalid AWS credentials
- **API Errors**: Cognito service issues
- **User Operation Errors**: Permission or user-specific problems

**Behavior**: Any error causes migration to fail, which stops Terraform deployment for safety

```mermaid
flowchart TD
    A[Migration Script] --> B{AWS Credentials OK?}
    B -->|No| C[Exit 1: Auth Error]
    B -->|Yes| D{Pool Lookup Success?}
    
    D -->|No| E[Exit 1: API Error]
    D -->|Yes| F{User Operations OK?}
    
    F -->|No| G[Exit 1: User Error]
    F -->|Yes| H[Exit 0: Success]
    
    C --> I[Terraform Fails]
    E --> I
    G --> I
    H --> J[Terraform Continues]
```

## Summary

### Migration Process Overview
The Cognito migration system provides **idempotent Terraform deployments** by intelligently handling existing users before resource creation.

### Key Benefits
- ✅ **Zero Downtime**: Preserves users with active AWS connections
- ✅ **Safe Cleanup**: Removes only orphaned users without bindings
- ✅ **Automatic Execution**: Runs seamlessly during `terraform apply`
- ✅ **Error Safety**: Fails fast to prevent resource corruption

### Decision Matrix
| User State | Has identity_id | In Groups | Action |
|------------|----------------|-----------|--------|
| **Bound User** | ✅ Yes | Any | **PRESERVE** |
| **Bound User** | Any | ✅ Yes | **PRESERVE** |
| **Unbound User** | ❌ No | ❌ No | **DELETE** |
| **Missing User** | N/A | N/A | **CONTINUE** |

### Deployment Outcomes
- **First Deployment**: Creates fresh resources, handles any existing conflicts
- **Subsequent Deployments**: Maintains existing users with AWS connections
- **Failed Deployments**: Migration errors prevent resource corruption

### Best Practices
1. **Test First**: Use `./test_migration.sh` before production
2. **Monitor Logs**: Review migration output for skipped users
3. **Backup Strategy**: Export user data before major changes
4. **Rollback Plan**: Keep user exports for emergency restoration