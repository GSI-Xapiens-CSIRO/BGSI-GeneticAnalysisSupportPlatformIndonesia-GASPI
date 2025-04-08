import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  Inject,
  Injectable,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import {
  MatPaginator,
  MatPaginatorIntl,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  map,
  Observable,
  of,
  Subject,
} from 'rxjs';
import { v4 as uuid } from 'uuid';
import { ClinicService } from 'src/app/services/clinic.service';
import { SpinnerService } from 'src/app/services/spinner.service';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { clinicFilter, clinicResort } from 'src/app/utils/clinic';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { HelpTextComponent } from '../help-text/help-text.component';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { TableVirtualScrollStrategy } from './scroll-strategy.service';
import {
  ScrollingModule,
  VIRTUAL_SCROLL_STRATEGY,
} from '@angular/cdk/scrolling';
import { ToastrService } from 'ngx-toastr';
import { TermFreqPlotComponent } from 'src/app/pages/portal-page/query-page/components/term-freq-plot/term-freq-plot.component';

type PGXFlowResult = {
  url?: string;
  pages: { [key: string]: number };
  content: string;
  page: number;
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
    return $localize`Page ${page + 1} of ${length / pageSize}`;
  }
}

@Component({
  selector: 'app-pgxflow-results-viewer',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatFormFieldModule,
    HelpTextComponent,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    ScrollingModule,
    MatCardModule,
  ],
  providers: [
    { provide: MatPaginatorIntl, useClass: MyCustomPaginatorIntl },
    {
      provide: VIRTUAL_SCROLL_STRATEGY,
      useClass: TableVirtualScrollStrategy,
    },
    TableVirtualScrollStrategy,
  ],
  templateUrl: './pgxflow-results-viewer.component.html',
  styleUrl: './pgxflow-results-viewer.component.scss',
})
export class PGXFlowResultsViewerComponent {
  @Input({ required: true }) requestId!: string;
  @Input({ required: true }) projectName!: string;
  @ViewChild('paginator') paginator!: MatPaginator;
  protected results: PGXFlowResult | null = null;
  protected diplotypeColumns: string[] = [
    'selected',
    'Organisation',
    'Gene Name',
    'Alleles',
    'Phenotypes',
    'Variants',
    'mappingId',
  ];
  protected variantColumns: string[] = [
    'RSID',
    'Chromosome',
    'Position',
    'Call',
    'Alleles',
    'Zygosity',
    'mappingId',
  ];
  protected diplotypeOriginalRows: any[] = [];
  protected diplotypeDataRows = new BehaviorSubject<any[]>([]);
  protected diplotypeToVariantMap: Map<string, string[]> = new Map();
  protected diplotypeDataView = new Observable<any[]>();
  protected diplotypeFilterField: FormControl = new FormControl('');
  protected variantOriginalRows: any[] = [];
  protected variantDataRows = new BehaviorSubject<any[]>([]);
  protected variantToDiplotypeMap: Map<string, string[]> = new Map();
  protected variantDataView = new Observable<any[]>();
  protected variantFilterField: FormControl = new FormControl('');
  protected annotationForm: FormGroup = new FormGroup({
    name: new FormControl('', [
      Validators.required,
      Validators.minLength(10),
      Validators.maxLength(64),
    ]),
    annotation: new FormControl('', [Validators.required]),
  });
  protected Object = Object;
  protected resultsLength = 0;
  protected pageIndex = 0;

  constructor(
    protected cs: ClinicService,
    private ss: SpinnerService,
    private tstr: ToastrService,
    private dg: MatDialog,
    private cdr: ChangeDetectorRef,
    @Inject(VIRTUAL_SCROLL_STRATEGY)
    private readonly scrollStrategy: TableVirtualScrollStrategy,
  ) {}

  resortDiplotypes(sort: Sort) {
    clinicResort(this.diplotypeOriginalRows, sort, (sorted) =>
      this.diplotypeDataRows.next(sorted),
    );
  }

  resortVariants(sort: Sort) {
    clinicResort(this.variantOriginalRows, sort, (sorted) =>
      this.variantDataRows.next(sorted),
    );
  }

  ngAfterViewInit(): void {
    this.scrollStrategy.setScrollHeight(52, 56);

    this.diplotypeDataView = combineLatest([
      this.diplotypeDataRows,
      this.scrollStrategy.scrolledIndexChange,
    ]).pipe(
      map((value: any) => {
        // Determine the start and end rendered range
        const start = Math.max(0, value[1] - 10);
        const end = Math.min(value[0].length, value[1] + 100);

        // Update the datasource for the rendered range of data
        return value[0].slice(start, end);
      }),
    );
    this.variantDataView = combineLatest([
      this.variantDataRows,
      this.scrollStrategy.scrolledIndexChange,
    ]).pipe(
      map((value: any) => {
        // Determine the start and end rendered range
        const start = Math.max(0, value[1] - 10);
        const end = Math.min(value[0].length, value[1] + 100);

        // Update the datasource for the rendered range of data
        return value[0].slice(start, end);
      }),
    );
  }

  pageChange(event: PageEvent) {
    this.refetch(this.requestId, this.projectName, event.pageIndex + 1);
  }

  filterDiplotypes() {
    const term: string = this.diplotypeFilterField.value;
    clinicFilter(this.diplotypeOriginalRows, term, (filtered) =>
      this.diplotypeDataRows.next(filtered),
    );
  }

  filterRelatedDiplotype(mappingId: string) {
    this.diplotypeFilterField.setValue(mappingId);
    this.filterDiplotypes();
    this.cdr.detectChanges();
  }

  filterVariants() {
    const term: string = this.variantFilterField.value;
    clinicFilter(this.variantOriginalRows, term, (filtered) => {
      this.variantDataRows.next(filtered);
    });
  }

  filterRelatedVariants(mappingId: string) {
    this.variantFilterField.setValue(mappingId);
    this.filterVariants();
    this.cdr.detectChanges();
  }

  async openAnnotateDialog() {
    const { AddAnnotationDialogComponent } = await import(
      '../add-annotation-dialog/add-annotation-dialog.component'
    );

    this.dg.open(AddAnnotationDialogComponent, {
      data: { projectName: this.projectName, requestId: this.requestId },
    });
  }

  async openSaveForReportingDialog() {
    const { SaveForReportingDialogComponent } = await import(
      '../save-for-reporting-dialog/save-for-reporting-dialog.component'
    );

    this.dg.open(SaveForReportingDialogComponent, {
      data: { projectName: this.projectName, requestId: this.requestId },
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.refetch(
      changes['requestId'] ? changes['requestId'].currentValue : this.requestId,
      changes['projectName']
        ? changes['projectName'].currentValue
        : this.projectName,
    );
  }

  refetch(requestId: string, projectName: string, page: number | null = null) {
    this.diplotypeOriginalRows = [];
    this.variantOriginalRows = [];
    this.diplotypeDataRows.next([]);
    this.variantDataRows.next([]);
    this.ss.start();
    this.cs
      .getClinicResults(requestId, projectName, null, page, null)
      .pipe(catchError(() => of(null)))
      .subscribe((data) => {
        if (!data) {
          this.tstr.error('Failed to load data', 'Error');
        } else {
          this.results = data;
          this.updateTable(data);
        }
        this.ss.end();
      });
  }

  updateTable(result: PGXFlowResult): void {
    this.results = result;
    this.resultsLength = result.pages[result.page];

    const lines = result.content.split('\n');
    this.diplotypeOriginalRows = lines
      .filter((l) => l.length > 0)
      .map((l) => {
        const parsedRow = JSON.parse(l);
        const diplotypeRow: any = {};

        Object.values(parsedRow).forEach((diplotypeVal, diplotypeIdx) => {
          if (this.diplotypeColumns[diplotypeIdx + 1] === 'Variants') {
            const variants = diplotypeVal as Record<string, any>;
            const variantRsids: string[] = [];
            const mappingId: string = uuid();
            Object.entries(variants).forEach(([rsid, variant]) => {
              const variantRow: any = {};
              variantRsids.push(rsid);
              variantRow[this.variantColumns[0]] = rsid;
              Object.values(variant).forEach((variantVal, variantIdx) => {
                variantRow[this.variantColumns[variantIdx + 1]] = variantVal;
              });
              variantRow[this.variantColumns[this.variantColumns.length - 1]] =
                mappingId;
              this.variantOriginalRows.push(variantRow);
            });

            diplotypeRow[this.diplotypeColumns[diplotypeIdx + 1]] =
              variantRsids;

            diplotypeRow[this.diplotypeColumns[diplotypeIdx + 2]] = mappingId;
          } else {
            diplotypeRow[this.diplotypeColumns[diplotypeIdx + 1]] =
              diplotypeVal;
          }
        });
        return diplotypeRow;
      });
    this.diplotypeDataRows.next(this.diplotypeOriginalRows);
    this.variantDataRows.next(this.variantOriginalRows);
  }
}
