import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  FileSelectEvent,
  ProjectsListComponent,
} from './projects-list/projects-list.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { catchError, of } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ClinicService } from 'src/app/services/clinic.service';
import { environment } from 'src/environments/environment';
import { MatCardModule } from '@angular/material/card';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-submit-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    ProjectsListComponent,
    MatProgressSpinnerModule,
    MatCardModule,
  ],
  providers: [],
  templateUrl: './clinic-submit.component.html',
  styleUrl: './clinic-submit.component.scss',
})
export class ClinicSubmitComponent {
  @ViewChild('projects') private projects!: ProjectsListComponent;
  protected projectName: string | null = null;
  protected vcfFile: string | null = null;
  protected valid = false;
  protected submissionStarted = false;
  protected results = {
    RequestId: null,
    ProjectName: null,
  };

  constructor(
    private cs: ClinicService,
    private tstr: ToastrService,
  ) {}

  filesSelected(event: FileSelectEvent) {
    console.log(event);
    this.projectName = event.projectName;
    this.vcfFile = event.vcf;
    this.valid = true;
  }

  reset() {
    this.projects.list(0);
    this.submissionStarted = false;
    this.valid = false;
  }

  submit() {
    this.submissionStarted = true;

    if (this.vcfFile) {
      const s3URI = `s3://${environment.storage.dataPortalBucket}/projects/${this.projectName}/project-files/${this.vcfFile}`;

      this.cs
        .submitClinicJob(s3URI, this.projectName!)
        .pipe(
          catchError((e) => {
            const errorMessage =
              e.response?.data?.error?.errorMessage ||
              'Something went wrong when initaiting the job. Please try again later.';
            this.tstr.error(errorMessage, 'Error');
            this.submissionStarted = false;
            return of(null);
          }),
        )
        .subscribe((response: any) => {
          if (response) {
            this.tstr.success(
              'Displaying results takes time according to the size of your data. Once completed, we will send you a notification via email.',
              'Success',
            );
            this.reset();
            // im not delete cuz maybe used soon
            // this.results.RequestId = response.RequestId ?? null;
            // this.results.ProjectName = response.ProjectName ?? null;
            // this.reset();
          }
        });
    } else {
      this.tstr.warning('No file selected', 'Warning');
      this.submissionStarted = false;
    }
  }
}
