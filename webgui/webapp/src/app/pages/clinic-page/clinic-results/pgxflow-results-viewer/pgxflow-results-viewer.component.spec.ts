import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PGXFlowResultsViewerComponent } from './pgxflow-results-viewer.component';

describe('PGXFlowResultsViewerComponent', () => {
  let component: PGXFlowResultsViewerComponent;
  let fixture: ComponentFixture<PGXFlowResultsViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PGXFlowResultsViewerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PGXFlowResultsViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
