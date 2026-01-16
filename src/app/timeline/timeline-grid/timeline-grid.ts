import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import {
  BarMenuTogglePayload,
  WorkOrderBarComponent,
  WorkOrderBarVM,
} from '../work-order-bar/work-order-bar';

type WorkCenter = { id: string; name: string };

export type TimelineColumnVm = {
  key: string;
  widthPx: number;
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
  @Input({ required: true }) workCenters: WorkCenter[] = [];
  @Input({ required: true }) columns: TimelineColumnVm[] = [];

  // ✅ use the bar component VM type (leftPx/widthPx)
  @Input({ required: true }) bars: WorkOrderBarVM[] = [];
  @Input({ required: true }) pixelsPerDay = 56;
  @Input() openMenuBarId: string | null = null;

  @Output() rowClick = new EventEmitter<{ workCenterId: string; event: MouseEvent }>();
  @Output() toggleMenu = new EventEmitter<BarMenuTogglePayload>();
  @Output() edit = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();

  barsFor(workCenterId: string) {
    return this.bars.filter((b) => b.workCenterId === workCenterId);
  }

  onRowClick(workCenterId: string, evt: MouseEvent) {
    this.rowClick.emit({ workCenterId, event: evt });
  }

  onToggleMenu(payload: BarMenuTogglePayload) {
    this.toggleMenu.emit(payload);
  }

  trackByWc = (_: number, wc: WorkCenter) => wc.id;
  trackById = (_: number, b: WorkOrderBarVM) => b.id;
}
