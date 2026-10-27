import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Empresa {
  id_centro_practica: number;
  rut_empresa: string;
  razon_social: string;
  nombre_fantasia: string | null;
  giro: string | null;
  direccion: string | null;
  numero_direccion: string | null;
  comuna: string | null;
  region: string | null;
  telefono: string | null;
  correo: string | null;
  sitio_web: string | null;
}

export interface BusquedaEmpresa {
  existe: boolean;
  empresa?: Empresa;
  rut?: string;
}

export interface PracticaVigente {
  id_practica: number;
  sucursal: string | null;
  departamento: string;
  jefe_directo: string | null;
  cargo_jefe_directo: string | null;
  etapa: string;
  id_centro_practica: number;
  rut_empresa: string;
  razon_social: string;
  nombre_fantasia: string | null;
  giro: string | null;
  direccion: string | null;
  numero_direccion: string | null;
  comuna: string | null;
  region: string | null;
  telefono_empresa: string | null;
  correo_empresa: string | null;
  sitio_web: string | null;
  rut_supervisor: string;
  supervisor_nombre: string;
  supervisor_cargo: string;
  supervisor_telefono: string | null;
  supervisor_correo: string;
}

export interface MiPracticaRespuesta {
  practica: PracticaVigente | null;
  editable: boolean;
}

export interface DatosPractica {
  rut_empresa: string;
  sucursal: string;
  departamento: string;
  jefe_directo: string;
  cargo_jefe_directo: string;
  supervisor: {
    rut: string;
    nombre_completo: string;
    cargo: string;
    telefono: string;
    correo: string;
  };
}

@Injectable({ providedIn: 'root' })
export class PracticaService {
  private http = inject(HttpClient);
  private api = 'http://localhost:3000/estudiante';

  buscarEmpresa(rut: string) {
    return this.http.get<BusquedaEmpresa>(`${this.api}/empresa/buscar`, {
      params: { rut },
      withCredentials: true,
    });
  }

  miPractica() {
    return this.http.get<MiPracticaRespuesta>(`${this.api}/mi-practica`, { withCredentials: true });
  }

  guardarPractica(datos: DatosPractica) {
    return this.http.put<{ ok: boolean }>(`${this.api}/mi-practica`, datos, { withCredentials: true });
  }
}