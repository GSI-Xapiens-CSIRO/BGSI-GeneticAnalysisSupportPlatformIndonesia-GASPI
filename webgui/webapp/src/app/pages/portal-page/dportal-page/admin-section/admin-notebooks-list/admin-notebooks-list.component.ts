import {
  ChangeDetectorRef,
  Component,
  Injectable,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { DportalService } from 'src/app/services/dportal.service';
import {
  BehaviorSubject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  map,
  Observable,
  of,
  Subject,
  switchMap,
} from 'rxjs';
import { AdminNotebookItemComponent } from './admin-notebook-item/admin-notebook-item.component';
import { AwsService } from 'src/app/services/aws.service';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import {
  MatPaginator,
  MatPaginatorIntl,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { ToastrService } from 'ngx-toastr';
import { ComponentSpinnerComponent } from 'src/app/components/component-spinner/component-spinner.component';

export interface InstanceInfo {
  instanceName: string;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  status: string;
  volumeSize: number;
  instanceType: string;
  costEstimation: number;
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
  selector: 'app-notebooks',
  providers: [{ provide: MatPaginatorIntl, useClass: MyCustomPaginatorIntl }],
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    AdminNotebookItemComponent,
    ReactiveFormsModule,
    MatInputModule,
    MatPaginatorModule,
    ComponentSpinnerComponent,
  ],
  templateUrl: './admin-notebooks-list.component.html',
  styleUrl: './admin-notebooks-list.component.scss',
})
export class NotebooksComponent {
  @ViewChildren('notebook') notebookItems?: AdminNotebookItemComponent[];
  notebooksDataSource: InstanceInfo[] = [];
  loading = false;

  searchControl = new FormControl('');
  private searchSubject = new BehaviorSubject<string>(''); // Stores latest search value

  protected pageSize = 3;
  @ViewChild('paginator')
  paginator!: MatPaginator;
  private pageTokens = new Map<number, number>();

  constructor(
    private dps: DportalService,
    private aws: AwsService,
    private cd: ChangeDetectorRef,
    private tstr: ToastrService,
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

  refresh() {
    this.list(0, '');
    this.searchSubject.next('');
    this.searchControl.setValue('');
  }

  resetPagination() {
    this.pageTokens = new Map<number, number>();
    this.paginator.pageIndex = 0;
    this.pageSize = this.paginator.pageSize;
  }

  setSearchInput(query: string) {
    this.searchSubject.next(query);
  }

  list(page: number, search: string) {
    if (!this.pageTokens.has(page) && page > 0) {
      this.paginator.pageIndex--;
      this.tstr.warning('No more items to show', 'Warning');
      return;
    }
    // Only show spinner if there are notebooks already populating the screen
    if (this.notebooksDataSource.length > 0) {
      this.loading = true;
    }
    this.dps
      .getAdminNotebooks(this.pageSize, this.pageTokens.get(page), search)
      .pipe(
        catchError(() => of(null)),
        switchMap((data: any) => {
          if (!data || !data.notebooks) {
            this.tstr.error('API returned invalid response', 'Error');
            return of([]);
          }

          if (data.notebooks.length <= 0 && this.paginator.pageIndex > 0) {
            this.paginator.pageIndex--;
            this.tstr.warning('No more items to show', 'Warning');
            return of([]);
          }

          if (data.notebooks.length <= 0) {
            return of([]);
          }

          // Save next page token
          if (data.lastEvaluatedIndex != null) {
            this.pageTokens.set(page + 1, data.lastEvaluatedIndex);
          }

          return this.constructListWithCostEstimation(data.notebooks);
        }),
      )
      .subscribe((notebooksWithCost) => {
        this.notebooksDataSource = notebooksWithCost.map((notebook: any) => ({
          instanceName: notebook.instanceName,
          userFirstName: notebook.userFirstName,
          userLastName: notebook.userLastName,
          userEmail: notebook.userEmail,
          status: notebook.status,
          volumeSize: notebook.volumeSize,
          instanceType: notebook.instanceType,
          costEstimation: notebook.costEstimation,
        }));
        this.loading = false;
      });
  }

  constructListWithCostEstimation(
    notebooks: InstanceInfo[],
  ): Observable<InstanceInfo[]> {
    if (!notebooks) return of([]);

    const costEstimations$ = notebooks.map((n) =>
      this.aws.calculateTotalPricePerMonth(
        n.instanceType,
        n.volumeSize,
        n.status,
      ),
    );

    return forkJoin(costEstimations$).pipe(
      map((costEstimations) =>
        notebooks.map((n, index) => ({
          ...n,
          costEstimation: costEstimations[index],
        })),
      ),
    );
  }

  remove(notebook: string) {
    this.notebooksDataSource = this.notebooksDataSource.filter(
      (n) => n.instanceName !== notebook,
    );
  }
}
