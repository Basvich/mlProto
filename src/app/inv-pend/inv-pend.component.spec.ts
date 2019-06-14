import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InvPendComponent } from './inv-pend.component';

describe('InvPendComponent', () => {
  let component: InvPendComponent;
  let fixture: ComponentFixture<InvPendComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ InvPendComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InvPendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
