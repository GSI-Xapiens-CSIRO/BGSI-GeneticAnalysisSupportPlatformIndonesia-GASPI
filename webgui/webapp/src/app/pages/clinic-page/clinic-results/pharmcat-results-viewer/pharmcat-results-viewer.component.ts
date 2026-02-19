import {
  ChangeDetectorRef,
  Component,
  Inject,
  Injectable,
  Input,
  SimpleChanges,
  ViewChild,
  signal,
  OnInit,
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
  Subscription,
} from 'rxjs';
import { ClinicService } from 'src/app/services/clinic.service';
import {
  clinicFilter,
  clinicMultiFilter,
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
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { COLUMNS } from '../hub_configs';
import { environment } from 'src/environments/environment';
import { RsponBoxDataViewComponent } from './rspon-box-data-view/rspon-box-data-view.component';
import { NoResultsAlertComponent } from '../no-results-alert/no-results-alert.component';
import { Router } from '@angular/router';
import { FilterModalComponent } from '../../../../components/filter-modal/filter-modal.component';
import {
  PHARMGKB_FILTER_FIELDS_DIPLOTYPES,
  PHARMGKB_FILTER_FIELDS_VARIANTS,
} from './pharmcat-results-viewer.types';
import {
  evaluateGroup,
  GetFilterSummaryText,
  FilterGroup,
} from 'src/app/utils/filter';

type PharmcatResult = {
  url?: string;
  pages: { [key: string]: number };
  content: string;
  page: number;
  config: {
    pharmcat: {
      ORGANISATIONS: Array<{
        gene: string;
        drug: string;
      }>;
      GENES: string[];
      DRUGS: string[];
    };
  };
  missingToRef: boolean | null;
  noResultsMessage: string;
  noResultsMessageType: string;
};

type FilterType = 'variants' | 'diplotypes';

interface FlagInfo {
  shouldShow: boolean;
  color: string;
  message: string;
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
    return $localize`Page ${page + 1} of ${length / pageSize}`;
  }
}

@Component({
  selector: 'app-pharmcat-results-viewer',
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
    MatIconModule,
    MatTooltipModule,
    MatAutocompleteModule,
    RsponBoxDataViewComponent,
    NoResultsAlertComponent,
  ],
  providers: [
    { provide: MatPaginatorIntl, useClass: MyCustomPaginatorIntl },
    { provide: VIRTUAL_SCROLL_STRATEGY, useClass: TableVirtualScrollStrategy },
    TableVirtualScrollStrategy,
  ],
  templateUrl: './pharmcat-results-viewer.component.html',
  styleUrl: './pharmcat-results-viewer.component.scss',
})
export class PharmcatResultsViewerComponent implements OnInit {
  @Input({ required: true }) requestId!: string;
  @Input({ required: true }) projectName!: string;
  @Input() listReports: any = []; // receive data from parent

  @ViewChild('paginator') paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  protected results: PharmcatResult | null = null;
  protected diplotypeColumns: string[] =
    COLUMNS[environment.hub_name].pharmcatCols.diplotypeCols;
  protected variantColumns: string[] = [
    'Status', // Add Status column as first column
    ...COLUMNS[environment.hub_name].pharmcatCols.variantCols,
  ];

  protected warningColumns: string[] =
    COLUMNS[environment.hub_name].pharmcatCols.warningCols;

  protected diplotypeOriginalRows: any[] = [];
  protected diplotypeHasRows: boolean = false;
  protected diplotypeDataRows = new BehaviorSubject<any[]>([]);
  protected diplotypeToVariantMap: Map<string, string[]> = new Map();
  protected diplotypeDataView = new Observable<any[]>();
  protected diplotypeCurrentRenderedRows: any[] = [];
  protected diplotypeFilterField: FormControl = new FormControl('');
  protected diplotypeScopeReduced: boolean = false;

  protected variantOriginalRows: any[] = [];
  protected variantHasRows: boolean = false;
  protected variantDataRows = new BehaviorSubject<any[]>([]);
  protected variantToDiplotypeMap: Map<string, string[]> = new Map();
  protected variantFilterField: FormControl = new FormControl('');
  protected variantScopeReduced: boolean = false;

  protected warningOriginalRows: any[] = [];
  protected warningDataRows = new BehaviorSubject<any[]>([]);
  protected missingToRef: boolean | null = null;
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
  protected diplotypeRows: any[] = [];
  protected isLoading: boolean = false;

  readonly panelOpenState = signal(false);

  //filter dyplotypes
  protected advancedFilter: FormControl = new FormControl('');
  filteredColumns: Observable<string[]> | undefined;
  filterValuesDyplotypes: { [key: string]: string } = {};
  filterMasterDataDyplotypes: { [key: string]: any[] } = {};

  //filter variants
  protected advancedFilterVariants: FormControl = new FormControl('');
  filteredColumnsVariants: Observable<string[]> | undefined;
  filterValuesVariants: { [key: string]: string } = {};
  filterMasterDataVariants: { [key: string | number]: any[] } = {};

  protected group!: FilterGroup;
  protected typeFilter!: FilterType | null;

  constructor(
    protected cs: ClinicService,
    private ss: SpinnerService,
    private tstr: ToastrService,
    private dg: MatDialog,
    private cdr: ChangeDetectorRef,
    private router: Router,
    @Inject(VIRTUAL_SCROLL_STRATEGY)
    private readonly virtualScrollStrategy: TableVirtualScrollStrategy,
  ) {}

  //handle on init
  ngOnInit(): void {
    this.filteredColumns = this.advancedFilter.valueChanges.pipe(
      startWith(''),
      map((value) => this._filter(value || '', 'diplotypes')),
    );
    this.filteredColumnsVariants =
      this.advancedFilterVariants.valueChanges.pipe(
        startWith(''),
        map((value) => this._filter(value || '', 'variants')),
      );
  }

  private _filter(value: string, type: FilterType): string[] {
    const filterValue = value.toLowerCase();
    const source =
      type === 'variants' ? this.variantColumns : this.diplotypeColumns;

    return source.filter((option) =>
      option.toLowerCase().includes(filterValue),
    );
  }

  // Flag generation methods
  private generateFlagInfo(row: any): FlagInfo {
    const thresholds = environment.clinic_warning_thresholds;
    const scoreFields = {
      Qual: { value: row['Qual'], threshold: thresholds.qual },
      DP: { value: row['Read Depth'], threshold: thresholds.dp },
      GQ: { value: row['Genotype Quality'], threshold: thresholds.gq },
      MQ: { value: row['Mapping Quality'], threshold: thresholds.mq },
      QD: { value: row['Quality by Depth'], threshold: thresholds.qd },
    };

    const belowThreshold: string[] = [];
    const missingKeys: string[] = [];

    // Check each field
    Object.entries(scoreFields).forEach(([key, config]) => {
      const value = config.value;

      if (
        value === '.' ||
        value === '-' ||
        value === '' ||
        value === null ||
        value === undefined
      ) {
        missingKeys.push(key);
      } else {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue < config.threshold) {
          belowThreshold.push(key);
        }
      }
    });

    // Check filter condition
    const filterValue = row['Filter'];
    const hasFilterIssue = ![thresholds.filter, '-', ''].includes(filterValue);
    const hasScoreIssues = belowThreshold.length > 0;
    const hasMissingKeys = missingKeys.length > 0;

    // Show flag if there are ANY issues: filter, score, or missing keys
    const shouldShowFlag = hasFilterIssue || hasScoreIssues || hasMissingKeys;

    return this.determineFlagInfo(
      belowThreshold,
      missingKeys,
      shouldShowFlag,
      filterValue,
      hasFilterIssue,
    );
  }

  private determineFlagInfo(
    belowThreshold: string[],
    missingKeys: string[],
    shouldShowFlag: boolean,
    filterValue: string,
    hasFilterIssue: boolean,
  ): FlagInfo {
    // Don't show flag if no issues at all
    if (!shouldShowFlag) {
      return {
        shouldShow: false,
        color: '#4b5563',
        message: '',
      };
    }

    // Generate messages
    const messages: string[] = [];

    // Add filter message only if filter has issues
    if (hasFilterIssue) {
      messages.push(this.getFilterMessage(filterValue));
    }

    // Add score message if there are threshold violations
    if (belowThreshold.length > 0) {
      messages.push(
        `The Result Score ${belowThreshold.join(
          ', ',
        )} is less than minimum Score`,
      );
    }

    // Add missing keys message if there are missing values
    if (missingKeys.length > 0) {
      messages.push(`The Key ${missingKeys.join(', ')} is missing in vcf file`);
    }

    const fullMessage = messages.join(' and ');

    // Determine color based on content
    // Gray hanya jika filter is missing (., -, atau empty) DAN tidak ada score violations DAN ada missing keys
    const filterIsMissing =
      filterValue === '.' ||
      filterValue === '-' ||
      filterValue === '' ||
      filterValue === null ||
      filterValue === undefined;
    const isGrayFlag =
      filterIsMissing && belowThreshold.length === 0 && missingKeys.length > 0;

    return {
      shouldShow: true,
      color: isGrayFlag ? '#4b5563' : '#dc2626', // gray if only missing keys, red otherwise
      message: fullMessage,
    };
  }

  private getFilterMessage(filterValue: string): string {
    if (
      filterValue === '.' ||
      filterValue === '-' ||
      filterValue === '' ||
      filterValue === null ||
      filterValue === undefined
    ) {
      return 'Filter is missing';
    } else {
      return 'Filter is not Passed';
    }
  }

  // Methods to get flag info for templates
  getFlagInfo(row: any): FlagInfo {
    return this.generateFlagInfo(row);
  }

  shouldShowFlag(row: any): boolean {
    return this.generateFlagInfo(row).shouldShow;
  }

  getFlagColor(row: any): string {
    return this.generateFlagInfo(row).color;
  }

  getFlagMessage(row: any): string {
    return this.generateFlagInfo(row).message;
  }

  addFilter(type: FilterType) {
    const isVariant = type === 'variants';

    const filterKey = isVariant
      ? this.advancedFilterVariants.value
      : this.advancedFilter.value;

    const currentFilterValues = isVariant
      ? this.filterValuesVariants
      : this.filterValuesDyplotypes;

    if (currentFilterValues.hasOwnProperty(filterKey) || filterKey === '') {
      isVariant
        ? this.advancedFilterVariants.reset()
        : this.advancedFilter.reset();
      return;
    }

    const updated = {
      ...currentFilterValues,
      [filterKey]: '',
    };

    if (isVariant) {
      this.filterValuesVariants = updated;
      this.advancedFilterVariants.reset();
    } else {
      this.filterValuesDyplotypes = updated;
      this.advancedFilter.reset();
    }
  }

  //handling order autocomplete based on index
  compareFn = (a: KeyValue<string, any>, b: KeyValue<string, any>): number => {
    return 0;
  };

  onSelectChange(event: any, key: string, type: FilterType): void {
    const target =
      type === 'variants'
        ? this.filterValuesVariants
        : this.filterValuesDyplotypes;
    target[key] = event;
  }

  removeFilter(key: string) {
    const { [key]: _, ...rest } = this.filterValuesDyplotypes;
    this.filterValuesDyplotypes = rest;
  }

  removeFilterVariants(key: string) {
    const { [key]: _, ...rest } = this.filterValuesVariants;
    this.filterValuesVariants = rest;
  }

  private setMasterFilterData<T extends Record<string, any>>(
    columns: string[],
    originalRows: T[],
    target: { [key: string]: string[] },
    convertToString = false,
  ) {
    columns.forEach((columnKey) => {
      if (columnKey !== 'selected' && columnKey !== 'Status') {
        // Exclude Status column from filter data
        const uniqueValues = new Set<string>();

        originalRows.forEach((row) => {
          const value = row[columnKey];

          if (Array.isArray(value)) {
            value.forEach((v) =>
              uniqueValues.add(convertToString ? String(v) : v),
            );
          } else {
            uniqueValues.add(convertToString ? String(value) : value);
          }
        });

        const existing = target[columnKey] || [];
        const merged = Array.from(new Set([...existing, ...uniqueValues]));

        target[columnKey] = merged;
      }
    });
  }

  setMasterData() {
    this.setMasterFilterData(
      this.diplotypeColumns,
      this.diplotypeOriginalRows,
      this.filterMasterDataDyplotypes,
      false,
    );

    this.setMasterFilterData(
      this.variantColumns,
      this.variantOriginalRows,
      this.filterMasterDataVariants,
      true,
    );
  }

  private applyFilter<T extends Record<string, any>>(
    originalRows: T[],
    filterValues: { [key: string]: string },
    updateFn: (filtered: T[]) => void,
  ) {
    const filtered = originalRows.filter((item) =>
      Object.keys(filterValues).every((col) => {
        if (col === 'Status') return true; // Skip Status column in filtering

        const filterVal = filterValues[col];
        const itemVal = item[col]?.toString().toLowerCase() || '';

        return !filterVal?.trim() || itemVal.includes(filterVal.toLowerCase());
      }),
    );

    updateFn(filtered);
  }

  setFilter() {
    this.applyFilter(
      this.diplotypeOriginalRows,
      this.filterValuesDyplotypes,
      (result) => this.diplotypeDataRows.next(result),
    );
    this.diplotypeFilterField.setValue('');
  }

  setFilterVariants() {
    this.applyFilter(
      this.variantOriginalRows,
      this.filterValuesVariants,
      (result) => this.variantDataRows.next(result),
    );
    this.variantFilterField.setValue('');
  }

  resetFilter() {
    this.filterValuesDyplotypes = {};
    this.setFilter();
  }
  resetFilterVariants() {
    this.filterValuesVariants = {};
    this.setFilterVariants();
  }

  /**
   * Check if PharmCAT configuration is available and has data
   */
  hasPharmcatConfig(): boolean {
    const config = this.results?.config?.pharmcat;
    return !!(
      config &&
      (config.ORGANISATIONS?.length > 0 ||
        config.GENES?.length > 0 ||
        config.DRUGS?.length > 0)
    );
  }

  /**
   * Get organizations from PharmCAT configuration
   */
  getOrganisations(): Array<{ gene: string; drug: string }> {
    return this.results?.config?.pharmcat?.ORGANISATIONS || [];
  }

  /**
   * Get genes from PharmCAT configuration
   */
  getGenes(): string[] {
    return this.results?.config?.pharmcat?.GENES || [];
  }

  /**
   * Get drugs from PharmCAT configuration
   */
  getDrugs(): string[] {
    return this.results?.config?.pharmcat?.DRUGS || [];
  }

  /**
   * Get unique organization names
   */
  getUniqueOrganizations(): string[] {
    const orgs = this.getOrganisations();
    const uniqueOrgs = [...new Set(orgs.map((org) => org.gene))];
    return uniqueOrgs;
  }

  /**
   * Check if clinic thresholds are available
   */
  getClinicThresholds(): boolean {
    return !!environment.clinic_warning_thresholds;
  }

  /**
   * Get quality thresholds for display
   */
  getQualityThresholds(): Array<{
    label: string;
    value: string;
    description: string;
  }> {
    const thresholds = environment.clinic_warning_thresholds;
    if (!thresholds) return [];

    return [
      {
        label: 'Filter Status',
        value: thresholds.filter || 'PASS',
        description: 'Expected filter status for variant quality',
      },
      {
        label: 'Quality Score (QUAL)',
        value: thresholds.qual?.toString() || '20',
        description: 'Minimum quality score threshold',
      },
      {
        label: 'Read Depth (DP)',
        value: thresholds.dp?.toString() || '10',
        description: 'Minimum read depth coverage',
      },
      {
        label: 'Genotype Quality (GQ)',
        value: thresholds.gq?.toString() || '15',
        description: 'Minimum genotype quality score',
      },
      {
        label: 'Mapping Quality (MQ)',
        value: thresholds.mq?.toString() || '30',
        description: 'Minimum mapping quality score',
      },
      {
        label: 'Quality by Depth (QD)',
        value: thresholds.qd?.toString() || '20',
        description: 'Minimum quality score normalized by depth',
      },
    ];
  }

  resortDiplotypes(sort: Sort) {
    const snapshot = [...this.diplotypeCurrentRenderedRows];
    clinicResort(snapshot, sort, (sorted) =>
      this.diplotypeDataRows.next(sorted),
    );
  }

  resortVariants(sort: Sort) {
    const snapshot = [...this.variantDataRows.value];
    clinicResort(snapshot, sort, (sorted) => this.variantDataRows.next(sorted));
  }

  ngAfterViewInit() {
    this.virtualScrollStrategy.setScrollHeight(52, 56);

    this.diplotypeDataView = combineLatest([
      this.diplotypeDataRows,
      this.virtualScrollStrategy.scrolledIndexChange,
    ]).pipe(
      map((value: any) => {
        // Determine the start and end rendered range
        const start = Math.max(0, value[1] - 10);
        const end = Math.min(value[0].length, value[1] + 100);
        this.diplotypeCurrentRenderedRows = [...value[0].slice(start, end)];

        // Update the datasource for the rendered range of data
        return value[0].slice(start, end);
      }),
    );

    this.diplotypeDataView.subscribe(
      (diplotypeRows) => (this.diplotypeRows = diplotypeRows),
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
    this.diplotypeScopeReduced = true;
    this.diplotypeFilterField.setValue(mappingId);
    this.filterDiplotypes();
    this.cdr.detectChanges();
    this.filterValuesDyplotypes = {};
  }

  resetDiplotypes() {
    this.diplotypeFilterField.setValue('');
    this.filterDiplotypes();
    this.cdr.detectChanges();
    this.filterValuesDyplotypes = {};
  }

  resetRelatedDiplotype() {
    this.resetDiplotypes();
    this.diplotypeScopeReduced = false;
    this.filterValuesDyplotypes = {};
  }

  filterVariants() {
    const term: string = this.variantFilterField.value;
    clinicFilter(this.variantOriginalRows, term, (filtered) => {
      this.variantDataRows.next(filtered);
    });
  }

  resetVariants() {
    this.filterValuesVariants = {};
    this.variantFilterField.setValue('');
    this.filterVariants();
    this.cdr.detectChanges();
  }

  filterRelatedVariants = (mappingIds: string[]) => {
    this.variantScopeReduced = true;
    this.variantFilterField.setValue('');
    const terms = mappingIds;
    clinicMultiFilter(this.variantOriginalRows, terms, (filtered) => {
      this.variantDataRows.next(filtered);
    });
    this.cdr.detectChanges();
    this.filterValuesVariants = {};
  };

  resetRelatedVariants() {
    this.resetVariants();
    this.variantScopeReduced = false;
    this.filterValuesVariants = {};
  }

  handleSelectionChange(row: any, isChecked: boolean): void {
    // Absorb all related variants in a checked diplotype row for annotation/reporting
    let diplotypeRow: any = { ...row };
    if (row['Related Variants']) {
      const relatedVariants = this.variantOriginalRows.filter((variant) => {
        return (
          variant['Related Diplotypes'] &&
          row['Related Variants'].includes(variant['Related Diplotypes'])
        );
      });
      if (!diplotypeRow['Zygosity'] && relatedVariants.length > 0) {
        diplotypeRow['Zygosity'] = relatedVariants.map(
          (variant) => variant['Zygosity'],
        );
      }
    }
    this.cs.selection(diplotypeRow, isChecked);
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

  handleRedirectFAQ = () => {
    this.router.navigate(['/faq']);
  };

  ngOnChanges(changes: SimpleChanges): void {
    this.refetch(
      changes['requestId'] ? changes['requestId'].currentValue : this.requestId,
      changes['projectName']
        ? changes['projectName'].currentValue
        : this.projectName,
    );
  }

  refetch(requestId: string, projectName: string, page: number | null = null) {
    const pipeline = 'pharmcat';
    this.diplotypeOriginalRows = [];
    this.variantOriginalRows = [];
    this.warningOriginalRows = [];
    this.diplotypeDataRows.next([]);
    this.variantDataRows.next([]);
    this.warningDataRows.next([]);
    this.ss.start();
    this.isLoading = true;

    this.cs
      .getClinicResults(requestId, projectName, null, page, null, pipeline)
      .pipe(catchError(() => of(null)))
      .subscribe((data) => {
        if (!data) {
          this.tstr.error('Failed to load data', 'Error');
        } else {
          if (data?.noResultsMessage) {
            const noResultsMessageType = data.noResultsMessageType || 'Warning';
            if (noResultsMessageType === 'Error') {
              this.tstr.error(data.noResultsMessage, noResultsMessageType);
            } else {
              this.tstr.warning(data.noResultsMessage, noResultsMessageType);
            }
          }
          this.results = data;
          if (this.results?.content) {
            this.updateTable(data);
          }
        }
        this.isLoading = false;
        this.ss.end();
      });
  }

  updateTable(result: PharmcatResult): void {
    this.results = result;
    this.resultsLength = result.pages[result.page];
    this.missingToRef = result.missingToRef;
    const resultJson = result.content ? JSON.parse(result.content) : {};

    const diplotypes = resultJson.diplotypes;
    this.diplotypeOriginalRows = diplotypes.map((diplotype: any) => {
      const diplotypeRow: any = {};
      Object.values(diplotype).forEach((v, i) => {
        diplotypeRow[this.diplotypeColumns[i + 1]] = v;
      });
      return diplotypeRow;
    });
    this.diplotypeHasRows = this.diplotypeOriginalRows.length > 0;

    const variants = resultJson.variants;
    this.variantOriginalRows = variants.map((variant: any) => {
      const variantRow: any = {};
      Object.values(variant).forEach((v, i) => {
        // Skip Status column index 0, start from index 1
        variantRow[this.variantColumns[i + 1]] = v;
      });
      return variantRow;
    });

    this.variantHasRows = this.variantOriginalRows.length > 0;

    const warnings = resultJson.messages;
    this.warningOriginalRows = warnings.map((warning: any) => {
      const messageRow: any = {};
      Object.values(warning).forEach((v, i) => {
        messageRow[this.warningColumns[i]] = v;
      });
      return messageRow;
    });

    this.warningDataRows.next(this.warningOriginalRows);
    this.setMasterData();
    this.setFilter();
    this.setFilterVariants();
  }

  checkIsMarked = (bObj: any) => {
    const isMarked = validationReportsObject(this.listReports, bObj);
    return isMarked;
  };

  openAdvancedFilter(type: FilterType) {
    const colomnFields =
      type === 'variants'
        ? PHARMGKB_FILTER_FIELDS_VARIANTS
        : PHARMGKB_FILTER_FIELDS_DIPLOTYPES;
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
        this.typeFilter = type;
        if (type === 'variants') {
          this.applyAdvancedFilterToVariants(result);
        } else {
          this.applyAdvancedFilterToDiplotypes(result);
        }
      });
  }

  private applyAdvancedFilterToDiplotypes(filter: any) {
    const filtered = this.diplotypeOriginalRows.filter((row) =>
      evaluateGroup(filter, row),
    );

    this.diplotypeDataRows.next(filtered);
  }

  private applyAdvancedFilterToVariants(filter: any) {
    const filtered = this.variantOriginalRows.filter((row) =>
      evaluateGroup(filter, row),
    );

    this.variantDataRows.next(filtered);
  }

  get summaryText(): string {
    return GetFilterSummaryText(this.group);
  }

  resetAdvanceFilter(type: 'variants' | 'diplotypes') {
    if (type === 'variants') {
      this.typeFilter = null;
      this.variantDataRows.next([...this.variantOriginalRows]);
    }

    if (type === 'diplotypes') {
      this.typeFilter = null;
      this.diplotypeDataRows.next([...this.diplotypeOriginalRows]);
    }
  }
}
