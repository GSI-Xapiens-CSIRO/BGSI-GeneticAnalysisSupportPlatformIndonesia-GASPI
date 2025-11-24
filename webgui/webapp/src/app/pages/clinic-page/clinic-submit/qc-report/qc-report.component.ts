import { Component, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { ToastrService } from 'ngx-toastr';
import {
  catchError,
  delay,
  lastValueFrom,
  mergeMap,
  of,
  retry,
  retryWhen,
  scan,
  throwError,
} from 'rxjs';
import { ClinicService } from 'src/app/services/clinic.service';
import { ComponentSpinnerComponent } from 'src/app/components/component-spinner/component-spinner.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

export interface FileSelectEvent {
  projectName: string;
  vcf: string;
}

export interface QCItem {
  title: string;
  desc: string;
  key: string;
  url?: string;
  status: 'error' | 'failed' | 'success' | 'pending';
  retries: number;
  loading?: boolean;
}

@Component({
  selector: 'qc-report',
  providers: [],
  standalone: true,
  imports: [
    MatCardModule,
    ComponentSpinnerComponent,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    FormsModule,
  ],
  templateUrl: './qc-report.component.html',
  styleUrl: './qc-report.component.scss',
})
export class QcReportComponent {
  protected projectName: string = '';
  protected fileName: string = '';
  protected listQC: QCItem[] = [
    {
      title: 'Histogram : Variant Quality Score Distributions',
      desc: 'Here is the histogram representing the distribution of variant quality scores. The x-axis shows the quality score ranges, and the y-axis represents the number of variants in each range.',
      key: 'qc_hc',
      status: 'success',
      retries: 0,
    },
    {
      title: 'Scatter Plot : Low Variant Flagging',
      desc: 'Here is the scatter plot for Low-Variant Flagging, where each point represents a variant with its quality score (QUAL) on the x-axis and depth (DP) on the y-axis. Low-quality variants could be flagged based on predefined thresholds.',
      key: 'low_var',
      status: 'success',
      retries: 0,
    },
    {
      title: 'Histogram: Genotype Quality',
      desc: 'Here is the histogram for Genotype Quality, showing the distribution of GQ values across all the variants and samples. Missing GQ values are recorded as -1.',
      key: 'gq',
      status: 'success',
      retries: 0,
    },
    {
      title: 'Histogram or density plot: Allele Frequency',
      desc: 'Here is the Histogram/Density Plot: Allele Frequency, showing the distribution of allele frequencies. The histogram bars represent the count of variants in each frequency range, while the smooth density curve helps visualize the overall distribution trend.',
      key: 'alle_freq',
      status: 'success',
      retries: 0,
    },
    {
      title: 'Only with SNPs PASS all filters',
      desc: `Here is the Bar Chart: Number of Substitutions of SNPs (Passed Variants).The X-axis represents different types of SNP substitutions (Transitions and Transversions).The Y-axis represents the count of passed variants for each substitution type.`,
      key: 'snp_pass',
      status: 'success',
      retries: 0,
    },
  ];

  loading = false;
  notes = 'Loading...';
  editNotes = false;
  editNotesText = '';
  private autoRetryInterval: any;
  maxRetries = 2;

  constructor(
    private tstr: ToastrService,
    private cs: ClinicService,
    private cd: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.projectName =
      this.route.snapshot.queryParamMap.get('projectName') || '';
    this.fileName = this.route.snapshot.queryParamMap.get('fileName') || '';
    this.cd.detectChanges();
    this.runAllQC().then(() => this.startAutoRetry());

    this.cs
      .getQCNotes(this.projectName || '', this.fileName || '')
      .pipe(
        catchError((e) => {
          const errorMessage =
            e?.response?.data?.error?.errorMessage ||
            'Something went wrong when loading QC notes. Please try again later.';
          this.tstr.error(errorMessage, 'Error: QC Notes');
          return of(null);
        }),
      )
      .subscribe((notes) => {
        if (notes) {
          this.notes = notes.notes || '';
        } else {
          this.notes = 'Failed to load notes.';
        }
      });
  }

  ngOnDestroy(): void {
    clearInterval(this.autoRetryInterval);
  }

  saveNotes(): void {
    const notes = this.editNotesText.trim();

    this.cs
      .updateQCNotes(this.projectName || '', this.fileName || '', notes)
      .pipe(
        catchError((e) => {
          const errorMessage =
            e?.response?.data?.error?.errorMessage ||
            'Something went wrong when saving QC notes. Please try again later.';
          this.tstr.error(errorMessage, 'Error: Save Notes');
          return of(null);
        }),
      )
      .subscribe((res) => {
        if (res) {
          this.notes = notes;
          this.tstr.success('Notes saved successfully.', 'Success');
          this.editNotes = false;
        } else {
          this.tstr.error('Failed to save notes.', 'Error');
        }
      });
  }

  async runAllQC(): Promise<void> {
    this.loading = true;

    const jobPromises = this.listQC.map((item) =>
      this.retryFailedItem(item.key),
    );
    await Promise.all(jobPromises);

    this.startAutoRetry();
  }

  async retryFailedItem(key: string): Promise<void> {
    const item = this.listQC.find((i) => i.key === key);
    if (!item) return;

    item.loading = true;
    item.status = 'pending';
    item.retries = (item.retries || 0) + 1;

    try {
      const res = await lastValueFrom(
        this.cs
          .generateQC(this.projectName || '', this.fileName || '', item.key)
          .pipe(
            mergeMap((res) => {
              const images = res?.images || {};
              if (!images[key]) {
                return throwError(() => new Error('Image still not ready'));
              }
              return of(res);
            }),
            retry({ count: 2, delay: 1000 }), // retry with delay
            catchError((e) => {
              const errorMessage =
                item?.retries < this.maxRetries
                  ? 'Retrying'
                  : e?.message || 'Image generation failed after retries.';

              if (item?.retries < this.maxRetries) {
                this.tstr.warning(errorMessage, `Warning: ${key}`);
              } else {
                this.tstr.error(errorMessage, `Error: ${key}`);
              }

              return of({
                images: {
                  [key]: {
                    description: this.handleErrDecription(
                      e?.response?.data?.body?.error_type,
                    ),
                  },
                },
              });
            }),
          ),
      );

      const imageInfo = res.images?.[key];

      if (imageInfo) {
        if (imageInfo.description) {
          item.desc = imageInfo.description;
          item.status = 'error';
        } else {
          item.title = imageInfo.title || item.title;
          item.url = imageInfo.url || '';
          item.status = 'success';
        }
      } else {
        item.status = 'failed';
      }
    } catch (e) {
      item.status = 'failed';
    }

    item.loading = false;
    this.cd.detectChanges();
  }

  startAutoRetry(): void {
    this.autoRetryInterval = setInterval(() => {
      const itemsToRetry = this.listQC.filter(
        (item) =>
          (item.status === 'failed' ||
            item.status === 'error' ||
            item.status === 'pending') &&
          (item.retries || 0) < this.maxRetries &&
          !item.loading,
      );

      if (itemsToRetry.length === 0) {
        clearInterval(this.autoRetryInterval);

        // Only set loading to false when everything is done
        const allDone = this.listQC.every(
          (item) =>
            item.status === 'success' || (item.retries || 0) >= this.maxRetries,
        );

        if (allDone) {
          this.loading = false;
          this.cd.detectChanges();
        }

        return;
      }

      // Retry each failed/pending item
      itemsToRetry.forEach((item) => {
        this.retryFailedItem(item.key);
      });
    }, 2000);
  }

  handleErrDecription(err: string): string {
    const value = err.toLowerCase();
    switch (value) {
      case 'no_data':
        return 'Report failed to generate, missing field on file.';
      case 'vcfstat_failed':
        return 'Vcfstat failed to generate report.';

      default:
        return 'Report failed to generate.';
    }
  }

  backToList() {
    this.router.navigate(['/clinic/clinic-submit'], {});
  }
}
