import { Component, Input, OnChanges } from '@angular/core';
import { extract_terms } from 'src/app/utils/onto';
import * as _ from 'lodash';
import { MatButtonModule } from '@angular/material/button';
import { TextQueryResultsViewerComponent } from '../text-query-results-viewer/text-query-results-viewer.component';
import { TabularQueryResultsViewerComponent } from '../tabular-query-results-viewer/tabular-query-results-viewer.component';
import { AdvancedQueryResultsViewerComponent } from '../advanced-query-results-viewer/advanced-query-results-viewer.component';
import { VisualQueryResultsViewerComponent } from '../visual-query-results-viewer/visual-query-results-viewer.component';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SpinnerService } from 'src/app/services/spinner.service';
import { catchError, firstValueFrom, from, of } from 'rxjs';
import { Storage } from 'aws-amplify';
import { getTotalStorageSize } from 'src/app/utils/file';
import { UserQuotaService } from 'src/app/services/userquota.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-query-result-viewer-container',
  templateUrl: './query-result-viewer-container.component.html',
  styleUrls: ['./query-result-viewer-container.component.scss'],
  standalone: true,
  imports: [
    MatCardModule,
    MatTabsModule,
    MatDialogModule,
    VisualQueryResultsViewerComponent,
    AdvancedQueryResultsViewerComponent,
    TabularQueryResultsViewerComponent,
    TextQueryResultsViewerComponent,
    MatButtonModule,
  ],
})
export class QueryResultViewerContainerComponent implements OnChanges {
  @Input()
  results: any;
  @Input()
  endpoint: any;
  @Input()
  query: any;
  @Input()
  scope: any;
  @Input()
  projects: any;

  protected _ = _;
  protected granularity = '';
  protected exists = false;
  protected words: any[] = [];

  constructor(
    private dg: MatDialog,
    private ss: SpinnerService,
    private tstr: ToastrService,
    private uq: UserQuotaService,
  ) {}

  ngOnChanges(): void {
    this.granularity = this.results.meta.returnedGranularity;
    this.exists = this.results.responseSummary.exists;
    this.words = [
      ...extract_terms(
        _.get(this.results, 'response.resultSets[0].results', []),
      ),
      ...extract_terms(_.get(this.results, 'response.collections', [])),
    ];
  }

  download(data: any) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'text/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Calculate total size from storage and current query result
  async totalStorage(queryResults: any) {
    // Get files in the storage
    const res = await Storage.list(``, {
      pageSize: 'ALL',
      level: 'private',
    });

    // Get total size from storage
    const bytesTotal = getTotalStorageSize(res.results);

    // Get size from current query result
    const blob = new Blob([JSON.stringify(queryResults, null, 2)], {
      type: 'text/json;charset=utf-8;',
    });

    return bytesTotal + blob.size;
  }

  updateUserQuota(userQuota: any, currentTotalSize: number) {
    this.uq
      .upsertUserQuota(userQuota.userSub, userQuota.costEstimation, {
        quotaSize: userQuota.quotaSize,
        quotaQueryCount: userQuota.quotaQueryCount,
        usageSize: currentTotalSize,
        usageCount: userQuota.usageCount,
      })
      .pipe(catchError(() => of(null)));
  }

  async save(content: any) {
    const userQuota = await firstValueFrom(this.uq.getCurrentUsage());
    const currentTotalSize = await this.totalStorage(content);

    // Check if the current total size is greater than the user's quota size
    if (currentTotalSize >= userQuota.quotaSize) {
      this.tstr.error(
        'Cannot Save Query because Quota Limit reached. Please contact administrator to increase your quota.',
        'Error',
      );
      return;
    }

    const { TextInputDialogComponent } = await import(
      '../../../../../components/text-input-dialog/text-input-dialog.component'
    );

    const dialog = this.dg.open(TextInputDialogComponent, {
      data: {
        title: 'Save Query Results',
        message:
          'Please enter a name for the file. Dupliactions will be overwritten.',
        label: 'Name your data',
        placeholder: 'My query results',
      },
    });

    dialog.afterClosed().subscribe((name) => {
      if (name) {
        this.ss.start();
        from(
          Storage.put(`saved-queries/${name}.json`, content, {
            level: 'private',
            contentType: 'application/json',
          }),
        )
          .pipe(catchError(() => of(null)))
          .subscribe((res) => {
            if (!res) {
              this.tstr.error('Saving failed', 'Error');
            }

            this.updateUserQuota(userQuota, currentTotalSize);
            this.ss.end();
          });
      }
    });
  }
}
