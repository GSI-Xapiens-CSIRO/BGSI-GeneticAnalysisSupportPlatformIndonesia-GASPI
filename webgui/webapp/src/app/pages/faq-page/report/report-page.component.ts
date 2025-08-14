import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { StepByItem, stepData } from '../data';
import { Router } from '@angular/router';

@Component({
  selector: 'app-report-page',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './report-page.component.html',
  styleUrl: './report-page.component.scss',
})
export class ReportPageComponent {
  stepData: StepByItem[] = [];

  constructor(private router: Router) {
    this.stepData = stepData.filter((item) => item.no !== 2);
  }

  handleRouter = (url: string) => {
    this.router.navigate([url]);
  };
}
