import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ComponentSpinnerComponent } from 'src/app/components/component-spinner/component-spinner.component';
import { ToastrService } from 'ngx-toastr';
import { RoleService, Role, PermissionsMatrix } from '../../services/role.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-admin-role-dialog',
  templateUrl: './admin-role-dialog.component.html',
  styleUrls: ['./admin-role-dialog.component.scss'],
  providers: [RoleService],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatTooltipModule,
    ComponentSpinnerComponent,
  ],
})
export class AdminRoleDialogComponent implements OnInit {
  roleForm: FormGroup;
  loading = false;
  permissionsMatrix: PermissionsMatrix | null = null;
  selectedPermissions = new Set<string>();
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private roleService: RoleService,
    private toastr: ToastrService,
    public dialogRef: MatDialogRef<AdminRoleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { role?: Role }
  ) {
    this.isEditMode = !!data?.role;

    this.roleForm = this.fb.group({
      role_name: [data?.role?.role_name || '', Validators.required],
      description: [data?.role?.description || ''],
      is_active: [data?.role?.is_active ?? true],
    });
  }

  ngOnInit(): void {
    this.loadPermissionsMatrix();

    // If editing, load existing permissions
    if (this.isEditMode && this.data.role) {
      this.loadRolePermissions();
    }
  }

  loadPermissionsMatrix(): void {
    this.loading = true;
    this.roleService
      .getPermissionsMatrix()
      .pipe(catchError(() => of(null)))
      .subscribe((response) => {
        if (!response || !response.success) {
          this.toastr.error('Failed to load permissions', 'Error');
        } else {
          this.permissionsMatrix = response;
        }
        this.loading = false;
      });
  }

  loadRolePermissions(): void {
    if (!this.data.role) return;

    this.roleService
      .getRoleById(this.data.role.role_id)
      .pipe(catchError(() => of(null)))
      .subscribe((response) => {
        if (response && response.success && response.role.permissions) {
          this.selectedPermissions = new Set(response.role.permissions);
        }
      });
  }

  togglePermission(permission: any): void {
    if (!permission || permission.disabled) return;

    const permissionId = permission.id;
    if (this.selectedPermissions.has(permissionId)) {
      this.selectedPermissions.delete(permissionId);
    } else {
      this.selectedPermissions.add(permissionId);
    }
  }

  isPermissionChecked(permission: any): boolean {
    if (!permission) return false;
    return this.selectedPermissions.has(permission.id);
  }

  isPermissionDisabled(permission: any): boolean {
    return permission?.disabled === true;
  }

  toggleAllResourcePermissions(resource: any): void {
    const allChecked = this.areAllResourcePermissionsChecked(resource);

    Object.values(resource.permissions).forEach((permission: any) => {
      // Skip disabled permissions
      if (!permission || permission.disabled) return;

      if (allChecked) {
        this.selectedPermissions.delete(permission.id);
      } else {
        this.selectedPermissions.add(permission.id);
      }
    });
  }

  areAllResourcePermissionsChecked(resource: any): boolean {
    const enabledPermissions = Object.values(resource.permissions).filter(
      (p: any) => p && !p.disabled
    );
    if (enabledPermissions.length === 0) return false;

    return enabledPermissions.every((permission: any) =>
      this.selectedPermissions.has(permission.id)
    );
  }

  areSomeResourcePermissionsChecked(resource: any): boolean {
    const enabledPermissions = Object.values(resource.permissions).filter(
      (p: any) => p && !p.disabled
    );
    const checkedCount = enabledPermissions.filter((p: any) =>
      this.selectedPermissions.has(p.id)
    ).length;
    return checkedCount > 0 && checkedCount < enabledPermissions.length;
  }

  onSubmit(): void {
    if (this.roleForm.invalid) {
      this.toastr.warning('Please fill in all required fields', 'Validation Error');
      return;
    }

    if (this.selectedPermissions.size === 0) {
      this.toastr.warning('Please select at least one permission', 'Validation Error');
      return;
    }

    const formData = {
      ...this.roleForm.value,
      permissions: Array.from(this.selectedPermissions),
    };

    this.loading = true;

    const request$ = this.isEditMode
      ? this.roleService.updateRole(this.data.role!.role_id, formData)
      : this.roleService.createRole(formData);

    request$
      .pipe(catchError(() => of(null)))
      .subscribe((response) => {
        if (!response || !response.success) {
          const errorMessage = response?.message || `Failed to ${this.isEditMode ? 'update' : 'create'} role`;
          this.toastr.error(errorMessage, 'Error');
        } else {
          const successMessage = response.message || `Role ${this.isEditMode ? 'updated' : 'created'} successfully`;
          this.toastr.success(successMessage, 'Success');
          this.dialogRef.close({ reload: true });
        }
        this.loading = false;
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
