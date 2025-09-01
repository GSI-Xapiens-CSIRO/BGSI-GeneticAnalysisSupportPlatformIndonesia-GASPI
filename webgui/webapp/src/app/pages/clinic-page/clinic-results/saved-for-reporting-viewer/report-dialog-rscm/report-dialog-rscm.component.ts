import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { ComponentSpinnerComponent } from 'src/app/components/component-spinner/component-spinner.component';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatOptionModule } from '@angular/material/core';

export interface ReportProps {
  projectName?: string;
  requestId?: string;
}

@Component({
  selector: 'app-report-dialog-rscm',
  standalone: true,
  templateUrl: './report-dialog-rscm.component.html',
  imports: [
    CommonModule,
    MatDialogModule,
    MatCheckboxModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatOptionModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
  ],
})
export class ReportDialogRscmComponent {
  reportForm: FormGroup;

  genderOptions = [
    { value: 'Laki-laki', label: 'Laki-laki' },
    { value: 'Perempuan', label: 'Perempuan' },
  ];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ReportDialogRscmComponent>,
    @Inject(MAT_DIALOG_DATA) public props: ReportProps,
  ) {
    this.reportForm = this.createForm();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      patient_name: ['', [Validators.required, Validators.minLength(2)]],
      date_of_birth: ['', [Validators.required]],
      rekam_medis: ['', [Validators.required]],
      gender: ['', [Validators.required]],
      clinical_diagnosis: [
        'Familial Hypercholesterolemia (FH)',
        [Validators.required],
      ],
      symptoms: [''],
      physician: ['dr. Dicky Tahapary, SpPD-KEMD., PhD', [Validators.required]],
      genetic_counselor: [
        'dr. Widya Eka Nugraha, M.Si. Med.',
        [Validators.required],
      ],
    });
  }

  onSubmit(): void {
    if (this.reportForm.valid) {
      this.dialogRef.close(this.reportForm.value);
    } else {
      this.markFormGroupTouched();
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.reportForm.controls).forEach((key) => {
      const control = this.reportForm.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.reportForm.get(fieldName);

    if (control?.hasError('required')) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }

    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `${this.getFieldLabel(
        fieldName,
      )} must be at least ${minLength} characters`;
    }

    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      patient_name: 'Patient Name',
      date_of_birth: 'Date of Birth',
      rekam_medis: 'Rekam Medis',
      gender: 'Gender',
      clinical_diagnosis: 'Clinical Diagnosis',
      symptoms: 'Symptoms',
      physician: 'Physician',
      genetic_counselor: 'Genetic Counselor',
    };
    return labels[fieldName] || fieldName;
  }
}
