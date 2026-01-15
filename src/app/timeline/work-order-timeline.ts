import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild } from '@angular/core';

import { TimelineHeaderComponent, TimelineColumnVm as HeaderColumnVm } from './timeline-header/timeline-header';
import { TimelineGridComponent, TimelineColumnVm as GridColumnVm } from './timeline-grid/timeline-grid';
import {
  WorkOrderPanelComponent,
  PanelMode,
  WorkOrderPanelInput,
  WorkOrderPanelSubmit,
  WorkOrderStatus,
} from './work-order-panel/work-order-panel';

type WorkCenter = { id: string; name: string };
type Timescale = 'day' | 'week' | 'month';

type TimelineColumn = {
  key: string;
  label: string;
  days: number;
};

type WorkOrderBar = {
  id: string;
  workCenterId: string;
  name: string;
  status: WorkOrderStatus;
  startDay: number;
  endDay: number; // inclusive
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

  @ViewChild('scrollEl', { static: true }) scrollEl!: ElementRef<HTMLDivElement>;

  workCenters: WorkCenter[] = [
    { id: 'wc-1', name: 'Extrusion Line A' },
    { id: 'wc-2', name: 'CNC Machine 1' },
    { id: 'wc-3', name: 'Assembly Station' },
    { id: 'wc-4', name: 'Quality Control' },
    { id: 'wc-5', name: 'Packaging Line' },
  ];

  timescale: Timescale = 'day';

  todayDayIndex = 14;
  pixelsPerDay = 56;

  columns: TimelineColumn[] = [];
  totalDays = 29;

  bars: WorkOrderBar[] = [
    { id: 'wo-1', workCenterId: 'wc-1', name: 'Extrude Batch 1042', status: 'complete', startDay: 2, endDay: 6 },
    { id: 'wo-2', workCenterId: 'wc-1', name: 'Extrude Batch 1043', status: 'open', startDay: 9, endDay: 11 },

    { id: 'wo-3', workCenterId: 'wc-2', name: 'Mill Housing A', status: 'in-progress', startDay: 8, endDay: 16 },

    { id: 'wo-4', workCenterId: 'wc-3', name: 'Assemble Unit K', status: 'open', startDay: 5, endDay: 7 },
    { id: 'wo-5', workCenterId: 'wc-3', name: 'Assemble Unit L', status: 'blocked', startDay: 12, endDay: 15 },

    { id: 'wo-6', workCenterId: 'wc-4', name: 'QC Audit 7A', status: 'in-progress', startDay: 0, endDay: 13 },
  ];

  // menu state
  openMenuBarId: string | null = null;

  // panel state (extracted)
  panelOpen = false;
  panelMode: PanelMode = 'create';
  panelEditingId: string | null = null;
  panelInitial: WorkOrderPanelInput | null = null;
  panelExternalError: string | null = null;

  constructor() {
    this.applyTimescale(this.timescale);
    queueMicrotask(() => this.centerScrollOnToday());
  }

  // ---------------- Zoom ----------------

  setTimescale(ts: Timescale) {
    if (this.timescale === ts) return;

    this.timescale = ts;
    this.applyTimescale(ts);

    queueMicrotask(() => this.centerScrollOnToday());
  }

  private applyTimescale(ts: Timescale) {
    if (ts === 'day') {
      this.pixelsPerDay = 56;
      this.totalDays = 29;
      this.todayDayIndex = 14;
      this.columns = this.buildDayColumns(this.totalDays);
      return;
    }

    if (ts === 'week') {
      this.pixelsPerDay = 20;
      this.totalDays = 112;
      this.todayDayIndex = 56;
      this.columns = this.buildWeekColumns(this.totalDays);
      return;
    }

    this.pixelsPerDay = 8;
    this.totalDays = 365;
    this.todayDayIndex = 182;
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

  todayLineLeftPx(): number {
    return this.todayDayIndex * this.pixelsPerDay + this.pixelsPerDay / 2;
  }

  private centerScrollOnToday() {
    const el = this.scrollEl?.nativeElement;
    if (!el) return;
    const target = this.todayLineLeftPx() - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, target);
  }

  // ---------------- Create from click ----------------

  openCreateFromClick(workCenterId: string, evt: MouseEvent) {
    this.closeMenu();

    const trackEl = evt.currentTarget as HTMLElement;
    const rect = trackEl.getBoundingClientRect();
    const xInTrack = evt.clientX - rect.left;

    const scrollLeft = this.scrollEl.nativeElement.scrollLeft;
    const x = xInTrack + scrollLeft;

    const dayIndex = Math.floor(x / this.pixelsPerDay);
    const startDay = this.clampDay(dayIndex);
    const endDay = this.clampDay(startDay + 6);

    this.panelOpen = true;
    this.panelMode = 'create';
    this.panelEditingId = null;
    this.panelExternalError = null;

    this.panelInitial = {
      workCenterId,
      name: '',
      status: 'open',
      startDay,
      endDay,
    };
  }

  // ---------------- Edit / Delete ----------------

  openEdit(barId: string) {
    const bar = this.bars.find(b => b.id === barId);
    if (!bar) return;

    this.closeMenu();

    this.panelOpen = true;
    this.panelMode = 'edit';
    this.panelEditingId = bar.id;
    this.panelExternalError = null;

    this.panelInitial = {
      workCenterId: bar.workCenterId,
      name: bar.name,
      status: bar.status,
      startDay: bar.startDay,
      endDay: bar.endDay,
    };
  }

  deleteBar(barId: string) {
    this.closeMenu();
    this.bars = this.bars.filter(b => b.id !== barId);
  }

  // ---------------- Panel events ----------------

  onPanelClose() {
    this.panelOpen = false;
    this.panelMode = 'create';
    this.panelEditingId = null;
    this.panelInitial = null;
    this.panelExternalError = null;
  }

  onPanelChanged() {
    // clear overlap error once the user edits anything
    this.panelExternalError = null;
  }

  onPanelSubmit(value: WorkOrderPanelSubmit) {
    // overlap check happens here (panel doesn’t know about other bars)
    const candidate: WorkOrderBar = {
      id: this.panelMode === 'edit' && this.panelEditingId ? this.panelEditingId : `wo-${crypto.randomUUID()}`,
      workCenterId: value.workCenterId,
      name: value.name,
      status: value.status,
      startDay: this.clampDay(value.startDay),
      endDay: this.clampDay(value.endDay),
    };

    const excludeId = this.panelMode === 'edit' ? this.panelEditingId ?? undefined : undefined;

    if (this.hasOverlap(candidate, excludeId)) {
      this.panelExternalError = 'Overlap detected: work orders cannot overlap on the same work center.';
      return;
    }

    if (this.panelMode === 'create') {
      this.bars = [...this.bars, candidate];
      this.onPanelClose();
      return;
    }

    // edit
    this.bars = this.bars.map(b => (b.id === candidate.id ? candidate : b));
    this.onPanelClose();
  }

  // ---------------- Menu state ----------------

  toggleMenu(barId: string, evt: MouseEvent) {
    evt.stopPropagation();
    this.openMenuBarId = this.openMenuBarId === barId ? null : barId;
  }

  closeMenu() {
    this.openMenuBarId = null;
  }

  onGlobalClick() {
    this.closeMenu();
  }

  // ---------------- Overlap ----------------

  hasOverlap(candidate: WorkOrderBar, excludeId?: string): boolean {
    return this.bars
      .filter(b => b.workCenterId === candidate.workCenterId)
      .filter(b => b.id !== excludeId)
      .some(b => this.rangesOverlapInclusive(candidate.startDay, candidate.endDay, b.startDay, b.endDay));
  }

  rangesOverlapInclusive(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
    return aStart <= bEnd && bStart <= aEnd;
  }

  clampDay(d: number): number {
    return Math.max(0, Math.min(this.totalDays - 1, d));
  }

  // ---------------- Columns (static labels for now) ----------------

  private buildDayColumns(totalDays: number): TimelineColumn[] {
    return Array.from({ length: totalDays }).map((_, i) => ({
      key: `d-${i}`,
      label: `Day ${i + 1}`,
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
    // @upgrade: replace with real month boundaries anchored around today.
    const monthLengths = [31, 30, 31, 30, 28, 31, 30, 31, 30, 31, 30, 31];

    const cols: TimelineColumn[] = [];
    let dayCursor = 0;
    let m = 0;

    while (dayCursor < totalDays) {
      const len = monthLengths[m % monthLengths.length];
      const days = Math.min(len, totalDays - dayCursor);
      cols.push({ key: `m-${m}`, label: `Month ${m + 1}`, days });
      dayCursor += days;
      m++;
    }

    return cols;
  }

  // trackby for left list
  trackById = (_: number, wc: WorkCenter) => wc.id;
}
