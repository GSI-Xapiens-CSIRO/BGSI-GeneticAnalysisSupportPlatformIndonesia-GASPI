import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HybridResultsViewerComponent } from './hybrid-results-viewer.component';

describe('HybridResultsViewerComponent', () => {
  let component: HybridResultsViewerComponent;
  let fixture: ComponentFixture<HybridResultsViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HybridResultsViewerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HybridResultsViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
