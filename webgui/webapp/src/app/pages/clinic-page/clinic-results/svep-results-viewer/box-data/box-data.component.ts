import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ClinicService } from '../../../../../services/clinic.service';
import { PopOverComponent } from './pop-over/pop-over.component';
import { environment } from 'src/environments/environment.development';

interface FlagInfo {
  shouldShow: boolean;
  color: string;
  message: string;
}

@Component({
  selector: 'box-data-component',
  standalone: true,
  imports: [
    MatButtonModule,
    CommonModule,
    MatExpansionModule,
    MatIconModule,
    MatTooltipModule,
    MatCheckboxModule,
    PopOverComponent,
  ],
  templateUrl: './box-data.component.html',
  styleUrl: './box-data.component.scss',
})
export class BoxDataComponent implements OnInit {
  @Input() row: any = null;
  @Input() rows: any = null;
  @Input() expanded = false;
  @Input() isSelected: boolean = false;
  @Output() panelToggled = new EventEmitter<boolean>();

  exclamationMarkStatus = false;
  flagInfo: FlagInfo = {
    shouldShow: false,
    color: '#4b5563',
    message: '',
  };

  readonly panelOpenState = signal(false);

  constructor(protected cs: ClinicService) {}

  ngOnInit(): void {
    this.generateFlagInfo();
  }

  private generateFlagInfo(): void {
    const thresholds = environment.clinic_warning_thresholds;
    const scoreFields = {
      Qual: { value: this.row['qual'], threshold: thresholds.qual },
      DP: { value: this.row['dp'], threshold: thresholds.dp },
      GQ: { value: this.row['gq'], threshold: thresholds.gq },
      MQ: { value: this.row['mq'], threshold: thresholds.mq },
      QD: { value: this.row['qd'], threshold: thresholds.qd },
    };

    const belowThreshold: string[] = [];
    const missingKeys: string[] = [];

    // Check each field for tooltip message generation
    Object.entries(scoreFields).forEach(([key, config]) => {
      const value = config.value;

      if (
        value === '.' ||
        value === '-' ||
        value === '' ||
        value === null ||
        value === undefined
      ) {
        missingKeys.push(key);
      } else {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue < config.threshold) {
          belowThreshold.push(key);
        }
      }
    });

    // Check filter condition
    const filterValue = this.row['filter'];
    const hasFilterIssue = ![thresholds.filter, '-', ''].includes(filterValue);
    const hasScoreIssues = belowThreshold.length > 0;
    const hasMissingKeys = missingKeys.length > 0;

    // Show flag if there are ANY issues: filter, score, or missing keys
    const shouldShowFlag = hasFilterIssue || hasScoreIssues || hasMissingKeys;

    // Determine flag status
    this.flagInfo = this.determineFlagInfo(
      belowThreshold,
      missingKeys,
      shouldShowFlag,
      filterValue,
      hasFilterIssue,
    );
    this.exclamationMarkStatus = this.flagInfo.shouldShow;
  }

  private determineFlagInfo(
    belowThreshold: string[],
    missingKeys: string[],
    shouldShowFlag: boolean,
    filterValue: string,
    hasFilterIssue: boolean,
  ): FlagInfo {
    // Don't show flag if no issues at all
    if (!shouldShowFlag) {
      return {
        shouldShow: false,
        color: '#4b5563',
        message: '',
      };
    }

    // Generate messages
    const messages: string[] = [];

    // Add filter message only if filter has issues
    if (hasFilterIssue) {
      messages.push(this.getFilterMessage(filterValue));
    }

    // Add score message if there are threshold violations
    if (belowThreshold.length > 0) {
      messages.push(
        `The Result Score ${belowThreshold.join(
          ', ',
        )} is less than minimum Score`,
      );
    }

    // Add missing keys message if there are missing values
    if (missingKeys.length > 0) {
      messages.push(`The Key ${missingKeys.join(', ')} is missing in vcf file`);
    }

    const fullMessage = messages.join(' and ');

    // Determine color based on content
    // Gray if filter is missing AND all score values are missing (no actual score violations)
    const filterIsMissing =
      filterValue === '.' ||
      filterValue === '' ||
      filterValue === null ||
      filterValue === undefined;
    const isGrayFlag =
      filterIsMissing && belowThreshold.length === 0 && missingKeys.length > 0;

    return {
      shouldShow: true,
      color: isGrayFlag ? '#4b5563' : '#dc2626', // gray if only missing keys, red otherwise
      message: fullMessage,
    };
  }

  private getFilterMessage(filterValue: string): string {
    if (
      filterValue === '.' ||
      filterValue === '' ||
      filterValue === null ||
      filterValue === undefined
    ) {
      return 'Filter is missing';
    } else {
      return 'Filter is not Passed';
    }
  }

  showTooltip(message: string, row: any): string {
    // Use the new flag info if available, otherwise fall back to filter message
    if (this.flagInfo.shouldShow && this.flagInfo.message) {
      return this.flagInfo.message;
    }

    // Fallback for filter-only issues
    return `Secondary analysis on this variants reports "${message}"`;
  }

  getFlagColor(): string {
    return this.flagInfo.color;
  }

  shouldShowFlag(): boolean {
    return this.flagInfo.shouldShow;
  }

  // Keep existing methods
  generateExclamationMarkStatus() {
    // This method is now replaced by generateFlagInfo()
    // Keeping for backward compatibility if called elsewhere
    this.generateFlagInfo();
  }

  togglePanel(opened: boolean) {
    this.panelToggled.emit(opened);
  }

  isSingleData() {
    const isTrue = this.rows.length <= 1 ? true : false;
    return isTrue;
  }

  splitPubMedArray(pubmedString: string): string[] {
    if (
      !pubmedString ||
      pubmedString.trim() === '' ||
      pubmedString.trim() === '-'
    ) {
      return [];
    }

    return pubmedString
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id !== '');
  }

  handleRedirectUrl(column: string, value: string) {
    const urlMap: Record<string, string> = {
      'Gene ID': `https://www.ncbi.nlm.nih.gov/gene/?term=${value}`,
      variationId: `https://www.ncbi.nlm.nih.gov/clinvar/variation/${value}/`,
      rsId: `https://www.ncbi.nlm.nih.gov/snp/${value}`,
      accession: `https://www.ncbi.nlm.nih.gov/clinvar/${value}/?redir=rcv`,
      pubmed: `https://pubmed.ncbi.nlm.nih.gov/${value}/`,
    };

    const url =
      urlMap[column] ||
      `https://asia.ensembl.org/Homo_sapiens/Location/View?r=${value}`;
    window.open(url, '_blank');
  }

  handleRedirectGnomad(row: any, gnomadVer: 'gnomad_r4' | 'gnomad_r3') {
    const match = row['Region'].match(/^chr(\d+):(\d+)-/);
    const region = `${match[1]}-${match[2]}`;
    const ref = row['ref'];
    const alt = row['Alt Allele'];

    const url = `https://gnomad.broadinstitute.org/variant/${region}-${ref}-${alt}?dataset=${gnomadVer}`;
    window.open(url, '_blank');
  }

  handleColorClignsign(value: string) {
    const lowerValue = value.toLowerCase();
    if (lowerValue.includes('pathogenic')) {
      return '#FB1212';
    } else if (lowerValue.includes('benign')) {
      return '#49750C';
    }

    return '#FF8F73';
  }
}
