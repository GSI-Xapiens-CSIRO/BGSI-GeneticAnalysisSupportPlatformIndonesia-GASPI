import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of, Subscription } from 'rxjs';
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
import { ClinicService } from 'src/app/services/clinic.service';

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
  protected myProjects: Project[] = [];
  private paramSubscription: Subscription | null = null;
  @ViewChild(ResultsViewerComponent) resultsViewer!: ResultsViewerComponent;
  @ViewChild(AnnotationViewerComponent)
  annotationViewer!: AnnotationViewerComponent;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private dps: DportalService,
    private sb: MatSnackBar,
    private cs: ClinicService,
  ) {
    this.requestIdFormControl = this.fb.control('', {
      validators: [Validators.required],
      nonNullable: true,
    });
    this.projectNameFormControl = this.fb.control('', {
      validators: [Validators.required],
      nonNullable: true,
    });
    this.cs.annotionsChanged.subscribe(() => {
      if (this.annotationViewer) {
        this.annotationViewer.refresh();
      }
    });
  }

  ngOnDestroy() {
    if (this.paramSubscription) {
      this.paramSubscription.unsubscribe();
    }
  }

  load() {
    if (
      this.requestId === this.requestIdFormControl.value &&
      this.projectName === this.projectNameFormControl.value
    ) {
      this.annotationViewer.refresh();
      this.resultsViewer.refetch(this.requestId, this.projectName);
    } else {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          jobId: this.requestIdFormControl.value,
          projectName: this.projectNameFormControl.value,
        },
      });
    }
  }
  reset() {
    this.requestIdFormControl.setValue('');
    this.projectNameFormControl.setValue('');
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
    });
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
        }
      });
  }

  ngOnInit(): void {
    this.list();
    this.paramSubscription = this.route.queryParams.subscribe((params) => {
      this.requestId = params['jobId'] ?? null;
      this.projectName = params['projectName'] ?? null;
      this.requestIdFormControl.setValue(this.requestId ?? '');
      this.projectNameFormControl.setValue(this.projectName ?? '');
    });
  }
}
