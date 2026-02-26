import { Component, OnInit, ViewChild, Injectable, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormControl,
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
import { MatPaginator, MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ComponentSpinnerComponent } from 'src/app/components/component-spinner/component-spinner.component';
import { ToastrService } from 'ngx-toastr';
import { HasPermissionDirective, DisableIfNoPermissionDirective } from 'src/app/directives/permission.directive';
import { RoleService, Role } from '../../services/role.service';
import { catchError, of, debounceTime, distinctUntilChanged, BehaviorSubject, Subject } from 'rxjs';
import * as _ from 'lodash';

@Injectable()
export class MyCustomPaginatorIntl implements MatPaginatorIntl {
  changes = new Subject<void>();

  // For internationalization, the `$localize` function from
  // the `@angular/localize` package can be used.
  firstPageLabel = $localize`First page`;
  itemsPerPageLabel = $localize`Items per page:`;
  lastPageLabel = $localize`Last page`;

  // You can set labels to an arbitrary string too, or dynamically compute
  // it through other third-party internationalization libraries.
  nextPageLabel = 'Next page';
  previousPageLabel = 'Previous page';

  getRangeLabel(page: number, pageSize: number, length: number): string {
    return $localize`Page ${page + 1}`;
  }
}

@Component({
  selector: 'app-admin-roles-tab',
  templateUrl: './admin-roles-tab.component.html',
  styleUrls: ['./admin-roles-tab.component.scss'],
  providers: [
    RoleService,
    { provide: MatPaginatorIntl, useClass: MyCustomPaginatorIntl }
  ],
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
    MatPaginatorModule,
    ComponentSpinnerComponent,
    HasPermissionDirective,
    DisableIfNoPermissionDirective,
  ],
})
export class AdminRolesTabComponent implements OnInit {
  loading = false;
  filterForm: FormGroup;
  searchControl = new FormControl('');
  displayedColumns: string[] = [
    'Role Name',
    'Function',
    'Status',
    'User Count',
    'Actions',
  ];
  dataSource = new MatTableDataSource<Role>([]);
  protected pageSize = 10;
  private pageTokens = new Map<number, string>();
  private searchSubject = new BehaviorSubject<string>('');

  @ViewChild('paginator')
  paginator!: MatPaginator;

  constructor(
    private fb: FormBuilder,
    private roleService: RoleService,
    private toastr: ToastrService,
    private dialog: MatDialog,
    private cd: ChangeDetectorRef
  ) {
    this.filterForm = this.fb.group({
      status: ['all'],
    });
  }

  ngOnInit(): void {
    this.loadRoles(0, '');
    this.cd.detectChanges();

    this.paginator.page.subscribe((event: PageEvent) => {
      if (this.pageSize !== this.paginator.pageSize) {
        this.resetPagination();
        this.refresh();
      } else {
        this.loadRoles(event.pageIndex, this.searchSubject.value);
      }
    });

    // Detect changes on search input
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => {
        this.resetPagination();
        this.setSearchInput(value as string);
        this.loadRoles(this.paginator.pageIndex, value as string);
      });

    // Detect changes on status filter
    this.filterForm.get('status')?.valueChanges.subscribe(() => {
      setTimeout(() => {
        this.resetPagination();
        this.loadRoles(0, this.searchSubject.value);
      });
    });
  }

  resetPagination(): void {
    this.pageTokens = new Map<number, string>();
    this.paginator.pageIndex = 0;
    this.pageSize = this.paginator.pageSize;
  }

  setSearchInput(query: string): void {
    this.searchSubject.next(query);
  }

  loadRoles(page: number, search: string): void {
    const statusFilter = this.filterForm.value.status || 'all';

    // Not the first page but the page token is not set
    if (!this.pageTokens.get(page) && page > 0) {
      this.paginator.pageIndex--;
      this.toastr.warning('No more items to show', 'Warning');
      return;
    }

    this.loading = true;
    this.roleService
      .getRoles(statusFilter, search || undefined, this.pageSize, this.pageTokens.get(page))
      .pipe(catchError(() => of(null)))
      .subscribe((response) => {
        if (!response || !response.success) {
          this.toastr.error('Failed to load roles', 'Error');
          this.dataSource.data = [];
        } else {
          // Handle if there's no data on next page
          if (response.roles.length <= 0 && this.paginator.pageIndex > 0) {
            this.paginator.pageIndex--;
            this.toastr.warning('No more items to show', 'Warning');
            this.loading = false;
            return;
          }

          this.dataSource.data = response.roles;

          // Set next page token
          if (response.last_evaluated_key) {
            this.pageTokens.set(page + 1, response.last_evaluated_key);
          }
        }
        this.loading = false;
      });
  }

  refresh(): void {
    this.resetPagination();
    this.loadRoles(0, this.searchSubject.value);
  }

  filterRoles(): void {
    this.resetPagination();
    this.loadRoles(0, this.searchSubject.value);
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
        this.refresh();
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
        this.refresh();
      }
    });
  }

  async deleteRole(role: Role): Promise<void> {
    // Check if role has users assigned
    if (role.user_count && role.user_count > 0) {
      const { ActionConfirmationDialogComponent } = await import(
        'src/app/components/action-confirmation-dialog/action-confirmation-dialog.component'
      );

      this.dialog.open(ActionConfirmationDialogComponent, {
        data: {
          title: 'Cannot Delete Role',
          message: `Role "${role.role_name}" cannot be deleted because it is assigned to ${role.user_count} user(s). Please reassign or remove users from this role first.`,
          confirmText: 'OK',
          hideCancel: true,
        },
      });
      return;
    }

    const { ActionConfirmationDialogComponent } = await import(
      'src/app/components/action-confirmation-dialog/action-confirmation-dialog.component'
    );

    const dialog = this.dialog.open(ActionConfirmationDialogComponent, {
      data: {
        title: 'Delete Role',
        message: `Are you sure you want to delete role "${role.role_name}"?`,
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
            this.refresh();
          }
          this.loading = false;
        });
    });
  }
}
