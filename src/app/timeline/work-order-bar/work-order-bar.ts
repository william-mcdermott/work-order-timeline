import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export type WorkOrderStatus = 'open' | 'in-progress' | 'complete' | 'blocked';

export type WorkOrderBarVm = {
  id: string;
  name: string;
  status: WorkOrderStatus;
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
  @Input({ required: true }) leftPx!: number;
  @Input({ required: true }) widthPx!: number;

  /** Whether the 3-dot menu is open for this bar */
  @Input() menuOpen = false;

  @Output() toggleMenu = new EventEmitter<{ id: string; event: MouseEvent }>();
  @Output() edit = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();

  stop(evt: MouseEvent) {
    evt.stopPropagation();
  }

  onToggleMenu(evt: MouseEvent) {
    evt.stopPropagation();
    this.toggleMenu.emit({ id: this.bar.id, event: evt });
  }

  onEdit(evt: MouseEvent) {
    evt.stopPropagation();
    this.edit.emit(this.bar.id);
  }

  onDelete(evt: MouseEvent) {
    evt.stopPropagation();
    this.delete.emit(this.bar.id);
  }
}
