import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  Injectable,
  Input,
  OnChanges,
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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { catchError, of, Subject } from 'rxjs';
import { ClinicService } from 'src/app/services/clinic.service';
import { SpinnerService } from 'src/app/services/spinner.service';

type ClinicalAnnotation = {
  name: string;
  annotation: string;
  variants: any[];
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
    MatSnackBarModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './annotation-viewer.component.html',
  styleUrl: './annotation-viewer.component.scss',
})
export class AnnotationViewerComponent implements OnChanges {
  @Input({ required: true }) requestId!: string;
  @Input({ required: true }) projectName!: string;
  @ViewChild('paginator')
  paginator!: MatPaginator;
  protected annotations: ClinicalAnnotation[] = [];
  protected pageSize = 5;
  private pageTokens = new Map<number, any>();
  protected pageIndex = 0;

  constructor(
    private cs: ClinicService,
    private sb: MatSnackBar,
    private dg: MatDialog,
    private ss: SpinnerService,
  ) {}

  resetPagination() {
    this.pageTokens = new Map<number, string>();
    this.pageIndex = 0;
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

  async deleteAnnotation(name: string) {
    const { ActionConfirmationDialogComponent } = await import(
      '../../../../components/action-confirmation-dialog/action-confirmation-dialog.component'
    );

    const dialogRef = this.dg.open(ActionConfirmationDialogComponent, {
      data: {
        title: 'Delete Annotation',
        message: `Are you sure you want to delete the annotation ${name}?`,
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
              this.sb.open('Annotation deleted', 'Okay', {
                duration: 5000,
              });
              this.refresh();
            } else {
              this.sb.open('Failed to delete annotation', 'Dismiss', {
                duration: 5000,
              });
            }
            this.ss.end();
          });
      }
    });
  }

  list(page: number) {
    // not the first page but the page token is not set
    if (!this.pageTokens.get(page) && page > 0) {
      this.pageIndex--;
      this.sb.open('No more items to show', 'Okay', { duration: 60000 });
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
          this.sb.open('Failed to load annotations', 'Dismiss', {
            duration: 5000,
          });
        } else {
          //handle if there no data on next page (set page index and last page to prev value)
          if (res.annotations.length <= 0 && this.pageIndex > 0) {
            this.pageIndex--;
            this.sb.open('No more items to show', 'Okay', { duration: 60000 });
            return;
          }
          this.annotations = res.annotations;
          // set next page token
          this.pageTokens.set(page + 1, res.last_evaluated_key);
        }
      });
  }
}
