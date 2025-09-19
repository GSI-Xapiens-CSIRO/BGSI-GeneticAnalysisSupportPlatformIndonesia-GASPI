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
  @Input() message?: string;
  @Input() additionalReasons?: string[];
  protected defaultReasons = [
    'The filtering parameters applied in the back-end.',
    'The database(s) referred to not having matched record(s) with the input VCF file.',
  ];
  constructor() {}

  get allReasons(): string[] {
    return [...this.defaultReasons, ...(this.additionalReasons || [])];
  }
}
