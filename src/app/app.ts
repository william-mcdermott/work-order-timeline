import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WorkOrderTimelineComponent } from './timeline/work-order-timeline';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, WorkOrderTimelineComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App {
  protected readonly title = signal('work-order-timeline');
}
