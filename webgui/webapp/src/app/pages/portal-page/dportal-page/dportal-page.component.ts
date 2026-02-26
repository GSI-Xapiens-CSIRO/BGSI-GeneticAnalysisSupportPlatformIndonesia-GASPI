import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from 'src/app/services/auth.service';
import { DataSubmissionFormComponent } from './admin-section/data-submission-form/data-submission-form.component';
import { UserFileListComponent } from './user-section/user-file-list/user-file-list.component';
import { UserNotebookListComponent } from './user-section/user-notebook-list/user-notebook-list.component';
import { UserProjectsListComponent } from './user-section/user-projects-list/user-projects-list.component';
import { UserSectionComponent } from './user-section/user-section.component';
import { AdminSectionComponent } from './admin-section/admin-section.component';
import { HasPermissionDirective } from 'src/app/directives/permission.directive';
import { PermissionService } from 'src/app/services/permission.service';

@Component({
  selector: 'app-dportal-page',
  standalone: true,
  imports: [
    MatCardModule,
    AsyncPipe,
    DataSubmissionFormComponent,
    UserFileListComponent,
    UserNotebookListComponent,
    UserProjectsListComponent,
    UserSectionComponent,
    AdminSectionComponent,
    HasPermissionDirective,
  ],
  templateUrl: './dportal-page.component.html',
  styleUrl: './dportal-page.component.scss',
})
export class DportalPageComponent {
  constructor(
    protected auth: AuthService,
    protected permissionService: PermissionService,
  ) { }
}
