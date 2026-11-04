import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../auth/auth.service';
import { NotificacionService } from '../shared/notificacion.service';

@Component({
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private aviso = inject(NotificacionService);

  redirigiendo = signal(false);

  ngOnInit() {
    // Si el ingreso falló, el backend vuelve a /login?error=1
    if (this.route.snapshot.queryParamMap.get('error')) {
      this.aviso.error('No pudimos iniciar tu sesión. Usa tu correo institucional.');
    }

    // Si ya hay sesión, no tiene sentido mostrar el login
    this.auth.cargarSesion().subscribe(u => {
      if (u) this.router.navigate(['/dashboard']);
    });
  }

  // Si el usuario vuelve con el botón "atrás" desde Google, se reactiva el botón
  @HostListener('window:pageshow')
  reactivar() {
    this.redirigiendo.set(false);
  }

  loginWithGoogle() {
    if (this.redirigiendo()) return;
    this.redirigiendo.set(true);
    window.location.href = 'http://localhost:3000/auth/google';
  }
}