import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnotationPageComponent } from './annotation-page.component';

describe('AnnotationPageComponent', () => {
  let component: AnnotationPageComponent;
  let fixture: ComponentFixture<AnnotationPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnnotationPageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnnotationPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
