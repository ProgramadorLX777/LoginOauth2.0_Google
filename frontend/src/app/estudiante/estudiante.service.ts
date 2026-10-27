import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface PerfilEstudiante {
  rut_completo: string;
  nombre_completo: string;
  curso: string;
  especialidad: string;
  estado: string;
  anio_generacion: number;
  correo_institucional: string | null;
  fecha_nacimiento: string;
  direccion: string;
  comuna: string;
  telefono_estudiante: string | null;
  celular_estudiante: string | null;
  tutor_nombre: string | null;
  tutor_correo: string | null;
  perfil_completo: boolean;
  faltantes: string[];
}

export interface PerfilEditable {
  direccion: string;
  comuna: string;
  telefono_estudiante: string;
  celular_estudiante: string;
}

export interface DocumentoEstado {
  id_tipo_documento: number;
  nombre: string;
  descripcion: string | null;
  obligatorio: number;
  id_documento: number | null;
  version: number | null;
  estado: string | null; // null = todavía no sube nada
  observacion: string | null;
  nombre_original: string | null;
  creado_en: string | null;
}

@Injectable({ providedIn: 'root' })
export class EstudianteService {
  private http = inject(HttpClient);
  private api = 'http://localhost:3000/estudiante';

  obtenerPerfil() {
    return this.http.get<PerfilEstudiante>(`${this.api}/mi-perfil`, { withCredentials: true });
  }

  guardarPerfil(datos: PerfilEditable) {
    return this.http.put<{ ok: boolean }>(`${this.api}/mi-perfil`, datos, { withCredentials: true });
  }

  listarDocumentos() {
    return this.http.get<DocumentoEstado[]>(`${this.api}/mis-documentos`, { withCredentials: true });
  }

  subirDocumento(idTipo: number, archivo: File) {
    const datos = new FormData();
    datos.append('archivo', archivo);
    return this.http.post<{ ok: boolean; version: number }>(
      `${this.api}/mis-documentos/${idTipo}`,
      datos,
      { withCredentials: true }
    );
  }

  urlDescarga(idDocumento: number) {
    return `${this.api}/documentos/${idDocumento}/descargar`;
  }
}