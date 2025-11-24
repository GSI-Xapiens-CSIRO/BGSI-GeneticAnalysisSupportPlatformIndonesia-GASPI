import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  ViewChild,
} from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import * as _ from 'lodash';
import { NgxJsonViewerModule } from 'ngx-json-viewer';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSort, MatSortModule } from '@angular/material/sort';

@Component({
  selector: 'app-tabular-query-results-viewer',
  templateUrl: './tabular-query-results-viewer.component.html',
  styleUrl: './tabular-query-results-viewer.component.scss',
  standalone: true,
  imports: [
    MatCardModule,
    MatTableModule,
    NgxJsonViewerModule,
    MatPaginatorModule,
    MatIconModule,
    ClipboardModule,
    MatButtonModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSortModule,
  ],
})
export class TabularQueryResultsViewerComponent
  implements OnChanges, AfterViewInit
{
  @Input({ required: true })
  results: any;
  @ViewChild('paginator')
  paginator!: MatPaginator;
  protected _ = _;
  protected displayedColumns: string[] = [];
  protected dataSource = new MatTableDataSource<any>([]);
  @ViewChild(MatSort) sort!: MatSort;

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.handleSortingByID();
  }

  ngOnChanges(): void {
    this.processData();
  }

  getFilterValues(obj: any): string {
    return Object.values(obj)
      .map((value) =>
        typeof value === 'object' && value !== null
          ? this.getFilterValues(value)
          : value,
      )
      .join(' ')
      .toLowerCase();
  }

  processData() {
    const results = _.isEmpty(this.results.response.resultSets)
      ? this.results.response.collections
      : this.results.response.resultSets[0].results;
    const variantInfoMapping = this.results?.info?.variantInfoMapping ?? {};
    // Handle the special case for variants
    const idName = _.isEmpty(results[0]['id']) ? 'variantInternalId' : 'id';
    // Expand info column, only including additional info for non-variant queries
    const processedResults = results.map((item: any) => {
      if (!item.variantInternalId) {
        const {
          projectName = '',
          datasetName = '',
          additionalInfo = '',
        } = item.info || {};
        return {
          ...item,
          projectName,
          datasetName,
          info: additionalInfo,
        };
      } else {
        const { projectName = '', datasetName = '' } =
          variantInfoMapping?.[item.variantInternalId] || {};
        return {
          ...item,
          projectName,
          datasetName,
        };
      }
    });

    const header = [
      idName,
      ..._.filter(_.keys(processedResults[0]), (item) => item !== idName),
    ];
    const data = _.map(processedResults, (item) => _.pick(item, header));

    this.displayedColumns = header;
    this.dataSource = new MatTableDataSource<any>(data);
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      return this.getFilterValues(data).includes(filter.trim().toLowerCase());
    };
    this.dataSource.paginator = this.paginator;
    this.handleSortingByID();
  }

  filterData(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue;
  }

  handleSortingByID() {
    this.dataSource.sortingDataAccessor = (item: any, property: string) => {
      try {
        let value = property.split('.').reduce((obj, key) => obj?.[key], item);

        // check if type data is object and has id
        if (value && typeof value === 'object' && 'id' in value) {
          return String(value.id).toLowerCase();
        }

        // by default set sorting by string
        return value ?? '';
      } catch (error) {
        console.error('Sorting error:', error);
        return '';
      }
    };
    this.dataSource.sort = this.sort;
  }

  disableOrder(columnName: string) {
    const listDisableOrder = [
      'diseases',
      'interventionsorprocedures',
      'obtentionprocedure',
      'pathologicaltnmfinding',
      'variation',
      'datauseconditions',
    ];

    const find = listDisableOrder.find(
      (e) => e.toLowerCase() === columnName.toLowerCase(),
    );
    if (find) {
      return true;
    }
    return false;
  }
}
