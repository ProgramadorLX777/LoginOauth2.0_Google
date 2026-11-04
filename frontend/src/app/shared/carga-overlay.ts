import { Component, inject } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CargaService } from './carga.service';

@Component({
  selector: 'app-carga-overlay',
  imports: [MatProgressSpinnerModule, MatProgressBarModule],
  template: `
    @if (carga.visible()) {
      <div class="fondo" role="alert" aria-busy="true" aria-live="polite">
        <div class="caja">
          @if (carga.progreso() !== null) {
            <mat-progress-bar mode="determinate" [value]="carga.progreso()!" />
            <p>Subiendo... {{ carga.progreso() }}%</p>
          } @else {
            <mat-progress-spinner mode="indeterminate" diameter="48" />
            <p>Procesando...</p>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .fondo {
      position: fixed;
      inset: 0;
      z-index: 3000;
      background: rgba(60, 60, 60, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: wait;
    }
    .caja {
      background: var(--mat-sys-surface, #fff);
      padding: 24px 32px;
      border-radius: 16px;
      min-width: 220px;
      max-width: 90vw;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .caja p { margin: 0; }
    mat-progress-bar { width: 100%; }
  `],
})
export class CargaOverlay {
  carga = inject(CargaService);
}