import { HttpContextToken, HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize, tap } from 'rxjs';
import { CargaService } from './carga.service';

/** Para peticiones silenciosas (por ejemplo, revisar la sesión) que no deben mostrar loader */
export const SIN_LOADER = new HttpContextToken<boolean>(() => false);

export const cargaInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SIN_LOADER)) return next(req);

  const carga = inject(CargaService);
  carga.iniciar();

  return next(req).pipe(
    tap(ev => {
      if (ev.type === HttpEventType.UploadProgress && ev.total) {
        carga.progreso.set(Math.round((100 * ev.loaded) / ev.total));
      }
    }),
    finalize(() => carga.terminar()),
  );
};