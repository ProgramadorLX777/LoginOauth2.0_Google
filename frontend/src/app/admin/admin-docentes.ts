import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService, DatosDocente, Docente, Especialidad } from './admin.service';

const FONO = /^[0-9+\s-]{8,15}$/;

@Component({
  selector: 'app-admin-docentes',
  imports: [ReactiveFormsModule],
  template: `
    <h2>Docentes tutores</h2>
    <p class="ayuda">
      Los docentes tutores (maestros guía) acompañan a los estudiantes de su especialidad.
      Los docentes no se eliminan: se desactivan, y su cuenta de acceso se desactiva con ellos.
    </p>

    @if (mensaje()) { <p class="ok">{{ mensaje() }}</p> }
    @if (error()) { <p class="error">{{ error() }}</p> }

    <div class="barra">
      <input [formControl]="busqueda" placeholder="Buscar por nombre, RUT o correo" (keyup.enter)="cargar()" />
      <select [formControl]="filtroEstado" (change)="cargar()">
        <option value="">Todos</option>
        <option value="activo">Activos</option>
        <option value="inactivo">Inactivos</option>
      </select>
      <button type="button" class="secundario" (click)="cargar()">Buscar</button>
      <button type="button" (click)="nuevo()">Nuevo docente</button>
    </div>

    @if (mostrandoForm()) {
      <form class="bloque" [formGroup]="form" (ngSubmit)="guardar()">
        <h3>{{ editandoRut() ? 'Editar docente' : 'Nuevo docente' }}</h3>

        <div class="grilla">
          <label>RUT
            <input formControlName="rut" placeholder="22.222.222-2" />
          </label>
          <label>Especialidad
            <select formControlName="id_especialidad">
              <option [ngValue]="0">Selecciona...</option>
              @for (e of especialidades(); track e.id_especialidad) {
                <option [ngValue]="e.id_especialidad">
                  {{ e.nombre }}{{ e.mencion ? ' mención ' + e.mencion : '' }}
                </option>
              }
            </select>
          </label>
          <label>Nombres
            <input formControlName="nombre" maxlength="70" />
          </label>
          <label>Apellido paterno
            <input formControlName="apellido_paterno" maxlength="80" />
          </label>
          <label>Apellido materno
            <input formControlName="apellido_materno" maxlength="80" />
          </label>
          <label>Correo institucional
            <input formControlName="correo" type="email" maxlength="100" />
          </label>
          <label>Teléfono
            <input formControlName="telefono" maxlength="15" />
          </label>
          <label>Celular
            <input formControlName="celular" maxlength="15" />
          </label>
          <label>Cargo
            <input formControlName="cargo" maxlength="100" />
          </label>
          <label>Jefe directo
            <input formControlName="jefe_directo" maxlength="100" />
          </label>
          <label>Cargo del jefe directo
            <input formControlName="cargo_jefe_directo" maxlength="100" />
          </label>
        </div>

        @if (!editandoRut()) {
          <label class="check">
            <input type="checkbox" formControlName="crear_cuenta" />
            Crear su cuenta de acceso (inicia sesión con Google con este correo)
          </label>
        }

        @if (form.invalid && form.touched) {
          <small class="error">Revisa los campos marcados: RUT, nombres, apellido paterno, correo, cargo y especialidad son obligatorios.</small>
        }

        <div class="fila">
          <button type="submit" [disabled]="guardando()">{{ guardando() ? 'Guardando...' : 'Guardar' }}</button>
          <button type="button" class="secundario" (click)="cancelar()">Cancelar</button>
        </div>
      </form>
    }

    @if (cargando()) {
      <p>Cargando...</p>
    } @else {
      <div class="scroll">
        <table>
          <thead>
            <tr>
              <th>Nombre</th><th>RUT</th><th>Especialidad</th><th>Cargo</th>
              <th>Correo</th><th>Alumnos</th><th>Estado</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (d of docentes(); track d.rut_docente) {
              <tr>
                <td>{{ d.nombre_completo }}</td>
                <td>{{ d.rut_completo }}</td>
                <td>{{ d.especialidad }}</td>
                <td>{{ d.cargo ?? '—' }}</td>
                <td>{{ d.correo ?? '—' }}</td>
                <td>{{ d.estudiantes }}</td>
                <td>
                  {{ d.estado === 'activo' ? 'Activo' : 'Inactivo' }}
                  <small class="ayuda">· cuenta: {{ d.tiene_cuenta ? (d.cuenta_activa ? 'sí' : 'inactiva') : 'no' }}</small>
                </td>
                <td class="acciones">
                  <button type="button" class="secundario" (click)="editar(d)">Editar</button>
                  <button type="button" class="secundario" (click)="alternar(d)">
                    {{ d.estado === 'activo' ? 'Desactivar' : 'Activar' }}
                  </button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="8">No hay docentes que coincidan.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    .ayuda { font-size: 0.9em; opacity: 0.75; }
    .barra { display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0; }
    .barra input { flex: 1; min-width: 220px; }
    input, select { padding: 8px; }
    button { padding: 8px 16px; }
    .secundario { background: transparent; border: 1px solid #888; }
    .bloque { border: 1px solid #ccc; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .grilla { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
    label { display: block; }
    label input, label select { display: block; width: 100%; margin-top: 4px; box-sizing: border-box; }
    .check { margin-top: 12px; }
    .check input { display: inline; width: auto; margin-right: 6px; }
    .fila { display: flex; gap: 8px; margin-top: 16px; }
    .scroll { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ccc; }
    .acciones { white-space: nowrap; }
    .acciones button { margin-right: 4px; padding: 4px 10px; }
    .error { color: #b00020; }
    .ok { color: #1b7a32; }
  `],
})
export class AdminDocentes implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(AdminService);

  docentes = signal<Docente[]>([]);
  especialidades = signal<Especialidad[]>([]);
  cargando = signal(true);
  mostrandoForm = signal(false);
  editandoRut = signal<number | null>(null);
  guardando = signal(false);
  mensaje = signal('');
  error = signal('');

  busqueda = new FormControl('', { nonNullable: true });
  filtroEstado = new FormControl('', { nonNullable: true });

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

  ngOnInit() {
    this.api.listarEspecialidades().subscribe({
      next: lista => this.especialidades.set(lista.filter(e => e.activa)),
      error: () => this.error.set('No se pudieron cargar las especialidades.'),
    });
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.api.listarDocentes(this.busqueda.value.trim(), this.filtroEstado.value).subscribe({
      next: lista => {
        this.docentes.set(lista);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los docentes.');
        this.cargando.set(false);
      },
    });
  }

  nuevo() {
    this.mensaje.set('');
    this.error.set('');
    this.form.enable();
    this.form.reset({ id_especialidad: 0, crear_cuenta: true });
    this.editandoRut.set(null);
    this.mostrandoForm.set(true);
  }

  editar(d: Docente) {
    this.mensaje.set('');
    this.error.set('');
    this.form.enable();
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
    this.editandoRut.set(d.rut_docente);
    this.mostrandoForm.set(true);
  }

  cancelar() {
    this.mostrandoForm.set(false);
    this.editandoRut.set(null);
    this.error.set('');
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.mensaje.set('');
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

    const rut = this.editandoRut();
    const peticion = rut ? this.api.editarDocente(rut, datos) : this.api.crearDocente(datos);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.mensaje.set(rut ? 'Docente actualizado.' : 'Docente creado.');
        this.cancelar();
        this.cargar();
      },
      error: e => {
        this.guardando.set(false);
        this.error.set(e.error?.error ?? 'No se pudo guardar el docente.');
      },
    });
  }

  alternar(d: Docente) {
    const activar = d.estado !== 'activo';
    if (!activar) {
      const aviso = d.estudiantes > 0
        ? ` Tiene ${d.estudiantes} estudiante(s) asignado(s) como tutor.`
        : '';
      if (!confirm(`¿Desactivar a ${d.nombre_completo}? Su cuenta dejará de funcionar.${aviso}`)) return;
    }

    this.mensaje.set('');
    this.error.set('');
    this.api.cambiarEstadoDocente(d.rut_docente, activar).subscribe({
      next: () => this.cargar(),
      error: e => this.error.set(e.error?.error ?? 'No se pudo cambiar el estado.'),
    });
  }
}