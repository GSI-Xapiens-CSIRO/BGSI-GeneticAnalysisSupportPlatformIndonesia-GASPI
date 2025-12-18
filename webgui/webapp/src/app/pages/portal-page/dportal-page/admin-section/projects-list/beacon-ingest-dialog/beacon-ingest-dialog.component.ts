import { Component, Inject } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatOptionModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTabsModule } from '@angular/material/tabs';
import { catchError, of } from 'rxjs';
import { ComponentSpinnerComponent } from 'src/app/components/component-spinner/component-spinner.component';
import { DportalService } from 'src/app/services/dportal.service';
import { environment } from 'src/environments/environment';
import { MatSelectModule } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';

function atLeastOneCheckboxChecked(
  formArray: AbstractControl,
): ValidationErrors | null {
  const isChecked = (formArray as FormArray).controls.some(
    (control) => control.get('checked')?.value,
  );
  return isChecked ? null : { atLeastOneRequired: true };
}

function metadataValidation(
  formGroup: AbstractControl,
): ValidationErrors | null {
  const metadataGroup = formGroup as FormGroup;
  const fileType = metadataGroup.get('fileType')?.value;
  if (!fileType) {
    return { metadataInvalid: true, message: 'File type must be selected.' };
  }
  if (fileType === 'json') {
    const jsons = metadataGroup.get('jsons')?.value;
    if (!jsons || jsons.trim() === '') {
      return { metadataInvalid: true, message: 'JSON file must be selected.' };
    }
  } else if (fileType === 'tabular') {
    const tabularFiles = metadataGroup.get('tabularFiles') as FormGroup;
    if (
      !tabularFiles ||
      !Object.values(tabularFiles.value).every(
        (value) => typeof value === 'string' && value.trim() !== '',
      )
    ) {
      return {
        metadataInvalid: true,
        message: 'CSV or TSV files must be selected for all tabs.',
      };
    }
  } else {
    return { metadataInvalid: true, message: 'Invalid file type selected.' };
  }
  return null;
}

@Component({
  selector: 'app-beacon-ingest-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatAutocompleteModule,
    MatCheckboxModule,
    MatRadioModule,
    ComponentSpinnerComponent,
  ],
  templateUrl: './beacon-ingest-dialog.component.html',
  styleUrl: './beacon-ingest-dialog.component.scss',
})
export class BeaconIngestDialogComponent {
  ingestionForm: FormGroup;
  jsons: string[] = [];
  tabularKeys: string[] = [];
  tabularFiles: string[] = [];
  filteredTabularFilesMap: { [key: string]: string[] } = {};
  loading = false;

  constructor(
    public dialogRef: MatDialogRef<BeaconIngestDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    fb: FormBuilder,
    private dps: DportalService,
    private tstr: ToastrService,
  ) {
    const vcfs = data.project.files.filter(
      (f: string) =>
        (f.endsWith('.vcf.gz') || f.endsWith('.bcf.gz')) &&
        (data.project.files.includes(`${f}.tbi`) ||
          data.project.files.includes(`${f}.csi`)) &&
        !data.project.pendingFiles.includes(f),
    );
    this.tabularKeys = [
      'dataset',
      'individuals',
      'biosamples',
      'runs',
      'analyses',
      'diseases',
      'dictionary',
    ];
    this.tabularFiles = data.project.files.filter(
      (f: string) => f.endsWith('.csv') || f.endsWith('.tsv'),
    );
    this.jsons = data.project.files.filter((f: string) => f.endsWith('.json'));

    this.ingestionForm = fb.group(
      {
        projectName: [data.project.name],
        datasetId: [
          '',
          [
            Validators.required,
            Validators.pattern(/^\S.*\S$/),
            Validators.pattern(/^[^,.:;/\\]+$/),
            Validators.maxLength(30),
            Validators.minLength(6),
          ],
        ],
        vcfLocations: fb.array(
          vcfs.map((v: string) => fb.group({ name: v, checked: false })),
          atLeastOneCheckboxChecked,
        ),
        fileType: ['json', Validators.required],
        jsons: [''],
        tabularFiles: fb.group({
          dataset: [''],
          individuals: [''],
          biosamples: [''],
          runs: [''],
          analyses: [''],
          diseases: [''],
          dictionary: [''],
        }),
      },
      { validators: metadataValidation },
    );
  }

  get vcfLocations(): FormArray {
    return this.ingestionForm.get('vcfLocations') as FormArray;
  }

  filterFiles(event: Event, key: string) {
    const searchTerm = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredTabularFilesMap[key] = this.tabularFiles.filter((file) =>
      file.toLowerCase().includes(searchTerm),
    );
  }

  getFilteredFiles(key: string): string[] {
    return this.filteredTabularFilesMap[key] || this.tabularFiles;
  }

  getTabularFileControl(key: string): FormControl {
    return this.ingestionForm.get(`tabularFiles.${key}`) as FormControl;
  }

  ingest(value: any) {
    console.log(value);
    const projectName = value.projectName;
    const datasetId = value.datasetId;
    const vcfLocations = value.vcfLocations
      .filter((v: any) => v.checked)
      .map(
        (v: any) =>
          `s3://${environment.storage.dataPortalBucket}/projects/${projectName}/project-files/${v.name}`,
      );
    console.log(this.ingestionForm.value);
    const metadataPayload: string | { [key: string]: string } =
      value.fileType === 'json'
        ? `s3://${environment.storage.dataPortalBucket}/projects/${projectName}/project-files/${value.jsons}`
        : Object.keys(value.tabularFiles).reduce(
            (acc: { [key: string]: string }, key) => {
              acc[key] =
                `s3://${environment.storage.dataPortalBucket}/projects/${projectName}/project-files/${value.tabularFiles[key]}`;
              return acc;
            },
            {},
          );
    this.loading = true;
    this.dps
      .adminIngestToBeacon(
        projectName,
        datasetId,
        metadataPayload,
        vcfLocations,
      )
      .pipe(catchError(() => of(null)))
      .subscribe((res: null | { success: boolean; message: string }) => {
        let ingested = false;
        if (!res) {
          this.tstr.error(
            'Operation failed, please check files and try again',
            'Error',
          );
        } else if (!res.success) {
          this.tstr.error(res.message, 'Error');
        } else {
          this.tstr.success(
            'Ingested successfully. Perform indexing when you have ingested all your datasets.',
            'Success',
          );
          ingested = true;
        }
        this.loading = false;
        this.dialogRef.close(ingested);
      });
  }
}
