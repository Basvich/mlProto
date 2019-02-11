import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { XorTfComponent } from './xor-tf.component';

describe('XorTfComponent', () => {
  let component: XorTfComponent;
  let fixture: ComponentFixture<XorTfComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ XorTfComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(XorTfComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
