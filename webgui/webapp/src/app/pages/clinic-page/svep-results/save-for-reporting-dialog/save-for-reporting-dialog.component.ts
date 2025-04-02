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
import { CONFIGS } from '../hub_configs';
import { environment } from 'src/environments/environment';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-save-for-reporting-dialog',
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
  templateUrl: './save-for-reporting-dialog.component.html',
  styleUrl: './save-for-reporting-dialog.component.scss',
})
export class SaveForReportingDialogComponent {
  protected saveForm: FormGroup = new FormGroup({
    comment: new FormControl('', [Validators.required]),
  });

  constructor(
    protected cs: ClinicService,
    private tstr: ToastrService,
    private ss: SpinnerService,
    public dialogRef: MatDialogRef<SaveForReportingDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { projectName: string; requestId: string },
  ) {}

  filterCols(row: { [key: string]: string }): { [key: string]: string } {
    if (environment.hub_name in CONFIGS) {
      const { cols } = CONFIGS[environment.hub_name];
      const filteredRow: { [key: string]: string } = {};
      for (const col of cols) {
        if (row[col]) {
          filteredRow[col] = row[col];
        }
      }
      return filteredRow;
    }
    return row;
  }

  async saveForReporting() {
    const variants = [...this.cs.selectedVariants.getValue().values()].map(
      (row) => this.filterCols(row),
    );
    this.ss.start();
    this.cs
      .saveVariants(
        this.data.projectName,
        this.data.requestId,
        this.saveForm.get('comment')?.value,
        variants,
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
}
