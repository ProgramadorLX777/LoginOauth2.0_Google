import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { EstudianteService, PerfilEditable } from '../estudiante/estudiante.service';

const FONO = /^[0-9+\s-]{8,15}$/;

// Debe existir al menos un teléfono o un celular
function alMenosUnTelefono(g: AbstractControl): ValidationErrors | null {
  const tel = String(g.get('telefono_estudiante')?.value ?? '').trim();
  const cel = String(g.get('celular_estudiante')?.value ?? '').trim();
  return tel || cel ? null : { sinTelefono: true };
}

@Component({
  selector: 'app-mi-perfil-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Mis datos de contacto</h2>

    <form [formGroup]="form" (ngSubmit)="guardar()">
      <mat-dialog-content>
        <div class="campos">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Dirección</mat-label>
            <input matInput formControlName="direccion" maxlength="100" />
            @if (form.controls.direccion.invalid) { <mat-error>La dirección es obligatoria</mat-error> }
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Comuna</mat-label>
            <input matInput formControlName="comuna" maxlength="100" />
            @if (form.controls.comuna.invalid) { <mat-error>La comuna es obligatoria</mat-error> }
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Teléfono</mat-label>
            <input matInput formControlName="telefono_estudiante" maxlength="15" />
            @if (form.controls.telefono_estudiante.invalid) { <mat-error>Solo números (8 a 15 dígitos)</mat-error> }
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Celular</mat-label>
            <input matInput formControlName="celular_estudiante" maxlength="15" />
            @if (form.controls.celular_estudiante.invalid) { <mat-error>Solo números (8 a 15 dígitos)</mat-error> }
          </mat-form-field>
        </div>

        <p class="ayuda">Indica al menos un teléfono o un celular.</p>
        @if (form.hasError('sinTelefono') && form.touched) {
          <p class="error" role="alert">Debes ingresar un teléfono o un celular.</p>
        }
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" [disabled]="guardando()" (click)="ref.close(false)">Cancelar</button>
        <button mat-flat-button type="submit" [disabled]="guardando()">
          {{ guardando() ? 'Guardando...' : 'Guardar cambios' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .campos { display: flex; flex-direction: column; gap: 16px; padding-top: 8px; }
    .ayuda { font-size: 0.85rem; opacity: 0.75; margin: 12px 0 0; }
    .error { color: #b00020; margin: 8px 0 0; }
  `],
})
export class MiPerfilDialog {
  private fb = inject(FormBuilder);
  private api = inject(EstudianteService);
  ref = inject<MatDialogRef<MiPerfilDialog, boolean>>(MatDialogRef);
  data = inject<PerfilEditable>(MAT_DIALOG_DATA);

  guardando = signal(false);
  error = signal('');

  form = this.fb.nonNullable.group(
    {
      direccion: [this.data.direccion ?? '', [Validators.required, Validators.maxLength(100)]],
      comuna: [this.data.comuna ?? '', [Validators.required, Validators.maxLength(100)]],
      telefono_estudiante: [this.data.telefono_estudiante ?? '', [Validators.pattern(FONO)]],
      celular_estudiante: [this.data.celular_estudiante ?? '', [Validators.pattern(FONO)]],
    },
    { validators: alMenosUnTelefono },
  );

  guardar() {
    if (this.guardando()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.error.set('');

    this.api.guardarPerfil(this.form.getRawValue()).subscribe({
      next: () => this.ref.close(true),
      error: e => {
        this.guardando.set(false);
        this.error.set(e.error?.error ?? 'No se pudo guardar. Revisa los datos e inténtalo de nuevo.');
      },
    });
  }
}