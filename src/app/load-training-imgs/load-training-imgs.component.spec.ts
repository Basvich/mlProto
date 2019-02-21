import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LoadTrainingImgsComponent } from './load-training-imgs.component';

describe('LoadTrainingImgsComponent', () => {
  let component: LoadTrainingImgsComponent;
  let fixture: ComponentFixture<LoadTrainingImgsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LoadTrainingImgsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LoadTrainingImgsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
