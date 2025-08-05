import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-submit-page',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './clinic-submit.component.html',
  styleUrl: './clinic-submit.component.scss',
})
export class ClinicSubmitComponent {
  constructor() {}
}
