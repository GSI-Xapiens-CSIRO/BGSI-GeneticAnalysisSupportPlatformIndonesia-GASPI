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
import { ToastrService } from 'ngx-toastr';
import { catchError, of } from 'rxjs';
import { ClinicService } from 'src/app/services/clinic.service';
import { SpinnerService } from 'src/app/services/spinner.service';

@Component({
  selector: 'app-validate-variant-to-report-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
  ],
  templateUrl: './validate-variant-to-report-dialog.component.html',
  styleUrl: './validate-variant-to-report-dialog.component.scss',
})
export class ValidateVariantToReportDialogComponent {
  protected validationForm: FormGroup = new FormGroup({
    annotation: new FormControl('', [Validators.required]),
  });
  constructor(
    protected cs: ClinicService,
    private tstr: ToastrService,
    private ss: SpinnerService,
    public dialogRef: MatDialogRef<ValidateVariantToReportDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { projectName: string; requestId: string; name?: string },
  ) {}

  saveValidation() {
    const comment = this.validationForm.get('annotation')?.value;

    if (comment.trim() === '') {
      this.tstr.error('Please fill in the required fields.');
      return;
    }

    this.ss.start();
    if (this.data.name) {
      this.cs
        .addValidation(
          this.data.projectName,
          this.data.requestId,
          this.data.name,
          comment,
        )
        .pipe(catchError((err) => of(err)))
        .subscribe((data) => {
          if (!data) {
            this.tstr.error('Failed to save validation', 'Error');
          } else {
            this.tstr.success('Validation saved', 'Success');
            this.cs.savedVariantsChanged.next();
            this.dialogRef.close();
          }
          this.ss.end();
        });
    } else {
      this.cs
        .addNoVariantsValidation(
          this.data.projectName,
          this.data.requestId,
          comment,
        )
        .pipe(catchError((err) => of(err)))
        .subscribe((data) => {
          if (!data) {
            this.tstr.error('Failed to save validation', 'Error');
          } else {
            this.tstr.success('Validation saved', 'Success');
            this.cs.savedVariantsChanged.next();
            this.dialogRef.close();
          }
          this.ss.end();
        });
    }
  }
}
