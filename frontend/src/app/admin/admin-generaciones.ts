import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ConfirmarDialog } from '../shared/confirmar-dialog';
import { NotificacionService } from '../shared/notificacion.service';
import { AdminService, Generacion } from './admin.service';
import { GeneracionDialog } from './generacion-dialog';

@Component({
  selector: 'app-admin-generaciones',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <h2>Generaciones</h2>
    <p class="ayuda">
      Una generación agrupa a los estudiantes que egresan el mismo año.
      No se eliminan: se desactivan.
    </p>

    <div class="barra">
      <button mat-flat-button type="button" (click)="nueva()">
        <mat-icon fontSet="material-symbols-outlined">add</mat-icon> Nueva generación
      </button>
    </div>

    <div class="tabla-scroll">
      <table>
        <thead>
          <tr><th>Año</th><th>Nombre</th><th>Estudiantes</th><th>Estado</th><th></th></tr>
        </thead>
        <tbody>
          @for (g of generaciones(); track g.anio) {
            <tr>
              <td>{{ g.anio }}</td>
              <td>{{ g.nombre }}</td>
              <td>{{ g.estudiantes }}</td>
              <td>
                <span class="chip" [class.inactivo]="!g.activa">{{ g.activa ? 'Activa' : 'Inactiva' }}</span>
              </td>
              <td class="acciones">
                <button mat-button type="button" (click)="alternar(g)">
                  {{ g.activa ? 'Desactivar' : 'Activar' }}
                </button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5">No hay generaciones.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .ayuda { font-size: 0.9rem; opacity: 0.75; }
    .barra { margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    th { position: sticky; top: 0; background: var(--mat-sys-surface); z-index: 1; }
    .acciones { white-space: nowrap; }
    .chip { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 0.8rem; background: #c8e6c9; color: #1b5e20; }
    .chip.inactivo { background: #e0e0e0; color: #424242; }
  `],
})
export class AdminGeneraciones implements OnInit {
  private api = inject(AdminService);
  private dialog = inject(MatDialog);
  private aviso = inject(NotificacionService);

  generaciones = signal<Generacion[]>([]);

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.api.listarGeneraciones().subscribe({
      next: lista => this.generaciones.set(lista),
      error: () => this.aviso.error('No se pudieron cargar las generaciones.'),
    });
  }

  nueva() {
    this.dialog
      .open(GeneracionDialog, { width: '420px', maxWidth: '95vw', disableClose: true })
      .afterClosed()
      .subscribe(creada => {
        if (!creada) return;
        this.aviso.ok('Generación creada.');
        this.cargar();
      });
  }

  alternar(g: Generacion) {
    if (!g.activa) {
      this.cambiar(g, true);
      return;
    }

    const aviso = g.estudiantes > 0 ? ` Tiene ${g.estudiantes} estudiante(s).` : '';
    this.dialog
      .open(ConfirmarDialog, {
        data: {
          titulo: 'Desactivar generación',
          mensaje: `¿Desactivar la generación ${g.anio}?${aviso}`,
          textoConfirmar: 'Desactivar',
        },
        maxWidth: '95vw',
      })
      .afterClosed()
      .subscribe(ok => {
        if (ok) this.cambiar(g, false);
      });
  }

  private cambiar(g: Generacion, activa: boolean) {
    this.api.cambiarGeneracion(g.anio, activa).subscribe({
      next: () => {
        this.aviso.ok(activa ? 'Generación activada.' : 'Generación desactivada.');
        this.cargar();
      },
      error: e => this.aviso.error(e.error?.error ?? 'No se pudo cambiar el estado.'),
    });
  }
}