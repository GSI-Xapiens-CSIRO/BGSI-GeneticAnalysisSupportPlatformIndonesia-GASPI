import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClinicResultsComponent } from './clinic-results.component';

describe('ClinicResultsComponent', () => {
  let component: ClinicResultsComponent;
  let fixture: ComponentFixture<ClinicResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClinicResultsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ClinicResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
