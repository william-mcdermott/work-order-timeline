import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

type WorkCenter = { id: string; name: string };

@Component({
  selector: 'app-work-order-timeline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './work-order-timeline.html',
  styleUrls: ['./work-order-timeline.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkOrderTimelineComponent {
  title = 'Work Orders';

  workCenters: WorkCenter[] = [
    { id: 'wc-1', name: 'Extrusion Line A' },
    { id: 'wc-2', name: 'CNC Machine 1' },
    { id: 'wc-3', name: 'Assembly Station' },
    { id: 'wc-4', name: 'Quality Control' },
    { id: 'wc-5', name: 'Packaging Line' },
  ];

  // Hardcoded columns (static)
  columns = [
    { key: 'd1', label: 'Mon 1' },
    { key: 'd2', label: 'Tue 2' },
    { key: 'd3', label: 'Wed 3' },
    { key: 'd4', label: 'Thu 4' },
    { key: 'd5', label: 'Fri 5' },
    { key: 'd6', label: 'Sat 6' },
    { key: 'd7', label: 'Sun 7' },
    { key: 'd8', label: 'Mon 8' },
    { key: 'd9', label: 'Tue 9' },
    { key: 'd10', label: 'Wed 10' },
    { key: 'd11', label: 'Thu 11' },
    { key: 'd12', label: 'Fri 12' },
    { key: 'd13', label: 'Sat 13' },
    { key: 'd14', label: 'Sun 14' },
  ];

  // Hardcoded "today" (1-based day index here)
  todayIndex = 9; // vertical line will show over "Tue 9"

  // width of a single column in px (static)
  colWidth = 72;

  trackById = (_: number, wc: WorkCenter) => wc.id;
  trackByKey = (_: number, c: { key: string }) => c.key;
}
