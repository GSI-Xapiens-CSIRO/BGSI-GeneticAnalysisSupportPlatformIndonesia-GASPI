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
import { ToastrService } from 'ngx-toastr';
import { environment } from 'src/environments/environment';
import { MatTooltip } from '@angular/material/tooltip';

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
  ],
  templateUrl: './annotation-viewer.component.html',
  styleUrl: './annotation-viewer.component.scss',
})
export class AnnotationViewerComponent implements OnChanges, OnInit, OnDestroy {
  @Output() dataSent = new EventEmitter<any>(); // array of objects
  @Input({ required: true }) requestId!: string;
  @Input({ required: true }) projectName!: string;
  @ViewChild('paginator')
  paginator!: MatPaginator;
  protected annotations: ClinicalAnnotation[] = [];
  protected pageSize = 5;
  private pageTokens = new Map<number, any>();
  private annotationChangedSubscription: Subscription | null = null;
  @Output() selectAnotation = new EventEmitter<any>();
  protected hubName: string = environment.hub_name;

  constructor(
    private cs: ClinicService,
    private tstr: ToastrService,
    private dg: MatDialog,
    private ss: SpinnerService,
  ) {}

  ngOnInit(): void {
    this.annotationChangedSubscription = this.cs.annotionsChanged.subscribe(
      () => {
        this.refresh();
      },
    );
  }

  ngOnDestroy(): void {
    if (this.annotationChangedSubscription) {
      this.annotationChangedSubscription.unsubscribe();
    }
  }

  resetPagination() {
    this.pageTokens = new Map<number, string>();
  }

  refresh() {
    try {
      this.resetPagination();
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
      this.list(event.pageIndex);
    }
  }

  handleSelectAnotation(data: any) {
    this.selectAnotation.emit(data.variants);
  }

  async openAddToReportingDialog(variants: any[]) {
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

    this.cs
      .getAnnotations(
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
          if (res.annotations.length <= 0 && this.paginator.pageIndex > 0) {
            this.paginator.pageIndex--;
            this.tstr.warning('No more items to show', 'Warning');
            return;
          }
          this.annotations = res.annotations;
          this.handleListVariants(res);
          // set next page token
          this.pageTokens.set(page + 1, res.last_evaluated_key);
        }
      });
  }

  handleListVariants(data: any) {
    const allVariants: any[] = [];
    data.annotations.map((e: any) => {
      allVariants.push(...e?.variants);
    });
    this.dataSent.emit(allVariants);
  }
}
