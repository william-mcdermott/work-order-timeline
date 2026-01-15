import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export type WorkOrderStatus = 'open' | 'in-progress' | 'complete' | 'blocked';

export type WorkOrderBarVm = {
  id: string;
  workCenterId: string;
  name: string;
  status: WorkOrderStatus;
  startDay: number;
  endDay: number;
};

@Component({
  selector: 'app-work-order-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './work-order-bar.html',
  styleUrls: ['./work-order-bar.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkOrderBarComponent {
  @Input({ required: true }) bar!: WorkOrderBarVm;
  @Input({ required: true }) pixelsPerDay!: number;

  /** Controlled by parent so only one menu opens at a time */
  @Input() menuOpen = false;

  @Output() toggleMenu = new EventEmitter<MouseEvent>();
  @Output() edit = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();

  get leftPx(): number {
    return this.bar.startDay * this.pixelsPerDay;
  }

  get widthPx(): number {
    const days = Math.max(1, this.bar.endDay - this.bar.startDay + 1);
    return days * this.pixelsPerDay;
  }

  onToggleMenu(evt: MouseEvent) {
    evt.stopPropagation();
    this.toggleMenu.emit(evt);
  }

  statusLabel(s: WorkOrderStatus): string {
    switch (s) {
      case 'open':
        return 'Open';
      case 'in-progress':
        return 'In progress';
      case 'complete':
        return 'Complete';
      case 'blocked':
        return 'Blocked';
      default:
        return s;
    }
  }
}
