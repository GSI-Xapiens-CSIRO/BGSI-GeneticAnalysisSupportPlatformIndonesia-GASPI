import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminFolderListComponent } from './admin-folder-list.component';

describe('AdminFolderListComponent', () => {
  let component: AdminFolderListComponent;
  let fixture: ComponentFixture<AdminFolderListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminFolderListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminFolderListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
