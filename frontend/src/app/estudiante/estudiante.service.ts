import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface PerfilEstudiante {
  rut_completo: string;
  nombre_completo: string;
  curso: string;
  especialidad: string;
  estado: string;
  fecha_nacimiento: string;
  direccion: string;
  comuna: string;
  correo: string | null;
  telefono_estudiante: string | null;
  celular_estudiante: string | null;
}

export interface PerfilEditable {
  direccion: string;
  comuna: string;
  correo: string;
  telefono_estudiante: string;
  celular_estudiante: string;
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
}