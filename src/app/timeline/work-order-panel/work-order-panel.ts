import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgbDateStruct, NgbDatepickerModule, NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap';

export type WorkOrderStatus = 'open' | 'in-progress' | 'complete' | 'blocked';
export type PanelMode = 'create' | 'edit';

export type WorkOrderPanelInput = {
  workCenterId: string;
  name: string;
  status: WorkOrderStatus;
  startDate: string; // ISO: YYYY-MM-DD
  endDate: string; // ISO: YYYY-MM-DD
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
export class WorkOrderPanelComponent implements AfterViewInit, OnChanges, OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) mode!: PanelMode;
  @Input({ required: true }) initial!: WorkOrderPanelInput;

  /** Parent overlap error (or other business rule error) */
  @Input() externalError: string | null = null;

  @Output() panelClosed = new EventEmitter<void>();
  @Output() panelSubmitted = new EventEmitter<WorkOrderPanelSubmit>();
  @Output() changed = new EventEmitter<void>();

  @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;

  submitted = false;

  ngAfterViewInit(): void {
    queueMicrotask(() => this.nameInput?.nativeElement?.focus());
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['initial'] && this.initial) {
      this.form.patchValue(
        {
          name: this.initial.name ?? '',
          status: this.initial.status ?? 'open',
          startDate: isoToStruct(this.initial.startDate),
          endDate: isoToStruct(this.initial.endDate),
        },
        { emitEvent: false }
      );
      this.form.markAsPristine();
      this.form.markAsUntouched();
      this.form.updateValueAndValidity({ emitEvent: false });

      this.submitted = false; // ✅ reset validation UI
    }
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    this.panelClosed.emit();
  }

  statusOptions: StatusOption[] = [
    { value: 'open', label: 'Open' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'complete', label: 'Complete' },
    { value: 'blocked', label: 'Blocked' },
  ];

  form = this.fb.group(
    {
      name: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
      status: this.fb.control<WorkOrderStatus>('open', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      startDate: this.fb.control<NgbDateStruct | null>(null, { validators: [Validators.required] }),
      endDate: this.fb.control<NgbDateStruct | null>(null, { validators: [Validators.required] }),
    },
    { validators: [this.dateOrderValidator] }
  );

  ngOnInit() {
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

  private resetUiState() {
    this.submitted = false; // ✅ hide validation when closing
    this.form.markAsPristine();
    this.form.markAsUntouched();
    Object.values(this.form.controls).forEach((c) => {
      c.markAsPristine();
      c.markAsUntouched();
    });
  }

  onBackdropClick(evt: Event) {
    if (evt.target !== evt.currentTarget) return; // clicked inside panel; ignore
    this.resetUiState();
    this.panelClosed.emit();
  }

  onCancel(evt: MouseEvent) {
    evt.stopPropagation();
    this.resetUiState();
    this.panelClosed.emit();
  }

  onSubmit(evt: MouseEvent) {
    evt.stopPropagation();

    this.submitted = true;
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const start = raw.startDate!;
    const end = raw.endDate!;
    const [a, b] = compareStruct(start, end) <= 0 ? [start, end] : [end, start];

    const payload: WorkOrderPanelSubmit = {
      workCenterId: this.initial.workCenterId,
      name: raw.name.trim(),
      status: raw.status,
      startDate: structToIso(a),
      endDate: structToIso(b),
    };

    this.panelSubmitted.emit(payload);
  }

  // ----- Date input display helpers -----

  formatDot(v: NgbDateStruct | null): string {
    if (!v) return '';
    const mm = String(v.month).padStart(2, '0');
    const dd = String(v.day).padStart(2, '0');
    const yyyy = String(v.year).padStart(4, '0');
    return `${mm}.${dd}.${yyyy}`;
  }

  openStart(dp: NgbInputDatepicker) {
    dp.open();
    const v = this.form.controls.startDate.value;
    if (v) dp.navigateTo(v);
  }

  openEnd(dp: NgbInputDatepicker) {
    dp.open();
    const v = this.form.controls.endDate.value;
    if (v) dp.navigateTo(v);
  }

  onPickStart(d: NgbDateStruct) {
    this.form.controls.startDate.setValue(d);
  }

  onPickEnd(d: NgbDateStruct) {
    this.form.controls.endDate.setValue(d);
  }

  // ----- Errors -----

  showNameRequired(): boolean {
    return this.submitted && !!this.form.controls.name.errors?.['required'];
  }

  showStartRequired(): boolean {
    return this.submitted && !!this.form.controls.startDate.errors?.['required'];
  }

  showEndRequired(): boolean {
    return this.submitted && !!this.form.controls.endDate.errors?.['required'];
  }

  showDateOrderError(): boolean {
    return this.submitted && !!this.form.errors?.['dateOrder'];
  }

  private dateOrderValidator(group: AbstractControl) {
    const start: NgbDateStruct | null = group?.get?.('startDate')?.value ?? null;
    const end: NgbDateStruct | null = group?.get?.('endDate')?.value ?? null;
    if (!start || !end) return null;
    return compareStruct(end, start) < 0 ? { dateOrder: true } : null;
  }
}

/** -------- date helpers -------- */

function isoToStruct(iso: string): NgbDateStruct | null {
  if (!iso || iso.length < 10) return null;
  const [y, m, d] = iso.split('-').map((n) => Number(n));
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
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}
