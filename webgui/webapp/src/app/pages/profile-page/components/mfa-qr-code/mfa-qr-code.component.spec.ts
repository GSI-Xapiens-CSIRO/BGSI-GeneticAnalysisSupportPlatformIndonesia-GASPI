import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MFAQRCodeComponent } from './mfa-qr-code.component';

describe('MFAQRCodeComponent', () => {
  let component: MFAQRCodeComponent;
  let fixture: ComponentFixture<MFAQRCodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MFAQRCodeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MFAQRCodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
