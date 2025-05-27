import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LookupResultsViewerComponent } from './lookup-results-viewer.component';

describe('LookupResultsViewerComponent', () => {
  let component: LookupResultsViewerComponent;
  let fixture: ComponentFixture<LookupResultsViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LookupResultsViewerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LookupResultsViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
