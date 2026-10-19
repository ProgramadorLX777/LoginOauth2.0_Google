import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

export type Rol = 'administrador' | 'docente' | 'estudiante';

export interface Usuario {
  id_usuario: number;
  email: string;
  name: string;
  rol: Rol;
  rut_estudiante: number | null;
  rut_docente: number | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private api = 'http://localhost:3000';

  usuario: Usuario | null = null;

  // Pregunta al backend quién está logueado (y con qué rol)
  cargarSesion(): Observable<Usuario | null> {
    return this.http
      .get<{ authenticated: boolean; user: Usuario }>(`${this.api}/auth/me`, { withCredentials: true })
      .pipe(
        map(r => r.user),
        tap(u => (this.usuario = u)),
        catchError(() => {
          this.usuario = null;
          return of(null);
        })
      );
  }

  logout(): Observable<unknown> {
    return this.http
      .post(`${this.api}/auth/logout`, {}, { withCredentials: true })
      .pipe(tap(() => (this.usuario = null)));
  }
}