import { Injectable } from '@angular/core';
import { API } from 'aws-amplify';
import { environment } from 'src/environments/environment';
import { from, Observable } from 'rxjs';

export interface Role {
  role_id: string;
  role_name: string;
  description: string;
  is_active: boolean;
  status: string;
  permission_count?: number;
  user_count?: number;
  permissions?: string[];
  users?: string[];
}

export interface PermissionObject {
  id: string;
  disabled: boolean;
  exists: boolean;
}

export interface Permission {
  name: string;
  label: string;
  permissions: {
    [action: string]: PermissionObject;
  };
}

export interface PermissionsMatrix {
  success: boolean;
  actions: string[];
  resources: Permission[];
  total_resources: number;
  total_permissions: number;
}

export interface RolesResponse {
  success: boolean;
  roles: Role[];
  total: number;
  last_evaluated_key?: string;
}

export interface RoleDetailResponse {
  success: boolean;
  role: Role;
}

export interface CreateRoleRequest {
  role_name: string;
  description: string;
  is_active: boolean;
  permissions: string[];
}

export interface UpdateRoleRequest {
  role_name?: string;
  description?: string;
  is_active?: boolean;
  permissions?: string[];
}

@Injectable()
export class RoleService {
  constructor() {}

  /**
   * Get all roles
   * @param status Filter by status: 'active' | 'inactive' | 'all'
   * @param search Search term for role name
   * @param limit Number of items to return
   * @param lastEvaluatedKey Pagination key from previous request
   */
  getRoles(
    status: string = 'all',
    search?: string,
    limit: number = 2,
    lastEvaluatedKey?: string
  ): Observable<RolesResponse> {
    const lim = 1
    const queryStringParameters: any = { status, limit: limit.toString() };

    if (search) {
      queryStringParameters.search = search;
    }

    if (lastEvaluatedKey) {
      queryStringParameters.last_evaluated_key = lastEvaluatedKey;
    }

    return from(
      API.get(environment.api_endpoint_sbeacon.name, 'admin/roles', {
        queryStringParameters,
      }),
    );
  }

  /**
   * Get role details by ID
   */
  getRoleById(roleId: string): Observable<RoleDetailResponse> {
    return from(
      API.get(
        environment.api_endpoint_sbeacon.name,
        `admin/roles/${roleId}`,
        {},
      ),
    );
  }

  /**
   * Create new role
   */
  createRole(role: CreateRoleRequest): Observable<any> {
    return from(
      API.post(environment.api_endpoint_sbeacon.name, 'admin/roles', {
        body: role,
      }),
    );
  }

  /**
   * Update existing role
   */
  updateRole(roleId: string, role: UpdateRoleRequest): Observable<any> {
    return from(
      API.put(environment.api_endpoint_sbeacon.name, `admin/roles/${roleId}`, {
        body: role,
      }),
    );
  }

  /**
   * Delete role
   */
  deleteRole(roleId: string): Observable<any> {
    return from(
      API.del(
        environment.api_endpoint_sbeacon.name,
        `admin/roles/${roleId}`,
        {},
      ),
    );
  }

  /**
   * Get permissions matrix for checkboxes
   */
  getPermissionsMatrix(): Observable<PermissionsMatrix> {
    return from(
      API.get(
        environment.api_endpoint_sbeacon.name,
        'admin/permissions/matrix',
        {},
      ),
    );
  }

  /**
   * Get users assigned to a role
   */
  getRoleUsers(roleId: string): Observable<any> {
    return from(
      API.get(
        environment.api_endpoint_sbeacon.name,
        `admin/roles/${roleId}/users`,
        {},
      ),
    );
  }

  /**
   * Set user role (1 user = 1 role)
   * Replaces any existing role with the new one
   */
  setUserRole(uid: string, roleId: string): Observable<any> {
    return from(
      API.put(
        environment.api_endpoint_sbeacon.name,
        `admin/users/${uid}/roles`,
        {
          body: { role_id: roleId },
        },
      ),
    );
  }

  /**
   * Get user's current role
   */
  getUserRole(uid: string): Observable<{ success: boolean; uid: string; roles: Role[]; total: number }> {
    return from(
      API.get(
        environment.api_endpoint_sbeacon.name,
        `admin/users/${uid}/roles`,
        {},
      ),
    );
  }

  /**
   * Get all active roles for dropdown selection
   */
  getActiveRoles(): Observable<RolesResponse> {
    return from(
      API.get(environment.api_endpoint_sbeacon.name, 'admin/roles', {
        queryStringParameters: { status: 'active', limit: '100' },
      }),
    );
  }
}
