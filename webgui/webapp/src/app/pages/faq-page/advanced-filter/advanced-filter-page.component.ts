import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { StepByItem, stepData } from '../data';
import { Router } from '@angular/router';

@Component({
  selector: 'app-advanced-filter-page',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './advanced-filter-page.component.html',
  styleUrl: './advanced-filter-page.component.scss',
})
export class AdvacedFilterPageComponent {
  stepData: StepByItem[] = [];

  constructor(private router: Router) {
    this.stepData = stepData.filter((item) => item.no !== 0);
  }

  handleRouter = (url: string) => {
    console.log(url);
    this.router.navigate([url]);
  };
}
