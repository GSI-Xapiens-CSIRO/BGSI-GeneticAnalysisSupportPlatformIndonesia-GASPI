import {
  AfterViewInit,
  Component,
  Inject,
  Injectable,
  Input,
  OnChanges,
  OnInit,
  signal,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule, KeyValue } from '@angular/common';
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
  startWith,
  Subject,
} from 'rxjs';
import { ClinicService } from 'src/app/services/clinic.service';
import {
  clinicFilter,
  clinicResort,
  validationReportsArray,
  validationReportsObject,
} from 'src/app/utils/clinic';
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
import { BoxDataComponent } from './box-data/box-data.component';
import { COLUMNS } from '../hub_configs';
import { environment } from 'src/environments/environment';
import { isEqual } from 'lodash';
import { NoResultsAlertComponent } from '../no-results-alert/no-results-alert.component';
import { Router } from '@angular/router';
import { FilterModalComponent } from '../../../../components/filter-modal/filter-modal.component';
import {
  DX_FILTER_FIELDS_RSCM,
  DX_FILTER_FIELDS_RSSARDJITO,
} from './svep-results-viewer.types';
import {
  evaluateGroup,
  GetFilterSummaryText,
  FilterGroup,
} from 'src/app/utils/filter';

type SVEPResult = {
  url?: string;
  pages: { [key: string]: number };
  content: string;
  page: number;
  chromosome: string;
  filters?: {
    clinvar_exclude: string[];
    consequence_rank: number;
    genes: string[];
    max_maf: number;
    min_qual: number;
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
    return $localize`Page ${page + 1} of ${length / pageSize}`;
  }
}

@Component({
  selector: 'app-svep-results-viewer',
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
    BoxDataComponent,
    NoResultsAlertComponent,
  ],
  providers: [
    { provide: MatPaginatorIntl, useClass: MyCustomPaginatorIntl },
    {
      provide: VIRTUAL_SCROLL_STRATEGY,
      useClass: TableVirtualScrollStrategy,
    },
    TableVirtualScrollStrategy,
  ],
  templateUrl: './svep-results-viewer.component.html',
  styleUrl: './svep-results-viewer.component.scss',
})
export class SvepResultsViewerComponent
  implements OnInit, OnChanges, AfterViewInit
{
  @Input({ required: true }) requestId!: string;
  @Input({ required: true }) projectName!: string;
  @Input() listData: any = []; // receive data from parent
  @Input() selectedData: any = []; // receive data from parent
  @Input() listReports: any = []; // receive data from parent

  @ViewChild('paginator') paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  readonly panelOpenState = signal(false);
  protected results: SVEPResult | null = null;
  protected hubName: string = environment.hub_name;
  protected columns: string[] = COLUMNS[this.hubName].svepCols;
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
  rows: any[] = [];
  genesExpanded: boolean = false; // Add this property

  expandedMap = new Map<string, boolean>();
  protected isLoading = false;

  protected group!: FilterGroup;
  protected hasAppliedAdvancedFilter = false;

  constructor(
    protected cs: ClinicService,
    private ss: SpinnerService,
    private tstr: ToastrService,
    private dg: MatDialog,
    @Inject(VIRTUAL_SCROLL_STRATEGY)
    private readonly scrollStrategy: TableVirtualScrollStrategy,
    private router: Router,
  ) {}

  /**
   * Check if SVEP configuration is available and has data
   */
  hasSvepConfig(): boolean {
    const filters = this.results?.filters;
    const thresholds = environment.clinic_warning_thresholds;
    return !!(filters || thresholds);
  }

  /**
   * Get filters configuration
   */
  getFilters(): any {
    return this.results?.filters || null;
  }

  /**
   * Get clinic warning thresholds from environment
   */
  getClinicThresholds(): any {
    return environment.clinic_warning_thresholds || null;
  }

  /**
   * Get filter criteria for display
   */
  getFilterCriteria(): Array<{ label: string; value: any; type: string }> {
    const filters = this.getFilters();
    if (!filters) return [];

    return [
      {
        label: 'ClinVar Exclude',
        value: filters.clinvar_exclude,
        type: 'array',
      },
      {
        label: 'Consequence Rank',
        value: filters.consequence_rank,
        type: 'number',
      },
      { label: 'Max MAF', value: filters.max_maf, type: 'number' },
      { label: 'Min Quality', value: filters.min_qual, type: 'number' },
      {
        label: 'Target Genes',
        value: filters.genes?.length || 0,
        type: 'count',
      },
    ];
  }

  /**
   * Get quality thresholds for display
   */
  getQualityThresholds(): Array<{
    label: string;
    value: any;
    description: string;
  }> {
    const thresholds = this.getClinicThresholds();
    if (!thresholds) return [];

    return [
      {
        label: 'Filter',
        value: thresholds.filter,
        description: 'Filter status threshold',
      },
      {
        label: 'Quality Score (QUAL)',
        value: thresholds.qual,
        description: 'Minimum quality score',
      },
      {
        label: 'Read Depth (DP)',
        value: thresholds.dp,
        description: 'Minimum read depth',
      },
      {
        label: 'Genotype Quality (GQ)',
        value: thresholds.gq,
        description: 'Minimum genotype quality',
      },
      {
        label: 'Mapping Quality (MQ)',
        value: thresholds.mq,
        description: 'Minimum mapping quality',
      },
      {
        label: 'Quality by Depth (QD)',
        value: thresholds.qd,
        description: 'Minimum quality by depth',
      },
    ];
  }

  /**
   * Get target genes (first 10 for preview)
   */
  getTargetGenesPreview(): string[] {
    const filters = this.getFilters();
    if (!filters?.genes) return [];
    return filters.genes.slice(0, 10);
  }

  /**
   * Get total genes count
   */
  getTotalGenesCount(): number {
    const filters = this.getFilters();
    return filters?.genes?.length || 0;
  }

  /**
   * Toggle genes expanded state
   */
  toggleGenesExpanded(): void {
    this.genesExpanded = !this.genesExpanded;
  }

  /**
   * Get remaining genes (after first 10)
   */
  getRemainingGenes(): string[] {
    const filters = this.getFilters();
    if (!filters?.genes) return [];
    return filters.genes.slice(10);
  }

  resort(sort: Sort) {
    const snapshot = [...this.currentRenderedRows];
    clinicResort(snapshot, sort, (sorted) => this.dataRows.next(sorted));
  }

  ngOnInit(): void {
    this.filteredColumns = this.advancedFilter.valueChanges.pipe(
      startWith(''),
      map((value) => this._filter(value || '')),
    );
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
    this.chromosomeField.valueChanges.subscribe((chromosome) => {
      this.refetch(this.requestId, this.projectName, chromosome);
      // if chromosome or page change we clear position
      this.basePositionField.setValue('');
    });
    this.dataView.subscribe((rows) => (this.rows = rows));
  }

  pageChange(event: PageEvent) {
    this.refetch(
      this.requestId,
      this.projectName,
      this.chromosomeField.value,
      event.pageIndex + 1,
    );
    // if chromosome or page change we clear position
    this.basePositionField.setValue('');
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

  clearFilter() {
    this.filterField.reset();
    this.dataRows.next(this.originalRows);
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
    //validation report
    const found = validationReportsArray(
      this.listReports,
      this.cs.selectedVariants.value,
    );
    if (found) {
      this.tstr.error(
        'This variant(s) was already selected for reporting, please see the "Variant selected for reporting" below',
        'Error',
      );
      return;
    }

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
    this.isLoading = true;
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
        this.isLoading = false;
      });
  }

  updateTable(result: SVEPResult): void {
    this.results = result;

    // No hardcoding - filters comes from API response

    this.resultsLength = result.pages[result.chromosome];
    const lines = result.content.split('\n');
    this.originalRows = lines
      .filter((l) => l.length > 0)
      .map((l) => {
        const row: any = {};
        l.trim()
          .split('\t')
          .forEach((v, i) => {
            row[this.columns[i + 1]] = v;
          });
        return row;
      });
    // this.dataRows.next(this.originalRows);
    this.setFilter();
    this.chromosomeField.setValue(result.chromosome, { emitEvent: false });
    this.pageIndex = result.page - 1;
    this.cs.selectedVariants.next(new Map());
    this.setMasterData();
  }

  setFilter() {
    const filtered = this.originalRows.filter((item) => {
      // Only check columns that have filter values (AND condition)
      return Object.keys(this.filterValues).every((col) => {
        const filterVal = this.filterValues[col];
        const itemVal = item[col]?.toString().toLowerCase() || '';

        // If filter value exists and is not empty, check if item contains it
        if (filterVal && filterVal.trim() !== '') {
          return itemVal.includes(filterVal.toLowerCase());
        }

        // If no filter value, this column passes the filter
        return true;
      });
    });

    this.dataRows.next(filtered);
  }

  findMatchingVariants(firstArray: any[], secondArray: any[]): any[] {
    return firstArray.filter((item1) => {
      return secondArray.some((item2) => {
        return Object.keys(item2).every((key) => item1[key] === item2[key]);
      });
    });
  }

  filterByAnotation(data: any) {
    //reset all filter
    this.clearFilter();
    this.filterValues = {};
    const filteredByAnnot = this.findMatchingVariants(this.originalRows, data);

    this.dataRows.next(filteredByAnnot);
    const el = document.getElementById('myTarget');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
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
      this.advancedFilter.reset(); //reset filter if the filter same
      return;
    }
    this.filterValues = { ...this.filterValues, [filterKey]: '' };
    this.advancedFilter.reset(); //reset filed after filter selected
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

  handleRedirectUrl(column: string, value: string) {
    const urlMap: Record<string, string> = {
      'Gene ID': `https://www.ncbi.nlm.nih.gov/gene/?term=${value}`,
      variationId: `https://www.ncbi.nlm.nih.gov/clinvar/variation/${value}/`,
      rsId: `https://www.ncbi.nlm.nih.gov/snp/${value}`,
      accession: `https://www.ncbi.nlm.nih.gov/clinvar/${value}/?redir=rcv`,
      pubmed: `https://pubmed.ncbi.nlm.nih.gov/${value}/`,
    };

    const url =
      urlMap[column] ||
      `https://asia.ensembl.org/Homo_sapiens/Location/View?r=${value}`;
    window.open(url, '_blank');
  }

  splitPubMedArray(pubmedString: string): string[] {
    //handle error if data null
    if (
      !pubmedString ||
      pubmedString.trim() === '' ||
      pubmedString.trim() === '-'
    ) {
      return [];
    }
    return pubmedString.split(',').map((id) => id.trim());
  }

  showTooltip(message: string) {
    return `Secondary analysis on this variants reports "${message}" `;
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.columns.filter((option) =>
      option.toLowerCase().includes(filterValue),
    );
  }

  onToggle(rowId: string, expanded: boolean) {
    this.expandedMap.set(rowId, expanded);
  }

  //function to check is row contains in listAnotation with dynamic attributes
  checkRow(listData: any[], row: any): boolean {
    return listData.some((variant) =>
      Object.keys(variant).every((key) => variant[key] === row[key]),
    );
  }

  handleIsSelected(row: any) {
    const result = this.checkRow(this.listData, row);
    return result || false;
  }

  handleRedirectFAQ = () => {
    this.router.navigate(['/faq']);
  };

  checkIsMarked = (bObj: any) => {
    const isMarked = validationReportsObject(this.listReports, bObj);
    return isMarked;
  };

  openAdvancedFilter() {
    const hubName = this.hubName;
    const colomnFields = ['RSCM'].includes(hubName)
      ? DX_FILTER_FIELDS_RSCM
      : ['RSSARDJITO'].includes(hubName)
        ? DX_FILTER_FIELDS_RSSARDJITO
        : [];

    this.dg
      .open(FilterModalComponent, {
        width: '950px',
        maxHeight: '90vh',
        data: { fields: colomnFields },
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;
        this.group = result;
        this.applyAdvancedFilter(result);
      });
  }

  private applyAdvancedFilter(filter: FilterGroup) {
    const filtered = this.originalRows.filter((row) =>
      evaluateGroup(filter, row),
    );

    this.hasAppliedAdvancedFilter = true;
    this.dataRows.next(filtered);
  }

  get summaryText(): string {
    return GetFilterSummaryText(this.group);
  }

  resetAdvanceFilter() {
    this.hasAppliedAdvancedFilter = false;
    this.dataRows.next([...this.originalRows]);
  }
}
