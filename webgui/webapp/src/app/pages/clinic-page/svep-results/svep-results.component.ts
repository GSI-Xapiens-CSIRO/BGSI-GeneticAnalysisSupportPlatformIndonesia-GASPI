import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, map, Observable, of, startWith, Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import {
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { ResultsViewerComponent } from './results-viewer/results-viewer.component';
import { MatCardModule } from '@angular/material/card';
import { DportalService } from 'src/app/services/dportal.service';
import { AnnotationViewerComponent } from './annotation-viewer/annotation-viewer.component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ListJobComponent } from './list-project-id/list-project-id.component';
import { MatIconModule } from '@angular/material/icon';

interface Project {
  name: string;
}

@Component({
  selector: 'app-results-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    FormsModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatInputModule,
    ResultsViewerComponent,
    AnnotationViewerComponent,
    MatCardModule,
    MatOptionModule,
    MatSelectModule,
    MatAutocompleteModule,
    ListJobComponent,
    MatIconModule,
  ],
  providers: [],
  templateUrl: './svep-results.component.html',
  styleUrl: './svep-results.component.scss',
})
export class SvepResultsComponent implements OnInit, OnDestroy {
  protected requestIdFormControl: FormControl<string>;
  protected projectNameFormControl: FormControl<string>;
  protected requestId: string | null = null;
  protected projectName: string | null = null;
  protected vcfFile: string | null = null;
  protected myProjects: Project[] = [];
  private paramSubscription: Subscription | null = null;
  filteredOptions: Observable<Project[]> | undefined;
  @ViewChild(ListJobComponent) svepIGVComponent!: ListJobComponent;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private dps: DportalService,
    private sb: MatSnackBar,
  ) {
    this.requestIdFormControl = this.fb.control('', {
      validators: [Validators.required],
      nonNullable: true,
    });
    this.projectNameFormControl = this.fb.control('', {
      validators: [Validators.required],
      nonNullable: true,
    });
  }

  ngOnDestroy() {
    if (this.paramSubscription) {
      this.paramSubscription.unsubscribe();
    }
  }

  loadListData() {
    if (this.projectName === this.projectNameFormControl.value) {
      this.svepIGVComponent.refresh();
    } else {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          projectName: this.projectNameFormControl.value,
        },
      });
    }
  }

  reset() {
    this.requestIdFormControl.setValue('');
    this.projectNameFormControl.setValue('');
    this.vcfFile = null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
    });
  }

  backToList() {
    this.requestIdFormControl.setValue('');
    this.projectNameFormControl.setValue('');
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        projectName: this.projectNameFormControl.value || this.projectName,
      },
    });
  }

  private _filter(value: string): Project[] {
    const filterValue = value.toLowerCase();

    return this.myProjects.filter((option: Project) =>
      option.name.toLowerCase().includes(filterValue),
    );
  }

  list() {
    this.dps
      .getMyProjects()
      .pipe(catchError(() => of(null)))
      .subscribe((projects: any) => {
        if (!projects?.data || !Array.isArray(projects.data)) {
          this.sb.open('Unable to get projects.', 'Close', { duration: 60000 });
        } else {
          this.myProjects = projects.data.map((p: Project) => ({
            ...p,
            expanded: false,
          }));
          this.filteredOptions = this.projectNameFormControl.valueChanges.pipe(
            startWith(''),
            map((value) => this._filter(value || '')),
          );
        }
      });
  }

  ngOnInit(): void {
    this.list();
    this.paramSubscription = this.route.queryParams.subscribe((params) => {
      this.requestId = params['jobId'] ?? null;
      this.projectName = params['projectName'] ?? null;
      this.vcfFile = params['vcf_file'] ?? null;
      this.requestIdFormControl.setValue(this.requestId ?? '');
      this.projectNameFormControl.setValue(this.projectName ?? '');
    });
  }
}
