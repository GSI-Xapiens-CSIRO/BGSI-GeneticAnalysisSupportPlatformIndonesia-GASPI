import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  Inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  AbstractControl,
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
import { MatSelectModule } from '@angular/material/select';
import { PIIEncryptionService } from 'src/app/services/pii-encryption.service';
import { ClinicService } from 'src/app/services/clinic.service';
import { SpinnerService } from 'src/app/services/spinner.service';
import { ToastrService } from 'ngx-toastr';
import { catchError, of } from 'rxjs';

export interface ReportProps {
  projectName: string;
  requestId: string;
}

@Component({
  selector: 'app-report-dialog-rscm',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatOptionModule,
    MatRadioModule,
    ReactiveFormsModule,
    ComponentSpinnerComponent,
  ],
  templateUrl: './report-dialog-rscm.component.html',
  styleUrls: ['./report-dialog-rscm.component.scss'],
})
export class ReportDialogRscmComponent {
  protected reportForm: FormGroup;
  @ViewChild('downloadLink') downloadLink!: ElementRef<HTMLAnchorElement>;
  protected loading = false;

  genderOptions = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
  ];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ReportDialogRscmComponent>,
    private PIIEncryptionService: PIIEncryptionService,
    private cs: ClinicService,
    private ss: SpinnerService,
    private tstr: ToastrService,
    @Inject(MAT_DIALOG_DATA) public props: ReportProps,
  ) {
    this.reportForm = this.createForm();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      pii: this.fb.group({
        patient_name: ['', [Validators.required, Validators.minLength(2)]],
        date_of_birth: ['', [Validators.required]],
        rekam_medis: ['', [Validators.required]],
      }),
      nonPii: this.fb.group({
        gender: ['', [Validators.required]],
        clinical_diagnosis: [
          'Familial Hypercholesterolemia (FH)',
          [Validators.required],
        ],
        symptoms: ['', [Validators.required]],
        physician: [
          'dr. Dicky Tahapary, SpPD-KEMD., PhD',
          [Validators.required],
        ],
        genetic_counselor: [
          'dr. Widya Eka Nugraha, M.Si. Med.',
          [Validators.required],
        ],
      }),
    });
  }

  async onSubmit(): Promise<void> {
    if (!this.reportForm.valid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;
    try {
      const piiValue = this.reportForm.get('pii')?.value;

      const pii = await this.PIIEncryptionService.encryptPIIData(
        piiValue,
        false,
      );

      const nonPii = this.reportForm.get('nonPii')?.value;

      this.cs
        .generateReport(this.props.projectName, this.props.requestId, {
          pii,
          nonPii,
        })
        .pipe(catchError(() => of(null)))
        .subscribe(async (res: any) => {
          if (res && res.success) {
            // Download file
            const link = document.createElement('a');
            const dataUrl = `data:application/pdf;base64,${res.content}`;
            link.download = `${this.props.projectName}_${
              this.props.requestId
            }_${new Date().toISOString()}_report.pdf`;
            link.href = dataUrl;
            link.click();
            link.remove();

            // Success message
            this.tstr.success('Report downloaded successfully', 'Success');

            this.dialogRef.close(this.reportForm.value);
          } else if (res && !res.success) {
            this.tstr.error(res.message, 'Error');
          } else {
            this.tstr.error('Failed to generate report', 'Error');
          }

          this.loading = false;
        });
    } catch (error) {
      this.tstr.error('Failed to process request', 'Error');
      this.loading = false;
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

  getErrorMessage(fieldPath: string): string {
    const pathParts = fieldPath.split('.');
    let control: AbstractControl | null = this.reportForm;

    // Navigate to the nested control
    for (const part of pathParts) {
      if (!control) return '';
      control = control.get(part);
    }

    if (!control) return '';

    if (control.hasError('required')) {
      return `${this.getFieldLabel(fieldPath)} is required`;
    }
    if (control.hasError('minlength')) {
      const requiredLength = control.getError('minlength').requiredLength;
      return `${this.getFieldLabel(
        fieldPath,
      )} must be at least ${requiredLength} characters`;
    }
    return '';
  }

  private getFieldLabel(fieldPath: string): string {
    const labels: { [key: string]: string } = {
      'pii.patient_name': 'Patient Name',
      'pii.date_of_birth': 'Date of Birth',
      'pii.rekam_medis': 'Rekam Medis',
      'pii.gender': 'Gender',
      'nonPii.clinical_diagnosis': 'Clinical Diagnosis',
      'nonPii.symptoms': 'Symptoms',
      'nonPii.physician': 'Physician',
      'nonPii.genetic_counselor': 'Genetic Counselor',
    };
    return labels[fieldPath] || fieldPath;
  }
}
