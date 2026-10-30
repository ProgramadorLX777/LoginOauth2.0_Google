import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService, Generacion } from './admin.service';

@Component({
  selector: 'app-admin-generaciones',
  imports: [ReactiveFormsModule],
  template: `
    <h2>Generaciones</h2>
    <p class="ayuda">
      Cada generación agrupa a los estudiantes que egresan un mismo año.
      Las generaciones no se eliminan, para conservar la historia.
    </p>

    @if (mensaje()) { <p class="ok">{{ mensaje() }}</p> }
    @if (error()) { <p class="error">{{ error() }}</p> }

    <form class="alta" (submit)="enviar($event)">
      <label>Nueva generación (año)
        <input type="number" [formControl]="anio" placeholder="2028" />
      </label>
      <button type="submit">Crear</button>
    </form>
    @if (anio.touched && anio.invalid) {
      <small class="error">Ingresa un año válido (entre 1990 y 2100).</small>
    }

    @if (cargando()) {
      <p>Cargando...</p>
    } @else {
      <table>
        <thead>
          <tr><th>Generación</th><th>Estudiantes</th><th>Estado</th><th></th></tr>
        </thead>
        <tbody>
          @for (g of generaciones(); track g.anio) {
            <tr>
              <td>{{ g.nombre }}</td>
              <td>{{ g.estudiantes }}</td>
              <td>{{ g.activa ? 'Activa' : 'Inactiva' }}</td>
              <td>
                <button type="button" class="secundario" (click)="alternar(g)">
                  {{ g.activa ? 'Desactivar' : 'Activar' }}
                </button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="4">Todavía no hay generaciones.</td></tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: [`
    .ayuda { font-size: 0.9em; opacity: 0.75; }
    .alta { display: flex; gap: 12px; align-items: flex-end; margin: 16px 0 4px; }
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
export class AdminGeneraciones implements OnInit {
  private api = inject(AdminService);

  generaciones = signal<Generacion[]>([]);
  cargando = signal(true);
  mensaje = signal('');
  error = signal('');

  anio = new FormControl<number | null>(null, [Validators.required, Validators.min(1990), Validators.max(2100)]);

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.api.listarGeneraciones().subscribe({
      next: lista => {
        this.generaciones.set(lista);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las generaciones.');
        this.cargando.set(false);
      },
    });
  }

  enviar(evento: Event) {
    evento.preventDefault();
    this.crear();
  }

  crear(excepcion = false) {
    this.mensaje.set('');
    this.error.set('');
    const anio = this.anio.value;
    if (this.anio.invalid || anio === null) {
      this.anio.markAsTouched();
      return;
    }

    this.api.crearGeneracion(anio, excepcion).subscribe({
      next: () => {
        this.mensaje.set(`Generación ${anio} creada.`);
        this.anio.reset();
        this.cargar();
      },
      error: e => {
        // Regla de la guía: antes de 2026 solo como excepción confirmada
        if (e.error?.codigo === 'REQUIERE_EXCEPCION') {
          if (confirm(`La generación ${anio} es anterior a 2026. ¿Confirmas crearla como excepción?`)) {
            this.crear(true);
          }
          return;
        }
        this.error.set(e.error?.error ?? 'No se pudo crear la generación.');
      },
    });
  }

  alternar(g: Generacion) {
    const activar = !g.activa;
    if (!activar && !confirm(`¿Desactivar la ${g.nombre}? Sus datos se conservan.`)) return;

    this.mensaje.set('');
    this.error.set('');
    this.api.cambiarGeneracion(g.anio, activar).subscribe({
      next: () => this.cargar(),
      error: e => this.error.set(e.error?.error ?? 'No se pudo actualizar la generación.'),
    });
  }
}