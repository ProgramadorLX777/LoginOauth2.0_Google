import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService, Rol } from './auth.service';

// Sin roles: basta con estar logueado. Con roles: además debe tener uno de ellos.
export const rolGuard = (...roles: Rol[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.cargarSesion().pipe(
    map(usuario => {
      if (!usuario) return router.createUrlTree(['/login']);
      if (roles.length && !roles.includes(usuario.rol)) return router.createUrlTree(['/dashboard']);
      return true;
    })
  );
};