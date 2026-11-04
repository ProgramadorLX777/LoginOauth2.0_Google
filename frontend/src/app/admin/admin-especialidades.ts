import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ConfirmarDialog } from '../shared/confirmar-dialog';
import { NotificacionService } from '../shared/notificacion.service';
import { AdminService, Especialidad } from './admin.service';
import { EspecialidadDialog } from './especialidad-dialog';

@Component({
  selector: 'app-admin-especialidades',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <h2>Especialidades</h2>
    <p class="ayuda">
      Catálogo de especialidades y menciones. No se eliminan: se desactivan,
      y las inactivas dejan de ofrecerse al crear docentes.
    </p>

    <div class="barra">
      <button mat-flat-button type="button" (click)="nueva()">
        <mat-icon fontSet="material-symbols-outlined">add</mat-icon> Nueva especialidad
      </button>
    </div>

    <div class="tabla-scroll">
      <table>
        <thead>
          <tr><th>Especialidad</th><th>Mención</th><th>Estado</th><th></th></tr>
        </thead>
        <tbody>
          @for (e of especialidades(); track e.id_especialidad) {
            <tr>
              <td>{{ e.nombre }}</td>
              <td>{{ e.mencion || '—' }}</td>
              <td>
                <span class="chip" [class.inactivo]="!e.activa">{{ e.activa ? 'Activa' : 'Inactiva' }}</span>
              </td>
              <td class="acciones">
                <button mat-button type="button" (click)="alternar(e)">
                  {{ e.activa ? 'Desactivar' : 'Activar' }}
                </button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="4">No hay especialidades.</td></tr>
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
export class AdminEspecialidades implements OnInit {
  private api = inject(AdminService);
  private dialog = inject(MatDialog);
  private aviso = inject(NotificacionService);

  especialidades = signal<Especialidad[]>([]);

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.api.listarEspecialidades().subscribe({
      next: lista => this.especialidades.set(lista),
      error: () => this.aviso.error('No se pudieron cargar las especialidades.'),
    });
  }

  nueva() {
    this.dialog
      .open(EspecialidadDialog, { width: '460px', maxWidth: '95vw', disableClose: true })
      .afterClosed()
      .subscribe(creada => {
        if (!creada) return;
        this.aviso.ok('Especialidad creada.');
        this.cargar();
      });
  }

  alternar(e: Especialidad) {
    if (!e.activa) {
      this.cambiar(e, true);
      return;
    }

    this.dialog
      .open(ConfirmarDialog, {
        data: {
          titulo: 'Desactivar especialidad',
          mensaje: `¿Desactivar "${e.nombre}${e.mencion ? ' mención ' + e.mencion : ''}"? Ya no se podrá elegir al crear docentes.`,
          textoConfirmar: 'Desactivar',
        },
        maxWidth: '95vw',
      })
      .afterClosed()
      .subscribe(ok => {
        if (ok) this.cambiar(e, false);
      });
  }

  private cambiar(e: Especialidad, activa: boolean) {
    this.api.cambiarEspecialidad(e.id_especialidad, activa).subscribe({
      next: () => {
        this.aviso.ok(activa ? 'Especialidad activada.' : 'Especialidad desactivada.');
        this.cargar();
      },
      error: err => this.aviso.error(err.error?.error ?? 'No se pudo cambiar el estado.'),
    });
  }
}