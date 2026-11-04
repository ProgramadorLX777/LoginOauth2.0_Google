import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AdminService, DatosDocente, Docente, Especialidad } from './admin.service';

const FONO = /^[0-9+\s-]{8,15}$/;

export interface DatosDialogoDocente {
  docente: Docente | null;
  especialidades: Especialidad[];
}

@Component({
  selector: 'app-docente-dialog',
  imports: [
    ReactiveFormsModule, MatDialogModule, MatButtonModule, MatCheckboxModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.docente ? 'Editar docente' : 'Nuevo docente' }}</h2>

    <form [formGroup]="form" (ngSubmit)="guardar()">
      <mat-dialog-content>
        <div class="grilla">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>RUT</mat-label>
            <input matInput formControlName="rut" placeholder="22.222.222-2" />
            @if (form.controls.rut.hasError('required')) { <mat-error>Obligatorio</mat-error> }
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Especialidad</mat-label>
            <mat-select formControlName="id_especialidad">
              @for (e of data.especialidades; track e.id_especialidad) {
                <mat-option [value]="e.id_especialidad">
                  {{ e.nombre }}{{ e.mencion ? ' mención ' + e.mencion : '' }}
                </mat-option>
              }
            </mat-select>
            @if (form.controls.id_especialidad.invalid) { <mat-error>Selecciona una especialidad</mat-error> }
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Nombres</mat-label>
            <input matInput formControlName="nombre" maxlength="70" />
            @if (form.controls.nombre.invalid) { <mat-error>Obligatorio</mat-error> }
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Apellido paterno</mat-label>
            <input matInput formControlName="apellido_paterno" maxlength="80" />
            @if (form.controls.apellido_paterno.invalid) { <mat-error>Obligatorio</mat-error> }
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Apellido materno</mat-label>
            <input matInput formControlName="apellido_materno" maxlength="80" />
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Correo institucional</mat-label>
            <input matInput type="email" formControlName="correo" maxlength="100" />
            @if (form.controls.correo.invalid) { <mat-error>Correo inválido</mat-error> }
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Teléfono</mat-label>
            <input matInput formControlName="telefono" maxlength="15" />
            @if (form.controls.telefono.invalid) { <mat-error>Teléfono inválido</mat-error> }
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Celular</mat-label>
            <input matInput formControlName="celular" maxlength="15" />
            @if (form.controls.celular.invalid) { <mat-error>Celular inválido</mat-error> }
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Cargo</mat-label>
            <input matInput formControlName="cargo" maxlength="100" />
            @if (form.controls.cargo.invalid) { <mat-error>Obligatorio</mat-error> }
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Jefe directo</mat-label>
            <input matInput formControlName="jefe_directo" maxlength="100" />
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Cargo del jefe directo</mat-label>
            <input matInput formControlName="cargo_jefe_directo" maxlength="100" />
          </mat-form-field>
        </div>

        @if (!data.docente) {
          <mat-checkbox formControlName="crear_cuenta" class="check">
            Crear su cuenta de acceso (inicia sesión con Google con este correo)
          </mat-checkbox>
        }

        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" [disabled]="guardando()" (click)="ref.close(null)">Cancelar</button>
        <button mat-flat-button type="submit" [disabled]="guardando()">
          {{ guardando() ? 'Guardando...' : 'Guardar' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .grilla {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      padding-top: 8px;
    }
    .check { display: block; margin-top: 12px; }
    .error { color: #b00020; margin: 12px 0 0; }
  `],
})
export class DocenteDialog {
  private fb = inject(FormBuilder);
  private api = inject(AdminService);
  ref = inject<MatDialogRef<DocenteDialog, 'creado' | 'editado' | null>>(MatDialogRef);
  data = inject<DatosDialogoDocente>(MAT_DIALOG_DATA);

  guardando = signal(false);
  error = signal('');

  form = this.fb.nonNullable.group({
    rut: ['', Validators.required],
    nombre: ['', [Validators.required, Validators.maxLength(70)]],
    apellido_paterno: ['', [Validators.required, Validators.maxLength(80)]],
    apellido_materno: ['', Validators.maxLength(80)],
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    telefono: ['', Validators.pattern(FONO)],
    celular: ['', Validators.pattern(FONO)],
    cargo: ['', [Validators.required, Validators.maxLength(100)]],
    jefe_directo: ['', Validators.maxLength(100)],
    cargo_jefe_directo: ['', Validators.maxLength(100)],
    id_especialidad: [0, [Validators.required, Validators.min(1)]],
    crear_cuenta: [true],
  });

  constructor() {
    const d = this.data.docente;
    if (d) {
      this.form.reset({
        rut: d.rut_completo,
        nombre: d.nombre,
        apellido_paterno: d.apellido_paterno,
        apellido_materno: d.apellido_materno ?? '',
        correo: d.correo ?? '',
        telefono: d.telefono_docente ?? '',
        celular: d.celular_docente ?? '',
        cargo: d.cargo ?? '',
        jefe_directo: d.jefe_directo ?? '',
        cargo_jefe_directo: d.cargo_jefe_directo ?? '',
        id_especialidad: d.id_especialidad ?? 0,
        crear_cuenta: false,
      });
      this.form.controls.rut.disable();
      this.form.controls.crear_cuenta.disable();
    }
  }

  guardar() {
    if (this.guardando()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.error.set('');

    const v = this.form.getRawValue();
    const datos: DatosDocente = {
      rut: v.rut,
      nombre: v.nombre,
      apellido_paterno: v.apellido_paterno,
      apellido_materno: v.apellido_materno,
      correo: v.correo,
      telefono: v.telefono,
      celular: v.celular,
      cargo: v.cargo,
      jefe_directo: v.jefe_directo,
      cargo_jefe_directo: v.cargo_jefe_directo,
      id_especialidad: v.id_especialidad,
      crear_cuenta: v.crear_cuenta,
    };

    const docente = this.data.docente;
    const peticion = docente
      ? this.api.editarDocente(docente.rut_docente, datos)
      : this.api.crearDocente(datos);

    peticion.subscribe({
      next: () => this.ref.close(docente ? 'editado' : 'creado'),
      error: e => {
        this.guardando.set(false);
        this.error.set(e.error?.error ?? 'No se pudo guardar el docente.');
      },
    });
  }
}