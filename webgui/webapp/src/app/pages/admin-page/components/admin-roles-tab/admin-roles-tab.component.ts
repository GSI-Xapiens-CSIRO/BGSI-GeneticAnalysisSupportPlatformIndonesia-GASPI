import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { ComponentSpinnerComponent } from 'src/app/components/component-spinner/component-spinner.component';
import { ToastrService } from 'ngx-toastr';
import { RoleService, Role } from '../../services/role.service';
import { catchError, of } from 'rxjs';
import * as _ from 'lodash';

@Component({
  selector: 'app-admin-roles-tab',
  templateUrl: './admin-roles-tab.component.html',
  styleUrls: ['./admin-roles-tab.component.scss'],
  providers: [RoleService],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatOptionModule,
    MatTableModule,
    MatIconModule,
    MatTooltipModule,
    MatCardModule,
    MatDialogModule,
    ComponentSpinnerComponent,
  ],
})
export class AdminRolesTabComponent implements OnInit {
  loading = false;
  filterForm: FormGroup;
  displayedColumns: string[] = [
    'Role Name',
    'Function',
    'Status',
    'User Count',
    'Actions',
  ];
  dataSource = new MatTableDataSource<Role>([]);

  constructor(
    private fb: FormBuilder,
    private roleService: RoleService,
    private toastr: ToastrService,
    private dialog: MatDialog
  ) {
    this.filterForm = this.fb.group({
      status: ['all'],
      query: [''],
    });
  }

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    const statusFilter = this.filterForm.value.status || 'all';

    this.loading = true;
    this.roleService
      .getRoles(statusFilter)
      .pipe(catchError(() => of(null)))
      .subscribe((response) => {
        if (!response) {
          this.toastr.error('Failed to load roles', 'Error');
          this.dataSource.data = [];
        } else {
          const query = this.filterForm.value.query?.toLowerCase() || '';
          let roles = response.roles;

          // Client-side filtering by role name
          if (query) {
            roles = roles.filter((role) =>
              role.role_name.toLowerCase().includes(query)
            );
          }

          this.dataSource.data = roles;
        }
        this.loading = false;
      });
  }

  filterRoles(): void {
    this.loadRoles();
  }

  async addRole(): Promise<void> {
    const { AdminRoleDialogComponent } = await import(
      '../admin-role-dialog/admin-role-dialog.component'
    );

    const dialogRef = this.dialog.open(AdminRoleDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      disableClose: true,
      data: {},
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (_.get(result, 'reload', false)) {
        this.loadRoles();
      }
    });
  }

  async editRole(role: Role): Promise<void> {
    const { AdminRoleDialogComponent } = await import(
      '../admin-role-dialog/admin-role-dialog.component'
    );

    const dialogRef = this.dialog.open(AdminRoleDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      disableClose: true,
      data: { role },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (_.get(result, 'reload', false)) {
        this.loadRoles();
      }
    });
  }

  async deleteRole(role: Role): Promise<void> {
    const { ActionConfirmationDialogComponent } = await import(
      'src/app/components/action-confirmation-dialog/action-confirmation-dialog.component'
    );

    const dialog = this.dialog.open(ActionConfirmationDialogComponent, {
      data: {
        title: 'Delete Role',
        message: `Are you sure you want to delete role "${role.role_name}"? This will remove the role from ${role.user_count || 0} user(s).`,
      },
    });

    dialog.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      this.loading = true;
      this.roleService
        .deleteRole(role.role_id)
        .pipe(catchError(() => of(null)))
        .subscribe((response) => {
          if (!response || !response.success) {
            const errorMessage = response?.message || 'Failed to delete role';
            this.toastr.error(errorMessage, 'Error');
          } else {
            const successMessage = response.message || `Role "${role.role_name}" deleted successfully`;
            this.toastr.success(successMessage, 'Success');
            this.loadRoles();
          }
          this.loading = false;
        });
    });
  }
}
