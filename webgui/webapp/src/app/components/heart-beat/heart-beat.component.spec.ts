import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeartBeatComponent } from './heart-beat.component';

describe('HeartBeatComponent', () => {
  let component: HeartBeatComponent;
  let fixture: ComponentFixture<HeartBeatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeartBeatComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HeartBeatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
