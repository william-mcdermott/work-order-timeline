import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
} from '@angular/core';

import { TimelineHeaderComponent, TimelineColumnVm as HeaderColumnVm } from './timeline-header/timeline-header';
import { TimelineGridComponent, TimelineColumnVm as GridColumnVm } from './timeline-grid/timeline-grid';
import {
  WorkOrderPanelComponent,
  PanelMode,
  WorkOrderPanelInput,
  WorkOrderPanelSubmit,
  WorkOrderStatus,
} from './work-order-panel/work-order-panel';

/* ================================
   Types
   ================================ */

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
  endDate: string;   // ISO
};

/* ================================
   Component
   ================================ */

@Component({
  selector: 'app-work-order-timeline',
  standalone: true,
  imports: [
    CommonModule,
    TimelineHeaderComponent,
    TimelineGridComponent,
    WorkOrderPanelComponent,
  ],
  templateUrl: './work-order-timeline.html',
  styleUrls: ['./work-order-timeline.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkOrderTimelineComponent {
  title = 'Work Orders';

  @ViewChild('scrollEl', { static: true })
  scrollEl!: ElementRef<HTMLDivElement>;

  /* ================================
     Static data
     ================================ */

  workCenters: WorkCenter[] = [
    { id: 'wc-1', name: 'Extrusion Line A' },
    { id: 'wc-2', name: 'CNC Machine 1' },
    { id: 'wc-3', name: 'Assembly Station' },
    { id: 'wc-4', name: 'Quality Control' },
    { id: 'wc-5', name: 'Packaging Line' },
  ];

  workOrders: WorkOrder[] = [
    {
      id: 'wo-1',
      workCenterId: 'wc-1',
      name: 'Extrude Batch 1042',
      status: 'complete',
      startDate: '2026-01-10',
      endDate: '2026-01-14',
    },
    {
      id: 'wo-2',
      workCenterId: 'wc-1',
      name: 'Extrude Batch 1043',
      status: 'open',
      startDate: '2026-01-18',
      endDate: '2026-01-20',
    },
    {
      id: 'wo-3',
      workCenterId: 'wc-3',
      name: 'Assemble Unit K',
      status: 'in-progress',
      startDate: '2026-01-13',
      endDate: '2026-01-17',
    },
  ];

  /* ================================
     Timeline state
     ================================ */

  timescale: Timescale = 'day';
  pixelsPerDay = 56;
  totalDays = 29;

  /** Day 0 anchor for the timeline */
  timelineStartDate = startOfDay(addDays(new Date(), -14));

  columns: TimelineColumn[] = [];

  /* ================================
     UI state
     ================================ */

  openMenuBarId: string | null = null;

  panelOpen = false;
  panelMode: PanelMode = 'create';
  panelEditingId: string | null = null;
  panelInitial: WorkOrderPanelInput | null = null;
  panelExternalError: string | null = null;

  constructor() {
    this.applyTimescale(this.timescale);
    queueMicrotask(() => this.centerOnToday());
  }

  /* ================================
     Zoom / Columns
     ================================ */

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
      return;
    }

    if (ts === 'week') {
      this.pixelsPerDay = 20;
      this.totalDays = 112;
      this.columns = this.buildWeekColumns(this.totalDays);
      return;
    }

    this.pixelsPerDay = 8;
    this.totalDays = 365;
    this.columns = this.buildMonthColumns(this.totalDays);
  }

  totalWidthPx(): number {
    return this.totalDays * this.pixelsPerDay;
  }

  colWidthPx(c: TimelineColumn): number {
    return c.days * this.pixelsPerDay;
  }

  headerColumns(): HeaderColumnVm[] {
    return this.columns.map(c => ({
      key: c.key,
      label: c.label,
      widthPx: this.colWidthPx(c),
    }));
  }

  gridColumns(): GridColumnVm[] {
    return this.columns.map(c => ({
      key: c.key,
      widthPx: this.colWidthPx(c),
    }));
  }

  /* ================================
     Date ↔ pixel helpers
     ================================ */

  dateToDayIndex(iso: string): number {
    const d = parseIso(iso);
    return diffDays(this.timelineStartDate, d);
  }

  dayIndexToIso(dayIndex: number): string {
    return toIso(addDays(this.timelineStartDate, dayIndex));
  }

  todayLineLeftPx(): number {
    const todayIndex = diffDays(this.timelineStartDate, startOfDay(new Date()));
    return todayIndex * this.pixelsPerDay + this.pixelsPerDay / 2;
  }

  private centerOnToday() {
    const el = this.scrollEl?.nativeElement;
    if (!el) return;
    const target = this.todayLineLeftPx() - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, target);
  }

  /* ================================
     Grid → bars mapping
     ================================ */

  barsVm() {
    return this.workOrders.map(w => ({
      id: w.id,
      workCenterId: w.workCenterId,
      name: w.name,
      status: w.status,
      startDay: this.dateToDayIndex(w.startDate),
      endDay: this.dateToDayIndex(w.endDate),
    }));
  }

  /* ================================
     Create / Edit
     ================================ */

  openCreateFromClick(workCenterId: string, evt: MouseEvent) {
    this.closeMenu();

    const track = evt.currentTarget as HTMLElement;
    const rect = track.getBoundingClientRect();
    const x = evt.clientX - rect.left + this.scrollEl.nativeElement.scrollLeft;
    const dayIndex = Math.floor(x / this.pixelsPerDay);

    const startIso = this.dayIndexToIso(dayIndex);
    const endIso = this.dayIndexToIso(dayIndex + 6);

    this.panelMode = 'create';
    this.panelEditingId = null;
    this.panelExternalError = null;
    this.panelInitial = {
      workCenterId,
      name: '',
      status: 'open',
      startDate: startIso,
      endDate: endIso,
    };
    this.panelOpen = true;
  }

  openEdit(id: string) {
    const w = this.workOrders.find(o => o.id === id);
    if (!w) return;

    this.closeMenu();

    this.panelMode = 'edit';
    this.panelEditingId = id;
    this.panelExternalError = null;
    this.panelInitial = { ...w };
    this.panelOpen = true;
  }

  deleteBar(id: string) {
    this.closeMenu();
    this.workOrders = this.workOrders.filter(w => w.id !== id);
  }

  /* ================================
     Panel events
     ================================ */

  onPanelSubmit(value: WorkOrderPanelSubmit) {
    const candidate: WorkOrder = {
      id: this.panelEditingId ?? crypto.randomUUID(),
      ...value,
    };

    const excludeId = this.panelMode === 'edit' ? this.panelEditingId ?? undefined : undefined;

    if (this.hasOverlap(candidate, excludeId)) {
      this.panelExternalError = 'Work orders cannot overlap on the same work center.';
      return;
    }

    if (this.panelMode === 'create') {
      this.workOrders = [...this.workOrders, candidate];
    } else {
      this.workOrders = this.workOrders.map(w => (w.id === candidate.id ? candidate : w));
    }

    this.closePanel();
  }

  onPanelChanged() {
    this.panelExternalError = null;
  }

  closePanel() {
    this.panelOpen = false;
    this.panelInitial = null;
    this.panelEditingId = null;
    this.panelExternalError = null;
  }

  /* ================================
     Menu
     ================================ */

  toggleMenu(id: string, evt: MouseEvent) {
    evt.stopPropagation();
    this.openMenuBarId = this.openMenuBarId === id ? null : id;
  }

  closeMenu() {
    this.openMenuBarId = null;
  }

  onGlobalClick() {
    this.closeMenu();
  }

  /* ================================
     Overlap
     ================================ */

  hasOverlap(candidate: WorkOrder, excludeId?: string): boolean {
    const aStart = parseIso(candidate.startDate);
    const aEnd = parseIso(candidate.endDate);

    return this.workOrders
      .filter(w => w.workCenterId === candidate.workCenterId)
      .filter(w => w.id !== excludeId)
      .some(w => {
        const bStart = parseIso(w.startDate);
        const bEnd = parseIso(w.endDate);
        return aStart <= bEnd && bStart <= aEnd;
      });
  }

  /* ================================
     Columns builders
     ================================ */

  private buildDayColumns(total: number): TimelineColumn[] {
    return Array.from({ length: total }).map((_, i) => ({
      key: `d-${i}`,
      label: toShortDate(addDays(this.timelineStartDate, i)),
      days: 1,
    }));
  }

  private buildWeekColumns(totalDays: number): TimelineColumn[] {
    const weeks = Math.ceil(totalDays / 7);
    return Array.from({ length: weeks }).map((_, i) => ({
      key: `w-${i}`,
      label: `Week ${i + 1}`,
      days: 7,
    }));
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

  trackById = (_: number, wc: WorkCenter) => wc.id;
}

/* ================================
   Date helpers
   ================================ */

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toShortDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
