import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { EstudianteService, PerfilEstudiante } from '../estudiante/estudiante.service';
import { NotificacionService } from '../shared/notificacion.service';
import { MiPerfilDialog } from './mi-perfil-dialog';

interface Campo {
  etiqueta: string;
  valor: string;
}

// "2008-05-14T00:00:00.000Z" -> "14-05-2008"
function formatearFecha(f: string | null): string {
  if (!f) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(f);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : f;
}

@Component({
  selector: 'app-mi-perfil',
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule],
  templateUrl: './mi-perfil.html',
  styleUrl: './mi-perfil.css',
})
export class MiPerfil implements OnInit {
  private api = inject(EstudianteService);
  private dialog = inject(MatDialog);
  private aviso = inject(NotificacionService);

  perfil = signal<PerfilEstudiante | null>(null);

  datosEstablecimiento = computed<Campo[]>(() => {
    const p = this.perfil();
    if (!p) return [];
    return [
      { etiqueta: 'Nombre', valor: p.nombre_completo },
      { etiqueta: 'RUT', valor: p.rut_completo },
      { etiqueta: 'Fecha de nacimiento', valor: formatearFecha(p.fecha_nacimiento) },
      { etiqueta: 'Generación', valor: String(p.anio_generacion ?? '') },
      { etiqueta: 'Curso', valor: p.curso },
      { etiqueta: 'Especialidad', valor: p.especialidad },
      { etiqueta: 'Correo institucional', valor: p.correo_institucional ?? 'No registrado' },
      {
        etiqueta: 'Profesor tutor (maestro guía)',
        valor: p.tutor_nombre
          ? p.tutor_nombre + (p.tutor_correo ? ` · ${p.tutor_correo}` : '')
          : 'Aún no asignado',
      },
      { etiqueta: 'Estado', valor: p.estado },
    ];
  });

  datosContacto = computed<Campo[]>(() => {
    const p = this.perfil();
    if (!p) return [];
    return [
      { etiqueta: 'Dirección', valor: p.direccion },
      { etiqueta: 'Comuna', valor: p.comuna },
      { etiqueta: 'Teléfono', valor: p.telefono_estudiante ?? '' },
      { etiqueta: 'Celular', valor: p.celular_estudiante ?? '' },
    ];
  });

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.api.obtenerPerfil().subscribe({
      next: p => this.perfil.set(p),
      error: () => this.aviso.error('No se pudo cargar tu perfil.'),
    });
  }

  editar() {
    const p = this.perfil();
    if (!p) return;

    this.dialog
      .open(MiPerfilDialog, {
        data: {
          direccion: p.direccion,
          comuna: p.comuna,
          telefono_estudiante: p.telefono_estudiante ?? '',
          celular_estudiante: p.celular_estudiante ?? '',
        },
        width: '520px',
        maxWidth: '95vw',
        disableClose: true,
      })
      .afterClosed()
      .subscribe(guardado => {
        if (!guardado) return;
        this.aviso.ok('Tus datos se guardaron correctamente.');
        this.cargar(); // actualiza el aviso de "perfil completo"
      });
  }
}