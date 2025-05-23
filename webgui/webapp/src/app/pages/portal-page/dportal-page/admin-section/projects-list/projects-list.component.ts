import {
  ChangeDetectorRef,
  Component,
  Injectable,
  ViewChild,
} from '@angular/core';
import { ComponentSpinnerComponent } from 'src/app/components/component-spinner/component-spinner.component';
import { DportalService } from 'src/app/services/dportal.service';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { SpinnerService } from 'src/app/services/spinner.service';
import {
  BehaviorSubject,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  of,
} from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  MatPaginator,
  MatPaginatorIntl,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import * as _ from 'lodash';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ToastrService } from 'ngx-toastr';

export interface Project {
  name: string;
  description: string;
  files: string[];
  pendingFiles: string[];
  totalSamples: number;
  ingestedDatasets: string[];
  errorMessages: { file: string; error: string }[];
}

@Injectable()
export class MyCustomPaginatorIntl implements MatPaginatorIntl {
  changes = new Subject<void>();

  // For internationalization, the `$localize` function from
  // the `@angular/localize` package can be used.
  firstPageLabel = $localize`First page`;
  itemsPerPageLabel = $localize`Items per page:`;
  lastPageLabel = $localize`Last page`;

  // You can set labels to an arbitrary string too, or dynamically compute
  // it through other third-party internationalization libraries.
  nextPageLabel = 'Next page';
  previousPageLabel = 'Previous page';

  getRangeLabel(page: number, pageSize: number, length: number): string {
    return $localize`Page ${page + 1}`;
  }
}

@Component({
  selector: 'app-projects-list',
  providers: [{ provide: MatPaginatorIntl, useClass: MyCustomPaginatorIntl }],
  standalone: true,
  imports: [
    ComponentSpinnerComponent,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule,
    MatPaginatorModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
  ],
  templateUrl: './projects-list.component.html',
  styleUrl: './projects-list.component.scss',
})
export class ProjectsListComponent {
  loading = true;
  dataSource = new MatTableDataSource<Project>();
  displayedColumns: string[] = [
    'name',
    'description',
    'files',
    'indexed',
    'actions',
  ];
  protected pageSize = 5;
  searchControl = new FormControl('');
  private searchSubject = new BehaviorSubject<string>(''); // Stores latest search value

  @ViewChild('paginator')
  paginator!: MatPaginator;
  private pageTokens = new Map<number, string>();

  constructor(
    private dps: DportalService,
    private ss: SpinnerService,
    private tstr: ToastrService,
    private dg: MatDialog,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.list(0, '');
    this.cd.detectChanges();

    this.paginator.page.subscribe((event: PageEvent) => {
      if (this.pageSize != this.paginator.pageSize) {
        this.resetPagination();
        this.refresh();
      } else {
        this.list(event.pageIndex, this.searchSubject.value);
      }
    });

    // Detect changes on search input
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => {
        this.resetPagination();
        this.setSearchInput(value as string);
        this.list(this.paginator.pageIndex, value as string);
      });
  }

  resetPagination() {
    this.pageTokens = new Map<number, string>();
    this.paginator.pageIndex = 0;
    this.pageSize = this.paginator.pageSize;
  }

  setSearchInput(query: string) {
    this.searchSubject.next(query);
  }

  list(page: number, search: string) {
    // not the first page but the page token is not set
    if (!this.pageTokens.get(page) && page > 0) {
      this.paginator.pageIndex--;
      this.tstr.warning('No more items to show', 'Warning');
      return;
    }
    this.loading = true;
    this.dps
      .getAdminProjects(this.pageSize, this.pageTokens.get(page), search)
      .pipe(catchError(() => of(null)))
      .subscribe((data: any) => {
        if (!data) {
          this.tstr.error('API request failed', 'Error');
          this.dataSource.data = [];
        } else {
          //handle if there no data on next page (set page index and last page to prev value)
          if (data && data.data.length <= 0 && this.paginator.pageIndex > 0) {
            this.paginator.pageIndex--;
            this.tstr.warning('No more items to show', 'Warning');
            this.loading = false;
            return;
          }

          this.dataSource.data = data.data.map((project: any) => ({
            name: project.name,
            description: project.description,
            files: project.files,
            totalSamples: project.total_samples,
            pendingFiles: project.pending_files,
            ingestedDatasets: project.ingested_datasets,
            errorMessages: project.error_messages,
          }));

          // set next page token
          this.pageTokens.set(page + 1, data.last_evaluated_key);
        }
        this.loading = false;
      });
  }

  refresh() {
    try {
      this.resetPagination();
      this.list(0, this.searchSubject.value);
    } catch (error) {
      console.log(error);
    }
  }

  async updateProject(project: Project) {
    const { ProjectUpdateDialogComponent } = await import(
      './project-update-dialog/project-update-dialog.component'
    );

    const dialog = this.dg.open(ProjectUpdateDialogComponent, {
      data: {
        project,
      },
    });

    dialog.afterClosed().subscribe((result) => {
      this.list(this.paginator.pageIndex, '');
    });
  }

  async index() {
    const { ActionConfirmationDialogComponent } = await import(
      '../../../../../components/action-confirmation-dialog/action-confirmation-dialog.component'
    );

    const dialog = this.dg.open(ActionConfirmationDialogComponent, {
      data: {
        title: 'Build sBeacon Index',
        message:
          'Do this once you have ingested as many new datasets as possible to avoid costs. Are you sure you want to re-index sBeacon?',
      },
    });
    dialog.afterClosed().subscribe((result) => {
      if (result) {
        this.ss.start();
        this.dps
          .adminIndexBeacon()
          .pipe(catchError(() => of(null)))
          .subscribe((res: any) => {
            if (!res) {
              this.tstr.error('API request failed', 'Error');
            } else if (!res.success) {
              this.tstr.error(res.message, 'Error');
            } else {
              this.tstr.success(
                'Indexing is happening in the background. It might take a few minutes.',
                'Success',
              );
            }
            this.ss.end();
          });
      }
    });
  }

  async clearErrors(name: string) {
    const { ActionConfirmationDialogComponent } = await import(
      '../../../../../components/action-confirmation-dialog/action-confirmation-dialog.component'
    );

    const dialog = this.dg.open(ActionConfirmationDialogComponent, {
      data: {
        title: 'Clear Errors',
        message: 'Are you sure you want to clear errors from this project?',
      },
    });
    dialog.afterClosed().subscribe((result) => {
      if (result) {
        this.dps
          .clearAdminProjectErrors(name)
          .pipe(catchError(() => of(null)))
          .subscribe((res: any) => {
            if (!res) {
              this.tstr.error('Unable to clear errors.', 'Error');
            } else {
              this.tstr.success('Errors cleared.', 'Success');
            }
            this.list(this.paginator.pageIndex, '');
          });
      }
    });
  }

  async delete(name: string) {
    const { ActionConfirmationDialogComponent } = await import(
      '../../../../../components/action-confirmation-dialog/action-confirmation-dialog.component'
    );

    const dialog = this.dg.open(ActionConfirmationDialogComponent, {
      data: {
        title: 'Delete Project',
        message: 'Are you sure you want to delete this project?',
      },
    });
    dialog.afterClosed().subscribe((result) => {
      if (result) {
        this.dps
          .deleteAdminProject(name)
          .pipe(catchError(() => of(null)))
          .subscribe((res: any) => {
            if (!res) {
              this.tstr.error('Unable to delete project.', 'Error');
            } else {
              this.tstr.success('Project deleted.', 'Success');
            }
            this.refresh();
          });
      }
    });
  }

  async addUserDialog(project: any) {
    const { ProjectAssignmentsDialogComponent } = await import(
      './project-assignments-dialog/project-assignments-dialog.component'
    );

    this.dg.open(ProjectAssignmentsDialogComponent, {
      data: {
        project: project.name,
      },
    });
  }

  async createUploadLink(project: any) {
    const { UploadLinkGenerationDialogComponent } = await import(
      './upload-link-generation-dialog/upload-link-generation-dialog.component'
    );

    this.dg.open(UploadLinkGenerationDialogComponent, {
      data: {
        project: project.name,
      },
    });
  }

  async manageUsersDialog(project: any) {
    const { ProjectUsersDialogComponent } = await import(
      './project-users-dialog/project-users-dialog.component'
    );

    this.dg.open(ProjectUsersDialogComponent, {
      data: {
        project: project.name,
      },
    });
  }

  async ingest(project: any) {
    const { BeaconIngestDialogComponent } = await import(
      './beacon-ingest-dialog/beacon-ingest-dialog.component'
    );

    const dialog = this.dg.open(BeaconIngestDialogComponent, {
      data: {
        project,
      },
    });
    dialog.afterClosed().subscribe((result) => {
      if (result) {
        this.list(this.paginator.pageIndex, '');
      }
    });
  }
}
