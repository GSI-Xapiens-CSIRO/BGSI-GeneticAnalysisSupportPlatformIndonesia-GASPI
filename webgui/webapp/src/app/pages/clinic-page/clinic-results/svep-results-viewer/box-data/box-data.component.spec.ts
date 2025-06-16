import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoxDataComponent } from './box-data.component';

describe('BoxDataComponent', () => {
  let component: BoxDataComponent;
  let fixture: ComponentFixture<BoxDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoxDataComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BoxDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
