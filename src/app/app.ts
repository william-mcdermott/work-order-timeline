import { Component, signal } from '@angular/core';
import { WorkOrderTimelineComponent } from './timeline/work-order-timeline';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [WorkOrderTimelineComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App {
  protected readonly title = signal('work-order-timeline');
}
