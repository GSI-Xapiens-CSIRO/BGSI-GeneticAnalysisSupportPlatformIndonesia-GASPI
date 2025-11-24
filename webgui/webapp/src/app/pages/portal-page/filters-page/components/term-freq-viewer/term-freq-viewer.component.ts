import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import {
  Subject,
  catchError,
  from,
  map,
  mergeMap,
  of,
  takeUntil,
  tap,
  toArray,
} from 'rxjs';
import { FilterService } from 'src/app/services/filter.service';
import _ from 'lodash';
import { EntityCountsByTermPlotComponent } from '../entity-counts-by-term-plot/entity-counts-by-term-plot.component';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-term-freq-viewer',
  templateUrl: './term-freq-viewer.component.html',
  styleUrl: './term-freq-viewer.component.scss',
  standalone: true,
  imports: [
    MatCardModule,
    MatProgressBarModule,
    EntityCountsByTermPlotComponent,
  ],
})
export class TermFreqViewerComponent implements OnChanges, OnDestroy {
  @Input({ required: true })
  scope!: string;
  @Input({ required: true })
  terms!: any[];
  @Input({ required: true })
  projects!: string[];
  protected completed = 0;
  protected loading = true;
  protected counts: any[] = [];
  private destroy$ = new Subject<void>();
  private readonly CONCURRENCY = 5;

  constructor(
    private fs: FilterService,
    private tstr: ToastrService,
  ) {}

  ngOnChanges(): void {
    this.loadTermCounts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadTermCounts() {
    this.loading = true;
    this.completed = 0;

    from(this.terms)
      .pipe(
        mergeMap(
          (term) =>
            this.fs
              .fetch_counts_by_scope_and_term(this.projects, this.scope, {
                id: term.id,
              })
              .pipe(
                catchError(() => of(null)),
                tap(() => this.completed++),
                map((count) =>
                  count
                    ? { term: term.id, count, label: term.label }
                    : { term: term.id, count: -1, label: term.label },
                ),
              ),
          this.CONCURRENCY,
        ),
        toArray(),
        takeUntil(this.destroy$),
        catchError(() => of(null)),
      )
      .subscribe((counts) => {
        if (!counts) {
          this.tstr.error('Unable to fetch details', 'Error');
        } else if (counts.length == this.terms.length) {
          const validCounts = _.filter(counts, (item) => item.count >= 0);
          if (validCounts.length !== this.terms.length) {
            this.tstr.warning(
              'Some terms could not be counted. System may be busy or you may have exceeded your quota. Please try again later.',
              'Warning',
            );
          }
          this.counts = _.reverse(_.sortBy(validCounts, (item) => item.count));
          this.loading = false;
        }
      });
  }
}
