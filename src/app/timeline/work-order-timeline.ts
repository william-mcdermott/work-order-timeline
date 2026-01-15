import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkOrderBarComponent } from './work-order-bar/work-order-bar';
import { TimelineHeaderComponent, TimelineColumnVm } from './timeline-header/timeline-header';

type WorkCenter = { id: string; name: string };
type Timescale = 'day' | 'week' | 'month';

type WorkOrderStatus = 'open' | 'in-progress' | 'complete' | 'blocked';

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

type PanelMode = 'create' | 'edit';

@Component({
  selector: 'app-work-order-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule, WorkOrderBarComponent, TimelineHeaderComponent],
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

  openMenuBarId: string | null = null;

  panelOpen = false;
  panelMode: PanelMode = 'create';
  panelWorkCenterId: string | null = null;
  panelEditingId: string | null = null;

  panelStartDay = 0;
  panelEndDay = 0;
  panelName = '';
  panelStatus: WorkOrderStatus = 'open';

  constructor() {
    this.applyTimescale(this.timescale);
    queueMicrotask(() => this.centerScrollOnToday());
  }

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

  headerColumns(): TimelineColumnVm[] {
    // maps to a VM with widthPx so the header component stays dumb
    return this.columns.map(c => ({
      key: c.key,
      label: c.label,
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

  barsFor(workCenterId: string): WorkOrderBar[] {
    return this.bars.filter(b => b.workCenterId === workCenterId);
  }

  barLeftPx(b: WorkOrderBar): number {
    return b.startDay * this.pixelsPerDay + 8;
  }

  barWidthPx(b: WorkOrderBar): number {
    const daysInclusive = (b.endDay - b.startDay) + 1;
    return Math.max(1, daysInclusive * this.pixelsPerDay - 16);
  }

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

    this.panelWorkCenterId = workCenterId;
    this.panelStartDay = startDay;
    this.panelEndDay = endDay;

    this.panelName = '';
    this.panelStatus = 'open';
  }

  openEdit(barId: string) {
    const bar = this.bars.find(b => b.id === barId);
    if (!bar) return;

    this.closeMenu();

    this.panelOpen = true;
    this.panelMode = 'edit';
    this.panelEditingId = bar.id;

    this.panelWorkCenterId = bar.workCenterId;
    this.panelName = bar.name;
    this.panelStatus = bar.status;
    this.panelStartDay = bar.startDay;
    this.panelEndDay = bar.endDay;
  }

  submitPanel() {
    const wcId = this.panelWorkCenterId;
    if (!wcId) return;

    const name = this.panelName.trim();
    if (!name) return;

    const startDay = this.clampDay(Math.min(this.panelStartDay, this.panelEndDay));
    const endDay = this.clampDay(Math.max(this.panelStartDay, this.panelEndDay));

    if (this.panelMode === 'create') {
      const candidate: WorkOrderBar = {
        id: `wo-${crypto.randomUUID()}`,
        workCenterId: wcId,
        name,
        status: this.panelStatus,
        startDay,
        endDay,
      };

      if (this.hasOverlap(candidate)) {
        alert('Overlap detected: work orders cannot overlap on the same work center.');
        return;
      }

      this.bars = [...this.bars, candidate];
      this.closePanel();
      return;
    }

    const editingId = this.panelEditingId;
    if (!editingId) return;

    const updated: WorkOrderBar = {
      id: editingId,
      workCenterId: wcId,
      name,
      status: this.panelStatus,
      startDay,
      endDay,
    };

    if (this.hasOverlap(updated, editingId)) {
      alert('Overlap detected: work orders cannot overlap on the same work center.');
      return;
    }

    this.bars = this.bars.map(b => (b.id === editingId ? updated : b));
    this.closePanel();
  }

  deleteBar(barId: string) {
    this.closeMenu();
    this.bars = this.bars.filter(b => b.id !== barId);
  }

  closePanel() {
    this.panelOpen = false;
    this.panelMode = 'create';
    this.panelEditingId = null;
    this.panelWorkCenterId = null;
  }

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

  stopRowClick(evt: MouseEvent) {
    evt.stopPropagation();
  }

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

  trackById = (_: number, wc: WorkCenter) => wc.id;
  trackByCol = (_: number, c: TimelineColumn) => c.key;
  trackByBar = (_: number, b: WorkOrderBar) => b.id;
}
