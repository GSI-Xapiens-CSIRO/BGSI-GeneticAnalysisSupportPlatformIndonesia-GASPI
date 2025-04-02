import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { Subject, catchError, forkJoin, map, of, takeUntil } from 'rxjs';
import { FilterService } from 'src/app/services/filter.service';
import * as _ from 'lodash';
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

    const observables$ = _.map(this.terms, (term) =>
      this.fs
        .fetch_counts_by_scope_and_term(this.projects, this.scope, {
          id: term.id,
        })
        .pipe(
          map((count) => {
            this.completed++;
            return {
              term: term.id,
              count: count,
              label: term.label,
            };
          }),
        ),
    );

    forkJoin(observables$)
      .pipe(
        takeUntil(this.destroy$),
        catchError((_) => of(null)),
      )
      .subscribe((counts) => {
        if (!counts) {
          this.tstr.error('Unable to fetch details', 'Error');
        } else if (counts.length == this.terms.length) {
          this.counts = _.reverse(_.sortBy(counts, (item) => item.count));
          this.loading = false;
        }
      });
  }
}
