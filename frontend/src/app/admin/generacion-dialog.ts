import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ConfirmarDialog } from '../shared/confirmar-dialog';
import { AdminService } from './admin.service';

@Component({
  selector: 'app-generacion-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Nueva generación</h2>

    <form [formGroup]="form" (ngSubmit)="guardar()">
      <mat-dialog-content>
        <mat-form-field appearance="outline" class="campo">
          <mat-label>Año de egreso</mat-label>
          <input matInput type="number" formControlName="anio" placeholder="2028" />
          <mat-hint>Ejemplo: 2028</mat-hint>
          @if (form.controls.anio.invalid) { <mat-error>Ingresa un año válido</mat-error> }
        </mat-form-field>

        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" [disabled]="guardando()" (click)="ref.close(null)">Cancelar</button>
        <button mat-flat-button type="submit" [disabled]="guardando()">
          {{ guardando() ? 'Guardando...' : 'Crear' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .campo { width: 100%; margin-top: 8px; }
    .error { color: #b00020; margin: 12px 0 0; }
  `],
})
export class GeneracionDialog {
  private fb = inject(FormBuilder);
  private api = inject(AdminService);
  private dialog = inject(MatDialog);
  ref = inject<MatDialogRef<GeneracionDialog, boolean | null>>(MatDialogRef);

  guardando = signal(false);
  error = signal('');

  form = this.fb.nonNullable.group({
    anio: [new Date().getFullYear() + 1, [Validators.required, Validators.min(2000), Validators.max(2100)]],
  });

  guardar() {
    if (this.guardando()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviar(false);
  }

  private enviar(excepcion: boolean) {
    const anio = Number(this.form.getRawValue().anio);
    this.guardando.set(true);
    this.error.set('');

    this.api.crearGeneracion(anio, excepcion).subscribe({
      next: () => this.ref.close(true),
      error: e => {
        this.guardando.set(false);

        // Años anteriores a 2026 requieren confirmar que es una excepción
        if (e.error?.codigo === 'REQUIERE_EXCEPCION') {
          this.dialog
            .open(ConfirmarDialog, {
              data: {
                titulo: 'Generación anterior a 2026',
                mensaje: `El sistema parte desde la generación 2026. ¿Quieres crear la generación ${anio} como excepción?`,
                textoConfirmar: 'Crear como excepción',
              },
              maxWidth: '95vw',
            })
            .afterClosed()
            .subscribe(ok => {
              if (ok) this.enviar(true);
            });
          return;
        }

        this.error.set(e.error?.error ?? 'No se pudo crear la generación.');
      },
    });
  }
}