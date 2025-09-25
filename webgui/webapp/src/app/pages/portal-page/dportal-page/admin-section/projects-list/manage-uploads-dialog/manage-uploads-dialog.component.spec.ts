import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageUploadsDialogComponent } from './manage-uploads-dialog.component';

describe('ManageUploadsDialogComponent', () => {
  let component: ManageUploadsDialogComponent;
  let fixture: ComponentFixture<ManageUploadsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageUploadsDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageUploadsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
