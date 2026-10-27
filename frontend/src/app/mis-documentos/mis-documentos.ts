import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DocumentoEstado, EstudianteService } from '../estudiante/estudiante.service';

const ETIQUETAS: Record<string, string> = {
  pendiente: '🔴 Pendiente',
  cargado: '🔵 Cargado',
  en_revision: '🟡 En revisión',
  observado: '🟠 Observado',
  aprobado: '🟢 Aprobado',
  reemplazado: '⚫ Reemplazado',
};

const MAX_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-mis-documentos',
  imports: [RouterLink, DatePipe],
  templateUrl: './mis-documentos.html',
  styleUrl: './mis-documentos.css',
})
export class MisDocumentos implements OnInit {
  private api = inject(EstudianteService);

  documentos = signal<DocumentoEstado[]>([]);
  cargando = signal(true);
  subiendoId = signal<number | null>(null);
  mensaje = signal('');
  error = signal('');

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.api.listarDocumentos().subscribe({
      next: lista => {
        this.documentos.set(lista);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar tus documentos.');
        this.cargando.set(false);
      },
    });
  }

  etiqueta(estado: string | null) {
    return ETIQUETAS[estado ?? 'pendiente'];
  }

  urlDescarga(idDocumento: number) {
    return this.api.urlDescarga(idDocumento);
  }

  onArchivo(doc: DocumentoEstado, evento: Event) {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;

    this.mensaje.set('');
    this.error.set('');

    if (archivo.type !== 'application/pdf') {
      this.error.set('Solo se permiten archivos PDF.');
      input.value = '';
      return;
    }
    if (archivo.size > MAX_BYTES) {
      this.error.set('El archivo supera los 5 MB.');
      input.value = '';
      return;
    }

    this.subiendoId.set(doc.id_tipo_documento);
    this.api.subirDocumento(doc.id_tipo_documento, archivo).subscribe({
      next: r => {
        this.mensaje.set(`"${doc.nombre}" se subió correctamente (versión ${r.version}).`);
        this.subiendoId.set(null);
        input.value = '';
        this.cargar();
      },
      error: e => {
        this.error.set(e.error?.error ?? 'No se pudo subir el archivo.');
        this.subiendoId.set(null);
        input.value = '';
      },
    });
  }
}