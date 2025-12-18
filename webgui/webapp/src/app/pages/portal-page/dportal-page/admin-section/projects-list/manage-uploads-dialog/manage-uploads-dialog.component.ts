import { Component, Inject, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ToastrService } from 'ngx-toastr';
import { catchError, filter, of, switchMap } from 'rxjs';
import { DportalService } from 'src/app/services/dportal.service';

type User = {
  firstName: string;
  lastName: string;
  email: string;
};

@Component({
  selector: 'app-manage-uploads-dialog',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatAutocompleteModule,
  ],
  templateUrl: './manage-uploads-dialog.component.html',
  styleUrl: './manage-uploads-dialog.component.scss',
})
export class ManageUploadsDialogComponent implements OnInit {
  project: string;
  newUploadForm: FormGroup;
  uploads: any[] = [];
  uploadsLoading = true;
  usersAutocomplete: User[] = [];
  uploadCmd: string | null = null;

  constructor(
    private dg: MatDialog,
    private dps: DportalService,
    private tstr: ToastrService,
    public dialogRef: MatDialogRef<ManageUploadsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { project: string },
  ) {
    this.project = data.project;
    this.newUploadForm = new FormGroup({
      fileName: new FormControl('', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(30),
        Validators.pattern('^[a-zA-Z0-9-_.]*$'),
      ]),
      maxMB: new FormControl(1024, [
        Validators.required,
        Validators.min(1),
        Validators.max(51200),
      ]),
      expirationMins: new FormControl(60, [
        Validators.required,
        Validators.min(5),
        Validators.max(1440),
      ]),
      email: new FormControl('', [
        Validators.required,
        Validators.email,
        Validators.maxLength(100),
      ]),
    });

    this.newUploadForm.controls['email'].valueChanges
      .pipe(
        filter((email) => !!email && email.length > 2),
        switchMap((email) => this.dps.adminSearchUsers(email!)),
        catchError(() => of([])),
      )
      .subscribe((users: User[]) => {
        this.usersAutocomplete = users;
      });
  }

  ngOnInit(): void {
    this.loadUploads();
  }

  loadUploads() {
    this.dps
      .adminGetUploaders(this.project)
      .pipe(
        catchError(() => {
          this.tstr.error('Could not fetch allowed uploaders', 'Error');
          return of(null);
        }),
      )
      .subscribe((result) => {
        this.uploadsLoading = false;
        this.uploads = result ? result.uploads : [];
      });
  }

  addNewUpload() {
    const formValue = this.newUploadForm.value;
    this.uploadCmd = null;
    this.dps
      .adminAddUploader(this.project, formValue.email, formValue)
      .pipe(
        catchError(() => {
          this.tstr.error('Could not create upload', 'Error');
          return of(null);
        }),
      )
      .subscribe((result) => {
        if (result && result.success) {
          this.uploadCmd = `gaspifs upload -p "${this.project}" -f "${formValue.fileName}"`;
        } else if (result && !result.success) {
          this.tstr.error(result.message || 'Could not create upload', 'Error');
        } else {
          this.tstr.error('Could not create upload', 'Error');
        }
        this.loadUploads();
      });
  }

  async removeUpload(email: string, uploadId: string) {
    const { ActionConfirmationDialogComponent } = await import(
      'src/app/components/action-confirmation-dialog/action-confirmation-dialog.component'
    );

    const dialog = this.dg.open(ActionConfirmationDialogComponent, {
      data: {
        title: 'Remove Upload Permission',
        message: `Are you sure you want to remove upload permission for ${email}?`,
      },
    });
    dialog.afterClosed().subscribe((result) => {
      if (result) {
        this.dps
          .adminRemoveUploader(this.project, email, uploadId)
          .pipe(
            catchError(() => {
              this.tstr.error('Could not remove upload', 'Error');
              return of(null);
            }),
          )
          .subscribe((result) => {
            if (result && result.success) {
              this.tstr.success('Upload permission removed', 'Success');
              this.loadUploads();
            } else if (result && !result.success) {
              this.tstr.error(
                result.message || 'Could not remove upload',
                'Error',
              );
            } else {
              this.tstr.error('Could not remove upload', 'Error');
            }
          });
      }
    });
  }

  async copyToClipboard() {
    // await navigator.clipboard.writeText(this.uploadCode);
  }
}
