import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClinicSubmitComponent } from './clinic-submit.component';

describe('ClinicSubmitComponent', () => {
  let component: ClinicSubmitComponent;
  let fixture: ComponentFixture<ClinicSubmitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClinicSubmitComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ClinicSubmitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
