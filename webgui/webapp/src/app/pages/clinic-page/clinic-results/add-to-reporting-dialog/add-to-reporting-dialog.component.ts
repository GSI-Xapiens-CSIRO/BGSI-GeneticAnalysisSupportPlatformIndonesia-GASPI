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
import { catchError, of } from 'rxjs';
import { ClinicService } from 'src/app/services/clinic.service';
import { SpinnerService } from 'src/app/services/spinner.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'add-to-reporting-dialog',
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
  templateUrl: './add-to-reporting-dialog.component.html',
  styleUrl: './add-to-reporting-dialog.component.scss',
})
export class AddToReportingDialogComponent {
  protected saveForm: FormGroup = new FormGroup({
    comment: new FormControl('', [Validators.required]),
  });

  constructor(
    protected cs: ClinicService,
    private tstr: ToastrService,
    private ss: SpinnerService,
    public dialogRef: MatDialogRef<AddToReportingDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { projectName: string; requestId: string; variants: any[] },
  ) {}

  async saveForReporting() {
    this.ss.start();
    this.cs
      .saveVariants(
        this.data.projectName,
        this.data.requestId,
        this.saveForm.get('comment')?.value,
        this.data.variants,
      )
      .pipe(catchError((err) => of(err)))
      .subscribe((data) => {
        if (!data) {
          this.tstr.error('Failed to save variants', 'Error');
        } else {
          this.tstr.success('Variants saved', 'Success');
          this.cs.selectedVariants.next(new Map());
          this.cs.savedVariantsChanged.next();
          this.dialogRef.close();
        }
        this.ss.end();
      });
  }

  removeSelectedVariant(variant: { [key: string]: string }): void {
    this.data.variants = this.data.variants.filter((v) => v !== variant);
  }
}
