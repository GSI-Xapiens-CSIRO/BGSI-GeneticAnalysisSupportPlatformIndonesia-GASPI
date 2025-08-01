import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  Injectable,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import {
  MatPaginator,
  MatPaginatorIntl,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { catchError, of, Subject, Subscription } from 'rxjs';
import { ClinicService } from 'src/app/services/clinic.service';
import { SpinnerService } from 'src/app/services/spinner.service';
import { environment } from 'src/environments/environment';
import { REPORTING_CONFIGS } from '../hub_configs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { MatTooltipModule } from '@angular/material/tooltip';

type SavedVariants = {
  name: string;
  comment: string;
  variants: any[];
  annotations: string[];
  createdAt: string;
  validatedByMedicalDirector: boolean;
  validationComment: string;
  validatedAt: string;
  user?: {
    email: string;
    firstName: string;
    lastName: string;
  };
  validator?: {
    email: string;
    firstName: string;
    lastName: string;
  };
};

type JobEntry = {
  job_id: string;
  job_name: string;
  validatedByMedicalDirector: boolean;
  validationComment: string;
  validatedAt: string;
  validator?: {
    email: string;
    firstName: string;
    lastName: string;
  };
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
  selector: 'app-saved-for-reporting-viewer',
  providers: [{ provide: MatPaginatorIntl, useClass: MyCustomPaginatorIntl }],
  standalone: true,
  imports: [
    CommonModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTooltipModule,
  ],
  templateUrl: './saved-for-reporting-viewer.component.html',
  styleUrl: './saved-for-reporting-viewer.component.scss',
})
export class SavedForReportingViewerComponent
  implements OnInit, OnChanges, OnDestroy
{
  @Input({ required: true }) requestId!: string;
  @Input({ required: true }) projectName!: string;
  @ViewChild('paginator')
  paginator!: MatPaginator;
  @ViewChild('downloadLink') downloadLink!: ElementRef<HTMLAnchorElement>;
  protected variants: SavedVariants[] = [];
  protected pageSize = 5;
  protected hub =
    environment.hub_name in REPORTING_CONFIGS ? environment.hub_name : null;
  protected jobEntry: JobEntry | null = null;
  private pageTokens = new Map<number, any>();
  private savedVariantsChangedSubscription: Subscription | null = null;

  constructor(
    protected auth: AuthService,
    private cs: ClinicService,
    private dg: MatDialog,
    private ss: SpinnerService,
    private tstr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.savedVariantsChangedSubscription =
      this.cs.savedVariantsChanged.subscribe(() => {
        this.refresh();
      });
  }

  ngOnDestroy(): void {
    if (this.savedVariantsChangedSubscription) {
      this.savedVariantsChangedSubscription.unsubscribe();
    }
  }

  noValidatedVariants() {
    return this.variants.every(
      (variant) => !variant.validatedByMedicalDirector,
    );
  }

  resetPagination() {
    this.pageTokens = new Map<number, string>();
  }

  refresh() {
    try {
      this.resetPagination();
      this.list(0);
      this.loadJobStatus();
    } catch (error) {
      console.log(error);
    }
  }

  ngOnChanges(_: SimpleChanges): void {
    this.list(0);
    this.loadJobStatus();
  }

  pageChange(event: PageEvent) {
    if (this.pageSize != event.pageSize) {
      this.pageSize = event.pageSize;
      this.resetPagination();
      this.refresh();
    } else {
      this.list(event.pageIndex);
    }
  }

  async loadJobStatus() {
    this.cs
      .getClinicJob(this.projectName, this.requestId)
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res) {
          if (!res.success) {
            this.tstr.error(res.message, 'Error');
          } else {
            this.jobEntry = res.job;
            console.log(res);
          }
        } else {
          this.tstr.error('Failed to load job status', 'Error');
        }
      });
  }

  async addValidation(name?: string) {
    const { ValidateVariantToReportDialogComponent } = await import(
      '../validate-variant-to-report-dialog/validate-variant-to-report-dialog.component'
    );

    const dialogRef = this.dg.open(ValidateVariantToReportDialogComponent, {
      data: {
        name,
        requestId: this.requestId,
        projectName: this.projectName,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      this.loadJobStatus();
    });
  }

  async removeValidation(name?: string) {
    const { ActionConfirmationDialogComponent } = await import(
      '../../../../components/action-confirmation-dialog/action-confirmation-dialog.component'
    );

    const dialogRef = this.dg.open(ActionConfirmationDialogComponent, {
      data: {
        title: name ? 'Invalidate Variants' : 'Invalidate negative reporting',
        message: name
          ? `Are you sure you want to invalidate these variants?`
          : `Are you sure you want to invalidate negative reporting?`,
        confirmText: 'Invalidate',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.ss.start();
        if (name) {
          this.cs
            .removeValidation(this.projectName, this.requestId, name)
            .pipe(catchError(() => of(null)))
            .subscribe((res) => {
              if (res) {
                this.tstr.success('Annotation invalidated', 'Success');
                this.cs.savedVariantsChanged.next();
              } else {
                this.tstr.error('Failed to invalidate annotation', 'Error');
              }
              this.ss.end();
            });
        } else {
          this.cs
            .removeNoVariantsValidation(this.projectName, this.requestId)
            .pipe(catchError(() => of(null)))
            .subscribe((res) => {
              if (res) {
                this.tstr.success('Annotation invalidated', 'Success');
                this.cs.savedVariantsChanged.next();
              } else {
                this.tstr.error('Failed to invalidate annotation', 'Error');
              }
              this.ss.end();
            });
        }
      }
    });
  }

  async deleteSavedVariants(name: string) {
    const { ActionConfirmationDialogComponent } = await import(
      '../../../../components/action-confirmation-dialog/action-confirmation-dialog.component'
    );

    const dialogRef = this.dg.open(ActionConfirmationDialogComponent, {
      data: {
        title: 'Delete Variants',
        message: `Are you sure you want to delete these variants?`,
        confirmText: 'Delete',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.ss.start();
        this.cs
          .deleteSavedVariants(this.projectName, this.requestId, name)
          .pipe(catchError(() => of(null)))
          .subscribe((res) => {
            if (res) {
              this.tstr.success('Annotation deleted', 'Success');
              this.cs.savedVariantsChanged.next();
            } else {
              this.tstr.error('Failed to delete annotation', 'Error');
            }
            this.ss.end();
          });
      }
    });
  }

  generateReportRSCM() {
    this.ss.start();
    this.cs
      .generateReport(this.projectName, this.requestId)
      .pipe(catchError(() => of(null)))
      .subscribe((res: any) => {
        if (res && res.success) {
          console.log(res);
          const dataUrl = `data:application/pdf;base64,${res.content}`;
          this.downloadLink.nativeElement.download = `${this.projectName}_${
            this.requestId
          }_${new Date().toISOString()}_report.pdf`;
          this.downloadLink.nativeElement.href = dataUrl;
          this.downloadLink.nativeElement.click();
        } else if (res && !res.success) {
          this.tstr.error(res.message, 'Error');
        } else {
          this.tstr.error('Failed to generate report', 'Error');
        }
        this.ss.end();
      });
  }

  generateReportRSJPD() {
    this.ss.start();
    this.cs
      .generateReport(this.projectName, this.requestId)
      .pipe(catchError(() => of(null)))
      .subscribe((res: any) => {
        if (res && res.success) {
          console.log(res);
          const dataUrl = `data:application/pdf;base64,${res.content}`;
          this.downloadLink.nativeElement.download = `${this.projectName}_${
            this.requestId
          }_${new Date().toISOString()}_report.pdf`;
          this.downloadLink.nativeElement.href = dataUrl;
          this.downloadLink.nativeElement.click();
        } else if (res && !res.success) {
          this.tstr.error(res.message, 'Error');
        } else {
          this.tstr.error('Failed to generate report', 'Error');
        }
        this.ss.end();
      });
  }

  generateReportRSIGNG() {
    this.ss.start();
    this.cs
      .generateReport(this.projectName, this.requestId)
      .pipe(catchError(() => of(null)))
      .subscribe((res: any) => {
        if (res && res.success) {
          console.log(res);
          const dataUrl = `data:application/pdf;base64,${res.content}`;
          this.downloadLink.nativeElement.download = `${this.projectName}_${
            this.requestId
          }_${new Date().toISOString()}_report.pdf`;
          this.downloadLink.nativeElement.href = dataUrl;
          this.downloadLink.nativeElement.click();
        } else if (res && !res.success) {
          this.tstr.error(res.message, 'Error');
        } else {
          this.tstr.error('Failed to generate report', 'Error');
        }
        this.ss.end();
      });
  }

  generateReportRSPON() {
    this.ss.start();
    this.cs
      .generateReport(this.projectName, this.requestId)
      .pipe(catchError(() => of(null)))
      .subscribe((res: any) => {
        if (res && res.success) {
          console.log(res);
          const dataUrl = `data:application/pdf;base64,${res.content}`;
          this.downloadLink.nativeElement.download = `${this.projectName}_${
            this.requestId
          }_${new Date().toISOString()}_report.pdf`;
          this.downloadLink.nativeElement.href = dataUrl;
          this.downloadLink.nativeElement.click();
        } else if (res && !res.success) {
          this.tstr.error(res.message, 'Error');
        } else {
          this.tstr.error('Failed to generate report', 'Error');
        }
        this.ss.end();
      });
  }

  generateReportRSSARDJITO(lang: string, mode: string) {
    this.ss.start();
    this.cs
      .generateReport(this.projectName, this.requestId, { lang, mode })
      .pipe(catchError(() => of(null)))
      .subscribe((res: any) => {
        if (res && res.success) {
          console.log(res);
          const dataUrl = `data:application/pdf;base64,${res.content}`;
          this.downloadLink.nativeElement.download = `${this.projectName}_${
            this.requestId
          }_${new Date().toISOString()}_report.pdf`;
          this.downloadLink.nativeElement.href = dataUrl;
          this.downloadLink.nativeElement.click();
        } else if (res && !res.success) {
          this.tstr.error(res.message, 'Error');
        } else {
          this.tstr.error('Failed to generate report', 'Error');
        }
        this.ss.end();
      });
  }

  list(page: number) {
    // not the first page but the page token is not set
    if (!this.pageTokens.get(page) && page > 0) {
      this.paginator.pageIndex--;
      this.tstr.warning('No more items to show', 'Warning');
      return;
    }

    this.cs
      .getSavedVariants(
        this.projectName,
        this.requestId,
        this.pageSize,
        this.pageTokens.get(page),
      )
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (!res) {
          this.tstr.error('Failed to load annotations', 'Error');
        } else {
          //handle if there no data on next page (set page index and last page to prev value)
          if (res.variants.length <= 0 && this.paginator.pageIndex > 0) {
            this.paginator.pageIndex--;
            this.tstr.warning('No more items to show', 'Warning');
            return;
          }
          this.variants = res.variants;
          // set next page token
          this.pageTokens.set(page + 1, res.last_evaluated_key);
        }
      });
  }
}
