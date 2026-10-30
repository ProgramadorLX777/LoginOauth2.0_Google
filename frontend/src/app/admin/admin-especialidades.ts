import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService, Especialidad } from './admin.service';

@Component({
  selector: 'app-admin-especialidades',
  imports: [ReactiveFormsModule],
  template: `
    <h2>Especialidades</h2>
    <p class="ayuda">
      Catálogo de especialidades del colegio. Si la especialidad tiene mención
      (por ejemplo, Administración mención Logística), se indica aparte.
    </p>

    @if (mensaje()) { <p class="ok">{{ mensaje() }}</p> }
    @if (error()) { <p class="error">{{ error() }}</p> }

    <form class="alta" [formGroup]="form" (ngSubmit)="crear()">
      <label>Especialidad
        <input formControlName="nombre" maxlength="80" placeholder="Conectividad y Redes" />
      </label>
      <label>Mención (opcional)
        <input formControlName="mencion" maxlength="80" placeholder="Logística" />
      </label>
      <button type="submit">Crear</button>
    </form>
    @if (form.controls.nombre.touched && form.controls.nombre.invalid) {
      <small class="error">El nombre debe tener entre 2 y 80 caracteres.</small>
    }

    @if (cargando()) {
      <p>Cargando...</p>
    } @else {
      <table>
        <thead>
          <tr><th>Especialidad</th><th>Mención</th><th>Estado</th><th></th></tr>
        </thead>
        <tbody>
          @for (e of especialidades(); track e.id_especialidad) {
            <tr>
              <td>{{ e.nombre }}</td>
              <td>{{ e.mencion || '—' }}</td>
              <td>{{ e.activa ? 'Activa' : 'Inactiva' }}</td>
              <td>
                <button type="button" class="secundario" (click)="alternar(e)">
                  {{ e.activa ? 'Desactivar' : 'Activar' }}
                </button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="4">Todavía no hay especialidades.</td></tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: [`
    .ayuda { font-size: 0.9em; opacity: 0.75; }
    .alta { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; margin: 16px 0 4px; }
    .alta label { display: block; }
    .alta input { display: block; padding: 8px; margin-top: 4px; }
    button { padding: 8px 16px; }
    .secundario { background: transparent; border: 1px solid #888; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ccc; }
    .error { color: #b00020; }
    .ok { color: #1b7a32; }
  `],
})
export class AdminEspecialidades implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(AdminService);

  especialidades = signal<Especialidad[]>([]);
  cargando = signal(true);
  mensaje = signal('');
  error = signal('');

  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    mencion: ['', Validators.maxLength(80)],
  });

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.api.listarEspecialidades().subscribe({
      next: lista => {
        this.especialidades.set(lista);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las especialidades.');
        this.cargando.set(false);
      },
    });
  }

  crear() {
    this.mensaje.set('');
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    this.api.crearEspecialidad(v.nombre, v.mencion).subscribe({
      next: () => {
        this.mensaje.set('Especialidad creada.');
        this.form.reset();
        this.cargar();
      },
      error: e => this.error.set(e.error?.error ?? 'No se pudo crear la especialidad.'),
    });
  }

  alternar(esp: Especialidad) {
    const activar = !esp.activa;
    if (!activar && !confirm(`¿Desactivar "${esp.nombre}"? Sus datos se conservan.`)) return;

    this.mensaje.set('');
    this.error.set('');
    this.api.cambiarEspecialidad(esp.id_especialidad, activar).subscribe({
      next: () => this.cargar(),
      error: e => this.error.set(e.error?.error ?? 'No se pudo actualizar la especialidad.'),
    });
  }
}