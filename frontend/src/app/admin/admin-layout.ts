import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="admin">
      <aside>
        <a routerLink="/dashboard" class="volver">← Menú principal</a>
        <h3>Administración</h3>
        <nav>
          <a routerLink="/admin/generaciones" routerLinkActive="activo">Generaciones</a>
          <a routerLink="/admin/especialidades" routerLinkActive="activo">Especialidades</a>
          <a routerLink="/admin/docentes" routerLinkActive="activo">Docentes</a>
          </nav>
      </aside>
      <main>
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .admin { display: grid; grid-template-columns: 220px 1fr; min-height: 100vh; }
    aside { padding: 16px; border-right: 1px solid #ccc; }
    aside nav { display: flex; flex-direction: column; gap: 4px; margin-top: 12px; }
    aside nav a { padding: 8px 10px; border-radius: 6px; text-decoration: none; color: inherit; }
    aside nav a.activo { background: #e8eefc; font-weight: 600; color: #1a237e; }
    main { padding: 24px; max-width: 900px; }
    .volver { font-size: 0.9em; }
    @media (max-width: 700px) {
      .admin { grid-template-columns: 1fr; }
      aside { border-right: 0; border-bottom: 1px solid #ccc; }
    }
  `],
})
export class AdminLayout {}