import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectAssignmentsDialogComponent } from './project-assignments-dialog.component';

describe('ProjectAssignmentsComponent', () => {
  let component: ProjectAssignmentsDialogComponent;
  let fixture: ComponentFixture<ProjectAssignmentsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectAssignmentsDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectAssignmentsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
