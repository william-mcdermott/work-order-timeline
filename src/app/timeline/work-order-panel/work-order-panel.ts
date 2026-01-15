import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NgSelectModule } from '@ng-select/ng-select';
import { NgbDateStruct, NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';

export type WorkOrderStatus = 'open' | 'in-progress' | 'complete' | 'blocked';
export type PanelMode = 'create' | 'edit';

export type WorkOrderPanelInput = {
  workCenterId: string;
  name: string;
  status: WorkOrderStatus;
  startDate: string; // ISO: YYYY-MM-DD
  endDate: string;   // ISO: YYYY-MM-DD
};

export type WorkOrderPanelSubmit = WorkOrderPanelInput;

type StatusOption = { value: WorkOrderStatus; label: string };

@Component({
  selector: 'app-work-order-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgSelectModule, NgbDatepickerModule],
  templateUrl: './work-order-panel.html',
  styleUrls: ['./work-order-panel.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkOrderPanelComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) mode!: PanelMode;
  @Input({ required: true }) initial!: WorkOrderPanelInput;

  /** Parent overlap error (or other business rule error) */
  @Input() externalError: string | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<WorkOrderPanelSubmit>();

  /** Let parent clear overlap error when user modifies form */
  @Output() changed = new EventEmitter<void>();

  statusOptions: StatusOption[] = [
    { value: 'open', label: 'Open' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'complete', label: 'Complete' },
    { value: 'blocked', label: 'Blocked' },
  ];

  form = this.fb.group(
    {
      name: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
      status: this.fb.control<WorkOrderStatus>('open', { nonNullable: true, validators: [Validators.required] }),
      startDate: this.fb.control<NgbDateStruct | null>(null, { validators: [Validators.required] }),
      endDate: this.fb.control<NgbDateStruct | null>(null, { validators: [Validators.required] }),
    },
    { validators: [this.dateOrderValidator] }
  );

  ngOnInit() {
    // hydrate from initial ISO dates
    this.form.patchValue(
      {
        name: this.initial.name ?? '',
        status: this.initial.status ?? 'open',
        startDate: isoToStruct(this.initial.startDate),
        endDate: isoToStruct(this.initial.endDate),
      },
      { emitEvent: false }
    );

    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.changed.emit();
    });
  }

  titleText(): string {
    return 'Work Order Details';
  }

  primaryCtaText(): string {
    return this.mode === 'edit' ? 'Save' : 'Create';
  }

  onBackdropClick() {
    this.close.emit();
  }

  onPanelClick(evt: MouseEvent) {
    evt.stopPropagation();
  }

  onCancel(evt: MouseEvent) {
    evt.stopPropagation();
    this.close.emit();
  }

  onSubmit(evt: MouseEvent) {
    evt.stopPropagation();

    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const start = raw.startDate!;
    const end = raw.endDate!;

    // normalize ordering (in case user picks end before start)
    const [a, b] = compareStruct(start, end) <= 0 ? [start, end] : [end, start];

    const payload: WorkOrderPanelSubmit = {
      workCenterId: this.initial.workCenterId,
      name: raw.name.trim(),
      status: raw.status,
      startDate: structToIso(a),
      endDate: structToIso(b),
    };

    this.submit.emit(payload);
  }

  // ------- error helpers -------

  showNameRequired(): boolean {
    const c = this.form.controls.name;
    return c.touched && !!c.errors?.['required'];
  }

  showStartRequired(): boolean {
    const c = this.form.controls.startDate;
    return c.touched && !!c.errors?.['required'];
  }

  showEndRequired(): boolean {
    const c = this.form.controls.endDate;
    return c.touched && !!c.errors?.['required'];
  }

  showDateOrderError(): boolean {
    return this.form.touched && !!this.form.errors?.['dateOrder'];
  }

  // ------- validator -------

  private dateOrderValidator(group: any) {
    const start: NgbDateStruct | null = group?.get?.('startDate')?.value ?? null;
    const end: NgbDateStruct | null = group?.get?.('endDate')?.value ?? null;
    if (!start || !end) return null;
    return compareStruct(end, start) < 0 ? { dateOrder: true } : null;
  }

  // @upgrade: Match Sketch-perfect ng-select styling (pill, spacing, focus ring).
  // @upgrade: Replace two-input picker with a nicer date-range UX if time allows.
}

/** -------- date helpers (local, no deps) -------- */

function isoToStruct(iso: string): NgbDateStruct | null {
  // expects YYYY-MM-DD
  if (!iso || iso.length < 10) return null;
  const [y, m, d] = iso.split('-').map(n => Number(n));
  if (!y || !m || !d) return null;
  return { year: y, month: m, day: d };
}

function structToIso(s: NgbDateStruct): string {
  const y = String(s.year).padStart(4, '0');
  const m = String(s.month).padStart(2, '0');
  const d = String(s.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function compareStruct(a: NgbDateStruct, b: NgbDateStruct): number {
  // returns -1/0/1-ish
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}
