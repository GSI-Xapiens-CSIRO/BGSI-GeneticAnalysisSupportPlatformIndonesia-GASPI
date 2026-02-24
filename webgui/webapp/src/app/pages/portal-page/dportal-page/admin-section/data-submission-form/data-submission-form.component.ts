import { Component, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DportalService } from '../../../../../services/dportal.service';
import { catchError, of, switchMap, map, defaultIfEmpty } from 'rxjs';
import { FileDropperComponent } from '../../file-dropper/file-dropper.component';
import { Storage } from 'aws-amplify';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { DecimalPipe } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { HasPermissionDirective } from 'src/app/directives/has-permission.directive';

@Component({
  selector: 'app-data-submission-form',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FileDropperComponent,
    MatProgressSpinnerModule,
    MatIconModule,
    DecimalPipe,
    HasPermissionDirective,
  ],
  templateUrl: './data-submission-form.component.html',
  styleUrl: './data-submission-form.component.scss',
})
export class DataSubmissionFormComponent {
  @ViewChild(FileDropperComponent) fileDroppper!: FileDropperComponent;
  dataSubmissionForm: FormGroup;
  totalSize = 0;
  progress = 0;
  fileProgress = new Map<string, number>();
  files: File[] = [];

  constructor(
    private fb: FormBuilder,
    private dps: DportalService,
    private tstr: ToastrService,
    private auth: AuthService,
  ) {
    this.dataSubmissionForm = this.fb.group({
      projectName: fb.control('', [
        Validators.required,
        Validators.pattern(/^[^\s][A-Za-z0-9\s_-]*[^\s]$/),
        Validators.minLength(6),
        Validators.maxLength(64),
      ]),
      projectDescription: fb.control('', [
        Validators.required,
        Validators.maxLength(5000),
      ]),
    });
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
    return file.name;
  }

  async onSubmit(entry: any) {
    this.dataSubmissionForm.disable();
    const projectName = entry.projectName;
    const projectDescription = entry.projectDescription;
    this.progress = 0;
    this.totalSize = this.files.reduce((acc, file) => acc + file.size, 0);
    this.dps
      .adminCreateProject(projectName, projectDescription)
      .pipe(
        catchError(() => {
          console.error('Error creating project');
          return of(null);
        }),
        switchMap((res: any) => {
          if (res) {
            return forkJoin(
              this.files.map((file) => this.uploadFile(projectName, file)),
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
        console.log('sub', res);
        if (res) {
          this.tstr.success('Project created', 'Success');
          this.reset();
        } else {
          this.tstr.error('Project creation failed', 'Error');
        }
        this.dataSubmissionForm.enable();
      });
  }

  patchFiles(files: FileList) {
    if (files.length + this.files.length > 50) {
      this.tstr.error(
        'No more than 50 files allowed per upload!. You may add more files later, upto 50 at a time.',
        'Error',
      );
      return;
    }

    const newFiles = Array.from(files).filter((file) => {
      if (this.files.some((addedFile) => addedFile.name === file.name)) {
        this.tstr.error(`File with name ${file.name} already exists!`, 'Error');
        return false;
      }
      return true;
    });

    this.files = [...this.files, ...newFiles];
  }

  reset() {
    this.dataSubmissionForm.reset();
    this.dataSubmissionForm.enable();
    this.progress = 0;
    this.totalSize = 0;
    this.files = [];
  }

  removeFile(index: number) {
    this.files.splice(index, 1);
  }
}
