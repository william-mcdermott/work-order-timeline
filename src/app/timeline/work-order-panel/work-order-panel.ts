import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export type WorkOrderStatus = 'open' | 'in-progress' | 'complete' | 'blocked';
export type PanelMode = 'create' | 'edit';

export type WorkOrderPanelInput = {
  workCenterId: string;
  name: string;
  status: WorkOrderStatus;
  startDay: number;
  endDay: number;
};

export type WorkOrderPanelSubmit = WorkOrderPanelInput;

@Component({
  selector: 'app-work-order-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './work-order-panel.html',
  styleUrls: ['./work-order-panel.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkOrderPanelComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  /** Parent controls show/hide by *ngIf */
  @Input({ required: true }) mode!: PanelMode;
  @Input({ required: true }) initial!: WorkOrderPanelInput;

  /** Optional error string from parent (e.g., overlap error) */
  @Input() externalError: string | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<WorkOrderPanelSubmit>();

  /** Clears external error when user edits form */
  @Output() changed = new EventEmitter<void>();

  form = this.fb.group(
    {
      name: ['', [Validators.required]],
      status: ['open' as WorkOrderStatus, [Validators.required]],
      startDay: [0, [Validators.required, Validators.min(0)]],
      endDay: [0, [Validators.required, Validators.min(0)]],
    },
    {
      validators: [this.dateOrderValidator],
    }
  );

  ngOnInit() {
    // Patch initial values into the form
    this.form.patchValue(
      {
        name: this.initial.name,
        status: this.initial.status,
        startDay: this.initial.startDay,
        endDay: this.initial.endDay,
      },
      { emitEvent: false }
    );

    // Notify parent when user changes anything (so it can clear overlap error)
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.changed.emit();
    });
  }

  // -------- UI helpers --------

  titleText(): string {
    return 'Work Order Details';
  }

  primaryCtaText(): string {
    return this.mode === 'edit' ? 'Save' : 'Create';
  }

  // -------- actions --------

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

    const start = Math.min(Number(raw.startDay), Number(raw.endDay));
    const end = Math.max(Number(raw.startDay), Number(raw.endDay));

    this.submit.emit({
      workCenterId: this.initial.workCenterId, // WC is decided by row click / bar edit
      name: String(raw.name).trim(),
      status: raw.status as WorkOrderStatus,
      startDay: start,
      endDay: end,
    });
  }

  // -------- validators --------

  private dateOrderValidator(group: any) {
    const start = Number(group?.get?.('startDay')?.value);
    const end = Number(group?.get?.('endDay')?.value);
    if (Number.isNaN(start) || Number.isNaN(end)) return null;
    return end < start ? { dateOrder: true } : null;
  }

  // -------- error helpers --------

  showNameRequired(): boolean {
    const c = this.form.controls.name;
    return c.touched && !!c.errors?.['required'];
  }

  showDateOrderError(): boolean {
    return this.form.touched && !!this.form.errors?.['dateOrder'];
  }

  // @upgrade: replace startDay/endDay numeric inputs with ngb-datepicker + ISO strings.
  // @upgrade: replace status select with ng-select and match Sketch styling exactly.
}
