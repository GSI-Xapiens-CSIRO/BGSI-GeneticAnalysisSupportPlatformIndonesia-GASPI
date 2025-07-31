import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { PharmcatResultsViewerComponent } from '../pharmcat-results-viewer/pharmcat-results-viewer.component';
import { LookupResultsViewerComponent } from '../lookup-results-viewer/lookup-results-viewer.component'; // adjust path as needed

@Component({
  selector: 'app-hybrid-results-viewer',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTabsModule,
    PharmcatResultsViewerComponent,
    LookupResultsViewerComponent,
  ],
  templateUrl: './hybrid-results-viewer.component.html',
  styleUrls: ['./hybrid-results-viewer.component.scss'],
})
export class HybridResultsViewerComponent {
  @Input({ required: true }) requestId!: string;
  @Input({ required: true }) projectName!: string;
}
