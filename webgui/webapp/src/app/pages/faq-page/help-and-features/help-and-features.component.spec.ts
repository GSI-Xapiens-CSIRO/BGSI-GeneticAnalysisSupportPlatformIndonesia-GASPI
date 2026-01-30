import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HelpAndFeaturesPageComponent } from './help-and-features-page.component';

describe('HelpAndFeaturesPageComponent', () => {
  let component: HelpAndFeaturesPageComponent;
  let fixture: ComponentFixture<HelpAndFeaturesPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HelpAndFeaturesPageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HelpAndFeaturesPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
