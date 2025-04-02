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
import { catchError, debounceTime, distinctUntilChanged, of } from 'rxjs';
import * as _ from 'lodash';
import { ComponentSpinnerComponent } from 'src/app/components/component-spinner/component-spinner.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SpinnerService } from 'src/app/services/spinner.service';
import { AwsService } from 'src/app/services/aws.service';
import { gigabytesToBytes } from 'src/app/utils/file';
import { UserQuotaService } from 'src/app/services/userquota.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-create-user-dialog',
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
  templateUrl: './admin-create-user-dialog.component.html',
  styleUrls: ['./admin-create-user-dialog.component.scss'],
  providers: [AdminService],
})
export class AdminCreateUserComponent implements OnInit {
  protected loading = false;
  protected newUserForm: FormGroup;
  protected costEstimation: number | null = 0;

  constructor(
    public dialogRef: MatDialogRef<AdminCreateUserComponent>,
    private fb: FormBuilder,
    private as: AdminService,
    private dg: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private ss: SpinnerService,
    private tstr: ToastrService,
    private aws: AwsService,
    private uq: UserQuotaService,
  ) {
    this.newUserForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      administrators: [false],
      managers: [false],
      // Quota
      quotaSize: ['', [Validators.required, Validators.min(0)]],
      quotaQueryCount: ['', [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit(): void {
    this.onChangeCalculateCost();
  }

  onChangeCalculateCost() {
    this.newUserForm.valueChanges
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

  cancel(): void {
    this.dialogRef.close();
  }

  createUser(): void {
    const form = this.newUserForm.value;
    const groups = _.pick(form, ['administrators', 'managers']);
    this.ss.start();
    this.as
      .createUser(form.firstName, form.lastName, form.email, groups)
      .pipe(
        catchError((e) => {
          if (
            _.get(e, 'response.data.error', '') === 'UsernameExistsException'
          ) {
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
          this.addUserQuota(response?.uid ?? form.email);
          this.newUserForm.reset();
          this.dialogRef.close({ reload: true });
          this.tstr.success('User created successfully!', 'Success');
        }
      });
  }

  addUserQuota(sub: string): void {
    this.uq
      .upsertUserQuota(sub, this.costEstimation, {
        quotaSize: gigabytesToBytes(this.newUserForm.value.quotaSize),
        quotaQueryCount: this.newUserForm.value.quotaQueryCount,
        usageSize: 0,
        usageCount: 0,
      })
      .pipe(catchError(() => of(null)));
  }
}
