import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddToReportingDialogComponent } from './add-to-reporting-dialog.component';

describe('AddToReportingDialogComponent', () => {
  let component: AddToReportingDialogComponent;
  let fixture: ComponentFixture<AddToReportingDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddToReportingDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AddToReportingDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
