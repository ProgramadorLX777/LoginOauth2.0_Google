import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AuthService, Usuario } from '../auth/auth.service';
import { MENU } from '../shared/menu';

@Component({
  imports: [RouterLink, MatCardModule, MatIconModule],
  selector: 'app-dashboard',
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private auth = inject(AuthService);

  usuario = signal<Usuario | null>(null);
  menu = computed(() => {
    const u = this.usuario();
    return u ? MENU.filter(item => item.roles.includes(u.rol)) : [];
  });

  ngOnInit() {
    this.auth.cargarSesion().subscribe(u => this.usuario.set(u));
  }
}