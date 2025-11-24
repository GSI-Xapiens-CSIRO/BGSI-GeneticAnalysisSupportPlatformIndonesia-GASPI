import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CohortJobIdDialogComponent } from './cohort-job-id-dialog.component';

describe('CohortJobIdDialogComponent', () => {
  let component: CohortJobIdDialogComponent;
  let fixture: ComponentFixture<CohortJobIdDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CohortJobIdDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CohortJobIdDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
