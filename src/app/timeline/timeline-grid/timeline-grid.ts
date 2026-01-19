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

  onToggleMenu(payload: BarMenuTogglePayload) {
    this.toggleMenu.emit(payload);
  }

  get colWidthPx(): number {
    // columns are already in px, so a “day width” var is no longer needed.
    // Use a sensible default gridline width for styling.
    return 56;
  }
  private readonly hintWidthPx = 170; // tweak until it matches the pill width
  private readonly hintEdgePadPx = 14;

  onTrackMove(workCenterId: string, evt: MouseEvent, el: HTMLElement) {
    // Only show/move hint on empty rows
    if (this.barsFor(workCenterId).length !== 0) return;

    const rect = el.getBoundingClientRect();
    const xRaw = evt.clientX - rect.left;

    const half = this.hintWidthPx / 2;
    const min = this.hintEdgePadPx + half;
    const max = rect.width - this.hintEdgePadPx - half;

    const x = clamp(xRaw, min, max);
    el.style.setProperty('--hint-x', `${x}px`);
  }

  onTrackLeave(el: HTMLElement) {
    el.style.removeProperty('--hint-x');
  }

  onRowKeyCreate(workCenterId: string, el: HTMLElement) {
    // Center-based synthetic click so parent math doesn't explode
    const rect = el.getBoundingClientRect();
    const clientX = rect.left + rect.width / 2;
    const clientY = rect.top + rect.height / 2;

    const synthetic = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
    });

    this.rowClick.emit({ workCenterId, event: synthetic });
  }
  trackByWc = (_: number, wc: WorkCenter) => wc.id;
  trackById = (_: number, b: WorkOrderBarVM) => b.id;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
