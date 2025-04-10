import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { ToastrService } from 'ngx-toastr';
import { catchError, of } from 'rxjs';
import { DportalService } from 'src/app/services/dportal.service';

interface User {
  firstName: string;
  lastName: string;
  email: string;
}

@Component({
  selector: 'app-projects-users',
  standalone: true,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatDialogModule,
    MatDialogModule,
  ],
  templateUrl: './project-users-dialog.component.html',
  styleUrl: './project-users-dialog.component.scss',
})
export class ProjectUsersDialogComponent {
  project: string;
  displayedColumns: string[] = ['firstName', 'lastName', 'email', 'actions'];
  dataSource = new MatTableDataSource<User>();

  constructor(
    private dps: DportalService,
    private tstr: ToastrService,
    private dg: MatDialog,
    public dialogRef: MatDialogRef<ProjectUsersDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { project: string },
  ) {
    this.project = data.project;
    this.list();
  }

  list() {
    this.dps
      .adminGetProjectUsers(this.project!)
      .pipe(catchError(() => of(null)))
      .subscribe((users: User[] | null) => {
        if (!users) {
          this.tstr.error('Unable to add user. Please check email.', 'error');
        } else {
          this.dataSource.data = users;
        }
      });
  }

  async unAssignUser(email: string) {
    const { ActionConfirmationDialogComponent } = await import(
      '../../../../../../components/action-confirmation-dialog/action-confirmation-dialog.component'
    );

    const dialog = this.dg.open(ActionConfirmationDialogComponent, {
      data: {
        title: 'Remove User',
        message: 'Are you sure you want to remove this user from project?',
      },
    });
    dialog.afterClosed().subscribe((result) => {
      if (result) {
        this.dps
          .adminRemoveUserFromProject(this.project, email)
          .pipe(catchError(() => of(null)))
          .subscribe((res: any) => {
            if (!res) {
              this.tstr.error('Unable to remove user.', 'Error');
            }
            this.list();
          });
      }
    });
  }
}
