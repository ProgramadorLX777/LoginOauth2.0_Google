import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Generacion {
  anio: number;
  nombre: string;
  activa: number;
  estudiantes: number;
}

export interface Especialidad {
  id_especialidad: number;
  nombre: string;
  mencion: string;
  activa: number;
}

export interface Docente {
  rut_docente: number;
  rut_completo: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  nombre_completo: string;
  correo: string | null;
  telefono_docente: string | null;
  celular_docente: string | null;
  cargo: string | null;
  jefe_directo: string | null;
  cargo_jefe_directo: string | null;
  estado: 'activo' | 'inactivo';
  id_especialidad: number | null;
  especialidad: string;
  tiene_cuenta: number;
  cuenta_activa: number;
  estudiantes: number;
}

export interface DatosDocente {
  rut?: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  correo: string;
  telefono: string;
  celular: string;
  cargo: string;
  jefe_directo: string;
  cargo_jefe_directo: string;
  id_especialidad: number;
  crear_cuenta?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private api = 'http://localhost:3000/admin';
  private opts = { withCredentials: true };

  listarGeneraciones() {
    return this.http.get<Generacion[]>(`${this.api}/generaciones`, this.opts);
  }

  crearGeneracion(anio: number, excepcion = false) {
    return this.http.post<{ ok: boolean }>(`${this.api}/generaciones`, { anio, excepcion }, this.opts);
  }

  cambiarGeneracion(anio: number, activa: boolean) {
    return this.http.put<{ ok: boolean }>(`${this.api}/generaciones/${anio}`, { activa }, this.opts);
  }

  listarEspecialidades() {
    return this.http.get<Especialidad[]>(`${this.api}/especialidades`, this.opts);
  }

  crearEspecialidad(nombre: string, mencion: string) {
    return this.http.post<{ ok: boolean }>(`${this.api}/especialidades`, { nombre, mencion }, this.opts);
  }

  cambiarEspecialidad(id: number, activa: boolean) {
    return this.http.put<{ ok: boolean }>(`${this.api}/especialidades/${id}`, { activa }, this.opts);
  }

  listarDocentes(q: string, estado: string) {
    const params: Record<string, string> = {};
    if (q) params['q'] = q;
    if (estado) params['estado'] = estado;
    return this.http.get<Docente[]>(`${this.api}/docentes`, { params, withCredentials: true });
  }

  crearDocente(datos: DatosDocente) {
    return this.http.post<{ ok: boolean }>(`${this.api}/docentes`, datos, this.opts);
  }

  editarDocente(rut: number, datos: DatosDocente) {
    return this.http.put<{ ok: boolean }>(`${this.api}/docentes/${rut}`, datos, this.opts);
  }

  cambiarEstadoDocente(rut: number, activo: boolean) {
    return this.http.put<{ ok: boolean }>(`${this.api}/docentes/${rut}/estado`, { activo }, this.opts);
  }
}