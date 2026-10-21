import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Dashboard } from './dashboard/dashboard';
import { GenerarPracticaComponent } from './generar_practica/generar-practica.component';
import { MiPerfil } from './mi-perfil/mi-perfil';
import { rolGuard } from './auth/rol.guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard, canActivate: [rolGuard()] },
  {
    path: 'generar-practica',
    component: GenerarPracticaComponent,
    canActivate: [rolGuard('administrador', 'docente')]
  },
  { path: 'mi-perfil', component: MiPerfil, canActivate: [rolGuard('estudiante')] },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];