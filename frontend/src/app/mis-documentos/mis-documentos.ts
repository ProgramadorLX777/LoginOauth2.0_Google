import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { DocumentoEstado, EstudianteService } from '../estudiante/estudiante.service';
import { ConfirmarDialog } from '../shared/confirmar-dialog';
import { NotificacionService } from '../shared/notificacion.service';

const MAX_BYTES = 5 * 1024 * 1024;

const ETIQUETAS: Record<string, string> = {
  pendiente: 'Pendiente',
  cargado: 'Cargado',
  en_revision: 'En revisión',
  observado: 'Observado',
  aprobado: 'Aprobado',
  reemplazado: 'Reemplazado',
};

const CLASES: Record<string, string> = {
  pendiente: 'estado-pendiente',
  cargado: 'estado-cargado',
  en_revision: 'estado-revision',
  observado: 'estado-observado',
  aprobado: 'estado-aprobado',
  reemplazado: 'estado-reemplazado',
};

@Component({
  selector: 'app-mis-documentos',
  imports: [DatePipe, MatButtonModule, MatIconModule, MatChipsModule],
  templateUrl: './mis-documentos.html',
  styleUrl: './mis-documentos.css',
})
export class MisDocumentos implements OnInit {
  private api = inject(EstudianteService);
  private dialog = inject(MatDialog);
  private aviso = inject(NotificacionService);

  documentos = signal<DocumentoEstado[]>([]);
  cargando = signal(true);
  subiendoId = signal<number | null>(null);

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.api.listarDocumentos().subscribe({
      next: lista => {
        this.documentos.set(lista);
        this.cargando.set(false);
      },
      error: () => {
        this.aviso.error('No se pudieron cargar tus documentos.');
        this.cargando.set(false);
      },
    });
  }

  etiqueta(estado: string | null) {
    return ETIQUETAS[estado ?? 'pendiente'];
  }

  clase(estado: string | null) {
    return CLASES[estado ?? 'pendiente'];
  }

  urlDescarga(idDocumento: number) {
    return this.api.urlDescarga(idDocumento);
  }

  elegirArchivo(doc: DocumentoEstado, input: HTMLInputElement) {
    if (this.subiendoId() !== null) return;

    // Si ya hay una versión subida, se confirma antes de reemplazarla
    if (doc.id_documento) {
      this.dialog
        .open(ConfirmarDialog, {
          data: {
            titulo: 'Reemplazar documento',
            mensaje: `"${doc.nombre}" ya tiene una versión subida (versión ${doc.version}). ` +
              'Al subir un archivo nuevo, esta pasará al historial como reemplazada. ¿Continuar?',
            textoConfirmar: 'Elegir archivo',
          },
          maxWidth: '95vw',
        })
        .afterClosed()
        .subscribe(ok => {
          if (ok) input.click();
        });
      return;
    }

    input.click();
  }

  onArchivo(doc: DocumentoEstado, evento: Event) {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;

    if (archivo.type !== 'application/pdf') {
      this.aviso.error('Solo se permiten archivos PDF.');
      input.value = '';
      return;
    }
    if (archivo.size > MAX_BYTES) {
      this.aviso.error('El archivo supera los 5 MB.');
      input.value = '';
      return;
    }

    this.subiendoId.set(doc.id_tipo_documento);
    this.api.subirDocumento(doc.id_tipo_documento, archivo).subscribe({
      next: r => {
        this.aviso.ok(`"${doc.nombre}" se subió correctamente (versión ${r.version}).`);
        this.subiendoId.set(null);
        input.value = '';
        this.cargar();
      },
      error: e => {
        this.aviso.error(e.error?.error ?? 'No se pudo subir el archivo.');
        this.subiendoId.set(null);
        input.value = '';
      },
    });
  }
}