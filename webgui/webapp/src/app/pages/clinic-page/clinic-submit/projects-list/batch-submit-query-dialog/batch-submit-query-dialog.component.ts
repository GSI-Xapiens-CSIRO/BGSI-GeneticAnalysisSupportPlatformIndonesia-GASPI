import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, ViewChild } from '@angular/core';
import {
  FormControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { ToastrService } from 'ngx-toastr';
import { catchError, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ClinicService } from 'src/app/services/clinic.service';
import { ComponentSpinnerComponent } from 'src/app/components/component-spinner/component-spinner.component';

interface JobRow {
  filename: string;
  jobName: number;
}

@Component({
  selector: 'app-batch-submit-query-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatSortModule,
    MatTableModule,
    ComponentSpinnerComponent,
  ],
  templateUrl: './batch-submit-query-dialog.component.html',
  styleUrl: './batch-submit-query-dialog.component.scss',
})
export class BatchSubmitQueryDialogComponent {
  @ViewChild(MatSort) sort!: MatSort;
  protected validators: ValidatorFn[] = [
    Validators.required,
    Validators.minLength(3),
    Validators.maxLength(40),
    Validators.pattern(/^[a-zA-Z0-9 ]+$/),
  ];
  protected loading = false;
  protected files: string[] = [];
  protected jobRows: JobRow[] = [];
  protected dataSource = new MatTableDataSource<JobRow>();
  protected displayedColumns: string[] = ['filename', 'jobName'];
  protected showMissingToRefOption = false;
  protected jobForm!: FormGroup;
  constructor(
    private cs: ClinicService,
    private fb: FormBuilder,
    private cd: ChangeDetectorRef,
    private tstr: ToastrService,
    public dialogRef: MatDialogRef<BatchSubmitQueryDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      projectName: string;
      checkedFiles: Set<string>;
      list: () => void;
    },
  ) {
    this.showMissingToRefOption =
      environment.hub_name === 'RSPON' || environment.hub_name === 'RSJPD';
  }

  ngOnInit() {
    this.files = Array.from(this.data.checkedFiles);
    this.jobRows = this.files.map((f, i) => ({
      filename: f,
      jobName: i,
    }));
    const group: Record<string, FormControl> = {};

    if (this.showMissingToRefOption) {
      group['missingToRef'] = new FormControl(false);
    }

    group['bulkJobName'] = new FormControl('', [
      Validators.maxLength(40),
      Validators.pattern(/^[a-zA-Z0-9 ]+$/),
    ]);

    this.files.forEach((_, i) => {
      group[`job_${i}`] = new FormControl('', this.validators);
    });

    this.jobForm = this.fb.group(group);

    this.dataSource.data = this.jobRows;
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;

    // Case-insensitive sorting
    this.dataSource.sortingDataAccessor = (
      data: JobRow,
      sortHeaderId: string,
    ) => {
      const value = data[sortHeaderId as keyof JobRow];
      return typeof value === 'string' ? value.toLowerCase() : value;
    };

    this.cd.detectChanges();
  }

  applyJobNameToAll() {
    this.files.forEach((_, i) => {
      const controlName = `job_${i}`;
      const jobNameValue = this.jobForm.controls[controlName].value;
      const bulkJobNameValue = this.jobForm.controls['bulkJobName'].value;
      this.jobForm.controls[controlName].setValue(
        `${jobNameValue}${bulkJobNameValue}`,
      );
    });
  }

  applyIndexToAll() {
    const sortedData = this.dataSource.sort
      ? this.dataSource.sortData(this.dataSource.data, this.dataSource.sort)
      : this.dataSource.data;
    sortedData.forEach((row, displayIndex) => {
      const controlName = `job_${row.jobName}`;
      const jobNameValue = this.jobForm.controls[controlName].value;
      this.jobForm.controls[controlName].setValue(
        `${jobNameValue}${displayIndex}`,
      );
    });
  }

  applyFilenameToAll() {
    this.files.forEach((f, i) => {
      const controlName = `job_${i}`;
      const jobNameValue = this.jobForm.controls[controlName].value;
      const cleanedFilename = f
        .replace(/\.(vcf|bcf)\.gz$/i, '') // strip extension
        .replace(/[^a-zA-Z0-9 ]+/g, ' ') // replace special chars with space
        .trim();
      this.jobForm.controls[controlName].setValue(
        `${jobNameValue}${cleanedFilename}`,
      );
    });
  }

  clearAllJobNames() {
    this.files.forEach((_, i) => {
      const controlName = `job_${i}`;
      this.jobForm.controls[controlName].setValue('');
    });
  }

  submit() {
    const sortedData = this.dataSource.sort
      ? this.dataSource.sortData(this.dataSource.data, this.dataSource.sort)
      : this.dataSource.data;

    const jobNameValues: string[] = [];
    const jobs: Array<{ filename: string; jobName: string }> = [];

    sortedData.forEach((f, i) => {
      const jobName = this.jobForm.value[`job_${f.jobName}`];
      jobs.push({ filename: f.filename, jobName: jobName });
      jobNameValues.push(jobName);
    });

    const hasDuplicates = jobNameValues.length !== new Set(jobNameValues).size;
    if (hasDuplicates) {
      const duplicateValues = jobNameValues.filter(
        (name, i, arr) => arr.indexOf(name) !== i,
      );
      const uniqueDuplicates = [...new Set(duplicateValues)];
      this.tstr.warning(`Duplicate job names found: ${uniqueDuplicates}`);
      return;
    }

    this.cs
      .batchSubmitClinicJobs(
        this.data.projectName!,
        jobs,
        this.jobForm.value.missingToRef,
      )
      .pipe(
        catchError((e) => {
          const errorMessage =
            e.response?.data?.error?.errorMessage ||
            'Something went wrong when initiating the jobs. Please try again later.';
          this.tstr.error(errorMessage, 'Error');
          this.loading = false;

          return of(null);
        }),
      )
      .subscribe((response: any) => {
        if (response) {
          this.tstr.success(
            'Displaying results takes time according to the size of your data. Once completed, we will send you a notification via email.',
            'Success',
          );
          this.data.list();
        }
        this.loading = false;
        this.dialogRef.close();
      });
  }
}
