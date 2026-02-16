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

export interface Permission {
  name: string;
  label: string;
  permissions: {
    [action: string]: string;
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
   */
  getRoles(status: string = 'all'): Observable<RolesResponse> {
    return from(
      API.get(environment.api_endpoint_sbeacon.name, 'admin/roles', {
        queryStringParameters: { status },
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
   * Assign role to user
   */
  assignRoleToUser(uid: string, roleId: string): Observable<any> {
    return from(
      API.post(
        environment.api_endpoint_sbeacon.name,
        `admin/users/${uid}/roles`,
        {
          body: { role_id: roleId },
        },
      ),
    );
  }

  /**
   * Remove role from user
   */
  removeRoleFromUser(uid: string, roleId: string): Observable<any> {
    return from(
      API.del(
        environment.api_endpoint_sbeacon.name,
        `admin/users/${uid}/roles/${roleId}`,
        {},
      ),
    );
  }

  /**
   * Get user's roles
   */
  getUserRoles(uid: string): Observable<any> {
    return from(
      API.get(
        environment.api_endpoint_sbeacon.name,
        `admin/users/${uid}/roles`,
        {},
      ),
    );
  }
}
