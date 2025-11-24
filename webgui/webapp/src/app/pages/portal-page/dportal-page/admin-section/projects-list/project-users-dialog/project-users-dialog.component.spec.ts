import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectUsersDialogComponent } from './project-users-dialog.component';

describe('ProjectUsersDialogComponent', () => {
  let component: ProjectUsersDialogComponent;
  let fixture: ComponentFixture<ProjectUsersDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectUsersDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectUsersDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
