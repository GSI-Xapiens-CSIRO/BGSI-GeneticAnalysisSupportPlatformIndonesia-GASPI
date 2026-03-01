import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { ToastrService } from 'ngx-toastr';
import { catchError, of } from 'rxjs';
import { DportalService } from 'src/app/services/dportal.service';
import { HasPermissionDirective, DisableIfNoPermissionDirective } from 'src/app/directives/permission.directive';

@Component({
  selector: 'app-admin-folder-list',
  standalone: true,
  imports: [
    MatTableModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    HasPermissionDirective,
    DisableIfNoPermissionDirective,
  ],
  templateUrl: './admin-folder-list.component.html',
  styleUrl: './admin-folder-list.component.scss',
})
export class AdminFolderListComponent implements OnInit, AfterViewInit {
  @ViewChild(MatSort) sort!: MatSort;
  displayedColumns: string[] = ['given_name', 'family_name', 'email', 'action'];
  dataSource = new MatTableDataSource<any>([]);
  inactiveIdentities: any[] = [];

  constructor(
    private dps: DportalService,
    private tstr: ToastrService,
    private dg: MatDialog,
  ) { }

  ngOnInit(): void {
    this.list();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  list() {
    this.dps
      .adminGetUserFolders()
      .pipe(catchError(() => of(null)))
      .subscribe((data) => {
        if (!data) {
          this.tstr.error('Error fetching folders', 'Error');
        } else {
          this.dataSource.data = data.active;
          this.inactiveIdentities = data.inactive;
        }
      });
  }

  async deleteFolder(folder: string) {
    const { ActionConfirmationDialogComponent } = await import(
      'src/app/components/action-confirmation-dialog/action-confirmation-dialog.component'
    );

    const dialog = this.dg.open(ActionConfirmationDialogComponent, {
      data: {
        title: 'Delete User Folder',
        message: 'Are you sure you want to delete this user folder?',
      },
    });

    dialog.afterClosed().subscribe((result) => {
      if (result) {
        this.dps
          .adminDeleteUserFolder(folder)
          .pipe(catchError(() => of(null)))
          .subscribe((data) => {
            if (!data) {
              this.tstr.error('Error deleting folder', 'Error');
            } else {
              this.list();
            }
          });
      }
    });
  }
}
