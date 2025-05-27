import {
  AfterViewInit,
  Component,
  Inject,
  Injectable,
  Input,
  OnChanges,
  signal,
  SimpleChanges,
  ViewChild,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, KeyValue } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  map,
  Observable,
  of,
  startWith,
  Subject,
} from 'rxjs';
import { ClinicService } from 'src/app/services/clinic.service';
import { clinicFilter, clinicResort } from 'src/app/utils/clinic';
import { SpinnerService } from 'src/app/services/spinner.service';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { HelpTextComponent } from '../help-text/help-text.component';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { TableVirtualScrollStrategy } from '../scroll-strategy.service';
import {
  ScrollingModule,
  VIRTUAL_SCROLL_STRATEGY,
} from '@angular/cdk/scrolling';
import { ToastrService } from 'ngx-toastr';
import { AutoCompleteComponent } from '../auto-complete/auto-complete.component';

import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
type LookupResult = {
  url?: string;
  pages: { [key: string]: number };
  content: string;
  page: number;
  chromosome: string;
};

@Component({
  selector: 'app-lookup-results-viewer',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
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
    MatExpansionModule,
    AutoCompleteComponent,
    MatIconModule,
    MatTooltipModule,
    MatAutocompleteModule,
  ],
  providers: [
    {
      provide: VIRTUAL_SCROLL_STRATEGY,
      useClass: TableVirtualScrollStrategy,
    },
    TableVirtualScrollStrategy,
  ],
  templateUrl: './lookup-results-viewer.component.html',
  styleUrl: './lookup-results-viewer.component.scss',
})
export class LookupResultsViewerComponent implements OnChanges, AfterViewInit {
  @Input({ required: true }) requestId!: string;
  @Input({ required: true }) projectName!: string;
  @ViewChild(MatSort) sort!: MatSort;
  readonly panelOpenState = signal(false);
  protected results: LookupResult | null = null;
  protected columns: string[] = [
    'selected',
    'No',
    'PharmGKB ID',
    'Level',
    'Variant',
    'Gene',
    'Drugs',
    'Alleles',
    'Allele Function',
    'Phenotype Categories',
    'Phenotype',
    'Implication',
    'Recommendation',
    'Pediatric',
    'chr',
    'start',
    'end',
    'Overlapped Count',
    'In FORNAS',
    'In Top 12',
  ];
  filterValues: { [key: string]: string } = {};
  filterMasterData: { [key: string]: any[] } = {};
  protected originalRows: any[] = [];
  protected dataRows = new BehaviorSubject<any[]>([]);
  protected dataView = new Observable<any[]>();
  protected currentRenderedRows: any[] = [];
  protected chromosomeField: FormControl = new FormControl('');
  protected basePositionField: FormControl = new FormControl('');
  protected filterField: FormControl = new FormControl('');
  protected advancedFilter: FormControl = new FormControl('');
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
  filteredColumns: Observable<string[]> | undefined;

  constructor(
    protected cs: ClinicService,
    private ss: SpinnerService,
    private tstr: ToastrService,
    private cdr: ChangeDetectorRef,
    private dg: MatDialog,
    @Inject(VIRTUAL_SCROLL_STRATEGY)
    private readonly scrollStrategy: TableVirtualScrollStrategy,
  ) {}

  resort(sort: Sort) {
    const snapshot = [...this.currentRenderedRows];
    clinicResort(snapshot, sort, (sorted) => this.dataRows.next(sorted));
  }

  ngAfterViewInit(): void {
    this.scrollStrategy.setScrollHeight(52, 56);
    this.dataView = combineLatest([
      this.dataRows,
      this.scrollStrategy.scrolledIndexChange,
    ]).pipe(
      map((value: any) => {
        // Determine the start and end rendered range
        const start = Math.max(0, value[1] - 10);
        const end = Math.min(value[0].length, value[1] + 100);
        this.currentRenderedRows = [...value[0].slice(start, end)]; // 🔥 store snapshot

        // Update the datasource for the rendered range of data
        return value[0].slice(start, end);
      }),
    );
    this.filteredColumns = this.advancedFilter.valueChanges.pipe(
      startWith(''),
      map((value) => this._filter(value || '')),
    );
  }

  search() {
    const position = this.basePositionField.value;
    if (position) {
      this.refetch(
        this.requestId,
        this.projectName,
        this.chromosomeField.value,
        null,
        position,
      );
    }
  }

  filter() {
    const term = this.filterField.value;

    if (term) {
      clinicFilter(this.originalRows, term, (filtered) =>
        this.dataRows.next(filtered),
      );
    } else {
      this.dataRows.next(this.originalRows);
    }
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

  refetch(
    requestId: string,
    projectName: string,
    chromosome: string | null = null,
    page: number | null = null,
    position: number | null = null,
  ) {
    this.originalRows = [];
    this.dataRows.next([]);
    this.ss.start();
    this.cs
      .getClinicResults(requestId, projectName, chromosome, page, position)
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

  updateTable(result: LookupResult): void {
    console.log(result);
    if (!this.originalRows) {
      console.warn('updateTable ran before originalRows was initialised');
    }
    this.results = result;
    const lines = result.content.split('\n');
    this.originalRows = lines
      .filter((l) => l.length > 0)
      .map((l) => {
        const annotationRow: any = {};
        Object.values(JSON.parse(l)).forEach((v, i) => {
          annotationRow[this.columns[i + 1]] = v;
        });
        return annotationRow;
      });
    this.dataRows.next(this.originalRows);
    this.cs.selectedVariants.next(new Map());
    this.setMasterData();
  }

  setFilter() {
    const filtered = this.originalRows.filter((item) => {
      return this.columns.every((col) => {
        const filterVal = this.filterValues[col];
        const itemVal = item[col]?.toString().toLowerCase() || '';
        return filterVal ? itemVal.includes(filterVal.toLowerCase()) : true;
      });
    });

    this.dataRows.next(filtered);
  }

  resetFilter() {
    this.filterValues = {};
    this.refetch(
      this.requestId,
      this.projectName,
      this.chromosomeField.value,
      this.pageIndex + 1,
    );
  }

  addFilter() {
    //add dinamic filter
    const filterKey = this.advancedFilter.value;
    if (this.filterValues.hasOwnProperty(filterKey) || filterKey === '') {
      return;
    }
    this.filterValues = { ...this.filterValues, [filterKey]: '' };
  }

  setMasterData() {
    this.columns.forEach((x) => {
      if (x !== 'selected') {
        const uniqueData = Array.from(
          new Set(this.originalRows.map((item) => item[x])),
        );

        const existing = this.filterMasterData[x] || [];
        const merged = Array.from(new Set([...existing, ...uniqueData]));

        this.filterMasterData = {
          ...this.filterMasterData,
          [x]: merged,
        };
      }
    });
  }

  onSelectChange(event: any, key: string) {
    this.filterValues[key] = event;
  }

  //handling order autocomplete based on index
  compareFn = (a: KeyValue<string, any>, b: KeyValue<string, any>): number => {
    return 0;
  };

  removeFilter(key: string) {
    const { [key]: _, ...rest } = this.filterValues;
    this.filterValues = rest;
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.columns.filter((option) =>
      option.toLowerCase().includes(filterValue),
    );
  }
}
