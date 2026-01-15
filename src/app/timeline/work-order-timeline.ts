import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

type WorkCenter = { id: string; name: string };
type WorkOrderStatus = 'open' | 'in-progress' | 'complete' | 'blocked';

type WorkOrderBar = {
  id: string;
  workCenterId: string;
  name: string;
  status: WorkOrderStatus;
  // static positioning for now
  leftPx: number;
  widthPx: number;
};

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

  columns = Array.from({ length: 14 }).map((_, i) => ({
    key: `d${i + 1}`,
    label: `Day ${i + 1}`,
  }));

  todayIndex = 9;
  colWidth = 72;

  // Hardcoded bars (use multiples of colWidth to make it easy to reason about)
  bars: WorkOrderBar[] = [
    {
      id: 'wo-1',
      workCenterId: 'wc-1',
      name: 'Extrude Batch 1042',
      status: 'complete',
      leftPx: 1 * this.colWidth + 8,
      widthPx: 4 * this.colWidth - 16,
    },
    {
      id: 'wo-2',
      workCenterId: 'wc-1',
      name: 'Extrude Batch 1043',
      status: 'open',
      leftPx: 6 * this.colWidth + 8,
      widthPx: 3 * this.colWidth - 16,
    },
    {
      id: 'wo-3',
      workCenterId: 'wc-2',
      name: 'Mill Housing A',
      status: 'in-progress',
      leftPx: 5 * this.colWidth + 8,
      widthPx: 6 * this.colWidth - 16,
    },
    {
      id: 'wo-4',
      workCenterId: 'wc-3',
      name: 'Assemble Unit K',
      status: 'open',
      leftPx: 2 * this.colWidth + 8,
      widthPx: 2 * this.colWidth - 16,
    },
    {
      id: 'wo-5',
      workCenterId: 'wc-3',
      name: 'Assemble Unit L',
      status: 'blocked',
      leftPx: 6 * this.colWidth + 8,
      widthPx: 3 * this.colWidth - 16,
    },
    {
      id: 'wo-6',
      workCenterId: 'wc-4',
      name: 'QC Audit 7A',
      status: 'in-progress',
      leftPx: 0 * this.colWidth + 8,
      widthPx: 9 * this.colWidth - 16,
    },
  ];

  barsFor(workCenterId: string): WorkOrderBar[] {
    return this.bars.filter(b => b.workCenterId === workCenterId);
  }

  trackById = (_: number, wc: WorkCenter) => wc.id;
  trackByKey = (_: number, c: { key: string }) => c.key;
  trackByBar = (_: number, b: WorkOrderBar) => b.id;
}
