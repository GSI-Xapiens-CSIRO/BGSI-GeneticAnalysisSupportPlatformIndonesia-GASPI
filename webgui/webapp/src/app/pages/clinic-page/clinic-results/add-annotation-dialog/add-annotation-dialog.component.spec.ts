import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddAnnotationDialogComponent } from './add-annotation-dialog.component';

describe('AddAnnotationDialogComponent', () => {
  let component: AddAnnotationDialogComponent;
  let fixture: ComponentFixture<AddAnnotationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddAnnotationDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddAnnotationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
