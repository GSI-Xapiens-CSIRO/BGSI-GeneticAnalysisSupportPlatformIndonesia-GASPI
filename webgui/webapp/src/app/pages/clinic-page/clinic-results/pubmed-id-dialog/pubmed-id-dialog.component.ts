import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { catchError, of } from 'rxjs';

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
  selector: 'app-pubmed-id-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './pubmed-id-dialog.component.html',
  styleUrl: './pubmed-id-dialog.component.scss',
})
export class PubmedIdDialogComponent implements OnInit {
  pubmedIDs: string[] = [];
  loading = false;
  constructor(
    private http: HttpClient,
    private tstr: ToastrService,
    private cd: ChangeDetectorRef,
    public dialogRef: MatDialogRef<PubmedIdDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { rsid: string },
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.cd.detectChanges(); // Ensure the loading state is reflected in the UI
    this.http
      .get<NCBISearchResponse>(
        'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi',
        {
          params: {
            db: 'snp',
            term: this.data.rsid,
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
          this.pubmedIDs = response.esearchresult.idlist;
        } else {
          this.tstr.error('No PubMed IDs found for this rsid', 'Error');
        }
        this.loading = false;
      });
  }
}
