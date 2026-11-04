import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private snack = inject(MatSnackBar);

  ok(mensaje: string) {
    this.snack.open(mensaje, 'Cerrar', {
      duration: 4000,
      panelClass: ['snack-ok'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  error(mensaje: string) {
    this.snack.open(mensaje, 'Cerrar', {
      duration: 7000,
      panelClass: ['snack-error'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  info(mensaje: string) {
    this.snack.open(mensaje, 'Cerrar', { duration: 4000 });
  }
}