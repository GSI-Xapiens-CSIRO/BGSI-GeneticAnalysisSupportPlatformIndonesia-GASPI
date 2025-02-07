import { Component, Inject } from '@angular/core';
import {
  FormBuilder,
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
import { QRCodeModule } from 'angularx-qrcode';

@Component({
  selector: 'app-mfa-qr-code',
  standalone: true,
  imports: [
    MatDialogModule,
    QRCodeModule,
    MatButtonModule,
    MatFormFieldModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
  ],
  templateUrl: './mfa-qr-code.component.html',
  styleUrl: './mfa-qr-code.component.scss',
})
export class MFAQRCodeComponent {
  protected code = this.fb.control('', [
    Validators.required,
    Validators.minLength(6),
    Validators.maxLength(6),
    Validators.pattern(/^[0-9]*$/),
  ]);

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<MFAQRCodeComponent>,
    @Inject(MAT_DIALOG_DATA) public data: string,
  ) {
    console.log(data);
  }
}
