import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type TimelineColumnVm = {
  key: string;
  label: string;
  widthPx: number;
};

@Component({
  selector: 'app-timeline-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './timeline-header.html',
  styleUrls: ['./timeline-header.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineHeaderComponent {
  @Input({ required: true }) columns!: TimelineColumnVm[];
}
