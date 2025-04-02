import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClinicIGVComponent } from './clinic-igv.component';

describe('ClinicIGVComponent', () => {
  let component: ClinicIGVComponent;
  let fixture: ComponentFixture<ClinicIGVComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClinicIGVComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ClinicIGVComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
