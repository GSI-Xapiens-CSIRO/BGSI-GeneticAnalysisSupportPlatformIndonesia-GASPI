import { AfterViewInit, Component } from '@angular/core';
import { DataSubmissionFormComponent } from './data-submission-form/data-submission-form.component';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { ProjectsListComponent } from './projects-list/projects-list.component';
import { NotebooksComponent } from './admin-notebooks-list/admin-notebooks-list.component';
import { Router } from '@angular/router';
import { AdminFolderListComponent } from './admin-folder-list/admin-folder-list.component';
import { HasPermissionDirective } from 'src/app/directives/permission.directive';

@Component({
  selector: 'app-admin-section',
  standalone: true,
  imports: [
    DataSubmissionFormComponent,
    MatCardModule,
    MatTabsModule,
    ProjectsListComponent,
    NotebooksComponent,
    AdminFolderListComponent,
    HasPermissionDirective,
  ],
  templateUrl: './admin-section.component.html',
  styleUrl: './admin-section.component.scss',
})
export class AdminSectionComponent implements AfterViewInit {
  protected selectedIndex = 0;
  constructor(private router: Router) { }
  ngAfterViewInit(): void {
    this.router.events.subscribe(() => {
      this.onSubTabChange(0);
    });
  }

  onSubTabChange(index: number) {
    this.selectedIndex = index;
  }
}
