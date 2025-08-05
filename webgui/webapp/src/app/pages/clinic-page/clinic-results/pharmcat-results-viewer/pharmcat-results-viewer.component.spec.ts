import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PharmcatResultsViewerComponent } from './pharmcat-results-viewer.component';

describe('PharmcatResultsViewerComponent', () => {
  let component: PharmcatResultsViewerComponent;
  let fixture: ComponentFixture<PharmcatResultsViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PharmcatResultsViewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PharmcatResultsViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
