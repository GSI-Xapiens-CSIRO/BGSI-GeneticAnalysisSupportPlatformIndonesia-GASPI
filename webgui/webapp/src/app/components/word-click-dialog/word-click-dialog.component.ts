import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { NgxJsonViewerModule } from 'ngx-json-viewer';
import { catchError, of } from 'rxjs';
import { OntologyService } from 'src/app/services/ontology.service';
import { ComponentSpinnerComponent } from '../component-spinner/component-spinner.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-word-click-dialog',
  templateUrl: './word-click-dialog.component.html',
  styleUrls: ['./word-click-dialog.component.scss'],
  providers: [OntologyService],
  standalone: true,
  imports: [
    NgxJsonViewerModule,
    MatCardModule,
    MatDialogModule,
    MatButtonModule,
    CommonModule,
    ComponentSpinnerComponent,
  ],
})
export class WordClickDialogComponent implements OnInit {
  protected results: any = null;
  protected loading = true;

  constructor(
    public dialogRef: MatDialogRef<WordClickDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private os: OntologyService,
    private tstr: ToastrService,
  ) {}
  ngOnInit(): void {
    this.os
      .fetch_term_details(this.data.id)
      .pipe(catchError((err) => of(null)))
      .subscribe((data) => {
        if (data) {
          this.results = data;
        } else {
          this.tstr.error('Unable to fetch details', 'Error');
        }
        this.loading = false;
      });
  }
}
