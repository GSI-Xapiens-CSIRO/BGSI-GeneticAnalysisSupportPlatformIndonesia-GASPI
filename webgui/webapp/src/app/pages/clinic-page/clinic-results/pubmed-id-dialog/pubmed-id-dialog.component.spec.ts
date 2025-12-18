import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PubmedIdDialogComponent } from './pubmed-id-dialog.component';

describe('PubmedIdDialogComponent', () => {
  let component: PubmedIdDialogComponent;
  let fixture: ComponentFixture<PubmedIdDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PubmedIdDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PubmedIdDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
