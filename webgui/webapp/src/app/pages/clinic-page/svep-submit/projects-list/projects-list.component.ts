import {
  Component,
  Output,
  EventEmitter,
  ViewChild,
  Injectable,
  ChangeDetectorRef,
} from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { catchError, of, Subject } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { DportalService } from 'src/app/services/dportal.service';
import { ComponentSpinnerComponent } from 'src/app/components/component-spinner/component-spinner.component';
import {
  MatPaginator,
  MatPaginatorIntl,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { isEmpty } from 'lodash';
import { ToastrService } from 'ngx-toastr';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';
import { environment } from 'src/environments/environment';
import { ClinicService } from 'src/app/services/clinic.service';

interface ProjectFile {
  filename: string;
  hasindex: boolean;
}

interface Project {
  name: string;
  description: string;
  files: ProjectFile[];
  indexed: boolean;
}

export interface FileSelectEvent {
  projectName: string;
  vcf: string;
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
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatPaginatorModule,
    ComponentSpinnerComponent,
    MatTooltip,
    MatTooltipModule,
  ],
  templateUrl: './projects-list.component.html',
  styleUrl: './projects-list.component.scss',
})
export class ProjectsListComponent {
  @Output() filesSelected = new EventEmitter<FileSelectEvent>();
  loading = true;
  dataSource = new MatTableDataSource<Project>();
  displayedColumns: string[] = ['name', 'description', 'files', 'actions'];
  assignTo: string | null = null;
  viewUsers: string | null = null;
  projectName: string | null = null;
  vcfFile: string | null = null;

  protected pageSize = 5;
  @ViewChild('paginator')
  paginator!: MatPaginator;
  private pageTokens = new Map<number, string>();
  private isEmptyLastPage = false;
  protected submissionStarted = false;

  constructor(
    private dps: DportalService,
    private tstr: ToastrService,
    private cd: ChangeDetectorRef,
    private cs: ClinicService,
  ) {}

  ngOnInit(): void {
    this.list(0);
    this.cd.detectChanges();

    this.paginator.page.subscribe((event: PageEvent) => {
      if (this.pageSize != this.paginator.pageSize) {
        this.resetPagination();
        this.refresh();
      } else {
        this.list(event.pageIndex);
      }
    });
  }

  list(page: number) {
    this.loading = true;

    if (this.isEmptyLastPage && this.paginator.pageIndex > 0) {
      this.paginator.pageIndex--;
      this.tstr.warning('No more items to show', 'Warning');
      this.loading = false;
      return;
    }

    this.dps
      .getMyProjects(this.pageSize, this.pageTokens.get(page))
      .pipe(
        catchError((error) => {
          console.error('Error fetching projects:', error); // Log the error
          return of(null); // Return null to continue the stream
        }),
      )
      .subscribe((response: any) => {
        if (!response.data) {
          this.tstr.error('API request failed', 'Error');
          this.dataSource.data = [];
        } else {
          this.dataSource.data = response.data.map((project: any) => {
            const vcfFiles = project.files.filter(
              (file: string) =>
                file.endsWith('.vcf.gz') || file.endsWith('.bcf.gz'),
            );
            const filesWithStatus = vcfFiles.map((file: string) => {
              const hasIndex =
                project.files.includes(`${file}.tbi`) ||
                project.files.includes(`${file}.csi`);
              return {
                filename: file,
                disabled: !hasIndex,
              };
            });

            return {
              name: project.name,
              description: project.description,
              files: filesWithStatus,
              action: '',
              indexed: false,
            };
          });

          // set next page token
          this.pageTokens.set(page + 1, response.last_evaluated_key);
          this.isEmptyLastPage = isEmpty(response.last_evaluated_key);
        }
        this.loading = false;
      });
  }

  resetPagination() {
    this.pageTokens = new Map<number, string>();
    this.paginator.pageIndex = 0;
    this.pageSize = this.paginator.pageSize;
  }

  refresh() {
    try {
      this.resetPagination();
      this.list(0);
    } catch (error) {
      console.log(error);
    }
  }

  showQC() {
    this.tstr.error('Waiting API', 'Error');
  }

  submit(file: string, projectName: string) {
    this.submissionStarted = true;

    if (file) {
      const s3URI = `s3://${environment.storage.dataPortalBucket}/projects/${projectName}/project-files/${file}`;

      this.cs
        .submitSvepJob(s3URI, projectName!)
        .pipe(
          catchError((e) => {
            const errorMessage =
              e.response?.data?.error?.errorMessage ||
              'Something went wrong when initaiting the job. Please try again later.';
            this.tstr.error(errorMessage, 'Error');
            this.submissionStarted = false;
            return of(null);
          }),
        )
        .subscribe((response: any) => {
          if (response) {
            this.tstr.success(
              'Displaying results takes time according to the size of your data. Once completed, we will send you a notification via email.',
              'Success',
            );
            this.list(0);
          }
        });
    } else {
      this.tstr.warning('No file selected', 'Warning');
      this.submissionStarted = false;
    }
  }
}
