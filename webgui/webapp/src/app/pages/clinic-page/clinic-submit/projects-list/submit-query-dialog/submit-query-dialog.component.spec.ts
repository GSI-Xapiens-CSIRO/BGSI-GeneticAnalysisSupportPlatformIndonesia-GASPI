import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmitQueryDialogComponent } from './submit-query-dialog.component';

describe('SubmitQueryDialogComponent', () => {
  let component: SubmitQueryDialogComponent;
  let fixture: ComponentFixture<SubmitQueryDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubmitQueryDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SubmitQueryDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
