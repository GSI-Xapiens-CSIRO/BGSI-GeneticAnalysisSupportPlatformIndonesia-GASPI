import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SavedForReportingViewerComponent } from './saved-for-reporting-viewer.component';

describe('SavedForReportingViewerComponent', () => {
  let component: SavedForReportingViewerComponent;
  let fixture: ComponentFixture<SavedForReportingViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SavedForReportingViewerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SavedForReportingViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
