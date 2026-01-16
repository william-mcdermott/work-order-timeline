import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild } from '@angular/core';

import { TimelineHeaderComponent } from './timeline-header/timeline-header';
import { TimelineGridComponent } from './timeline-grid/timeline-grid';
import {
  WorkOrderPanelComponent,
  PanelMode,
  WorkOrderPanelInput,
  WorkOrderPanelSubmit,
  WorkOrderStatus,
} from './work-order-panel/work-order-panel';

type Timescale = 'day' | 'week' | 'month';

type WorkCenter = {
  id: string;
  name: string;
};

type TimelineColumn = {
  key: string;
  label: string;
  days: number;
};

type WorkOrder = {
  id: string;
  workCenterId: string;
  name: string;
  status: WorkOrderStatus;
  startDate: string; // ISO
  endDate: string; // ISO
};

type BarMenuTogglePayload = {
  id: string;
  rect: DOMRect;
  event: MouseEvent;
};

@Component({
  selector: 'app-work-order-timeline',
  standalone: true,
  imports: [CommonModule, TimelineHeaderComponent, TimelineGridComponent, WorkOrderPanelComponent],
  templateUrl: './work-order-timeline.html',
  styleUrls: ['./work-order-timeline.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkOrderTimelineComponent {
  title = 'Work Orders';

  @ViewChild('scrollEl', { static: true })
  scrollEl!: ElementRef<HTMLDivElement>;

  private readonly LS_KEY = 'work-order-timeline.workOrders.v1';

  workCenters: WorkCenter[] = [
    { id: 'wc-1', name: 'Extrusion Line A' },
    { id: 'wc-2', name: 'CNC Machine 1' },
    { id: 'wc-3', name: 'Assembly Station' },
    { id: 'wc-4', name: 'Quality Control' },
    { id: 'wc-5', name: 'Packaging Line' },
  ];

  workOrders: WorkOrder[] = [
    { id: 'wo-1', workCenterId: 'wc-1', name: 'Extrude Batch 1042', status: 'complete', startDate: '2026-01-03', endDate: '2026-01-06' },
    { id: 'wo-2', workCenterId: 'wc-1', name: 'Extrude Batch 1043', status: 'open', startDate: '2026-01-09', endDate: '2026-01-12' },
    { id: 'wo-3', workCenterId: 'wc-1', name: 'Extrude Batch 1044', status: 'in-progress', startDate: '2026-01-15', endDate: '2026-01-19' },
    { id: 'wo-4', workCenterId: 'wc-2', name: 'Mill Housing A', status: 'in-progress', startDate: '2026-01-07', endDate: '2026-01-13' },
    { id: 'wo-5', workCenterId: 'wc-2', name: 'Drill Plate Set 2', status: 'blocked', startDate: '2026-01-16', endDate: '2026-01-18' },
    { id: 'wo-6', workCenterId: 'wc-3', name: 'Assemble Unit K', status: 'open', startDate: '2026-01-05', endDate: '2026-01-08' },
    { id: 'wo-7', workCenterId: 'wc-3', name: 'Assemble Unit L', status: 'complete', startDate: '2026-01-10', endDate: '2026-01-11' },
    { id: 'wo-8', workCenterId: 'wc-3', name: 'Assemble Unit M', status: 'blocked', startDate: '2026-01-21', endDate: '2026-01-24' },
  ];

  timescale: Timescale = 'day';
  pixelsPerDay = 56;
  totalDays = 29;

  timelineStartDate = startOfDay(addDays(new Date(), -14));
  columns: TimelineColumn[] = [];

  /* Bar action menu (fixed-position) */
  openMenuBarId: string | null = null;
  menuRect: DOMRect | null = null;

  /* Timescale dropdown UI */
  timescaleOpen = false;
  readonly timescaleOptions: Array<{ label: string; value: 'hour' | 'day' | 'week' | 'month' }> = [
    { label: 'Hour', value: 'hour' }, // shown in design
    { label: 'Day', value: 'day' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
  ];

  get timescaleLabel(): string {
    if (this.timescale === 'day') return 'Day';
    if (this.timescale === 'week') return 'Week';
    return 'Month';
  }

  toggleTimescale(evt: MouseEvent) {
    evt.stopPropagation();
    this.timescaleOpen = !this.timescaleOpen;
  }

  selectTimescale(value: 'hour' | 'day' | 'week' | 'month', evt?: MouseEvent) {
    evt?.stopPropagation();
    this.timescaleOpen = false;
    if (value === 'hour') {
      // @upgrade: hour view isn't required by spec; implement later if desired.
      return;
    }
    this.setTimescale(value);
  }

  /* Panel state */
  panelOpen = false;
  panelMode: PanelMode = 'create';
  panelEditingId: string | null = null;
  panelInitial: WorkOrderPanelInput | null = null;
  panelExternalError: string | null = null;

  constructor() {
    const saved = this.loadWorkOrders();
    if (saved) this.workOrders = saved;

    this.applyTimescale(this.timescale);
    queueMicrotask(() => this.centerOnToday());
  }

  trackById = (_: number, item: { id: string }) => item.id;

  onPanelChanged() {
    this.panelExternalError = null;
  }

  setTimescale(ts: Timescale) {
    if (ts === this.timescale) return;
    this.timescale = ts;
    this.applyTimescale(ts);
    queueMicrotask(() => this.centerOnToday());
  }

  private applyTimescale(ts: Timescale) {
    if (ts === 'day') {
      this.pixelsPerDay = 56;
      this.totalDays = 29;
      this.columns = this.buildDayColumns(this.totalDays);
    } else if (ts === 'week') {
      this.pixelsPerDay = 20;
      this.totalDays = 112;
      this.columns = this.buildWeekColumns(this.totalDays);
    } else {
      this.pixelsPerDay = 8;
      this.totalDays = 365;
      this.columns = this.buildMonthColumns(this.totalDays);
    }
  }

  totalWidthPx() {
    return this.totalDays * this.pixelsPerDay;
  }

  headerColumns() {
    return this.columns.map((c) => ({
      key: c.key,
      label: c.label,
      widthPx: c.days * this.pixelsPerDay,
    }));
  }

  gridColumns() {
    return this.columns.map((c) => ({
      key: c.key,
      widthPx: c.days * this.pixelsPerDay,
    }));
  }

  barsVm() {
    return this.workOrders.map((w) => ({
      id: w.id,
      workCenterId: w.workCenterId,
      name: w.name,
      status: w.status,
      startDay: diffDays(this.timelineStartDate, parseIso(w.startDate)),
      endDay: diffDays(this.timelineStartDate, parseIso(w.endDate)),
    }));
  }

  todayLineLeftPx() {
    return diffDays(this.timelineStartDate, startOfDay(new Date())) * this.pixelsPerDay;
  }

  openCreateFromClick(workCenterId: string, evt: MouseEvent) {
    const rect = (evt.currentTarget as HTMLElement).getBoundingClientRect();
    const x = evt.clientX - rect.left + this.scrollEl.nativeElement.scrollLeft;
    const day = Math.floor(x / this.pixelsPerDay);

    this.panelMode = 'create';
    this.panelEditingId = null;
    this.panelExternalError = null;
    this.panelInitial = {
      workCenterId,
      name: '',
      status: 'open',
      startDate: toIso(addDays(this.timelineStartDate, day)),
      endDate: toIso(addDays(this.timelineStartDate, day + 6)),
    };
    this.panelOpen = true;
  }

  openEdit(id: string) {
    const w = this.workOrders.find((x) => x.id === id);
    if (!w) return;

    this.panelMode = 'edit';
    this.panelEditingId = id;
    this.panelExternalError = null;
    this.panelInitial = { ...w };
    this.panelOpen = true;
  }

  deleteBar(id: string) {
    this.workOrders = this.workOrders.filter((w) => w.id !== id);
    this.saveWorkOrders();
  }

  onPanelSubmit(value: WorkOrderPanelSubmit) {
    const candidate: WorkOrder = {
      id: this.panelEditingId ?? crypto.randomUUID(),
      ...value,
    };

    if (this.hasOverlap(candidate, this.panelEditingId ?? undefined)) {
      this.panelExternalError = 'Work orders cannot overlap on the same work center.';
      return;
    }

    if (this.panelMode === 'create') {
      this.workOrders = [...this.workOrders, candidate];
    } else {
      this.workOrders = this.workOrders.map((w) => (w.id === candidate.id ? candidate : w));
    }

    this.saveWorkOrders();
    this.closePanel();
  }

  closePanel() {
    this.panelOpen = false;
    this.panelInitial = null;
    this.panelEditingId = null;
    this.panelExternalError = null;
  }

  /* Receive fixed-position menu anchor rect from bar */
  onToggleMenu(payload: BarMenuTogglePayload) {
    payload.event.stopPropagation();

    if (this.openMenuBarId === payload.id) {
      this.openMenuBarId = null;
      this.menuRect = null;
      return;
    }

    this.openMenuBarId = payload.id;
    this.menuRect = payload.rect;
  }

  onGlobalClick() {
    this.openMenuBarId = null;
    this.menuRect = null;
    this.timescaleOpen = false;
  }

  private hasOverlap(candidate: WorkOrder, excludeId?: string) {
    const aStart = parseIso(candidate.startDate);
    const aEnd = parseIso(candidate.endDate);

    return this.workOrders
      .filter((w) => w.workCenterId === candidate.workCenterId && w.id !== excludeId)
      .some((w) => {
        const bStart = parseIso(w.startDate);
        const bEnd = parseIso(w.endDate);
        return aStart <= bEnd && bStart <= aEnd;
      });
  }

  private centerOnToday() {
    const el = this.scrollEl.nativeElement;
    el.scrollLeft = this.todayLineLeftPx() - el.clientWidth / 2;
  }

  private loadWorkOrders(): WorkOrder[] | null {
    try {
      const raw = localStorage.getItem(this.LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private saveWorkOrders() {
    localStorage.setItem(this.LS_KEY, JSON.stringify(this.workOrders));
  }

  private buildDayColumns(total: number): TimelineColumn[] {
    return Array.from({ length: total }).map((_, i) => ({
      key: `d-${i}`,
      label: toShortDate(addDays(this.timelineStartDate, i)),
      days: 1,
    }));
  }

  private buildWeekColumns(totalDays: number): TimelineColumn[] {
    const weeks = Math.ceil(totalDays / 7);
    return Array.from({ length: weeks }).map((_, i) => {
      const start = addDays(this.timelineStartDate, i * 7);
      const end = addDays(start, 6);
      return {
        key: `w-${i}`,
        label: `${toShortDate(start)}–${toShortDate(end)}`,
        days: 7,
      };
    });
  }

  private buildMonthColumns(totalDays: number): TimelineColumn[] {
    const cols: TimelineColumn[] = [];
    let cursor = this.timelineStartDate;

    while (diffDays(this.timelineStartDate, cursor) < totalDays) {
      const start = new Date(cursor);
      const month = start.getMonth();
      let days = 0;

      while (cursor.getMonth() === month) {
        cursor = addDays(cursor, 1);
        days++;
      }

      cols.push({
        key: `m-${start.getFullYear()}-${month}`,
        label: start.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
        days,
      });
    }
    return cols;
  }
}

/* helpers */
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function diffDays(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
function parseIso(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function toShortDate(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
