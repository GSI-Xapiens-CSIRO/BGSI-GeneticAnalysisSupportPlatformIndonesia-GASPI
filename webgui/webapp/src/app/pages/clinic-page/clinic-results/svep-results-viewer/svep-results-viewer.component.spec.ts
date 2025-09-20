import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SvepResultsViewerComponent } from './svep-results-viewer.component';

describe('ResultsViewerComponent', () => {
  let component: SvepResultsViewerComponent;
  let fixture: ComponentFixture<SvepResultsViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SvepResultsViewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SvepResultsViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
