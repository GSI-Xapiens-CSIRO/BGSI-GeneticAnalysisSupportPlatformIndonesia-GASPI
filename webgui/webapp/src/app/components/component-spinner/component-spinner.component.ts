import { AsyncPipe } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { OnChanges, SimpleChanges } from '@angular/core';
import {
  debounce,
  distinctUntilChanged,
  map,
  Observable,
  pairwise,
  startWith,
  Subject,
  timer,
} from 'rxjs';

@Component({
  selector: 'app-component-spinner',
  templateUrl: './component-spinner.component.html',
  styleUrls: ['./component-spinner.component.scss'],
  imports: [AsyncPipe],
  standalone: true,
})
export class ComponentSpinnerComponent implements OnChanges, OnInit, OnDestroy {
  @Input()
  loading: boolean = false;
  localLoading: Observable<boolean> = new Observable<boolean>();
  private loadingSubject = new Subject<boolean>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['loading']) {
      this.loadingSubject.next(this.loading);
    }
  }

  /**
   * Lifecycle hook that is called after data-bound properties of a directive are initialized.
   * Initializes the localLoading observable by subscribing to the loadingSubject observable.
   *
   * The localLoading observable:
   * - Starts with a value of false.
   * - Emits values only when they change.
   * - Emits a value after a debounce period, which is 1000ms if the previous value was true, otherwise 0ms.
   * - Maps the emitted pair to the current value.
   */
  ngOnInit(): void {
    this.localLoading = this.loadingSubject.pipe(
      startWith(false),
      distinctUntilChanged(),
      pairwise(),
      debounce(([prev, _]) => (!!prev ? timer(1000) : timer(0))),
      map(([_, curr]) => curr),
    );
  }

  ngOnDestroy(): void {}
}
