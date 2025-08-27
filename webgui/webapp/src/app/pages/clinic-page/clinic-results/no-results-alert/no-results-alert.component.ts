import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-no-results-alert',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './no-results-alert.component.html',
})
export class NoResultsAlertComponent {
  @Input() message: string | null | undefined = null;
  constructor() {}
}
