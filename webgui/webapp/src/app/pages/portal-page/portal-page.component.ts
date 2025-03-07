import { AsyncPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from 'src/app/services/auth.service';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-dportal-page',
  standalone: true,
  imports: [MatCardModule, MatTabsModule, RouterOutlet],
  templateUrl: './portal-page.component.html',
  styleUrl: './portal-page.component.scss',
})
export class PortalPageComponent implements OnInit {
  protected selectedIndex = 0;

  constructor(
    protected auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.setTabIndex();
  }

  setTabIndex() {
    const urlTree = this.router.parseUrl(this.router.url);
    const path = urlTree.root.children['primary'].segments.join('/');

    if (path.startsWith('dportal/portal')) {
      this.selectedIndex = 0;
    } else if (path.startsWith('dportal/sbeacon-query')) {
      this.selectedIndex = 1;
    } else if (path.startsWith('dportal/sbeacon-filter')) {
      this.selectedIndex = 2;
    }
  }

  ngOnInit(): void {
    this.router.events.subscribe(() => {
      this.setTabIndex();
    });
  }

  onTabChange(index: number) {
    const routes = ['portal', 'sbeacon-query', 'sbeacon-filter'];
    // if directed to correct tab from same page, do nothing
    const urlTree = this.router.parseUrl(this.router.url);
    const path = urlTree.root.children['primary'].segments.at(-1)?.path;

    if (path === routes[index]) {
      return;
    }

    this.router.navigate([routes[index]], { relativeTo: this.route });
  }
}
