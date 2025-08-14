import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdvacedFilterPageComponent } from './advanced-filter-page.component';

describe('AdvacedFilterPageComponent', () => {
  let component: AdvacedFilterPageComponent;
  let fixture: ComponentFixture<AdvacedFilterPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdvacedFilterPageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdvacedFilterPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
