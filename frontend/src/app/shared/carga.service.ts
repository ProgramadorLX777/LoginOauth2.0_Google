import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CargaService {
  private pendientes = 0;
  private temporizador: ReturnType<typeof setTimeout> | null = null;

  readonly visible = signal(false);
  /** null = sin barra (spinner); 0-100 = subida con progreso */
  readonly progreso = signal<number | null>(null);

  iniciar() {
    this.pendientes++;
    if (this.pendientes === 1) {
      this.temporizador = setTimeout(() => this.visible.set(true), 150);
    }
  }

  terminar() {
    this.pendientes = Math.max(0, this.pendientes - 1);
    if (this.pendientes === 0) {
      if (this.temporizador) clearTimeout(this.temporizador);
      this.temporizador = null;
      this.visible.set(false);
      this.progreso.set(null);
    }
  }
}