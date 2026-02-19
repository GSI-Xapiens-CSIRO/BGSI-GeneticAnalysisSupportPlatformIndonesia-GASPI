import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AdminService } from 'src/app/pages/admin-page/services/admin.service';
import { Role, RoleService } from 'src/app/pages/admin-page/services/role.service';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  of,
  Subscription,
  tap,
} from 'rxjs';
import * as _ from 'lodash';
import { ComponentSpinnerComponent } from 'src/app/components/component-spinner/component-spinner.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AwsService } from 'src/app/services/aws.service';
import { SpinnerService } from 'src/app/services/spinner.service';
import {
  bytesToGigabytes,
  formatBytes,
  gigabytesToBytes,
} from 'src/app/utils/file';
import { UserQuotaService } from 'src/app/services/userquota.service';
import { NotebookRole, UserInstitutionType } from '../enums';
import { MatRadioModule } from '@angular/material/radio';
import { ToastrService } from 'ngx-toastr';
import { UserInfoService } from 'src/app/services/userinfo.service';

export interface UserDialogData {
  mode: 'create' | 'edit';
  sub?: string;
  name?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  mfaActive?: boolean;
}

@Component({
  selector: 'app-admin-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatCheckboxModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    ComponentSpinnerComponent,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatRadioModule,
  ],
  templateUrl: './admin-user-click-dialog.component.html',
  styleUrls: ['./admin-user-click-dialog.component.scss'],
  providers: [AdminService, RoleService],
})
export class AdminUserClickDialogComponent implements OnInit, OnDestroy {
  protected initialRoleId: string | null = null;
  protected form: FormGroup;
  protected loading = false;
  protected disableDelete = false;

  // mode
  protected isCreateMode: boolean;

  // roles
  protected availableRoles: Role[] = [];

  // quota
  protected costEstimation: number | null = 0;
  protected usageSize = 0;
  protected usageCount = 0;
  protected loadingCostEstimation: boolean = true;
  usageSizeText = '';
  noteBookRoleValue = NotebookRole;
  institutionTypeValue = UserInstitutionType;

  // subscriptions
  private emailSubscription: Subscription | undefined;

  constructor(
    public dialogRef: MatDialogRef<AdminUserClickDialogComponent>,
    private fb: FormBuilder,
    private as: AdminService,
    private rs: RoleService,
    private uq: UserQuotaService,
    private aws: AwsService,
    private dg: MatDialog,
    private tstr: ToastrService,
    private ui: UserInfoService,
    private ss: SpinnerService,

    @Inject(MAT_DIALOG_DATA) public data: UserDialogData,
  ) {
    this.isCreateMode = data.mode === 'create';

    this.form = this.fb.group({
      firstName: [data.firstName || '', Validators.required],
      lastName: [data.lastName || '', Validators.required],
      email: [data.email || '', [Validators.required, Validators.email]],
      roleId: ['', Validators.required],
      quotaSize: ['', [Validators.required, Validators.min(0)]],
      quotaQueryCount: ['', [Validators.required, Validators.min(0)]],
      notebookRole: [NotebookRole.BASIC, Validators.required],
      institutionType: [UserInstitutionType.INTERNAL, Validators.required],
      institutionName: ['', Validators.required],
    });

    // Disable user info fields in edit mode
    if (!this.isCreateMode) {
      this.form.get('firstName')?.disable();
      this.form.get('lastName')?.disable();
      this.form.get('email')?.disable();
    }
  }

  updateDataUser: (userData: any, quotaSize: number | null) => void = () => {};

  ngOnInit(): void {
    if (this.isCreateMode) {
      this.loadActiveRoles();
      this.setupEmailLowercase();
      this.loadingCostEstimation = false;
    } else {
      this.dialogRef.afterOpened().subscribe(() => {
        this.loadUserData();
      });
    }
    this.onChangeCalculateCost();
  }

  ngOnDestroy(): void {
    if (this.emailSubscription) {
      this.emailSubscription.unsubscribe();
    }
  }

  setupEmailLowercase(): void {
    this.emailSubscription = this.form.get('email')?.valueChanges.subscribe((value: string | null) => {
      if (value && value !== value.toLowerCase()) {
        this.form.get('email')?.setValue(value.toLowerCase(), { emitEvent: false });
      }
    });
  }

  loadActiveRoles(): void {
    this.rs.getActiveRoles().pipe(catchError(() => of(null))).subscribe((response) => {
      if (response?.roles) {
        this.availableRoles = response.roles;
      }
    });
  }

  onChangeCalculateCost() {
    this.form.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((values) => {
        this.loadingCostEstimation = true;

        const queryCountCtrl = this.form.get('quotaQueryCount');
        const quotaSizeCtrl = this.form.get('quotaSize');

        this.usageSizeText = formatBytes(this.usageSize);

        // Only check exceeded for edit mode
        if (!this.isCreateMode) {
          if (gigabytesToBytes(values.quotaSize) < this.usageSize) {
            quotaSizeCtrl?.setErrors({ quotaExceeded: true });
            return;
          }

          if (values.quotaQueryCount < this.usageCount) {
            queryCountCtrl?.setErrors({ quotaExceeded: true });
            return;
          }

          // Clear error if condition no longer applies
          if (queryCountCtrl?.hasError('quotaExceeded')) {
            queryCountCtrl.setErrors(null);
          }

          if (quotaSizeCtrl?.hasError('quotaExceeded')) {
            quotaSizeCtrl.setErrors(null);
          }
        }

        if (values.quotaQueryCount && values.quotaSize) {
          this.aws
            .calculateQuotaEstimationPerMonth(
              values.quotaQueryCount,
              values.quotaSize,
            )
            .subscribe((res) => {
              this.costEstimation = res;
              this.loadingCostEstimation = false;
            });
        }
      });
  }

  async disableMFA() {
    const { ActionConfirmationDialogComponent } = await import(
      '../../../../components/action-confirmation-dialog/action-confirmation-dialog.component'
    );

    const dialog = this.dg.open(ActionConfirmationDialogComponent, {
      data: {
        title: 'Clear User MFA',
        message: 'Are you sure you want to clear MFA for this user?',
      },
    });
    dialog.afterClosed().subscribe((result) => {
      if (result) {
        this.loading = true;
        this.as
          .clearUserMfa(this.data.email!)
          .pipe(catchError(() => of(null)))
          .subscribe(() => {
            this.loading = false;
            this.dialogRef.close({ reload: true });
          });
      }
    });
  }

  loadUserData() {
    this.loading = true;

    // Define all observables for edit mode
    const userQuota$ = this.uq
      .getUserQuota(this.data.sub!)
      .pipe(catchError(() => of(null)));

    const userGroups$ = this.as
      .listUsersGroups(this.data.email!)
      .pipe(catchError(() => of(null)));

    const userInfo$ = this.ui
      .getUserInfo(this.data.sub!)
      .pipe(catchError(() => of(null)));

    const activeRoles$ = this.rs
      .getActiveRoles()
      .pipe(catchError(() => of(null)));

    const userRole$ = this.rs
      .getUserRole(this.data.sub!)
      .pipe(catchError(() => of(null)));

    // Use forkJoin to run them in parallel
    forkJoin({
      userQuota: userQuota$,
      userGroups: userGroups$,
      userInfo: userInfo$,
      activeRoles: activeRoles$,
      userRole: userRole$,
    }).subscribe(
      ({ userQuota, userGroups, userInfo, activeRoles, userRole }) => {
        // Process user quota response
        if (userQuota?.success) {
          const { data } = userQuota;
          this.costEstimation = data.CostEstimation;
          this.usageSize = data.Usage.usageSize;
          this.usageCount = data.Usage.usageCount;

          this.form.patchValue({
            quotaSize: bytesToGigabytes(data.Usage.quotaSize),
            quotaQueryCount: data.Usage.quotaQueryCount,
            notebookRole: data.Usage.notebookRole || '',
            institutionType:
              userInfo?.data?.institutionType || UserInstitutionType.INTERNAL,
            institutionName: userInfo?.data?.institutionName || '',
          });
        }

        // Process active roles for dropdown
        if (activeRoles?.roles) {
          this.availableRoles = activeRoles.roles;
        }

        // Process user's current role
        if (userRole?.roles && userRole.roles.length > 0) {
          const currentRole = userRole.roles[0];
          this.initialRoleId = currentRole.role_id;
          this.form.patchValue({ roleId: currentRole.role_id });
        }

        // Process user groups response for admin check
        if (userGroups) {
          const user = _.get(userGroups, 'user', null);
          const authorizer = _.get(userGroups, 'authorizer', null);

          if (user === authorizer) {
            this.disableDelete = true;
          }
        }

        this.loading = false;
      },
      (error) => {
        console.error('Error loading user data:', error);
        this.loading = false;
      },
    );
  }

  async delete() {
    const { ActionConfirmationDialogComponent } = await import(
      '../../../../components/action-confirmation-dialog/action-confirmation-dialog.component'
    );

    const dialog = this.dg.open(ActionConfirmationDialogComponent, {
      data: {
        title: 'Delete User',
        message: 'Are you sure you want to delete this user?',
      },
    });
    dialog.afterClosed().subscribe((result) => {
      if (result) {
        this.loading = true;
        this.as
          .deleteUser(this.data.email!)
          .pipe(catchError(() => of(null)))
          .subscribe((res: null | { success: boolean; message: string }) => {
            if (!res) {
              this.tstr.error(
                'Operation failed, please try again later',
                'Error',
              );
            } else if (!res.success) {
              this.tstr.error(res.message, 'Error');
            } else {
              this.tstr.success('User deleted successfully', 'Success');
            }
            this.loading = false;
            this.dialogRef.close({ reload: true });
          });
      }
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  // ====== Create mode methods ======

  createUser(): void {
    const formValue = this.form.getRawValue();

    this.ss.start();
    this.as
      .createUser(formValue.firstName, formValue.lastName, formValue.email, {}, {})
      .pipe(
        catchError((e) => {
          if (_.get(e, 'response.data.error', '') === 'UsernameExistsException') {
            this.tstr.warning('This user already exists!', 'Warning');
          } else {
            this.tstr.error(
              e.response?.data?.message ?? 'Please Try Again Later',
              'Error',
            );
          }
          return of(null);
        }),
      )
      .subscribe((response) => {
        this.ss.end();
        if (response) {
          const uid = response?.uid ?? formValue.email;
          this.addUserQuota(uid);
          this.addUserInstitution(uid);
          this.assignUserRole(uid);
          this.form.reset();
          this.dialogRef.close({ reload: true });
          this.tstr.success('User created successfully!', 'Success');
        }
      });
  }

  addUserQuota(uid: string): void {
    const formValue = this.form.getRawValue();
    this.uq
      .upsertUserQuota(uid, this.costEstimation, {
        quotaSize: gigabytesToBytes(formValue.quotaSize),
        quotaQueryCount: formValue.quotaQueryCount,
        usageSize: 0,
        usageCount: 0,
        notebookRole: formValue.notebookRole,
      })
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  addUserInstitution(uid: string): void {
    const formValue = this.form.getRawValue();
    this.ui
      .storeUserInfo(uid, formValue.institutionType, formValue.institutionName)
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  assignUserRole(uid: string): void {
    const formValue = this.form.getRawValue();
    if (formValue.roleId) {
      this.rs.setUserRole(uid, formValue.roleId).pipe(catchError(() => of(null))).subscribe();
    }
  }

  // ====== Edit mode methods ======

  updateQuota() {
    const formValue = this.form.getRawValue();
    return this.uq
      .upsertUserQuota(this.data.sub!, this.costEstimation, {
        quotaSize: gigabytesToBytes(formValue.quotaSize),
        quotaQueryCount: formValue.quotaQueryCount,
        usageSize: this.usageSize,
        usageCount: this.usageCount,
        notebookRole: formValue.notebookRole,
      })
      .pipe(catchError(() => of(null)));
  }

  updateUserInstitution() {
    const formValue = this.form.getRawValue();
    return this.ui
      .storeUserInfo(
        this.data.sub!,
        formValue.institutionType,
        formValue.institutionName,
      )
      .pipe(catchError(() => of(null)));
  }

  updateUserRole() {
    const formValue = this.form.getRawValue();
    const newRoleId = formValue.roleId;

    // Only update if role changed
    if (newRoleId === this.initialRoleId) {
      return of({ success: true, message: 'Role unchanged' });
    }

    return this.rs.setUserRole(this.data.sub!, newRoleId).pipe(
      tap((response) => {
        if (response?.success) {
          this.initialRoleId = newRoleId;
        }
      }),
      catchError((error) => {
        console.error('Update role failed', error);
        return of(null);
      }),
    );
  }

  updateUser(): void {
    this.loading = true;

    const updateQuota$ = this.updateQuota();
    const updateUserInstitution$ = this.updateUserInstitution();
    const updateUserRole$ = this.updateUserRole();

    forkJoin([updateQuota$, updateUserInstitution$, updateUserRole$]).subscribe(
      () => {
        this.loading = false;
        this.dialogRef.close({
          reload: true,
        });
      },
    );
  }

  // ====== Main submit method ======

  done(): void {
    if (this.isCreateMode) {
      this.createUser();
    } else {
      this.updateUser();
    }
  }
}
