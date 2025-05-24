import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { catchError, of } from 'rxjs';
import { FilterService } from 'src/app/services/filter.service';
import { DportalService } from 'src/app/services/dportal.service';
import { ScopeTypes } from 'src/app/utils/interfaces';
import { environment } from 'src/environments/environment';
import * as _ from 'lodash';
import { FiltersResultViewerComponent } from '../filters-result-viewer/filters-result-viewer.component';
import { TermFreqViewerComponent } from '../term-freq-viewer/term-freq-viewer.component';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { RouterLink } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { SpinnerService } from 'src/app/services/spinner.service';
import { ToastrService } from 'ngx-toastr';
// import { result, testTerms } from './test_responses/filters';

interface Project {
  name: string;
  ingested_datasets: string[];
}

@Component({
  selector: 'app-filters-tab',
  standalone: true,
  imports: [
    MatCardModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatInputModule,
    RouterLink,
    MatCheckboxModule,
    MatButtonModule,
    TermFreqViewerComponent,
    FiltersResultViewerComponent,
  ],
  providers: [FilterService, DportalService],
  templateUrl: './filters-tab.component.html',
  styleUrl: './filters-tab.component.scss',
})
export class FiltersTabComponent {
  protected _ = _;
  protected form: FormGroup;
  protected myProjects: Project[] = [];
  protected query: any = null;
  protected endpoint: any = null;
  protected results: any = null;
  protected scopeTypes = ScopeTypes;
  protected activeScope: string | null = null;
  protected terms: any[] = [];
  protected projects: any[] = [];

  constructor(
    private fb: FormBuilder,
    private fs: FilterService,
    private dps: DportalService,
    private dg: MatDialog,
    private tstr: ToastrService,
    private ss: SpinnerService,
  ) {
    this.form = fb.group({
      projects: [[], Validators.required],
      scope: this.fb.control(ScopeTypes.INDIVIDUALS, [Validators.required]),
      id: this.fb.control({ value: '', disabled: true }, [Validators.required]),
      skip: this.fb.control(0, [Validators.required, Validators.min(0)]),
      limit: this.fb.control(100, [
        Validators.required,
        Validators.min(1),
        Validators.max(5000),
      ]),
      search: this.fb.control('', [Validators.pattern(/^\S.*\S$/)]),
      stats: this.fb.control(false),
    });

    this.form.controls['scope'].valueChanges.subscribe((scope) => {
      if (scope === ScopeTypes.DATASETS) {
        this.form.controls['id'].enable();
        this.form.controls['id'].markAsTouched();
        this.form.controls['stats'].setValue(false);
        this.form.controls['stats'].disable();
      } else {
        this.form.controls['stats'].enable();
        this.form.controls['id'].disable();
      }
    });
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

  run() {
    this.ss.start();
    const form = this.form.value;
    const projects = form.projects.join(',');
    const query: any = {
      skip: form.skip,
      limit: form.limit,
      projects: projects,
      search: form.search,
    };

    let result$;
    let endpoint: any;

    if (form.scope === ScopeTypes.DATASETS) {
      result$ = this.fs.fetch_by_scope_and_id(form.scope, form.id, query);
      endpoint = `${environment.api_endpoint_sbeacon.endpoint}${form.scope}/${form.id}/filtering_terms`;
    } else {
      result$ = this.fs.fetch_by_scope(form.scope, query);
      endpoint = `${environment.api_endpoint_sbeacon.endpoint}${form.scope}/filtering_terms`;
    }

    result$.pipe(catchError((err) => of(null))).subscribe((data) => {
      if (data) {
        this.results = data;
        this.endpoint = endpoint;
        this.terms = form.stats
          ? _.map(_.get(data, 'response.filteringTerms'), (term) => ({
              id: term.id,
              label: term.label,
            }))
          : [];
        this.activeScope = form.stats ? form.scope : null;
        this.projects = form.projects;
      } else {
        if (!data) {
          this.tstr.error('API request failed', 'Error');
          this.ss.end();
          return;
        }
      }
      this.ss.end();
      this.query = query;
    });
  }

  reset() {
    this.form.get('projects')!.setValue([]);
    this.results = null;
    this.query = null;
    this.endpoint = null;
    this.terms = [];
    this.projects = [];
    this.activeScope = null;
    this.form.patchValue({
      scope: ScopeTypes.INDIVIDUALS,
      skip: 0,
      limit: 100,
      search: '',
    });
  }

  async searchIds() {
    const scope = this.form.value.scope;
    const projects = this.form.value.projects;
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
