import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, Router, RouterOutlet, UrlTree } from '@angular/router';
import { environment } from 'src/environments/environment';

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
  private paramCache: Map<string, any> = new Map();
  private readonly ROUTES = {
    SUBMIT: 'svep-submit',
    IGV: 'svep-igv',
    RESULTS:
      environment.clinic_mode === 'svep' ? 'svep-results' : 'pgxflow-results',
  };
  private readonly TAB_ROUTES = [
    this.ROUTES.SUBMIT,
    this.ROUTES.IGV,
    this.ROUTES.RESULTS,
  ];

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

    if (path.startsWith(`clinic/${this.ROUTES.SUBMIT}`)) {
      this.paramCache.set(this.ROUTES.SUBMIT, queryParams);
      this.selectedIndex = 0;
    } else if (path.startsWith(`clinic/${this.ROUTES.IGV}`)) {
      this.paramCache.set(this.ROUTES.IGV, queryParams);
      this.selectedIndex = 1;
    } else if (path.startsWith(`clinic/${this.ROUTES.RESULTS}`)) {
      this.paramCache.set(this.ROUTES.RESULTS, queryParams);
      this.selectedIndex = 2;
    }
  }

  ngOnInit() {
    this.router.events.subscribe(() => {
      this.setTabIndex();
    });
  }

  onTabChange(index: number) {
    const route = this.TAB_ROUTES[index];

    // if directed to correct tab from same page, do nothing
    const urlTree = this.router.parseUrl(this.router.url);
    const path = urlTree.root.children['primary'].segments.at(-1)?.path;

    if (path === route) {
      return;
    }

    const params = {
      ...(this.paramCache.get(route) || {}),
    };

    this.router.navigate([route], {
      relativeTo: this.route,
      queryParams: params,
    });
  }
}
