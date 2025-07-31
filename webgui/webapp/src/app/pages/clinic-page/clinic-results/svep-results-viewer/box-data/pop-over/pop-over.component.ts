import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  Input,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'pop-over-component',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './pop-over.component.html',
  styleUrl: './pop-over.component.scss',
})
export class PopOverComponent {
  @Input() data: any = null;
  isShow = false;

  @ViewChild('popover') popover!: ElementRef;

  constructor() {}

  handleRedirectUrl(value: string) {
    const url = `https://pubmed.ncbi.nlm.nih.gov/${value}/`;
    window.open(url, '_blank');
  }

  onClick() {
    this.isShow = !this.isShow;
  }
}
