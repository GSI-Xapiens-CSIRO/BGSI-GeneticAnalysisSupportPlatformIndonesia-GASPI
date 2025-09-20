import { Component, Inject, OnInit } from '@angular/core';
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
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  of,
  tap,
} from 'rxjs';
import * as _ from 'lodash';
import { ComponentSpinnerComponent } from 'src/app/components/component-spinner/component-spinner.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AwsService } from 'src/app/services/aws.service';
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

@Component({
  selector: 'app-admin-user-click-dialog',
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
    MatRadioModule,
  ],
  templateUrl: './admin-user-click-dialog.component.html',
  styleUrls: ['./admin-user-click-dialog.component.scss'],
  providers: [AdminService],
})
export class AdminUserClickDialogComponent implements OnInit {
  protected initialGroups: any = {
    administrators: false,
  };
  protected form: FormGroup;
  protected loading = false;
  protected disableDelete = false;

  // quota
  protected costEstimation: number | null = 0;
  protected usageSize = 0;
  protected usageCount = 0;
  protected loadingCostEstimation: boolean = true;
  usageSizeText = '';
  noteBookRoleValue = NotebookRole;
  institutionTypeValue = UserInstitutionType;

  constructor(
    public dialogRef: MatDialogRef<AdminUserClickDialogComponent>,
    private fb: FormBuilder,
    private as: AdminService,
    private uq: UserQuotaService,
    private aws: AwsService,
    private dg: MatDialog,
    private tstr: ToastrService,
    private ui: UserInfoService,

    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.form = this.fb.group({
      administrators: [false],
      managers: [false],
      quotaSize: ['', [Validators.required, Validators.min(0)]],
      quotaQueryCount: ['', [Validators.required, Validators.min(0)]],
      notebookRole: [NotebookRole.BASIC, Validators.required], // default role
      institutionType: [UserInstitutionType.INTERNAL, Validators.required], // default institution type
      institutionName: ['', Validators.required],
      isMedicalDirector: [false],
    });
  }

  updateDataUser: (userData: any, quotaSize: number | null) => void = () => {};

  ngOnInit(): void {
    this.dialogRef.afterOpened().subscribe(() => {
      this.getUserGroups();
    });
    this.onChangeCalculateCost();
  }

  onChangeCalculateCost() {
    this.form.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((values) => {
        this.loadingCostEstimation = true;

        const queryCountCtrl = this.form.get('quotaQueryCount');
        const quotaSizeCtrl = this.form.get('quotaSize');

        this.usageSizeText = formatBytes(this.usageSize);

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
          .clearUserMfa(this.data.email)
          .pipe(catchError(() => of(null)))
          .subscribe(() => {
            this.loading = false;
            this.dialogRef.close({ reload: true });
          });
      }
    });
  }

  getUserGroups() {
    this.loading = true;

    // Define both observables
    const userQuota$ = this.uq
      .getUserQuota(this.data.sub)
      .pipe(catchError(() => of(null)));

    const userGroups$ = this.as
      .listUsersGroups(this.data.email)
      .pipe(catchError(() => of(null)));

    const userInfo$ = this.ui
      .getUserInfo(this.data.sub)
      .pipe(catchError(() => of(null)));

    // Use forkJoin to run them in parallel
    forkJoin({
      userQuota: userQuota$,
      userGroups: userGroups$,
      userInfo: userInfo$,
    }).subscribe(
      ({ userQuota, userGroups, userInfo }) => {
        // Process user quota response
        const { success, data } = userQuota;
        if (success) {
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

        // Process user groups response
        if (userGroups) {
          const groups = _.get(userGroups, 'groups', []);
          const attributes = _.get(userGroups, 'attributes', {});
          const user = _.get(userGroups, 'user', null);
          const authorizer = _.get(userGroups, 'authorizer', null);
          const groupNames = _.map(
            groups,
            (group) => _.split(group.GroupName, '-')[0],
          );
          const userGroupsObj: { [key: string]: boolean } = {};
          _.each(groupNames, (gn: string) => {
            userGroupsObj[gn] = true;
          });
          _.merge(this.initialGroups, userGroupsObj);
          userGroupsObj['isMedicalDirector'] =
            attributes['isMedicalDirector'] || false;
          this.form.patchValue(userGroupsObj);

          if (user === authorizer) {
            this.form.get('administrators')?.disable();
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
          .deleteUser(this.data.email)
          .pipe(catchError(() => of(null)))
          .subscribe((res: null | { success: boolean; message: string }) => {
            let deleted = false;
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

  updateQuota() {
    return this.uq
      .upsertUserQuota(this.data.sub, this.costEstimation, {
        quotaSize: gigabytesToBytes(this.form.value.quotaSize),
        quotaQueryCount: this.form.value.quotaQueryCount,
        usageSize: this.usageSize, // bytes
        usageCount: this.usageCount,
        notebookRole: this.form.value.notebookRole,
      })
      .pipe(catchError(() => of(null)));
  }

  updateUserInstitution() {
    return this.ui
      .storeUserInfo(
        this.data.sub,
        this.form.value.institutionType,
        this.form.value.institutionName,
      )
      .pipe(catchError(() => of(null)));
  }

  updateUser() {
    const groups = _.pick(this.form.value, ['administrators', 'managers']);
    const attributes = _.pick(this.form.value, ['isMedicalDirector']);

    return this.as.updateUsersGroups(this.data.email, groups, attributes).pipe(
      // when update success call parent function to update data.
      tap((response) => {
        if (response) {
          this.updateDataUser(this.form.value, this.costEstimation);
        }
      }),
      catchError((error) => {
        console.error('Update failed', error);
        return of(null);
      }),
    );
  }

  done(): void {
    this.loading = true;

    const updateQuota$ = this.updateQuota();
    const updateUser$ = this.updateUser();
    const updateUserInstitution$ = this.updateUserInstitution();

    forkJoin([updateQuota$, updateUserInstitution$, updateUser$]).subscribe(
      () => {
        this.loading = false;
        this.dialogRef.close({
          reload: true,
        });
      },
    );
  }
}
