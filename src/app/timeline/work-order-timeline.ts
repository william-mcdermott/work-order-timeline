import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild } from '@angular/core';

type WorkCenter = { id: string; name: string };
type Timescale = 'day' | 'week' | 'month';
type WorkOrderStatus = 'open' | 'in-progress' | 'complete' | 'blocked';

type TimelineColumn = {
  key: string;
  label: string;
  // for week/month, width varies by unit; for day it's 1 day
  days: number;
};

type WorkOrderBar = {
  id: string;
  workCenterId: string;
  name: string;
  status: WorkOrderStatus;

  // STATIC FOR NOW: day offsets within the visible range
  startDay: number; // 0-based day index
  endDay: number;   // inclusive
};

@Component({
  selector: 'app-work-order-timeline',
  standalone: true,
  imports: [CommonModule],
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

  // “today” position inside the current visible range (as a day index)
  // keep it centered-ish initially
  todayDayIndex = 14;

  // computed
  pixelsPerDay = 56;
  columns: TimelineColumn[] = [];

  // visible range in days (for static demo)
  totalDays = 29; // day view default

  // Bars now defined in day units, not pixels
  bars: WorkOrderBar[] = [
    { id: 'wo-1', workCenterId: 'wc-1', name: 'Extrude Batch 1042', status: 'complete',    startDay: 2,  endDay: 6 },
    { id: 'wo-2', workCenterId: 'wc-1', name: 'Extrude Batch 1043', status: 'open',        startDay: 9,  endDay: 11 },

    { id: 'wo-3', workCenterId: 'wc-2', name: 'Mill Housing A',     status: 'in-progress', startDay: 8,  endDay: 16 },

    { id: 'wo-4', workCenterId: 'wc-3', name: 'Assemble Unit K',    status: 'open',        startDay: 5,  endDay: 7 },
    { id: 'wo-5', workCenterId: 'wc-3', name: 'Assemble Unit L',    status: 'blocked',     startDay: 12, endDay: 15 },

    { id: 'wo-6', workCenterId: 'wc-4', name: 'QC Audit 7A',        status: 'in-progress', startDay: 0,  endDay: 13 },
  ];

  constructor() {
    this.applyTimescale(this.timescale);
  }

  setTimescale(ts: Timescale) {
    if (this.timescale === ts) return;
    this.timescale = ts;
    this.applyTimescale(ts);

    // Center the scroll around "today"
    queueMicrotask(() => this.centerScrollOnToday());
  }

  private applyTimescale(ts: Timescale) {
    if (ts === 'day') {
      this.pixelsPerDay = 56;
      this.totalDays = 29; // ~±2 weeks
      this.todayDayIndex = 14;
      this.columns = this.buildDayColumns(this.totalDays);
      return;
    }

    if (ts === 'week') {
      this.pixelsPerDay = 20;     // 20px/day => 140px/week
      this.totalDays = 112;       // 16 weeks
      this.todayDayIndex = 56;
      this.columns = this.buildWeekColumns(this.totalDays);
      return;
    }

    // month
    this.pixelsPerDay = 8;        // small px/day for long horizon
    this.totalDays = 365;         // ~12 months
    this.todayDayIndex = 182;
    this.columns = this.buildMonthColumns(this.totalDays);
  }

  // ---- Grid sizing helpers ----

  totalWidthPx(): number {
    return this.totalDays * this.pixelsPerDay;
  }

  colWidthPx(c: TimelineColumn): number {
    return c.days * this.pixelsPerDay; // day=1, week=7, month=28-31
  }

  todayLineLeftPx(): number {
    return this.todayDayIndex * this.pixelsPerDay + this.pixelsPerDay / 2;
  }

  // ---- Bar positioning (from day-units) ----

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

  // ---- Column builders (static labels; “real” date math later) ----

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
    // For static demo, approximate month lengths cycling 31/30/31/30/28/31...
    // @upgrade: replace with real month boundaries anchored around today.
    const monthLengths = [31, 30, 31, 30, 28, 31, 30, 31, 30, 31, 30, 31];
    const cols: TimelineColumn[] = [];
    let dayCursor = 0;
    let m = 0;

    while (dayCursor < totalDays) {
      const len = monthLengths[m % monthLengths.length];
      const days = Math.min(len, totalDays - dayCursor);
      cols.push({
        key: `m-${m}`,
        label: `Month ${m + 1}`,
        days,
      });
      dayCursor += days;
      m++;
    }

    return cols;
  }

  private centerScrollOnToday() {
    const el = this.scrollEl?.nativeElement;
    if (!el) return;
    const target = this.todayLineLeftPx() - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, target);
  }

  // trackbys
  trackById = (_: number, wc: WorkCenter) => wc.id;
  trackByCol = (_: number, c: TimelineColumn) => c.key;
  trackByBar = (_: number, b: WorkOrderBar) => b.id;
}
