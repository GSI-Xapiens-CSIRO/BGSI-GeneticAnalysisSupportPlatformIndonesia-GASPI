import { Component, Input, NgZone, ChangeDetectorRef } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { ToastrService } from 'ngx-toastr';
import { catchError, lastValueFrom, of } from 'rxjs';
import { ClinicService } from 'src/app/services/clinic.service';
import { SelectedProjectType } from '../clinic-submit.component';
import { ComponentSpinnerComponent } from 'src/app/components/component-spinner/component-spinner.component';

export interface FileSelectEvent {
  projectName: string;
  vcf: string;
}

export interface QCItem {
  title: string;
  desc: string;
  key: string;
  url?: string;
}

@Component({
  selector: 'qc-report',
  providers: [],
  standalone: true,
  imports: [MatCardModule, ComponentSpinnerComponent],
  templateUrl: './qc-report.component.html',
  styleUrl: './qc-report.component.scss',
})
export class QcReportComponent {
  @Input() qcData!: SelectedProjectType; // terima data dengan tipe QCData

  protected listQC: QCItem[] = [
    {
      title: 'Histogram : Variant Quality Score Distributions',
      desc: 'Here is the histogram representing the distribution of variant quality scores. The x-axis shows the quality score ranges, and the y-axis represents the number of variants in each range.',
      key: 'qc_hc',
    },
    {
      title: 'Scatter Plot : Low Variant Flagging',
      desc: 'Here is the scatter plot for Low-Variant Flagging, where each point represents a variant with its quality score (QUAL) on the x-axis and depth (DP) on the y-axis. Low-quality variants could be flagged based on predefined thresholds.',
      key: 'low_var',
    },
    {
      title: 'Boxplot: Genotype Quality',
      desc: 'Here is the Boxplot: Genotype Quality, where each genomic position (POS) on the x-axis has a distribution of genotype quality (QUAL) values on the y-axis. The boxplot shows the median, quartiles, and potential outliers for each position',
      key: 'gq',
    },
    {
      title: 'Histogram or density plot: Allele Frequency',
      desc: 'Here is the Histogram/Density Plot: Allele Frequency, showing the distribution of allele frequencies. The histogram bars represent the count of variants in each frequency range, while the smooth density curve helps visualize the overall distribution trend.',
      key: 'alle_freq',
    },
    {
      title: 'Only with SNPs PASS all filters',
      desc: `Here is the Bar Chart: Number of Substitutions of SNPs (Passed Variants).The X-axis represents different types of SNP substitutions (Transitions and Transversions).The Y-axis represents the count of passed variants for each substitution type.`,
      key: 'snp_pass',
    },
  ];

  loading = false;

  constructor(
    private tstr: ToastrService,
    private cs: ClinicService,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cd.detectChanges();
    this.runAllQC();
  }

  async runAllQC(): Promise<void> {
    this.loading = true;

    const jobPromises = this.listQC.map((item) =>
      lastValueFrom(
        this.cs
          .generateQC(
            this.qcData.projectName || '',
            this.qcData.fileName || '',
            item.key,
          )
          .pipe(
            catchError((e) => {
              const errorMessage =
                e?.response?.data?.error?.errorMessage ||
                'Something went wrong when loading image . Please try again later.';
              this.tstr.error(errorMessage, `Error: ${item.key} image`);
              const errData = {
                message: errorMessage,
                images: {
                  [item.key]: {
                    description: this.handleErrDecription(
                      e?.response?.data?.body?.error_type,
                    ),
                  },
                },
              };
              return of(errData);
            }),
          ),
      ),
    );

    try {
      const results = await Promise.all(jobPromises);

      results.forEach((res, index) => {
        const key = this.listQC[index].key;
        if (res?.images?.[key]) {
          const imageInfo = res.images[key];
          if (imageInfo.description) {
            return (this.listQC[index].desc = imageInfo.description);
          }

          this.listQC[index].title = imageInfo.title;
          this.listQC[index].url = imageInfo.url;
        }
      });
      // this.loading = false;
    } catch (error) {
      this.tstr.error('Unexpected error during QC generation.', 'Error');
    }
    this.loading = false;
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
}
