import { Component, Inject, ViewChild } from '@angular/core';
import { Project } from '../projects-list.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FileDropperComponent } from '../../../file-dropper/file-dropper.component';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DportalService } from 'src/app/services/dportal.service';
import { DecimalPipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { catchError, defaultIfEmpty, forkJoin, map, of, switchMap } from 'rxjs';
import { Storage } from 'aws-amplify';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-project-updates',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    FileDropperComponent,
    DecimalPipe,
    MatFormFieldModule,
    FormsModule,
    MatInputModule,
    MatTooltipModule,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatPaginatorModule,
  ],
  templateUrl: './project-update-dialog.component.html',
  styleUrl: './project-update-dialog.component.scss',
})
export class ProjectUpdateDialogComponent {
  @ViewChild(FileDropperComponent) fileDroppper!: FileDropperComponent;
  project: Project;
  dataSubmissionForm!: FormGroup;
  totalSize = 0;
  progress = 0;
  fileProgress = new Map<string, number>();
  addedFiles: File[] = [];
  removedFiles: string[] = [];

  constructor(
    private fb: FormBuilder,
    private dps: DportalService,
    private tstr: ToastrService,
    private dg: MatDialog,
    private auth: AuthService,
    public dialogRef: MatDialogRef<ProjectUpdateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { project: Project },
  ) {
    this.project = data.project;
    this.dataSubmissionForm = this.fb.group({
      projectDescription: this.fb.control(this.project.description, [
        Validators.required,
        Validators.maxLength(5000),
      ]),
    });

    console.log(this.project.files);
  }

  removeFile(file: string) {
    if (!this.removedFiles.includes(file)) {
      this.removedFiles.push(file);
    }
  }

  async unIngest(projectName: string, datasetId: string) {
    const { ActionConfirmationDialogComponent } = await import(
      'src/app/components/action-confirmation-dialog/action-confirmation-dialog.component'
    );

    const dialog = this.dg.open(ActionConfirmationDialogComponent, {
      data: {
        title: 'Un-ingest Dataset',
        message: 'Are you sure you want to un-ingest this dataset?',
      },
    });
    dialog.afterClosed().subscribe((result) => {
      if (result) {
        this.dps
          .adminUnIngestFromBeacon(projectName, datasetId)
          .pipe(catchError(() => of(null)))
          .subscribe((res: any) => {
            if (!res) {
              this.tstr.error('Unable to delete project.', 'Error');
            } else {
              this.project.ingestedDatasets =
                this.project.ingestedDatasets.filter(
                  (dataset) => dataset !== datasetId,
                );
              this.tstr.success(
                'Dataset un-ingested. Please re-index when you have un-ingested all desired datasets.',
                'Success',
              );
            }
          });
      }
    });
  }

  removeFileFromForm(index: number) {
    this.addedFiles.splice(index, 1);
  }

  undoRemoveFile(index: number) {
    this.removedFiles.splice(index, 1);
  }

  submitDisabled(entry: any) {
    if (this.dataSubmissionForm.invalid || this.dataSubmissionForm.disabled) {
      return true;
    }

    if (
      this.addedFiles.length === 0 &&
      this.removedFiles.length === 0 &&
      entry.projectDescription === this.project.description
    ) {
      return true;
    }

    return false;
  }

  patchFiles(files: FileList) {
    if (files.length + this.addedFiles.length > 50) {
      this.tstr.error('No more than 50 files allowed per upload!', 'Error');
      return;
    }

    const newFiles = Array.from(files).filter((file) => {
      if (
        this.addedFiles.some((addedFile) => addedFile.name === file.name) ||
        this.project.files.some((existingFile) => existingFile === file.name)
      ) {
        this.tstr.error(`File with name ${file.name} already exists!`, 'Error');
        return false;
      }
      return true;
    });

    const totalFutureFiles =
      this.addedFiles.length +
      newFiles.length +
      this.project.files.length -
      this.removedFiles.length;

    if (totalFutureFiles > 5000) {
      this.tstr.error('No more than 5000 files allowed per project!', 'Error');
      return;
    }

    this.addedFiles = [...this.addedFiles, ...newFiles];
  }

  reset() {
    console.log('reset');
    this.dataSubmissionForm.reset({
      projectDescription: this.project.description,
    });
    this.dataSubmissionForm.enable();
    this.progress = 0;
    this.totalSize = 0;
    this.fileProgress.clear();
    this.addedFiles = [];
    this.removedFiles = [];
  }

  async uploadFile(path: string, file: File): Promise<string> {
    this.fileProgress.set(file.name, 0);
    try {
      const user = this.auth.user.getValue();
      await Storage.put(
        `staging/projects/${path}/project-files/${file.name}`,
        file,
        {
          customPrefix: { public: '' },
          metadata: {
            usersub: user.attributes.sub,
            username: user.attributes.email,
          },
          progressCallback: (progress: { loaded: number; total: number }) => {
            this.fileProgress.set(file.name, progress.loaded);
            this.progress = Array.from(this.fileProgress.values()).reduce(
              (acc, val) => acc + val,
              0,
            );
          },
        },
      );
    } catch (error) {
      console.error('Error uploading file', error);
      throw error;
    }
    return `projects/${path}/project-files/${file.name}`;
  }

  async onSubmit(entry: any) {
    this.dataSubmissionForm.disable();
    this.progress = 0;
    this.totalSize = this.addedFiles.reduce((acc, file) => acc + file.size, 0);
    const files = [
      ...this.addedFiles.map((file) => file.name),
      ...this.project.files.filter((file) => !this.removedFiles.includes(file)),
    ];
    this.dps
      .adminUpdateProject(this.project.name, entry.projectDescription, files)
      .pipe(
        catchError(() => of(null)),
        switchMap((res: any) => {
          if (res) {
            return forkJoin(
              this.addedFiles.map((file) =>
                this.uploadFile(this.project.name, file),
              ),
            ).pipe(
              defaultIfEmpty(res),
              catchError(() => of(null)),
              map(() => of(res)),
            );
          }
          return of(null);
        }),
      )
      .subscribe((res: any) => {
        if (!res) {
          this.tstr.error('Project update failed', 'Error');
        } else {
          this.tstr.success('Project updated', 'Success');
          this.project.description = entry.projectDescription;
          this.project.files = files;
        }
        this.reset();
      });
  }
}
