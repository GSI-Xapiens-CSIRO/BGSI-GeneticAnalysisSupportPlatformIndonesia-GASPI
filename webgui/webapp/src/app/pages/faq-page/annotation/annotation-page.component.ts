import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { StepByItem, stepData } from '../data';
import { Router } from '@angular/router';

@Component({
  selector: 'app-annotation-page',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './annotation-page.component.html',
  styleUrl: './annotation-page.component.scss',
})
export class AnnotationPageComponent {
  stepData: StepByItem[] = [];

  constructor(private router: Router) {
    this.stepData = stepData.filter((item) => item.no !== 1);
  }

  handleRouter = (url: string) => {
    this.router.navigate([url]);
  };
}
