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
import { HasPermissionDirective } from 'src/app/directives/has-permission.directive';
import dayjs from 'dayjs';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { clinicResort } from 'src/app/utils/clinic';
import { environment } from 'src/environments/environment';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const localTz = dayjs.tz.guess();

enum JobStatus {
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
  PENDING = 'pending',
}

interface BaseJob {
  job_id: string;
  job_name: string;
  input_vcf: string;
  created_at: string;
}

interface SvepJob extends BaseJob {
  svep_status: JobStatus;
  svep_failed_step?: string;
  svep_error_message?: string;
}

interface PharmcatJob extends BaseJob {
  pharmcat_status: JobStatus;
  pharmcat_failed_step?: string;
  pharmcat_error_message?: string;
  missing_to_ref?: boolean;
}

interface LookupJob extends BaseJob {
  lookup_status: JobStatus;
  lookup_failed_step?: string;
  lookup_error_message?: string;
}

interface HybridJob extends BaseJob {
  pharmcat_status: JobStatus;
  pharmcat_failed_step?: string;
  pharmcat_error_message?: string;
  lookup_status: JobStatus;
  lookup_failed_step?: string;
  lookup_error_message?: string;
  missing_to_ref: boolean;
}

type ClinicJob = SvepJob | PharmcatJob | LookupJob | HybridJob;

type HubConfig = {
  status_fields: string[];
};

const HUB_CONFIGS: Record<string, HubConfig> = {
  RSCM: {
    status_fields: ['svep_status'],
  },
  RSSARDJITO: {
    status_fields: ['svep_status'],
  },
  RSPON: {
    status_fields: ['pharmcat_status'],
  },
  RSIGNG: {
    status_fields: ['lookup_status'],
  },
  RSJPD: {
    status_fields: ['pharmcat_status', 'lookup_status'],
  },
};

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
    MatSortModule,
    HasPermissionDirective,
  ],
  templateUrl: './list-project-id.component.html',
  styleUrl: './list-project-id.component.scss',
})
export class ListJobComponent implements OnChanges, OnInit {
  @Input({ required: true }) projectName!: string;
  loading = true;
  dataSource = new MatTableDataSource<ClinicJob>();
  JobStatus = JobStatus;
  jobStatusOptions = ['all', ...Object.values(JobStatus)];
  protected hubName: string = environment.hub_name;
  protected pageSize = 5;
  @ViewChild('paginator')
  paginator!: MatPaginator;
  @ViewChild(MatSort)
  sort!: MatSort;

  snapshotSorting: Sort | null = null;

  private pageTokens = new Map<number, string>();
  protected config: HubConfig;

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
  ) {
    this.config = HUB_CONFIGS[environment.hub_name];
  }

  get displayedColumns(): string[] {
    return [
      'input_vcf',
      'job_name',
      'job_id',
      ...this.config.status_fields,
      ...(['RSPON', 'RSJPD'].includes(environment.hub_name)
        ? ['missing_to_ref']
        : []),
      'created_at',
      'action',
    ];
  }

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

  getMissingToRefDisplay(missingToRef: boolean | null): string {
    return missingToRef === null
      ? 'Unknown'
      : missingToRef
        ? 'Enabled'
        : 'Disabled';
  }

  getStatusDisplayName(statusField: string) {
    const statusMap: { [key: string]: string } = {
      svep_status: 'sVEP Status',
      pharmcat_status: 'PharmCAT Status',
      lookup_status: 'Lookup Status',
    };
    return statusMap[statusField];
  }

  getOverallStatus(element: any) {
    const statusFields = this.config.status_fields;

    if (statusFields.some((field) => element[field] === JobStatus.COMPLETED)) {
      return JobStatus.COMPLETED;
    }

    if (statusFields.some((field) => element[field] === JobStatus.FAILED)) {
      return JobStatus.FAILED;
    }

    if (statusFields.some((field) => element[field] === JobStatus.EXPIRED)) {
      return JobStatus.EXPIRED;
    }

    return JobStatus.PENDING;
  }

  tooltipMessage(element: any) {
    const overallStatus = this.getOverallStatus(element);
    switch (overallStatus) {
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

  isAnyStatus(element: any, status: JobStatus) {
    const statusFields = this.config.status_fields;
    return statusFields.some((field) => element[field] === status);
  }

  getFailedInfo(element: any) {
    for (const statusField of this.config.status_fields) {
      if (element[statusField] === JobStatus.FAILED) {
        const failedStepField = statusField.replace('_status', '_failed_step');
        const errorMessageField = statusField.replace(
          '_status',
          '_error_message',
        );

        return {
          failedStep: element[failedStepField],
          errorMessage: element[errorMessageField],
        };
      }
    }

    return {
      failedStep: null,
      errorMessage: null,
    };
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
      this.loading = false;
      return;
    }

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

          this.dataSource.data = response.jobs.map((job: any) => {
            return {
              ...job,
              created_at: dayjs
                .utc(job.created_at)
                .tz(localTz) // Convert to local timezone
                .format('YYYY-MM-DD HH:mm:ss'),
            };
          });

          // keep sorting when data is changed
          if (this.snapshotSorting) {
            clinicResort(
              this.dataSource.data,
              this.snapshotSorting,
              (sorted) => (this.dataSource.data = sorted),
            );
          }

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

  resort(sort: Sort) {
    clinicResort(this.dataSource.data, sort, (sorted) => {
      this.dataSource.data = sorted;
      this.snapshotSorting = sort;
    });
  }

  refresh() {
    try {
      this.resetPagination();
      this.list(0, this.searchSubject.value, this.statusSubject.value);
    } catch (error) {
      console.log(error);
    }
  }

  async handleError(element: any) {
    const { failedStep, errorMessage } = this.getFailedInfo(element);
    const { ErrorDialogComponent } = await import(
      './error-dialog/error-dialog.component'
    );

    this.dg.open(ErrorDialogComponent, {
      data: {
        failedStep: failedStep,
        errorMessage: errorMessage,
      },
    });
  }

  async deleteJob(projectName: string, jobID: string, jobName: string) {
    const { ActionConfirmationDialogComponent } = await import(
      'src/app/components/action-confirmation-dialog/action-confirmation-dialog.component'
    );

    const dialog = this.dg.open(ActionConfirmationDialogComponent, {
      data: {
        title: 'Delete Failed Job',
        message: `Are you sure you want to delete ${jobName}?`,
      },
    });

    dialog.afterClosed().subscribe((result) => {
      if (result) {
        this.loading = true;
        this.cs
          .deleteFailedJob(projectName, jobID)
          .pipe(
            catchError((error) => {
              this.tstr.error('API request failed', error);
              this.loading = false;
              return of(null);
            }),
          )
          .subscribe((response: any) => {
            if (response.success) {
              this.tstr.success(response.message, 'Success');
              this.list(0, '', this.jobStatusOptions[0]);
            } else {
              this.tstr.error('API request failed', response.message);
            }
            this.loading = false;
          });
      }
    });
  }
}
