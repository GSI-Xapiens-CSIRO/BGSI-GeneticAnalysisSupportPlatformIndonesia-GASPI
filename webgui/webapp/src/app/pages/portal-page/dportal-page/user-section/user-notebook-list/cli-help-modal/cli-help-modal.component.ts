import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-cli-help-modal',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatIconModule, MatTabsModule],
  templateUrl: './cli-help-modal.component.html',
  styleUrl: './cli-help-modal.component.scss',
})
export class CliHelpModalComponent {}
