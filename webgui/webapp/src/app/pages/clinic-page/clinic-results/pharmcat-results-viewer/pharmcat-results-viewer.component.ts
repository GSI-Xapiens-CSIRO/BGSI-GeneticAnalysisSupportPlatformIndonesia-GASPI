import {
  ChangeDetectorRef,
  Component,
  Injectable,
  Input,
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
  map,
  Observable,
  of,
  Subject,
} from 'rxjs';
import { ClinicService } from 'src/app/services/clinic.service';
import {
  clinicFilter,
  clinicMultiFilter,
  clinicResort,
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
import { ToastrService } from 'ngx-toastr';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { COLUMNS } from '../hub_configs';
import { environment } from 'src/environments/environment';
import { RsponBoxDataViewComponent } from './rspon-box-data-view/rspon-box-data-view.component';
import { NoResultsAlertComponent } from '../no-results-alert/no-results-alert.component';

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
    MatCardModule,
    MatExpansionModule,
    MatIconModule,
    MatTooltipModule,
    MatAutocompleteModule,
    RsponBoxDataViewComponent,
    NoResultsAlertComponent,
  ],
  providers: [{ provide: MatPaginatorIntl, useClass: MyCustomPaginatorIntl }],
  templateUrl: './pharmcat-results-viewer.component.html',
  styleUrl: './pharmcat-results-viewer.component.scss',
})
export class PharmcatResultsViewerComponent {
  @Input({ required: true }) requestId!: string;
  @Input({ required: true }) projectName!: string;
  @ViewChild('paginator') paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  protected results: PharmcatResult | null = null;
  protected diplotypeColumns: string[] =
    COLUMNS[environment.hub_name].pharmcatCols.diplotypeCols;
  protected variantColumns: string[] =
    COLUMNS[environment.hub_name].pharmcatCols.variantCols;
  protected warningColumns: string[] =
    COLUMNS[environment.hub_name].pharmcatCols.warningCols;

  protected diplotypeOriginalRows: any[] = [];
  protected diplotypeHasRows: boolean = false;
  protected diplotypeDataRows = new BehaviorSubject<any[]>([]);
  protected diplotypeToVariantMap: Map<string, string[]> = new Map();
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
  protected isLoading: boolean = false;

  constructor(
    protected cs: ClinicService,
    private ss: SpinnerService,
    private tstr: ToastrService,
    private dg: MatDialog,
    private cdr: ChangeDetectorRef,
  ) {}

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

  resortDiplotypes(sort: Sort) {
    const snapshot = [...this.diplotypeDataRows.value];
    clinicResort(snapshot, sort, (sorted) =>
      this.diplotypeDataRows.next(sorted),
    );
  }

  resortVariants(sort: Sort) {
    const snapshot = [...this.variantDataRows.value];
    clinicResort(snapshot, sort, (sorted) => this.variantDataRows.next(sorted));
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
  }

  resetDiplotypes() {
    this.diplotypeFilterField.setValue('');
    this.filterDiplotypes();
    this.cdr.detectChanges();
  }

  resetRelatedDiplotype() {
    this.resetDiplotypes();
    this.diplotypeScopeReduced = false;
  }

  filterVariants() {
    const term: string = this.variantFilterField.value;
    clinicFilter(this.variantOriginalRows, term, (filtered) => {
      this.variantDataRows.next(filtered);
    });
  }

  resetVariants() {
    this.variantFilterField.setValue('');
    this.filterVariants();
    this.cdr.detectChanges();
  }

  filterRelatedVariants = (mappingIds: string[]) => {
    console.log('filterRelatedVariants', mappingIds);
    this.variantScopeReduced = true;
    this.variantFilterField.setValue('');
    const terms = mappingIds;
    clinicMultiFilter(this.variantOriginalRows, terms, (filtered) => {
      this.variantDataRows.next(filtered);
    });
    this.cdr.detectChanges();
  };

  resetRelatedVariants() {
    this.resetVariants();
    this.variantScopeReduced = false;
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
          this.results = data;
          this.updateTable(data);
        }
        this.isLoading = false;
        this.ss.end();
      });
  }

  updateTable(result: PharmcatResult): void {
    this.results = result;
    this.resultsLength = result.pages[result.page];
    this.missingToRef = result.missingToRef;
    const resultJson = JSON.parse(result.content);

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
        variantRow[this.variantColumns[i]] = v;
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

    this.diplotypeDataRows.next(this.diplotypeOriginalRows);
    this.variantDataRows.next(this.variantOriginalRows);
    this.warningDataRows.next(this.warningOriginalRows);
  }
}
