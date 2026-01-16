import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

export type WorkOrderStatus = 'open' | 'in-progress' | 'complete' | 'blocked';

export type WorkOrderBarVM = {
  id: string;
  workCenterId: string;
  name: string;
  status: WorkOrderStatus;
  startDay: number;
  endDay: number;
  // add these for tooltip display
  startDate: string; // ISO
  endDate: string;   // ISO
};

export type BarMenuTogglePayload = {
  id: string;
  rect: DOMRect;
  event: MouseEvent;
};

@Component({
  selector: 'app-work-order-bar',
  standalone: true,
  imports: [CommonModule, NgbTooltipModule],
  templateUrl: './work-order-bar.html',
  styleUrls: ['./work-order-bar.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkOrderBarComponent {
  @Input({ required: true }) bar!: WorkOrderBarVM;
  @Input({ required: true }) pixelsPerDay!: number;

  @Input() menuOpen = false;

  @Output() toggleMenu = new EventEmitter<BarMenuTogglePayload>();
  @Output() edit = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();

  get leftPx(): number {
    return this.bar.startDay * this.pixelsPerDay;
  }

  get widthPx(): number {
    const days = Math.max(1, this.bar.endDay - this.bar.startDay + 1);
    return days * this.pixelsPerDay;
  }

  statusLabel(): string {
    switch (this.bar.status) {
      case 'open':
        return 'Open';
      case 'in-progress':
        return 'In Progress';
      case 'complete':
        return 'Complete';
      case 'blocked':
        return 'Blocked';
    }
  }

  onKebabClick(evt: MouseEvent) {
    evt.stopPropagation();
    const rect = (evt.currentTarget as HTMLElement).getBoundingClientRect();
    this.toggleMenu.emit({ id: this.bar.id, rect, event: evt });
  }

  onEditClick(evt: MouseEvent) {
    evt.stopPropagation();
    this.edit.emit(this.bar.id);
  }

  onDeleteClick(evt: MouseEvent) {
    evt.stopPropagation();
    this.delete.emit(this.bar.id);
  }
}
