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
import { MatSnackBar } from '@angular/material/snack-bar';
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
  protected Object = Object;

  constructor(
    protected cs: ClinicService,
    private sb: MatSnackBar,
    private ss: SpinnerService,
    public dialogRef: MatDialogRef<AddAnnotationDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { projectName: string; requestId: string },
  ) {}

  saveAnnotations() {
    const variants = Object.keys(this.cs.selectedVariants).map(
      (key) => this.cs.selectedVariants[key],
    );

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
          this.sb.open('Failed to save annotations', 'Okay', {
            duration: 5000,
          });
        } else {
          this.sb.open('Annotations saved', 'Okay', {
            duration: 5000,
          });
          this.cs.selectedVariants = {};
          this.cs.annotionsChanged.next();
          this.dialogRef.close();
        }
        this.ss.end();
      });
  }
}
