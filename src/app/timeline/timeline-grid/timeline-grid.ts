import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { WorkOrderBarComponent } from '../work-order-bar/work-order-bar';

export type WorkCenterVm = { id: string; name: string };

export type TimelineColumnVm = {
  key: string;
  widthPx: number;
};

export type WorkOrderStatus = 'open' | 'in-progress' | 'complete' | 'blocked';

export type WorkOrderBarVm = {
  id: string;
  workCenterId: string;
  name: string;
  status: WorkOrderStatus;
  startDay: number;
  endDay: number; // inclusive
};

@Component({
  selector: 'app-timeline-grid',
  standalone: true,
  imports: [CommonModule, WorkOrderBarComponent],
  templateUrl: './timeline-grid.html',
  styleUrls: ['./timeline-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineGridComponent {
  @Input({ required: true }) workCenters!: WorkCenterVm[];
  @Input({ required: true }) columns!: TimelineColumnVm[];
  @Input({ required: true }) bars!: WorkOrderBarVm[];

  @Input({ required: true }) pixelsPerDay!: number;

  /** Which bar’s actions menu is currently open */
  @Input() openMenuBarId: string | null = null;

  /** Row click → parent opens create panel */
  @Output() rowClick = new EventEmitter<{ workCenterId: string; event: MouseEvent }>();

  /** Bar actions */
  @Output() toggleMenu = new EventEmitter<{ id: string; event: MouseEvent }>();
  @Output() edit = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();

  trackByWc = (_: number, wc: WorkCenterVm) => wc.id;
  trackByCol = (_: number, c: TimelineColumnVm) => c.key;
  trackByBar = (_: number, b: WorkOrderBarVm) => b.id;

  barsFor(workCenterId: string): WorkOrderBarVm[] {
    return this.bars.filter(b => b.workCenterId === workCenterId);
  }

  barLeftPx(b: WorkOrderBarVm): number {
    return b.startDay * this.pixelsPerDay + 8;
  }

  barWidthPx(b: WorkOrderBarVm): number {
    const daysInclusive = (b.endDay - b.startDay) + 1;
    return Math.max(1, daysInclusive * this.pixelsPerDay - 16);
  }

  onRowClick(workCenterId: string, evt: MouseEvent) {
    this.rowClick.emit({ workCenterId, event: evt });
  }
}
