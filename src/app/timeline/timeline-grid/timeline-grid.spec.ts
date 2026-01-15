import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimelineGrid } from './timeline-grid';

describe('TimelineGrid', () => {
  let component: TimelineGrid;
  let fixture: ComponentFixture<TimelineGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimelineGrid]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimelineGrid);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
