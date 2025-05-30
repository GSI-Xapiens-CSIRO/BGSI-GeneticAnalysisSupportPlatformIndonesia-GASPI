import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Inject,
  Input,
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
export class BoxDataComponent {
  @Input() row: any = null;
  @Input() expanded = false;
  @Output() panelToggled = new EventEmitter<boolean>();

  readonly panelOpenState = signal(false);
  constructor(protected cs: ClinicService) {}

  showTooltip(message: string) {
    return `Secondary analysis on this variants reports "${message}" `;
  }

  togglePanel(opened: boolean) {
    this.panelToggled.emit(opened);
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
