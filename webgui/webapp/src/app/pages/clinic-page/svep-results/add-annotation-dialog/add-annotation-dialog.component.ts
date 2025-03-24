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
  selector: 'app-add-annotation-dialog',
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
  templateUrl: './add-annotation-dialog.component.html',
  styleUrl: './add-annotation-dialog.component.scss',
})
export class AddAnnotationDialogComponent {
  protected annotationForm: FormGroup = new FormGroup({
    annotation: new FormControl('', [Validators.required]),
  });

  constructor(
    protected cs: ClinicService,
    private tstr: ToastrService,
    private ss: SpinnerService,
    public dialogRef: MatDialogRef<AddAnnotationDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { projectName: string; requestId: string },
  ) {}

  saveAnnotations() {
    const variants = [...this.cs.selectedVariants.getValue().values()];
    this.ss.start();
    this.cs
      .saveAnnotations(
        this.data.projectName,
        this.data.requestId,
        this.annotationForm.get('annotation')?.value,
        variants,
      )
      .pipe(catchError(() => of(null)))
      .subscribe((data) => {
        if (!data) {
          this.tstr.error('Failed to save annotations', 'Error');
        } else {
          this.tstr.success('Annotations saved', 'Success');
          this.cs.selectedVariants.next(new Map());
          this.cs.annotionsChanged.next();
          this.dialogRef.close();
        }
        this.ss.end();
      });
  }
}
