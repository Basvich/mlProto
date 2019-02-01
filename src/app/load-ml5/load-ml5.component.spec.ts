import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LoadMl5Component } from './load-ml5.component';

describe('LoadMl5Component', () => {
  let component: LoadMl5Component;
  let fixture: ComponentFixture<LoadMl5Component>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LoadMl5Component ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LoadMl5Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
