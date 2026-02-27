# Cognito Migration Process Diagram

## Migration Flow

**Purpose**: Shows the complete migration process from Terraform execution to resource creation.

**Key Points**:
- Migration runs automatically before Cognito resources are created
- Script handles duplicate pools by keeping the newest and deleting others
- Users with AWS bindings are preserved, unbound users are deleted
- Process is idempotent - safe to run multiple times

```mermaid
flowchart TD
    A[Terraform Apply] --> B[null_resource: cognito_migration]
    B --> C[Execute migrate_cognito_users.py]
    C --> D[Scan for User Pools]
    D --> E{Pools Found?}
    
    E -->|No Pools| F[Log: No pools found]
    F --> G[Exit 0 - Continue Terraform]
    
    E -->|Single Pool| H[Use existing pool]
    E -->|Multiple Pools| I[Check Pool Configurations]
    I --> J{Terraform Pool Found?}
    
    J -->|1 Terraform Pool| K[Keep Terraform pool]
    K --> L[Delete non-Terraform pools]
    L --> H
    
    J -->|0 or 2+ Terraform Pools| M[ERROR: Ambiguous pools]
    M --> N[Exit 1 - Manual cleanup required]
    
    H --> K[Check Admin User]
    K --> L{Admin User Exists?}
    
    L -->|No| M[Log: Admin not found]
    L -->|Yes| N{Admin Has Bindings?}
    
    N -->|Yes| O[Log: Admin has bindings - Skip]
    N -->|No| P[Delete Admin User]
    
    M --> Q[Check Guest User]
    O --> Q
    P --> Q
    
    Q --> R{Guest User Exists?}
    R -->|No| S[Log: Guest not found]
    R -->|Yes| T{Guest Has Bindings?}
    
    T -->|Yes| U[Log: Guest has bindings - Skip]
    T -->|No| V[Delete Guest User]
    
    S --> W[Migration Complete]
    U --> W
    V --> W
    
    W --> X[Terraform Creates User Pool]
    X --> Y[Create User Pool Client]
    Y --> Z[Create Groups & Users]
    
    G --> X
    N --> O[Terraform Fails - Fix Required]
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