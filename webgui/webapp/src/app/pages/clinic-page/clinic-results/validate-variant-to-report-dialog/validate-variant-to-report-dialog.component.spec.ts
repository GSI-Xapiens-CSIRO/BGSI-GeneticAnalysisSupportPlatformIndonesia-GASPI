import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidateVariantToReportDialogComponent } from './validate-variant-to-report-dialog.component';

describe('ValidateVariantToReportDialogComponent', () => {
  let component: ValidateVariantToReportDialogComponent;
  let fixture: ComponentFixture<ValidateVariantToReportDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidateVariantToReportDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ValidateVariantToReportDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
