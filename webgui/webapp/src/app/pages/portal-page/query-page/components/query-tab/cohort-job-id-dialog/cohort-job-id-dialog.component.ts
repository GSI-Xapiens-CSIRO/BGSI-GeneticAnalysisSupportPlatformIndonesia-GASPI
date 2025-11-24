import { Component } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-cohort-job-id-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    FormsModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './cohort-job-id-dialog.component.html',
  styleUrl: './cohort-job-id-dialog.component.scss',
})
export class CohortJobIdDialogComponent {
  jobIdFormControl: FormControl;

  constructor(fb: FormBuilder) {
    this.jobIdFormControl = fb.control('', {
      validators: [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(20),
        Validators.pattern(/^[a-zA-Z0-9-_]+$/),
      ],
    });
  }
}
