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
} from 'rxjs';
import * as _ from 'lodash';
import { ComponentSpinnerComponent } from 'src/app/components/component-spinner/component-spinner.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AwsService } from 'src/app/services/aws.service';
import { bytesToGigabytes, gigabytesToBytes } from 'src/app/utils/file';
import { UserQuotaService } from 'src/app/services/userquota.service';

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

  constructor(
    public dialogRef: MatDialogRef<AdminUserClickDialogComponent>,
    private fb: FormBuilder,
    private as: AdminService,
    private uq: UserQuotaService,
    private aws: AwsService,
    private dg: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.form = this.fb.group({
      administrators: [false],
      quotaSize: ['', [Validators.required, Validators.min(0)]],
      quotaQueryCount: ['', [Validators.required, Validators.min(0)]],
    });
  }

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
        if (values.quotaQueryCount && values.quotaSize) {
          this.aws
            .calculateQuotaEstimationPerMonth(
              values.quotaQueryCount,
              values.quotaSize,
            )

            .subscribe((res) => {
              this.costEstimation = res;
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

    // Use forkJoin to run them in parallel
    forkJoin({ userQuota: userQuota$, userGroups: userGroups$ }).subscribe(
      ({ userQuota, userGroups }) => {
        // Process user quota response
        const { success, data } = userQuota;
        if (success) {
          this.costEstimation = data.CostEstimation;
          this.usageSize = data.Usage.usageSize;
          this.usageCount = data.Usage.usageCount;

          this.form.patchValue({
            quotaSize: bytesToGigabytes(data.Usage.quotaSize),
            quotaQueryCount: data.Usage.quotaQueryCount,
          });
        }

        // Process user groups response
        if (userGroups) {
          const groups = _.get(userGroups, 'groups', []);
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
          .subscribe(() => {
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
      })
      .pipe(catchError(() => of(null)));
  }

  updateUser() {
    const groups = _.pick(this.form.value, ['administrators']);
    return this.as
      .updateUsersGroups(this.data.email, groups)
      .pipe(catchError(() => of(null)));
  }

  done(): void {
    this.loading = true;

    const updateQuota$ = this.updateQuota();
    const updateUser$ = this.updateUser();

    forkJoin([updateQuota$, updateUser$]).subscribe(() => {
      this.loading = false;
      this.dialogRef.close();
    });
  }
}
