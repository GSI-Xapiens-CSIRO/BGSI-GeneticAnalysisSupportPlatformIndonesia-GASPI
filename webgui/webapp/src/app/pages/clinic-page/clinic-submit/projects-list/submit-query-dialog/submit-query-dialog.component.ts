import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ToastrService } from 'ngx-toastr';
import { catchError, of } from 'rxjs';
import { ClinicService } from 'src/app/services/clinic.service';
import { environment } from 'src/environments/environment';
import { ComponentSpinnerComponent } from 'src/app/components/component-spinner/component-spinner.component';

@Component({
  selector: 'app-submit-query-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatCheckboxModule,
    MatFormFieldModule,
    ComponentSpinnerComponent,
  ],
  templateUrl: './submit-query-dialog.component.html',
  styleUrl: './submit-query-dialog.component.scss',
})
export class SubmitQueryDialogComponent {
  protected jobForm: FormGroup = new FormGroup({
    jobName: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(20),
      Validators.pattern(/^[a-zA-Z0-9 ]+$/), // Allow alphanumeric and space
    ]),
    missingToRef: new FormControl(false),
  });
  protected loading = false;
  protected showMissingToRefOption = false;

  constructor(
    protected cs: ClinicService,
    private tstr: ToastrService,
    public dialogRef: MatDialogRef<SubmitQueryDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      projectName: string;
      file: string;
      list: () => void;
    },
  ) {
    this.showMissingToRefOption =
      environment.hub_name === 'RSPON' || environment.hub_name === 'RSJPD';
  }

  submit() {
    if (this.data.file) {
      const s3URI = `s3://${environment.storage.dataPortalBucket}/projects/${this.data.projectName}/project-files/${this.data.file}`;
      this.loading = true;

      this.cs
        .submitClinicJob(
          s3URI,
          this.data.projectName!,
          this.jobForm.value.jobName,
          this.jobForm.value.missingToRef,
        )
        .pipe(
          catchError((e) => {
            const errorMessage =
              e.response?.data?.error?.errorMessage ||
              'Something went wrong when initiating the job. Please try again later.';
            this.tstr.error(errorMessage, 'Error');
            this.loading = false;

            return of(null);
          }),
        )
        .subscribe((response: any) => {
          if (response) {
            const responses = Array.isArray(response) ? response : [response];
            const allSuccessful = responses.every((res) => res && res.Success);
            if (!allSuccessful) {
              const failedResponse = responses.find(
                (res) => !res || !res.Success,
              );
              const errorMessage =
                failedResponse?.Response || 'Job submission failed';
              this.tstr.error(errorMessage, 'Error');
              this.loading = false;
              return;
            }

            this.tstr.success(
              'Displaying results takes time according to the size of your data. Once completed, we will send you a notification via email.',
              'Success',
            );
            this.data.list();
          }
          this.loading = false;
          this.dialogRef.close();
        });
    } else {
      this.tstr.warning('No file selected', 'Warning');
    }
  }
}
