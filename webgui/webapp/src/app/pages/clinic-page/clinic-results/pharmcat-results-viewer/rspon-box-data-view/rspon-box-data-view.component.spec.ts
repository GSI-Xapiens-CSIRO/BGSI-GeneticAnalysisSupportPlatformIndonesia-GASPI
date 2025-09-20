import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RsponBoxDataViewComponent } from './rspon-box-data-view.component';

describe('RsponBoxDataViewComponent', () => {
  let component: RsponBoxDataViewComponent;
  let fixture: ComponentFixture<RsponBoxDataViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RsponBoxDataViewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RsponBoxDataViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
