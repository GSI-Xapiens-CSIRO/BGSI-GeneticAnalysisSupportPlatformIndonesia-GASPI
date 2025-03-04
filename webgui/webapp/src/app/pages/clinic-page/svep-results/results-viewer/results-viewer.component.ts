import {
  AfterViewInit,
  Component,
  Injectable,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import {
  MatPaginator,
  MatPaginatorIntl,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { catchError, of, Subject } from 'rxjs';
import { ClinicService } from 'src/app/services/clinic.service';
import { SpinnerService } from 'src/app/services/spinner.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { HelpTextComponent } from '../help-text/help-text.component';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';

type SVEPResult = {
  url?: string;
  pages: { [key: string]: number };
  content: string;
  page: number;
  chromosome: string;
};

@Injectable()
export class MyCustomPaginatorIntl implements MatPaginatorIntl {
  changes = new Subject<void>();

  // For internationalization, the `$localize` function from
  // the `@angular/localize` package can be used.
  firstPageLabel = $localize`First page`;
  itemsPerPageLabel = $localize`Items per page:`;
  lastPageLabel = $localize`Last page`;

  // You can set labels to an arbitrary string too, or dynamically compute
  // it through other third-party internationalization libraries.
  nextPageLabel = 'Next page';
  previousPageLabel = 'Previous page';

  getRangeLabel(page: number, pageSize: number, length: number): string {
    return $localize`Page ${page + 1} of ${length / pageSize}`;
  }
}

@Component({
  selector: 'app-results-viewer',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatFormFieldModule,
    HelpTextComponent,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
  ],
  providers: [{ provide: MatPaginatorIntl, useClass: MyCustomPaginatorIntl }],
  templateUrl: './results-viewer.component.html',
  styleUrl: './results-viewer.component.scss',
})
export class ResultsViewerComponent implements OnChanges, AfterViewInit {
  @Input({ required: true }) requestId!: string;
  @Input({ required: true }) projectName!: string;
  @ViewChild('paginator') paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  protected results: SVEPResult | null = null;
  protected columns: string[] = [
    'selected',
    'Rank',
    '.',
    'Region',
    'Alt Allele',
    'Consequence',
    'Gene Name',
    'Gene ID',
    'Feature',
    'Transcript ID & Version',
    'Transcript Biotype',
    'Exon Number',
    'Amino Acid Change',
    'Codon Change',
    'Strand',
    'Transcript Support Level',
  ];
  protected data = new MatTableDataSource<any>([]);
  protected chromosomeField: FormControl = new FormControl('');
  protected basePositionField: FormControl = new FormControl('');
  protected annotationForm: FormGroup = new FormGroup({
    name: new FormControl('', [
      Validators.required,
      Validators.minLength(10),
      Validators.maxLength(64),
    ]),
    annotation: new FormControl('', [Validators.required]),
  });
  protected Object = Object;
  protected resultsLength = 0;
  protected pageIndex = 0;

  constructor(
    protected cs: ClinicService,
    private ss: SpinnerService,
    private sb: MatSnackBar,
    private dg: MatDialog,
  ) {}

  ngAfterViewInit(): void {
    this.chromosomeField.valueChanges.subscribe((chromosome) => {
      this.refetch(this.requestId, this.projectName, chromosome);
      // if chromosome or page change we clear position
      this.basePositionField.setValue('');
    });
  }

  pageChange(event: PageEvent) {
    this.refetch(
      this.requestId,
      this.projectName,
      this.chromosomeField.value,
      event.pageIndex + 1,
    );
    // if chromosome or page change we clear position
    this.basePositionField.setValue('');
  }

  search() {
    const position = this.basePositionField.value;
    if (position) {
      this.refetch(
        this.requestId,
        this.projectName,
        this.chromosomeField.value,
        null,
        position,
      );
    }
  }

  async openAnnotateDialog() {
    const { AddAnnotationDialogComponent } = await import(
      '../add-annotation-dialog/add-annotation-dialog.component'
    );

    const dialogRef = this.dg.open(AddAnnotationDialogComponent, {
      data: { projectName: this.projectName, requestId: this.requestId },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.refetch(this.requestId, this.projectName);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.refetch(
      changes['requestId'] ? changes['requestId'].currentValue : this.requestId,
      changes['projectName']
        ? changes['projectName'].currentValue
        : this.projectName,
    );
  }

  refetch(
    requestId: string,
    projectName: string,
    chromosome: string | null = null,
    page: number | null = null,
    position: number | null = null,
  ) {
    this.ss.start();
    this.cs
      .getSvepResults(requestId, projectName, chromosome, page, position)
      .pipe(catchError(() => of(null)))
      .subscribe((data) => {
        if (!data) {
          this.sb.open('Failed to load data', 'Dismiss', {
            duration: 5000,
          });
        } else {
          this.results = data;
          this.updateTable(data);
        }
        this.ss.end();
      });
  }

  updateTable(result: SVEPResult): void {
    this.results = result;
    this.resultsLength = result.pages[result.chromosome];
    const lines = result.content.split('\n');
    this.data = new MatTableDataSource<any>(
      lines
        .filter((l) => l.length > 0)
        .map((l) => {
          const row: any = {};
          l.trim()
            .split('\t')
            .forEach((v, i) => {
              row[this.columns[i + 1]] = v;
            });
          return row;
        }),
    );
    this.chromosomeField.setValue(result.chromosome, { emitEvent: false });
    this.pageIndex = result.page - 1;
    this.data.sort = this.sort;
  }
}
