import { CommonModule } from '@angular/common';
import { Input, signal, Component, Output, EventEmitter } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PopOverComponent } from '../../svep-results-viewer/box-data/pop-over/pop-over.component';

@Component({
  selector: 'app-rspon-box-data-view',
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
  templateUrl: './rspon-box-data-view.component.html',
  styleUrl: './rspon-box-data-view.component.scss',
})
export class RsponBoxDataViewComponent {
  @Input({ required: true }) row: any = null;
  @Input({ required: true }) selected: boolean = false;
  @Output() change = new EventEmitter<boolean>();
  @Output() filter = new EventEmitter<string[]>();
  togglePanel = false;
  readonly panelOpenState = signal(false);

  showTooltip(message: string) {
    return `Secondary analysis on this variants reports "${message}" `;
  }

  handleRedirectUrl(column: string, value: string) {
    const urlMap: Record<string, string> = {
      'PubMed IDs': `https://pubmed.ncbi.nlm.nih.gov/${value}/`,
      Variants: `https://www.ncbi.nlm.nih.gov/snp/${value}`,
    };

    const url = urlMap[column];
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
