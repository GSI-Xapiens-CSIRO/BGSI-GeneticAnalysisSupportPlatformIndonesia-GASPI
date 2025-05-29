import {
  Component,
  ViewChild,
  Injectable,
  ChangeDetectorRef,
  Input,
  OnInit,
  OnChanges,
} from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import {
  BehaviorSubject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  of,
  Subject,
  Subscription,
} from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import {
  MatPaginator,
  MatPaginatorIntl,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { isEmpty } from 'lodash';
import { MatTooltip } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { ComponentSpinnerComponent } from 'src/app/components/component-spinner/component-spinner.component';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ClinicService } from 'src/app/services/clinic.service';
import { ToastrService } from 'ngx-toastr';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from 'src/app/services/auth.service';
import { AsyncPipe } from '@angular/common';

interface Project {
  job_id: string;
  input_vcf: string;
  job_status: JobStatus;
  error_message: string;
  failed_step: string;
}

enum JobStatus {
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
  PENDING = 'pending',
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
  selector: 'list-project-id',
  providers: [{ provide: MatPaginatorIntl, useClass: MyCustomPaginatorIntl }],
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatTooltip,
    ComponentSpinnerComponent,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatSelectModule,
    AsyncPipe,
  ],
  templateUrl: './list-project-id.component.html',
  styleUrl: './list-project-id.component.scss',
})
export class ListJobComponent implements OnChanges, OnInit {
  @Input({ required: true }) projectName!: string;
  loading = true;
  dataSource = new MatTableDataSource<Project>();
  displayedColumns: string[] = [
    'input_vcf',
    'job_status',
    'job_name',
    'job_id',
    'action',
  ];
  JobStatus = JobStatus;
  jobStatusOptions = ['all', ...Object.values(JobStatus)];
  protected pageSize = 5;
  @ViewChild('paginator')
  paginator!: MatPaginator;
  private pageTokens = new Map<number, string>();

  // Reactive form controls for search and status
  searchControl = new FormControl('');
  statusControl = new FormControl(this.jobStatusOptions[0]);
  private searchSubject = new BehaviorSubject<string>('');
  private statusSubject = new BehaviorSubject<string>(this.jobStatusOptions[0]);

  constructor(
    private cs: ClinicService,
    private tstr: ToastrService,
    private cd: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private dg: MatDialog,
    protected auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.list(0, '', this.jobStatusOptions[0]);
    this.dataSource.paginator = this.paginator;
    this.cd.detectChanges();

    this.paginator.page.subscribe((event: PageEvent) => {
      if (this.pageSize != this.paginator.pageSize) {
        this.resetPagination();
        this.refresh();
      } else {
        this.list(
          event.pageIndex,
          this.searchSubject.value,
          this.statusSubject.value,
        );
      }
    });

    // Detect changes on search input
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => {
        this.resetPagination();
        this.setSearchInput(value as string);
        this.list(
          this.paginator.pageIndex,
          value as string,
          this.statusSubject.value,
        );
      });

    this.statusControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => {
        this.resetPagination();
        this.setStatusInput(value as string);
        this.list(
          this.paginator.pageIndex,
          this.searchSubject.value,
          value as string,
        );
      });
  }

  ngOnChanges(): void {
    if (this.paginator) {
      this.refresh();
    }
  }

  async loadResult(jobID: string, vcf_file: string) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        jobId: jobID,
        projectName: this.projectName,
        vcf_file: vcf_file,
      },
    });
  }

  setSearchInput(query: string) {
    this.searchSubject.next(query);
  }

  setStatusInput(query: string) {
    this.statusSubject.next(query);
  }

  list(page: number, search: string, status: string) {
    this.loading = true;

    if (!this.pageTokens.get(page) && page > 0) {
      this.paginator.pageIndex--;
      this.tstr.warning('No more items to show', 'Warning');
      return;
    }

    this.loading = true;
    this.cs
      .getMyJobsID(
        this.pageSize,
        this.pageTokens.get(page),
        this.projectName,
        search,
        status,
      )
      .pipe(
        catchError((error) => {
          console.error('Error fetching job id:', error);
          return of(null);
        }),
      )
      .subscribe((response: any) => {
        if (!response) {
          this.tstr.error('API request failed', 'Error');
          this.dataSource.data = [];
        } else if (!response.success) {
          this.tstr.error('API request failed', 'Error');
          this.dataSource.data = [];
        } else {
          //handle if there no data on next page (set page index and last page to prev value)
          if (
            response &&
            response.jobs.length <= 0 &&
            this.paginator.pageIndex > 0
          ) {
            this.paginator.pageIndex--;
            this.tstr.warning('No more items to show', 'Warning');
            this.loading = false;
            return;
          }

          this.dataSource.data = response.jobs;

          // set next page token
          this.pageTokens.set(page + 1, response.last_evaluated_key);
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
      this.list(0, this.searchSubject.value, this.statusSubject.value);
    } catch (error) {
      console.log(error);
    }
  }

  tooltipMessage(status: JobStatus) {
    switch (status) {
      case JobStatus.COMPLETED:
        return 'Load the result';
      case JobStatus.FAILED:
        return 'Failed to process';
      case JobStatus.EXPIRED:
        return 'Job ID is no longer work';
      default:
        return 'Job ID is processing result';
    }
  }

  async handleError(failedStep: any, error: any) {
    const { ErrorDialogComponent } = await import(
      './error-dialog/error-dialog.component'
    );

    this.dg.open(ErrorDialogComponent, {
      data: {
        failedStep: failedStep,
        errorMessage: error,
      },
    });
  }

  deleteJob(projectName: string, jobID: string) {
    this.loading = true;
    this.cs
      .deleteFailedJob(projectName, jobID)
      .pipe(
        catchError((error) => {
          this.tstr.error('API request failed', error);
          return of(null);
        }),
      )
      .subscribe((response: any) => {
        console.log(response);
        if (response.success) {
          this.tstr.success(response.message, 'Success');
          this.list(0, '', this.jobStatusOptions[0]);
        }
        this.loading = false;
      });
  }
}
