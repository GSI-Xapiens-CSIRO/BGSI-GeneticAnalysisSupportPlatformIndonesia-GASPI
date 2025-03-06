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
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, of, Subject, Subscription } from 'rxjs';
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

import { DportalService } from 'src/app/services/dportal.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

interface Project {
  job_id: string;
  input_vcf: string;
  job_status: string;
  error_message: string;
  failed_step: string;
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
  ],
  templateUrl: './list-project-id.component.html',
  styleUrl: './list-project-id.component.scss',
})
export class ListJobComponent implements OnChanges, OnInit {
  @Input({ required: true }) projectName!: string;
  loading = true;
  dataSource = new MatTableDataSource<Project>();
  displayedColumns: string[] = ['input_vcf', 'job_status', 'job_id'];

  protected pageSize = 5;
  @ViewChild('paginator')
  paginator!: MatPaginator;
  private pageTokens = new Map<number, string>();
  private isEmptyLastPage = false;
  private paramSubscription: Subscription | null = null;

  constructor(
    private dps: DportalService,
    private sb: MatSnackBar,
    private cd: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private dg: MatDialog,
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

  ngOnChanges(): void {
    this.refresh();
  }

  ngOnDestroy() {
    if (this.paramSubscription) {
      this.paramSubscription.unsubscribe();
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

  list(page: number) {
    this.loading = true;

    if (this.isEmptyLastPage && this.paginator.pageIndex > 0) {
      this.paginator.pageIndex--;
      this.sb.open('No more items to show', 'Okay', { duration: 60000 });
      this.loading = false;
      return;
    }

    this.dps
      .getMyJobsID(this.pageSize, this.pageTokens.get(page), this.projectName)
      .pipe(
        catchError((error) => {
          console.error('Error fetching job id:', error);
          return of(null);
        }),
      )
      .subscribe((response: any) => {
        if (!response.success) {
          this.sb.open('API request failed', 'Okay', { duration: 60000 });
          this.dataSource.data = [];
        } else {
          this.dataSource.data = response.jobs;

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

  tooltipMessage(status: string) {
    if (status.toLowerCase() === 'completed') {
      return `Load the result`;
    } else if (status.toLowerCase() === 'failed') {
      return `Failed to process`;
    } else if (status.toLowerCase() === 'expired') {
      return `Job ID is no longer work`;
    }
    return 'Job ID is processing result';
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
}
