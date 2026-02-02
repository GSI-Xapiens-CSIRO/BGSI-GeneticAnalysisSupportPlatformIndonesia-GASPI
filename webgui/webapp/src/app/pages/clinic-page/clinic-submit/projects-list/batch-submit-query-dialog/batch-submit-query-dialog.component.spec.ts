import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BatchSubmitQueryDialogComponent } from './batch-submit-query-dialog.component';

describe('BatchSubmitQueryDialogComponent', () => {
  let component: BatchSubmitQueryDialogComponent;
  let fixture: ComponentFixture<BatchSubmitQueryDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatchSubmitQueryDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BatchSubmitQueryDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
