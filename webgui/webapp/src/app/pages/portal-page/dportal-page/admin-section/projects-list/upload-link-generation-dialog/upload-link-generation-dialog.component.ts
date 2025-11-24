import { Component, Inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import AWS from 'aws-sdk';
import { AuthService } from 'src/app/services/auth.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-upload-link-generation-dialog',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
  ],
  templateUrl: './upload-link-generation-dialog.component.html',
  styleUrl: './upload-link-generation-dialog.component.scss',
})
export class UploadLinkGenerationDialogComponent {
  project: string;
  fileNameForm: FormGroup;
  uploadCode: string = '';

  constructor(
    private auth: AuthService,
    public dialogRef: MatDialogRef<UploadLinkGenerationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { project: string },
  ) {
    this.project = data.project;
    this.fileNameForm = new FormGroup({
      name: new FormControl('', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(30),
        Validators.pattern('^[a-zA-Z0-9-_.]*$'),
      ]),
    });
  }

  async copyToClipboard() {
    await navigator.clipboard.writeText(this.uploadCode);
  }

  async submit(filename: string) {
    try {
      const { accessKeyId, secretAccessKey, sessionToken } =
        await this.auth.getKeys();
      const s3 = new AWS.S3({
        region: environment.auth.region,
        credentials: {
          accessKeyId,
          secretAccessKey,
          sessionToken,
        },
      });
      const res = s3.createPresignedPost({
        Bucket: environment.storage.dataPortalBucket,
        Fields: {
          key: `staging/projects/${this.project}/project-files/${filename}`,
        },
        Expires: 60 * 60,
      });

      this.uploadCode = `import requests

presigned_post = ${JSON.stringify(res, null, 2)}

file_path = "path/to/file"

# Prepare multipart form data
with open(file_path, "rb") as file:
    # Add all fields and the file to the multipart data
    multipart_form_data = {
        **presigned_post["fields"],  # Include all presigned POST fields
        "file": file,  # Add the file
    }

    # Make the POST request
    response = requests.post(presigned_post["url"], files=multipart_form_data)

# Check the response
if response.status_code == 204:
    print("File uploaded successfully!")
else:
    print("Failed to upload file!")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")`;
    } catch (error) {
      console.error(error);
    }
  }
}
