import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BeaconIngestDialogComponent } from './beacon-ingest-dialog.component';

describe('BeaconIngestDialogComponent', () => {
  let component: BeaconIngestDialogComponent;
  let fixture: ComponentFixture<BeaconIngestDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BeaconIngestDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BeaconIngestDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
