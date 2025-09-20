import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { faqItemsData, StepByItem, stepData } from '../data';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
  selector: 'app-help-and-feature-page',
  standalone: true,
  imports: [CommonModule, MatExpansionModule, MatIconModule],
  templateUrl: './help-and-features-page.component.html',
  styleUrl: './help-and-features-page.component.scss',
})
export class HelpAndFeaturesPageComponent {
  panelOpenState = false;
  panelContentState = true;
  content: '' | 'introduction' | 'step-by-step' = '';

  faqItems: { title: string; html: SafeHtml }[] = [];
  stepData: StepByItem[] = [];

  constructor(
    private sanitizer: DomSanitizer,
    private router: Router,
  ) {
    this.faqItems = faqItemsData.map((item) => ({
      ...item,
      html: this.sanitizer.bypassSecurityTrustHtml(item.html),
    }));
    this.stepData = stepData;
  }

  setContent(content: '' | 'introduction' | 'step-by-step') {
    if (this.content === content) {
      this.content = '';
      return;
    }
    this.content = content;
  }

  handleRedirect = (url: string) => {
    this.router.navigate([url]);
  };
}
