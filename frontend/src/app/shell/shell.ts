import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { map } from 'rxjs';
import { AuthService, Usuario } from '../auth/auth.service';
import { MENU } from '../shared/menu';

const ETIQUETA_ROL: Record<string, string> = {
  administrador: 'Administrador',
  docente: 'Docente tutor',
  estudiante: 'Estudiante',
};

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatSidenavModule, MatListModule, MatIconModule, MatButtonModule,
  ],
  template: `
    <div [class]="'pantalla rol-' + (usuario()?.rol ?? '')">
      <mat-toolbar class="encabezado">
        <button mat-icon-button type="button" aria-label="Abrir menú" (click)="nav.toggle()">
          <mat-icon fontSet="material-symbols-outlined">menu</mat-icon>
        </button>
        <span class="titulo">SIGP-TP</span>
        <span class="etiqueta-rol">{{ etiquetaRol() }}</span>
        <span class="espacio"></span>

        @if (!movil()) {
          <span class="nombre">{{ usuario()?.name }}</span>
          <button mat-button type="button" (click)="cerrarSesion()">
            <mat-icon fontSet="material-symbols-outlined">logout</mat-icon>
            Cerrar sesión
          </button>
        } @else {
          <button mat-icon-button type="button" aria-label="Cerrar sesión" (click)="cerrarSesion()">
            <mat-icon fontSet="material-symbols-outlined">logout</mat-icon>
          </button>
        }
      </mat-toolbar>

      <mat-sidenav-container class="contenedor">
        <mat-sidenav #nav [mode]="movil() ? 'over' : 'side'" [opened]="!movil()" class="menu">
          <div class="menu-interior">
            <mat-nav-list>
              <a mat-list-item routerLink="/dashboard" routerLinkActive="activo" (click)="cerrarEnMovil(nav)">
                <mat-icon matListItemIcon fontSet="material-symbols-outlined">home</mat-icon>
                <span matListItemTitle>Inicio</span>
              </a>
              @for (item of menu(); track item.titulo) {
                @if (item.ruta) {
                  <a mat-list-item [routerLink]="item.ruta" routerLinkActive="activo" (click)="cerrarEnMovil(nav)">
                    <mat-icon matListItemIcon fontSet="material-symbols-outlined">{{ item.icono }}</mat-icon>
                    <span matListItemTitle>{{ item.titulo }}</span>
                  </a>
                } @else {
                  <a mat-list-item class="pronto" aria-disabled="true">
                    <mat-icon matListItemIcon fontSet="material-symbols-outlined">{{ item.icono }}</mat-icon>
                    <span matListItemTitle>{{ item.titulo }}</span>
                    <span matListItemLine>Próximamente</span>
                  </a>
                }
              }
            </mat-nav-list>

            <div class="pie">
              <button mat-stroked-button type="button" class="salir" (click)="cerrarSesion()">
                <mat-icon fontSet="material-symbols-outlined">logout</mat-icon>
                Cerrar sesión
              </button>
            </div>
          </div>
        </mat-sidenav>

        <mat-sidenav-content class="contenido-scroll">
          <main class="contenido">
            <router-outlet />
          </main>
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
  styles: [`
    .pantalla { display: flex; flex-direction: column; height: 100dvh; }
    .encabezado {
      --mat-toolbar-container-background-color: var(--rol-actual);
      --mat-toolbar-container-text-color: #fff;
      --mat-button-text-label-text-color: #fff;
      --mat-icon-button-icon-color: #fff;
      flex: 0 0 auto;
      gap: 8px;
    }
    .titulo { font-weight: 500; }
    .etiqueta-rol {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      padding: 2px 10px;
      font-size: 0.8rem;
    }
    .espacio { flex: 1; }
    .nombre { font-size: 0.9rem; }
    .contenedor { flex: 1; min-height: 0; }
    .menu { width: 260px; max-width: 80vw; }
    .menu-interior { display: flex; flex-direction: column; min-height: 100%; }
    .pie { margin-top: auto; padding: 16px; }
    .salir { width: 100%; }
    .contenido-scroll { overflow: auto; }
    .activo {
      background: color-mix(in srgb, var(--rol-actual) 14%, transparent);
      font-weight: 500;
    }
    .pronto { opacity: 0.55; pointer-events: none; }
  `],
})
export class Shell implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private bp = inject(BreakpointObserver);

  usuario = signal<Usuario | null>(null);
  menu = computed(() => {
    const u = this.usuario();
    return u ? MENU.filter(item => item.roles.includes(u.rol)) : [];
  });
  etiquetaRol = computed(() => ETIQUETA_ROL[this.usuario()?.rol ?? ''] ?? '');
  movil = toSignal(this.bp.observe('(max-width: 899px)').pipe(map(r => r.matches)), { initialValue: false });

  ngOnInit() {
    this.auth.cargarSesion().subscribe(u => this.usuario.set(u));
  }

  cerrarEnMovil(nav: { close: () => unknown }) {
    if (this.movil()) nav.close();
  }

  cerrarSesion() {
    this.auth.logout().subscribe(() => this.router.navigate(['/login']));
  }
}