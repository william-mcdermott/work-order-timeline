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
  @Input() openMenuBarId: string | null = null;
  @Input({ required: true }) timescale!: 'day' | 'week' | 'month';
  @Output() rowClick = new EventEmitter<{ workCenterId: string; event: MouseEvent }>();
  @Output() toggleMenu = new EventEmitter<BarMenuTogglePayload>();
  @Output() edit = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();

  barsFor(workCenterId: string) {
    return this.bars.filter((b) => b.workCenterId === workCenterId);
  }

  onRowClick(workCenterId: string, evt: Event) {
    // only emit mouse clicks (has coords)
    if (evt instanceof MouseEvent) {
      this.rowClick.emit({ workCenterId, event: evt });
    }
  }

  onRowKeyCreate(workCenterId: string) {
    // keyboard create: parent should default to "today" or center-of-viewport
    this.rowClick.emit({ workCenterId, event: null as unknown as MouseEvent });
  }

  onToggleMenu(payload: BarMenuTogglePayload) {
    this.toggleMenu.emit(payload);
  }

  get colWidthPx(): number {
    // columns are already in px, so a “day width” var is no longer needed.
    // Use a sensible default gridline width for styling.
    return 56;
  }

  onTrackMove(evt: MouseEvent) {
    const el = evt.currentTarget as HTMLElement;

    const rect = el.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;

    el.style.setProperty('--hint-x', `${x}px`);
    el.style.setProperty('--hint-y', `${y}px`);
  }

  onTrackLeave(evt: MouseEvent) {
    const el = evt.currentTarget as HTMLElement;
    el.style.removeProperty('--hint-x');
    el.style.removeProperty('--hint-y');
  }

  trackByWc = (_: number, wc: WorkCenter) => wc.id;
  trackById = (_: number, b: WorkOrderBarVM) => b.id;
}
