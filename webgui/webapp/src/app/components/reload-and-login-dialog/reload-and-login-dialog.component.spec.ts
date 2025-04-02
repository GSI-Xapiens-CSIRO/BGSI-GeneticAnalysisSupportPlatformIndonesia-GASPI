import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReloadAndLoginDialogComponent } from './reload-and-login-dialog.component';

describe('ReloadAndLoginDialogComponent', () => {
  let component: ReloadAndLoginDialogComponent;
  let fixture: ComponentFixture<ReloadAndLoginDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReloadAndLoginDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ReloadAndLoginDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
