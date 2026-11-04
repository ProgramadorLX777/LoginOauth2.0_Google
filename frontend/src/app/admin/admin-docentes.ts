import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ConfirmarDialog } from '../shared/confirmar-dialog';
import { NotificacionService } from '../shared/notificacion.service';
import { AdminService, Docente, Especialidad } from './admin.service';
import { DocenteDialog } from './docente-dialog';

@Component({
  selector: 'app-admin-docentes',
  imports: [
    ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule,
  ],
  template: `
    <h2>Docentes tutores</h2>
    <p class="ayuda">
      Los docentes tutores (maestros guía) acompañan a los estudiantes de su especialidad.
      Los docentes no se eliminan: se desactivan, y su cuenta de acceso se desactiva con ellos.
    </p>

    <div class="barra">
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="buscar">
        <mat-label>Buscar por nombre, RUT o correo</mat-label>
        <input matInput [formControl]="busqueda" (keyup.enter)="cargar()" />
      </mat-form-field>

      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="estado">
        <mat-label>Estado</mat-label>
        <mat-select [formControl]="filtroEstado" (selectionChange)="cargar()">
          <mat-option value="">Todos</mat-option>
          <mat-option value="activo">Activos</mat-option>
          <mat-option value="inactivo">Inactivos</mat-option>
        </mat-select>
      </mat-form-field>

      <button mat-stroked-button type="button" (click)="cargar()">
        <mat-icon fontSet="material-symbols-outlined">search</mat-icon> Buscar
      </button>
      <button mat-flat-button type="button" (click)="abrir(null)">
        <mat-icon fontSet="material-symbols-outlined">add</mat-icon> Nuevo docente
      </button>
    </div>

    <div class="tabla-scroll">
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
                <span class="chip" [class.inactivo]="d.estado !== 'activo'">
                  {{ d.estado === 'activo' ? 'Activo' : 'Inactivo' }}
                </span>
                <small class="ayuda">cuenta: {{ d.tiene_cuenta ? (d.cuenta_activa ? 'sí' : 'inactiva') : 'no' }}</small>
              </td>
              <td class="acciones">
                <button mat-button type="button" (click)="abrir(d)">Editar</button>
                <button mat-button type="button" (click)="alternar(d)">
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
  `,
  styles: [`
    .ayuda { font-size: 0.85rem; opacity: 0.75; }
    .barra { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin: 16px 0; }
    .buscar { flex: 1; min-width: 220px; }
    .estado { width: 160px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    th { position: sticky; top: 0; background: var(--mat-sys-surface); z-index: 1; }
    .acciones { white-space: nowrap; }
    .chip {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 0.8rem;
      background: #c8e6c9;
      color: #1b5e20;
      margin-right: 6px;
    }
    .chip.inactivo { background: #e0e0e0; color: #424242; }
  `],
})
export class AdminDocentes implements OnInit {
  private api = inject(AdminService);
  private dialog = inject(MatDialog);
  private aviso = inject(NotificacionService);

  docentes = signal<Docente[]>([]);
  especialidades = signal<Especialidad[]>([]);

  busqueda = new FormControl('', { nonNullable: true });
  filtroEstado = new FormControl('', { nonNullable: true });

  ngOnInit() {
    this.api.listarEspecialidades().subscribe({
      next: lista => this.especialidades.set(lista.filter(e => e.activa)),
      error: () => this.aviso.error('No se pudieron cargar las especialidades.'),
    });
    this.cargar();
  }

  cargar() {
    this.api.listarDocentes(this.busqueda.value.trim(), this.filtroEstado.value).subscribe({
      next: lista => this.docentes.set(lista),
      error: () => this.aviso.error('No se pudieron cargar los docentes.'),
    });
  }

  abrir(docente: Docente | null) {
    const ref = this.dialog.open(DocenteDialog, {
      data: { docente, especialidades: this.especialidades() },
      width: '760px',
      maxWidth: '95vw',
      disableClose: true,
    });
    ref.afterClosed().subscribe(res => {
      if (!res) return;
      this.aviso.ok(res === 'editado' ? 'Docente actualizado.' : 'Docente creado.');
      this.cargar();
    });
  }

  alternar(d: Docente) {
    const activar = d.estado !== 'activo';

    if (activar) {
      this.cambiarEstado(d, true);
      return;
    }

    const avisoAlumnos = d.estudiantes > 0
      ? ` Tiene ${d.estudiantes} estudiante(s) asignado(s) como tutor.`
      : '';

    this.dialog
      .open(ConfirmarDialog, {
        data: {
          titulo: 'Desactivar docente',
          mensaje: `¿Desactivar a ${d.nombre_completo}? Su cuenta dejará de funcionar.${avisoAlumnos}`,
          textoConfirmar: 'Desactivar',
        },
        maxWidth: '95vw',
      })
      .afterClosed()
      .subscribe(ok => {
        if (ok) this.cambiarEstado(d, false);
      });
  }

  private cambiarEstado(d: Docente, activo: boolean) {
    this.api.cambiarEstadoDocente(d.rut_docente, activo).subscribe({
      next: () => {
        this.aviso.ok(activo ? 'Docente activado.' : 'Docente desactivado.');
        this.cargar();
      },
      error: e => this.aviso.error(e.error?.error ?? 'No se pudo cambiar el estado.'),
    });
  }
}