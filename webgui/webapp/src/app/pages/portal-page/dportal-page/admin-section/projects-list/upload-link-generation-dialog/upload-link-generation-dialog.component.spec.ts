import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadLinkGenerationDialogComponent } from './upload-link-generation-dialog.component';

describe('UploadLinkGenerationDialogComponent', () => {
  let component: UploadLinkGenerationDialogComponent;
  let fixture: ComponentFixture<UploadLinkGenerationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadLinkGenerationDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UploadLinkGenerationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
