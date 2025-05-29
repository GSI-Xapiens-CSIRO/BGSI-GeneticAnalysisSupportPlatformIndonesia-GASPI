import {
  AfterViewInit,
  Component,
  Input,
  OnDestroy,
  OnInit,
  SecurityContext,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { examples } from './examples';
import { QueryService } from 'src/app/services/query.service';
import { DportalService } from 'src/app/services/dportal.service';
import {
  parseFilters,
  parseRequestParameters,
  serializeFilters,
  serializeRequestParameters,
} from 'src/app/utils/parsers';
import { MatDialog } from '@angular/material/dialog';
import { FilterTypes, ScopeTypes } from 'src/app/utils/interfaces';
import { catchError, of, Subscription } from 'rxjs';
import _ from 'lodash';
import { QueryResultViewerContainerComponent } from '../query-result-viewer-container/query-result-viewer-container.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCardModule } from '@angular/material/card';
import { SpinnerService } from 'src/app/services/spinner.service';
import { FilterEditorComponent } from 'src/app/components/filter-editor/filter-editor.component';
import { VariantEditorComponent } from 'src/app/components/variant-editor/variant-editor.component';
import {
  baseRangeValidator,
  acgtNValidator,
  twoRangesValidator,
} from 'src/app/utils/validators';
import { customQueries } from './custom-queries';
import { UserQuotaService } from 'src/app/services/userquota.service';
import { DomSanitizer } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
// import { result, query, endpoint } from './test_responses/individuals';
// import { result, query } from './test_responses/biosamples';

interface Project {
  name: string;
  ingested_datasets: string[];
}

const allowedReturns = {
  individuals: {
    biosamples: true,
    g_variants: true,
  },
  biosamples: {
    runs: true,
    analyses: true,
    g_variants: true,
  },
  runs: {
    analyses: true,
    g_variants: true,
  },
  analyses: {
    g_variants: true,
  },
  g_variants: {
    individuals: true,
    biosamples: true,
  },
  datasets: {
    individuals: true,
    biosamples: true,
    g_variants: true,
  },
};

@Component({
  selector: 'app-query-tab',
  templateUrl: './query-tab.component.html',
  styleUrl: './query-tab.component.scss',
  providers: [QueryService, DportalService],
  standalone: true,
  imports: [
    MatCardModule,
    MatExpansionModule,
    MatButtonModule,
    RouterLink,
    MatIconModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatInputModule,
    MatCheckboxModule,
    MatTooltipModule,
    QueryResultViewerContainerComponent,
    FilterEditorComponent,
    VariantEditorComponent,
  ],
})
export class QueryTabComponent implements OnInit, AfterViewInit, OnDestroy {
  protected _ = _;
  protected allowedReturns: any = allowedReturns;
  protected loading = false;
  protected form: FormGroup;
  protected examples: any[] = examples;
  protected myProjects: Project[] = [];
  protected scopeTypes = ScopeTypes;
  protected filterTypes = FilterTypes;
  // TODO bug fix for https://github.com/angular/components/issues/13870
  protected disableAnimation = true;
  // displayed results and related data tied with results
  protected results: any = null;
  protected endpoint: any = null;
  protected query: any = null;
  protected projects: any = null;
  // protected results: any = result;
  // protected endpoint: any = endpoint;
  // protected query: any = query;
  protected scope: any = ScopeTypes.INDIVIDUALS;
  // expansion panels
  protected openPanels: boolean[] = [false, false, false];
  // custom queries
  protected customQuery = false;
  protected customQueries: any[] = customQueries;
  // saved queries
  protected savedQueries: any[] = [];
  @Input()
  page!: number;
  private subscription: Subscription | null = null;

  // user quota
  protected userSub: string = '';
  protected quotaQueryCount: number = 0;
  protected usageCount: number = 0;

  constructor(
    private fb: FormBuilder,
    private qs: QueryService,
    private dps: DportalService,
    public dg: MatDialog,
    private tstr: ToastrService,
    private ss: SpinnerService,
    private sanitizer: DomSanitizer,
  ) {
    this.form = this.fb.group({
      projects: [[], Validators.required],
      scope: this.fb.control(ScopeTypes.INDIVIDUALS, [Validators.required]),
      granularity: this.fb.control('count', Validators.required),
      skip: this.fb.control({ value: 0, disabled: true }, [
        Validators.required,
        Validators.min(0),
      ]),
      limit: this.fb.control({ value: 100, disabled: true }, [
        Validators.required,
        Validators.min(1),
        Validators.max(500),
      ]),
      filters: this.fb.array([], []),
      // custom return entries
      customReturn: this.fb.control(false),
      return: this.fb.control({ value: '', disabled: true }, [
        Validators.required,
      ]),
      id: this.fb.control({ value: '', disabled: true }, [Validators.required]),
      // request parameters
      requestParameters: this.fb.group(
        {
          assemblyId: this.fb.control('GRCH38', Validators.required),
          start: this.fb.control('', [
            Validators.required,
            baseRangeValidator(),
          ]),
          end: this.fb.control('', [Validators.required, baseRangeValidator()]),
          referenceName: this.fb.control('1', Validators.required),
          referenceBases: this.fb.control('N', [
            Validators.required,
            acgtNValidator(),
          ]),
          alternateBases: this.fb.control('N', [
            Validators.required,
            acgtNValidator(),
          ]),
        },
        { validators: twoRangesValidator() },
      ),
    });
    this.form.controls['requestParameters'].disable();
    this.form.controls['customReturn'].valueChanges.subscribe(
      (customReturn) => {
        if (customReturn) {
          this.form.controls['return'].enable();
          this.form.controls['id'].enable();
          this.form.markAllAsTouched();
        } else {
          this.form.controls['return'].disable();
          this.form.controls['id'].disable();
        }
      },
    );
    this.form.controls['granularity'].valueChanges.subscribe((granularity) => {
      if (granularity === 'record') {
        this.form.controls['skip'].enable();
        this.form.controls['limit'].enable();
      } else {
        this.form.controls['skip'].disable();
        this.form.controls['limit'].disable();
      }
    });
    this.form.controls['scope'].valueChanges.subscribe((scope) => {
      if (
        scope === ScopeTypes.GENOMIC_VARIANTS &&
        this.form.value.customReturn
      ) {
        this.form.controls['requestParameters'].disable();
      } else if (scope === ScopeTypes.GENOMIC_VARIANTS) {
        this.form.controls['requestParameters'].enable();
      } else {
        this.form.controls['requestParameters'].disable();
      }
    });
    this.form.controls['return'].valueChanges.subscribe((returnScope) => {
      if (returnScope === ScopeTypes.GENOMIC_VARIANTS) {
        this.form.controls['requestParameters'].enable();
      } else {
        this.form.controls['requestParameters'].disable();
      }
    });
    this.form.controls['customReturn'].valueChanges.subscribe((custom) => {
      if (this.form.value.scope === ScopeTypes.GENOMIC_VARIANTS && custom) {
        this.form.controls['requestParameters'].disable();
      } else if (this.form.value.scope === ScopeTypes.GENOMIC_VARIANTS) {
        this.form.controls['requestParameters'].enable();
      }
    });

    this.savedQueries = JSON.parse(
      localStorage.getItem('savedQueries') || '[]',
    );

    this.dps
      .getMySavedQueries()
      .pipe(catchError(() => of(null)))
      .subscribe((queries: any) => {
        if (queries === null) {
          this.tstr.error('Unable to get saved queries.', 'Error');
        } else {
          this.savedQueries = queries;
        }
      });
  }

  getSafeHtml(html: string) {
    return this.sanitizer.sanitize(SecurityContext.HTML, html);
  }

  openPanel(index: number) {
    this.openPanels = this.openPanels.map((o, i) =>
      index === i ? true : false,
    );
  }

  ngOnInit(): void {
    this.list();
  }

  list() {
    this.dps
      .getMyProjects()
      .pipe(catchError(() => of(null)))
      .subscribe((projects: any) => {
        if (!projects.data || !Array.isArray(projects.data)) {
          this.tstr.error('Unable to get projects.', 'Error');
        } else {
          this.myProjects = projects.data
            .filter((p: Project) => p.ingested_datasets.length > 0)
            .map((p: Project) => ({
              ...p,
              expanded: false,
            }));
        }
      });
  }

  ngAfterViewInit(): void {
    // TODO bug fix for https://github.com/angular/components/issues/13870
    setTimeout(() => (this.disableAnimation = false));
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }

  closePanel(index: number) {
    this.openPanels[index] = false;
  }

  async run() {
    this.ss.start();

    const form: any = this.form.value;
    const query = {
      projects: form.projects,
      query: {
        filters: serializeFilters(form.filters, form.scope),
        requestedGranularity: form.granularity,
        pagination: {
          skip: form.skip,
          limit: form.limit,
        },
      },
      meta: {
        apiVersion: 'v2.0',
      },
    };
    if (
      (form.scope === ScopeTypes.GENOMIC_VARIANTS && !form.customReturn) ||
      form.return === ScopeTypes.GENOMIC_VARIANTS
    ) {
      _.set(
        query,
        'query.requestParameters',
        serializeRequestParameters(form.requestParameters),
      );
    }
    let result$;
    let endpoint: any;
    if (form.customReturn) {
      endpoint = `${form.scope}/${form.id}/${form.return}`;
      result$ = this.qs.fetch_custom(
        `${form.scope}/${form.id}/${form.return}`,
        query,
      );
    } else {
      result$ = this.qs.fetch(form.scope, query);
      endpoint = `${form.scope}/`;
    }
    result$
      .pipe(
        catchError((err: any) => {
          if (err?.code === 'ERR_NETWORK') {
            this.tstr.error(
              'API request failed. Please check your network connectivity.',
              'Error',
            );
          } else if (
            err?.response?.status === 403 &&
            err?.response?.data?.code === 'QUOTA_EXCEEDED'
          ) {
            this.tstr.error(
              'Cannot run Query because Quota Limit reached. Please contact administrator to increase your quota.',
              'Error',
            );
          } else {
            this.tstr.error(
              'API request failed. Please check your parameters.',
              'Error',
            );
          }
          return of(null);
        }),
      )
      .subscribe((data) => {
        if (data) {
          this.results = data;
          this.endpoint = endpoint;
          this.scope = form.customReturn ? form.return : form.scope;
          this.projects = form.projects;
        }
        this.query = query;

        this.ss.end();
      });
  }

  async makeCohort() {
    const { CohortJobIdDialogComponent } = await import(
      './cohort-job-id-dialog/cohort-job-id-dialog.component'
    );

    const dialog = this.dg.open(CohortJobIdDialogComponent, {
      data: {},
    });

    dialog.afterClosed().subscribe((jobId) => {
      if (!jobId) {
        return;
      }
      const form: any = this.form.value;
      const query = {
        jobId: jobId,
        projects: form.projects,
        scope: form.scope,
        query: {
          filters: serializeFilters(form.filters, form.scope),
          requestedGranularity: form.granularity,
        },
        meta: {
          apiVersion: 'v2.0',
        },
      };
      if (form.scope === ScopeTypes.GENOMIC_VARIANTS) {
        _.set(
          query,
          'query.requestParameters',
          serializeRequestParameters(form.requestParameters),
        );
      }
      this.ss.start();
      this.dps
        .generateCohort(query)
        .pipe(catchError(() => of(null)))
        .subscribe((data) => {
          if (data) {
            this.tstr.success(
              'Cohort job created successfully. Please check the status in My Data section.',
              'Success',
            );
          } else {
            this.tstr.error('Unable to create cohort job.', 'Error');
          }
          this.ss.end();
        });
    });
  }

  addFilter(filters: FormArray) {
    const group = this.fb.group({
      id: this.fb.control('', [Validators.required]),
      operator: this.fb.control({ value: '=', disabled: true }),
      includeDescendantTerms: this.fb.control(true, Validators.required),
      scope: this.fb.control(ScopeTypes.INDIVIDUALS),
      type: this.fb.control(FilterTypes.ONTOLOGY),
      value: this.fb.control({ value: '', disabled: true }, [
        Validators.required,
      ]),
    });
    group.controls['type'].valueChanges.subscribe((filter) => {
      if (filter !== FilterTypes.ALPHANUMERIC) {
        group.controls['value'].disable();
        group.controls['operator'].disable();
      } else {
        group.controls['value'].enable();
        group.controls['operator'].enable();
      }
      if (filter !== FilterTypes.ONTOLOGY) {
        group.controls['includeDescendantTerms'].disable();
      } else {
        group.controls['includeDescendantTerms'].enable();
      }
    });
    group.markAllAsTouched();
    filters.push(group);
  }

  removeFilter(index: number) {
    (this.form.get('filters') as FormArray).removeAt(index);
  }

  reset() {
    this.customQuery = false;
    this.form.reset();

    this.form.get('projects')!.setValue([]);
    (this.form.get('filters') as FormArray).clear();

    this.form.patchValue({
      scope: ScopeTypes.INDIVIDUALS,
      granularity: 'count',
      skip: 0,
      limit: 100,
      filters: [],
      requestParameters: {
        assemblyId: 'GRCH38',
        start: '',
        end: '',
        referenceName: '1',
        referenceBases: 'N',
        alternateBases: 'N',
      },
      customReturn: false,
      id: '',
      return: ScopeTypes.INDIVIDUALS,
    });
    this.results = null;
    this.query = null;
    this.endpoint = null;
    this.scope = null;
  }

  runCustomQuery(query: any) {
    query.func(this);
  }

  loadQuery(entry: any) {
    const query = entry.query;
    this.reset();
    (this.form.get('filters') as FormArray).clear();
    _.range(query.body.query.filters.length).forEach(() => {
      this.addFilter(this.form.get('filters') as FormArray);
    });

    this.form.patchValue({
      projects: query.projects,
      scope: query.scope,
      granularity: query.body.query.requestedGranularity,
      id: query.id,
      return: query.return,
      customReturn: query.customReturn,
      skip: query.body.query.pagination.skip,
      limit: query.body.query.pagination.limit,
      filters: parseFilters(query.body.query.filters, query.scope),
    });

    if (query.scope === ScopeTypes.GENOMIC_VARIANTS && !query.customReturn) {
      this.form.patchValue({
        requestParameters: parseRequestParameters(
          query.body.query.requestParameters,
        ),
      });
    }
  }

  async saveQuery() {
    const { SaveQueryDialogComponent } = await import(
      'src/app/pages/portal-page/query-page/components/save-query-dialog/save-query-dialog.component'
    );
    const dialog = this.dg.open(SaveQueryDialogComponent, {
      data: {},
    });

    dialog
      .afterClosed()
      .subscribe((details: { name: string; description: string } | null) => {
        if (!details) {
          return;
        }
        const saved = JSON.parse(localStorage.getItem('savedQueries') || '[]');
        const form: any = this.form.value;
        const entry = {
          projects: form.projects,
          scope: form.scope,
          return: form.return,
          id: form.id,
          customReturn: form.customReturn,
          body: {
            query: {
              filters: serializeFilters(form.filters, form.scope),
              requestedGranularity: form.granularity,
              pagination: {
                skip: form.skip,
                limit: form.limit,
              },
            },
            meta: {
              apiVersion: 'v2.0',
            },
          },
        };
        if (form.scope === ScopeTypes.GENOMIC_VARIANTS && !form.customReturn) {
          _.set(
            entry,
            'body.query.requestParameters',
            serializeRequestParameters(form.requestParameters),
          );
        }
        this.dps
          .saveMyQuery(details.name, details.description, entry)
          .pipe(catchError(() => of(null)))
          .subscribe((res) => {
            if (!res) {
              this.tstr.error('Unable to save query.', 'Error');
            } else {
              this.savedQueries.push({
                name: details.name,
                description: details.description,
                query: entry,
              });
            }
          });
      });
  }

  async deleteSavedQuery(index: number) {
    const { ActionConfirmationDialogComponent } = await import(
      'src/app/components/action-confirmation-dialog/action-confirmation-dialog.component'
    );
    const dialog = this.dg.open(ActionConfirmationDialogComponent, {
      data: {
        title: 'Delete Saved Query',
        message: 'Are you sure you want to delete this saved query?',
      },
    });

    dialog.afterClosed().subscribe((yes) => {
      if (yes) {
        this.dps
          .deleteMyQuery(this.savedQueries[index].name)
          .pipe(catchError(() => of(null)))
          .subscribe((res) => {
            if (res) {
              this.savedQueries = this.savedQueries.filter(
                (_, index) => index !== index,
              );
            } else {
              this.tstr.error('Unable to delete query.', 'Error');
            }
          });
      }
    });
  }

  async searchFilters(filter: FormGroup, index: number) {
    const scope = filter.get('scope')!.value;
    const type = filter.get('type')!.value;
    const projects = this.form.value.projects;
    const { FilterSelectionDialogComponent } = await import(
      'src/app/components/filter-selection-dialog/filter-selection-dialog.component'
    );
    const dialog = this.dg.open(FilterSelectionDialogComponent, {
      data: { scope, type, projects },
    });

    dialog.afterClosed().subscribe((filters) => {
      if (!_.isEmpty(filters)) {
        (this.form.get('filters') as FormArray).removeAt(index);
        const original = (this.form.get('filters') as FormArray).value;
        const parsed = parseFilters(filters, scope);
        original.splice(index, 0, ...parsed);
        const combined = original;

        (this.form.get('filters') as FormArray).clear();
        _.range(combined.length).forEach(() => {
          this.addFilter(this.form.get('filters') as FormArray);
        });

        this.form.patchValue({
          filters: parseFilters(combined, scope),
        });
      }
    });
  }

  async searchEntries() {
    const scope = this.form.value.scope;
    const projects = this.form.value.projects;

    if (scope === ScopeTypes.GENOMIC_VARIANTS) {
      alert(
        'This is not implemented yet! Requires special iterator for variants, probably a new dialog box',
      );
      return;
    }
    const { EntryIdSelectionDialogComponent } = await import(
      'src/app/components/entry-id-selection-dialog/entry-id-selection-dialog.component'
    );
    const dialog = this.dg.open(EntryIdSelectionDialogComponent, {
      data: { scope, projects },
    });

    dialog.afterClosed().subscribe((entry) => {
      if (entry) {
        this.form.patchValue({
          id: entry,
        });
      }
    });
  }
}
