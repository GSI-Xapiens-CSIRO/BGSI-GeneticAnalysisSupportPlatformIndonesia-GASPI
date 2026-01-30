import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-faq-page',
  standalone: true,
  imports: [CommonModule, MatTabsModule, MatCardModule, RouterOutlet],
  templateUrl: './faq-page.component.html',
  styleUrl: './faq-page.component.scss',
})
export class FaqPageComponent implements OnInit {
  protected selectedIndex = 0;
  constructor(
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.setTabIndex();
  }

  setTabIndex() {
    const urlTree = this.router.parseUrl(this.router.url);
    const path = urlTree.root.children['primary'].segments.join('/');
    const queryParams = urlTree.queryParams;
    if (path.startsWith('faq/help-and-features')) {
      this.selectedIndex = 0;
    } else if (path.startsWith('faq/glossary')) {
      this.selectedIndex = 1;
    }
  }

  ngOnInit() {
    this.router.events.subscribe(() => {
      this.setTabIndex();
    });
  }

  onTabChange(index: number) {
    const routes = ['help-and-features', 'glossary'];
    console.log(index);
    // if directed to correct tab from same page, do nothing
    const urlTree = this.router.parseUrl(this.router.url);
    const path = urlTree.root.children['primary'].segments.at(-1)?.path;

    if (path === routes[index]) {
      return;
    }

    this.router.navigate([routes[index]], {
      relativeTo: this.route,
    });
  }
}
