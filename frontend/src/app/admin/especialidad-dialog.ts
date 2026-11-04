import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AdminService } from './admin.service';

@Component({
  selector: 'app-especialidad-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Nueva especialidad</h2>

    <form [formGroup]="form" (ngSubmit)="guardar()">
      <mat-dialog-content>
        <div class="campos">
          <mat-form-field appearance="outline">
            <mat-label>Nombre de la especialidad</mat-label>
            <input matInput formControlName="nombre" maxlength="60" />
            @if (form.controls.nombre.invalid) { <mat-error>Obligatorio</mat-error> }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Mención (opcional)</mat-label>
            <input matInput formControlName="mencion" maxlength="60" />
          </mat-form-field>
        </div>

        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" [disabled]="guardando()" (click)="ref.close(false)">Cancelar</button>
        <button mat-flat-button type="submit" [disabled]="guardando()">
          {{ guardando() ? 'Guardando...' : 'Crear' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .campos { display: flex; flex-direction: column; gap: 4px; padding-top: 8px; }
    .error { color: #b00020; margin: 8px 0 0; }
  `],
})
export class EspecialidadDialog {
  private fb = inject(FormBuilder);
  private api = inject(AdminService);
  ref = inject<MatDialogRef<EspecialidadDialog, boolean>>(MatDialogRef);

  guardando = signal(false);
  error = signal('');

  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(60)]],
    mencion: ['', Validators.maxLength(60)],
  });

  guardar() {
    if (this.guardando()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.error.set('');

    const { nombre, mencion } = this.form.getRawValue();
    this.api.crearEspecialidad(nombre.trim(), mencion.trim()).subscribe({
      next: () => this.ref.close(true),
      error: e => {
        this.guardando.set(false);
        this.error.set(e.error?.error ?? 'No se pudo crear la especialidad.');
      },
    });
  }
}