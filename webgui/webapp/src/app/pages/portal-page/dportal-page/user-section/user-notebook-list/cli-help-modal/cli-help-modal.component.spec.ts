import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CliHelpModalComponent } from './cli-help-modal.component';

describe('CliHelpModalComponent', () => {
  let component: CliHelpModalComponent;
  let fixture: ComponentFixture<CliHelpModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CliHelpModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CliHelpModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
