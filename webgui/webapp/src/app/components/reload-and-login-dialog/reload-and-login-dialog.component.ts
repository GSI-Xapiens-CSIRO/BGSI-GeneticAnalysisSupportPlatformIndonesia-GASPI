import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-reload-and-login-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './reload-and-login-dialog.component.html',
  styleUrl: './reload-and-login-dialog.component.scss',
})
export class ReloadAndLoginDialogComponent {
  constructor(public dialogRef: MatDialogRef<ReloadAndLoginDialogComponent>) {}

  reload() {
    window.location.href = '/login';
  }
}
