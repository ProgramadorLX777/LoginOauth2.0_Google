import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { NotificacionService } from './notificacion.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const aviso = inject(NotificacionService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const esConsulta = req.method === 'GET';
      const enLogin = router.url.startsWith('/login');

      if (err.status === 401) {
        // La comprobación silenciosa de sesión no debe molestar al usuario
        if (!enLogin && !req.url.includes('/auth/me')) {
          aviso.error('Tu sesión terminó. Inicia sesión nuevamente.');
        }
        if (!enLogin) router.navigate(['/login']);
      } else if (esConsulta && (err.status === 403 || err.status === 404)) {
        aviso.error(
          err.status === 403
            ? 'No tienes permiso para ver esa información.'
            : 'No encontramos esa información.'
        );
        router.navigate(['/dashboard']);
      } else if (err.status === 0) {
        aviso.error('No hay conexión con el servidor. Intenta de nuevo en unos minutos.');
      } else if (err.status >= 500) {
        aviso.error('Ocurrió un error en el servidor. Intenta de nuevo.');
      }

      // El error sigue su camino: cada formulario decide cómo mostrar el suyo
      return throwError(() => err);
    }),
  );
};