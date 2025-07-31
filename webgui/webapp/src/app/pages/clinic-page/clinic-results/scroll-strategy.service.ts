import { Injectable } from '@angular/core';
import {
  VirtualScrollStrategy,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import { Subject, Observable } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

// from https://nahgrin-virtual-scroll-table.stackblitz.io
@Injectable()
export class TableVirtualScrollStrategy implements VirtualScrollStrategy {
  private scrollHeight!: number;
  private scrollHeader!: number;
  private readonly indexChange = new Subject<number>();

  private viewport!: CdkVirtualScrollViewport;

  public scrolledIndexChange: Observable<number>;

  constructor() {
    this.scrolledIndexChange = this.indexChange
      .asObservable()
      .pipe(distinctUntilChanged());
  }

  public attach(viewport: CdkVirtualScrollViewport): void {
    this.viewport = viewport;
    this.onDataLengthChanged();
    this.updateContent(viewport);
  }

  public detach(): void {
    // no-op
  }

  public onContentScrolled(): void {
    this.updateContent(this.viewport);
  }

  public onDataLengthChanged(): void {
    if (this.viewport) {
      this.viewport.setTotalContentSize(
        this.viewport.getDataLength() * this.scrollHeight,
      );
    }
  }

  public onContentRendered(): void {
    // no-op
  }

  public onRenderedOffsetChanged(): void {
    // no-op
  }

  public scrollToIndex(index: number, behavior: ScrollBehavior): void {
    // no-op
  }

  public setScrollHeight(rowHeight: number, headerHeight: number) {
    this.scrollHeight = rowHeight;
    this.scrollHeader = headerHeight;
    this.updateContent(this.viewport);
  }

  private updateContent(viewport: CdkVirtualScrollViewport) {
    if (this.viewport) {
      const newIndex = Math.max(
        0,
        Math.round(
          (viewport.measureScrollOffset() - this.scrollHeader) /
            this.scrollHeight,
        ) - 2,
      );
      viewport.setRenderedContentOffset(this.scrollHeight * newIndex);
      this.indexChange.next(
        Math.round(
          (viewport.measureScrollOffset() - this.scrollHeader) /
            this.scrollHeight,
        ) + 1,
      );
    }
  }
}
