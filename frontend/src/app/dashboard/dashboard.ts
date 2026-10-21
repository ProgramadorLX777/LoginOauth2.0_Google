import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, Rol, Usuario } from '../auth/auth.service';

interface ItemMenu {
  titulo: string;
  descripcion: string;
  ruta: string | null; // null = todavía no existe la pantalla
  roles: Rol[];
}

const MENU: ItemMenu[] = [
  { titulo: 'Usuarios', descripcion: 'Agregar y administrar usuarios del sistema', ruta: null, roles: ['administrador'] },
  { titulo: 'Estudiantes', descripcion: 'Ver y gestionar estudiantes', ruta: null, roles: ['administrador', 'docente'] },
  { titulo: 'Docentes', descripcion: 'Gestionar docentes', ruta: null, roles: ['administrador'] },
  { titulo: 'Centros de práctica', descripcion: 'Empresas donde se realizan las prácticas', ruta: null, roles: ['administrador', 'docente'] },
  { titulo: 'Generar práctica', descripcion: 'Generar el documento de práctica en PDF', ruta: '/generar-practica', roles: ['administrador', 'docente'] },
  { titulo: 'Mi perfil', descripcion: 'Ver y completar mis datos personales', ruta: '/mi-perfil', roles: ['estudiante'] },
  { titulo: 'Mis documentos', descripcion: 'Descargar y subir documentos de tu práctica', ruta: null, roles: ['estudiante'] },
];

@Component({
  imports: [RouterLink],
  selector: 'app-dashboard',
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  usuario = signal<Usuario | null>(null);
  menu = signal<ItemMenu[]>([]);

  ngOnInit() {
    this.auth.cargarSesion().subscribe(u => {
      this.usuario.set(u);
      this.menu.set(u ? MENU.filter(item => item.roles.includes(u.rol)) : []);
    });
  }

  cerrarSesion() {
    this.auth.logout().subscribe(() => this.router.navigate(['/login']));
  }
}