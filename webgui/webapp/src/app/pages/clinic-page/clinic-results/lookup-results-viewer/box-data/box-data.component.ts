import { catchError, of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Input, signal, Component, ChangeDetectorRef } from '@angular/core';

import { ClinicService } from '../../../../../services/clinic.service';
import { PopOverComponent } from '../../svep-results-viewer/box-data/pop-over/pop-over.component';
import { ComponentSpinnerComponent } from 'src/app/components/component-spinner/component-spinner.component';

interface NCBISearchResponse {
  header: {
    type: string;
    version: string;
  };
  esearchresult: {
    count: string;
    retmax: string;
    retstart: string;
    idlist: string[];
    translationset: any[];
    translationstack: Array<
      | {
          term: string;
          field: string;
          count: string;
          explode: string;
        }
      | string
    >;
    querytranslation: string;
  };
}

@Component({
  selector: 'box-data-component-rsigng',
  standalone: true,
  imports: [
    MatButtonModule,
    CommonModule,
    MatExpansionModule,
    MatIconModule,
    MatTooltipModule,
    MatCheckboxModule,
    PopOverComponent,
    ComponentSpinnerComponent,
  ],
  templateUrl: './box-data.component.html',
  styleUrl: './box-data.component.scss',
})
export class BoxDataComponent {
  @Input() row: any = null;

  togglePanel = false;
  loading = false;
  protected pubmed: string[] = [];

  readonly panelOpenState = signal(false);
  constructor(
    protected cs: ClinicService,
    protected cd: ChangeDetectorRef,
    private http: HttpClient,
    private tstr: ToastrService,
  ) {}

  openPanel(variant: string) {
    this.togglePanel = true;
    this.loadPubmed(variant);
  }

  loadPubmed(variant: string) {
    this.loading = true;
    this.cd.detectChanges(); // Ensure the loading state is reflected in the UI
    this.http
      .get<NCBISearchResponse>(
        'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi',
        {
          params: {
            db: 'snp',
            term: variant,
            retmode: 'json',
          },
        },
      )
      .pipe(catchError(() => of(null)))
      .subscribe((response) => {
        if (!response) {
          this.tstr.error('Error fetching PubMed IDs', 'Error');
        } else if (
          response &&
          response.esearchresult &&
          response.esearchresult.idlist
        ) {
          console.log(response.esearchresult.idlist);
          this.pubmed = response.esearchresult.idlist;
        } else {
          this.tstr.error('No PubMed IDs found for this rsid', 'Error');
        }
        this.loading = false;
      });
  }

  handleRedirectUrl(value: string) {
    window.open(`https://pubmed.ncbi.nlm.nih.gov/${value}/`, '_blank');
  }
}
