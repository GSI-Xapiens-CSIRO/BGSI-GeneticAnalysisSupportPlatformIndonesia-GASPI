import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IgvViewerComponent } from './igv-viewer.component';

describe('IgvViewerComponent', () => {
  let component: IgvViewerComponent;
  let fixture: ComponentFixture<IgvViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IgvViewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(IgvViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
