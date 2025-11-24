import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserManagementDialogComponent } from './user-management-dialog.component';

describe('UserManagementDialogComponent', () => {
  let component: UserManagementDialogComponent;
  let fixture: ComponentFixture<UserManagementDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserManagementDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UserManagementDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
