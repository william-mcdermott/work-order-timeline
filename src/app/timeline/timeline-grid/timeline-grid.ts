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
    // Only emit mouse events to the parent (parent uses clientX math)
    if (evt instanceof MouseEvent) {
      this.rowClick.emit({ workCenterId, event: evt });
    } else {
      // Keyboard activation: use center of track as click position
      const el = evt.currentTarget as HTMLElement | null;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const synthetic = new MouseEvent('click', {
        bubbles: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      });

      this.rowClick.emit({ workCenterId, event: synthetic });
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

  trackByWc = (_: number, wc: WorkCenter) => wc.id;
  trackById = (_: number, b: WorkOrderBarVM) => b.id;
}
