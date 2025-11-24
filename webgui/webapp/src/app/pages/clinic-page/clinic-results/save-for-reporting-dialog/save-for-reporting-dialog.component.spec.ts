import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaveForReportingDialogComponent } from './save-for-reporting-dialog.component';

describe('SaveForReportingDialogComponent', () => {
  let component: SaveForReportingDialogComponent;
  let fixture: ComponentFixture<SaveForReportingDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaveForReportingDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SaveForReportingDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
