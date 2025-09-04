import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  Inject,
  OnInit,
  ViewChild,
} from '@angular/core';
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
import { MatSelectModule } from '@angular/material/select';
import { PIIEncryptionService } from 'src/app/services/pii-encryption.service';
import { ClinicService } from 'src/app/services/clinic.service';
import { SpinnerService } from 'src/app/services/spinner.service';
import { ToastrService } from 'ngx-toastr';
import { catchError, of } from 'rxjs';

export interface ReportProps {
  projectName: string;
  requestId: string;
  lang: string;
  mode: string;
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
  templateUrl: './report-dialog-rssardjito.component.html',
  styleUrls: ['./report-dialog-rssardjito.component.scss'],
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
      patient_name: ['', [Validators.required, Validators.minLength(2)]],
      lab_number: ['', [Validators.required, Validators.minLength(2)]],
      gender: ['', [Validators.required]],
      date_of_birth: ['', [Validators.required]],
      race: ['', [Validators.required]],
      specimen_type: ['', [Validators.required]],
      sample_id: ['', [Validators.required]],
      referring_clinician: ['', [Validators.required]],
      sampling_date: ['', [Validators.required]],
      testing_date: ['', [Validators.required]],
      reporting_date: ['', [Validators.required]],
      reffering_institution: ['', [Validators.required]],
      testing_laboratory: ['', [Validators.required]],
    });
  }

  async onSubmit(): Promise<void> {
    if (!this.reportForm.valid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;
    try {
      const pii = await this.PIIEncryptionService.encryptPIIData(
        this.reportForm.value,
        false,
      );

      this.cs
        .generateReport(this.props.projectName, this.props.requestId, {
          lang: this.props.lang,
          mode: this.props.mode,
          pii,
        })
        .pipe(catchError(() => of(null)))
        .subscribe((res: any) => {
          if (res && res.success) {
            console.log(res);
            const dataUrl = `data:application/pdf;base64,${res.content}`;
            this.downloadLink.nativeElement.download = `${
              this.props.projectName
            }_${this.props.requestId}_${new Date().toISOString()}_report.pdf`;
            this.downloadLink.nativeElement.href = dataUrl;
            this.downloadLink.nativeElement.click();
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
      lab_number: 'Lab Number',
      gender: 'Gender',
      date_of_birth: 'Date of Birth',
      race: 'Race',
      specimen_type: 'Specimen Type',
      sample_id: 'Sample ID',
      referring_clinician: 'Referring Clinician',
      sampling_date: 'Sampling Date',
      testing_date: 'Testing Date',
      reporting_date: 'Reporting Date',
      reffering_institution: 'Referring Institution',
      testing_laboratory: 'Testing Laboratory',
    };
    return labels[fieldName] || fieldName;
  }
}
