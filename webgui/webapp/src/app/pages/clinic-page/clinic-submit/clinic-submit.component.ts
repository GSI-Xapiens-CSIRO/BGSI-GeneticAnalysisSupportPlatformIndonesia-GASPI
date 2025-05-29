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
import { QcReportComponent } from './qc-report/qc-report.component';
import { MatIconModule } from '@angular/material/icon';

export interface SelectedProjectType {
  projectName: string | null;
  fileName: string | null;
}
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
    QcReportComponent,
    MatProgressSpinnerModule,
    MatCardModule,
    MatIconModule,
  ],
  providers: [],
  templateUrl: './clinic-submit.component.html',
  styleUrl: './clinic-submit.component.scss',
})
export class ClinicSubmitComponent {
  @ViewChild('projects') private projects!: ProjectsListComponent;
  protected projectName: string | null = null;
  protected vcfFile: string | null = null;
  protected clinicMode =
    environment.clinic_mode === 'svep' ? 'sVEP' : 'PGxFlow';
  protected valid = false;
  protected submissionStarted = false;
  protected results = {
    RequestId: null,
    ProjectName: null,
  };

  protected selectedProject: SelectedProjectType | null = null;

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

  handleSelectProject(updatedProject: SelectedProjectType): void {
    this.selectedProject = updatedProject; // Update parent's variable with the child data
  }

  backToList() {
    this.selectedProject = null;
  }
}
