import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Injectable,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import {
  MatPaginator,
  MatPaginatorIntl,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { catchError, of, Subject, Subscription, debounceTime } from 'rxjs';
import { ClinicService } from 'src/app/services/clinic.service';
import { SpinnerService } from 'src/app/services/spinner.service';
import { ToastrService } from 'ngx-toastr';
import { environment } from 'src/environments/environment';
import { MatTooltip } from '@angular/material/tooltip';
import { HasPermissionDirective } from 'src/app/directives/has-permission.directive';
import { validationReportsArray } from 'src/app/utils/clinic';

type ClinicalAnnotation = {
  name: string;
  annotation: string;
  variants: any[];
  createdAt: string;
  user?: {
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
  selector: 'app-annotation-viewer',
  providers: [{ provide: MatPaginatorIntl, useClass: MyCustomPaginatorIntl }],
  standalone: true,
  imports: [
    CommonModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTooltip,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatDialogModule,
    HasPermissionDirective,
  ],
  templateUrl: './annotation-viewer.component.html',
  styleUrl: './annotation-viewer.component.scss',
})
export class AnnotationViewerComponent implements OnChanges, OnInit, OnDestroy {
  @Output() dataSent = new EventEmitter<any>(); // array of objects
  @Input({ required: true }) requestId!: string;
  @Input({ required: true }) projectName!: string;
  @Input() listReports: any = []; // receive data from parent
  @ViewChild('paginator')
  paginator!: MatPaginator;
  protected annotations: ClinicalAnnotation[] = [];
  protected filteredAnnotations: ClinicalAnnotation[] = [];
  public allAnnotations: ClinicalAnnotation[] = []; // Store all annotations for filtering - made public for template access
  protected pageSize = 5;
  protected searchTerm = '';
  private pageTokens = new Map<number, any>();
  private annotationChangedSubscription: Subscription | null = null;
  private searchSubject = new Subject<string>();
  private searchSubscription: Subscription | null = null;
  @Output() selectAnotation = new EventEmitter<any>();
  protected hubName: string = environment.hub_name;

  constructor(
    private cs: ClinicService,
    private tstr: ToastrService,
    private dg: MatDialog,
    private ss: SpinnerService,
  ) { }

  ngOnInit(): void {
    this.annotationChangedSubscription = this.cs.annotionsChanged.subscribe(
      () => {
        this.refresh();
      },
    );

    // Setup search debouncing
    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(300))
      .subscribe((searchTerm) => {
        this.performSearch(searchTerm);
      });
  }

  ngOnDestroy(): void {
    if (this.annotationChangedSubscription) {
      this.annotationChangedSubscription.unsubscribe();
    }
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  resetPagination() {
    this.pageTokens = new Map<number, string>();
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }
  }

  refresh() {
    try {
      this.resetPagination();
      this.searchTerm = '';
      this.list(0);
    } catch (error) {
      console.log(error);
    }
  }

  ngOnChanges(_: SimpleChanges): void {
    this.list(0);
  }

  pageChange(event: PageEvent) {
    if (this.pageSize != event.pageSize) {
      this.pageSize = event.pageSize;
      this.resetPagination();
      this.refresh();
    } else {
      this.updatePaginatedResults(event.pageIndex);
    }
  }

  onSearchChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const searchTerm = target?.value || '';
    this.searchTerm = searchTerm;
    this.searchSubject.next(searchTerm);
  }

  clearSearch() {
    this.searchTerm = '';
    this.performSearch('');
  }

  private performSearch(searchTerm: string) {
    if (!searchTerm.trim()) {
      // If no search term, show all annotations and reset pagination
      this.filteredAnnotations = [...this.allAnnotations];
      this.resetPagination();
      this.updatePaginatedResults(0);
    } else {
      // Apply search filter
      this.applySearch();
    }
  }

  private applySearch() {
    let filtered = [...this.allAnnotations];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (annotation) =>
          annotation.annotation.toLowerCase().includes(searchLower) ||
          annotation.name.toLowerCase().includes(searchLower) ||
          annotation.user?.firstName?.toLowerCase().includes(searchLower) ||
          annotation.user?.lastName?.toLowerCase().includes(searchLower) ||
          annotation.user?.email?.toLowerCase().includes(searchLower) ||
          annotation.variants.some((variant) =>
            JSON.stringify(variant).toLowerCase().includes(searchLower),
          ),
      );
    }

    this.filteredAnnotations = filtered;
    // Show first page of search results
    this.resetPagination();
    this.updatePaginatedResults(0);
  }

  private updatePaginatedResults(pageIndex?: number) {
    const currentPageIndex =
      pageIndex !== undefined ? pageIndex : this.paginator?.pageIndex || 0;

    if (this.searchTerm) {
      // Client-side pagination for search results
      const startIndex = currentPageIndex * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      this.annotations = this.filteredAnnotations.slice(startIndex, endIndex);

      // Update the variants data only when displaying filtered results
      this.handleListVariants({ annotations: this.annotations }, false);
    } else {
      // Server-side pagination for normal list
      this.list(currentPageIndex);
    }
  }

  handleSelectAnotation(data: any) {
    this.selectAnotation.emit(data.variants);
  }

  async openAddToReportingDialog(variants: any[]) {
    const found = validationReportsArray(this.listReports, variants);
    if (found) {
      this.tstr.error(
        'This variant(s) was already selected for reporting, please see the "Variant selected for reporting" below',
        'Error',
      );
      return;
    }

    const { AddToReportingDialogComponent } = await import(
      '../add-to-reporting-dialog/add-to-reporting-dialog.component'
    );

    this.dg.open(AddToReportingDialogComponent, {
      data: {
        projectName: this.projectName,
        requestId: this.requestId,
        variants: [...variants], // sending a copy so that the dialog can modify it if needed
      },
    });
  }

  async deleteAnnotation(name: string) {
    const { ActionConfirmationDialogComponent } = await import(
      '../../../../components/action-confirmation-dialog/action-confirmation-dialog.component'
    );

    const dialogRef = this.dg.open(ActionConfirmationDialogComponent, {
      data: {
        title: 'Delete Annotation',
        message: `Are you sure you want to delete the annotation?`,
        confirmText: 'Delete',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.ss.start();
        this.cs
          .deleteAnnotation(this.projectName, this.requestId, name)
          .pipe(catchError(() => of(null)))
          .subscribe((res) => {
            if (res) {
              this.tstr.success('Annotation deleted', 'Success');
              this.cs.annotionsChanged.next();
            } else {
              this.tstr.error('Failed to delete annotation', 'Error');
            }
            this.ss.end();
          });
      }
    });
  }

  list(page: number) {
    // not the first page but the page token is not set
    if (!this.pageTokens.get(page) && page > 0) {
      this.paginator.pageIndex--;
      this.tstr.warning('No more items to show', 'Warning');
      return;
    }

    const pageToken = page === 0 ? undefined : this.pageTokens.get(page);

    this.cs
      .getAnnotations(
        this.projectName,
        this.requestId,
        this.pageSize,
        pageToken,
      )
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (!res) {
          this.tstr.error('Failed to load annotations', 'Error');
        } else {
          //handle if there no data on next page (set page index and last page to prev value)
          if (res.annotations.length <= 0 && this.paginator.pageIndex > 0) {
            this.paginator.pageIndex--;
            this.tstr.warning('No more items to show', 'Warning');
            return;
          }

          // Store all annotations for filtering and sort by newest first
          if (page === 0) {
            this.allAnnotations = [...res.annotations].sort((a, b) => {
              const dateA = new Date(a.createdAt).getTime();
              const dateB = new Date(b.createdAt).getTime();
              return dateB - dateA; // Newest first
            });
          } else {
            const sortedNew = [...res.annotations].sort((a, b) => {
              const dateA = new Date(a.createdAt).getTime();
              const dateB = new Date(b.createdAt).getTime();
              return dateB - dateA; // Newest first
            });
            this.allAnnotations.push(...sortedNew);
          }

          // Apply default sorting (newest first) to current page
          this.annotations = res.annotations.sort(
            (
              a: { createdAt: string | number | Date },
              b: { createdAt: string | number | Date },
            ) => {
              const dateA = new Date(a.createdAt).getTime();
              const dateB = new Date(b.createdAt).getTime();
              return dateB - dateA; // Newest first
            },
          );

          this.filteredAnnotations = [...this.allAnnotations];
          this.handleListVariants(res, true); // Emit data only on fresh load

          // set next page token only if it exists
          if (res.last_evaluated_key) {
            this.pageTokens.set(page + 1, res.last_evaluated_key);
          }
        }
      });
  }

  handleListVariants(data: any, shouldEmit: boolean = false) {
    const allVariants: any[] = [];
    data.annotations.map((e: any) => {
      allVariants.push(...e?.variants);
    });

    // Only emit when explicitly requested (fresh data load, not during search/filter)
    if (shouldEmit) {
      this.dataSent.emit(allVariants);
    }
  }

  // Helper method to get total count for paginator
  getTotalCount(): number {
    return this.searchTerm ? this.filteredAnnotations.length : 9999;
  }
}
