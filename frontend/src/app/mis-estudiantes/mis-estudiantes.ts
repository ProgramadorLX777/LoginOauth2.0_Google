import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';

interface EstudianteTutoreado {
  rut_completo: string;
  nombre_completo: string;
  curso: string;
  especialidad: string;
  anio_generacion: number;
  estado: string;
  correo_institucional: string | null;
}

@Component({
  selector: 'app-mis-estudiantes',
  imports: [RouterLink],
  template: `
    <div class="contenedor">
      <a routerLink="/dashboard">← Volver al menú</a>
      <h2>Mis estudiantes</h2>
      <p class="ayuda">Estudiantes de los que eres profesor tutor.</p>

      @if (error()) { <p class="error">{{ error() }}</p> }

      @if (cargando()) {
        <p>Cargando...</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Nombre</th><th>RUT</th><th>Generación</th>
              <th>Curso</th><th>Especialidad</th><th>Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (e of estudiantes(); track e.rut_completo) {
              <tr>
                <td>{{ e.nombre_completo }}</td>
                <td>{{ e.rut_completo }}</td>
                <td>{{ e.anio_generacion }}</td>
                <td>{{ e.curso }}</td>
                <td>{{ e.especialidad }}</td>
                <td>{{ e.estado }}</td>
              </tr>
            } @empty {
              <tr><td colspan="6">Todavía no tienes estudiantes asignados.</td></tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  styles: [`
    .contenedor { max-width: 900px; margin: 0 auto; padding: 24px; }
    .ayuda { font-size: 0.9em; opacity: 0.75; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ccc; }
    .error { color: #b00020; }
  `],
})
export class MisEstudiantes implements OnInit {
  private http = inject(HttpClient);

  estudiantes = signal<EstudianteTutoreado[]>([]);
  cargando = signal(true);
  error = signal('');

  ngOnInit() {
    this.http
      .get<EstudianteTutoreado[]>('http://localhost:3000/docente/mis-estudiantes', { withCredentials: true })
      .subscribe({
        next: lista => {
          this.estudiantes.set(lista);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar tus estudiantes.');
          this.cargando.set(false);
        },
      });
  }
}