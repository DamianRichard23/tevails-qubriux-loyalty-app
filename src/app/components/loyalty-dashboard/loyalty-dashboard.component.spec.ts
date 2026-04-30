import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoyaltyDashboardComponent } from './loyalty-dashboard.component';

describe('LoyaltyDashboardComponent', () => {
  let component: LoyaltyDashboardComponent;
  let fixture: ComponentFixture<LoyaltyDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoyaltyDashboardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LoyaltyDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
