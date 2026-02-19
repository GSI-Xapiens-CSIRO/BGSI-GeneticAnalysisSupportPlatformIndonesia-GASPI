import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { AdminUsersTabComponent } from './components/admin-users-tab/admin-users-tab.component';
import { AdminRolesTabComponent } from './components/admin-roles-tab/admin-roles-tab.component';

@Component({
  selector: 'app-admin-page',
  templateUrl: './admin-page.component.html',
  styleUrls: ['./admin-page.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTabsModule,
    AdminUsersTabComponent,
    AdminRolesTabComponent,
  ],
})
export class AdminPageComponent {
  selectedTab = 0;

  onTabChange(index: number) {
    this.selectedTab = index;
  }
}
