import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, Router, RouterOutlet, UrlTree } from '@angular/router';

@Component({
  selector: 'app-filters-page',
  templateUrl: './clinic-page.component.html',
  styleUrls: ['./clinic-page.component.scss'],
  standalone: true,
  imports: [MatTabsModule, MatCardModule, RouterOutlet],
  animations: [],
})
export class ClinicPageComponent implements OnInit {
  protected selectedIndex = 0;
  private paramChache: Map<string, any> = new Map();

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

    if (path.startsWith('clinic/clinic-submit')) {
      this.paramChache.set('clinic-submit', queryParams);
      this.selectedIndex = 0;
    } else if (path.startsWith('clinic/clinic-igv')) {
      this.paramChache.set('clinic-igv', queryParams);
      this.selectedIndex = 1;
    } else if (path.startsWith('clinic/clinic-results')) {
      this.paramChache.set('clinic-results', queryParams);
      this.selectedIndex = 2;
    }
  }

  ngOnInit() {
    this.router.events.subscribe(() => {
      this.setTabIndex();
    });
  }

  onTabChange(index: number) {
    const routes = ['clinic-submit', 'clinic-igv', 'clinic-results'];
    // if directed to correct tab from same page, do nothing
    const urlTree = this.router.parseUrl(this.router.url);
    const path = urlTree.root.children['primary'].segments.at(-1)?.path;

    if (path === routes[index]) {
      return;
    }

    const params = {
      ...(this.paramChache.get(routes[index]) || {}),
    };

    this.router.navigate([routes[index]], {
      relativeTo: this.route,
      queryParams: params,
    });
  }
}
