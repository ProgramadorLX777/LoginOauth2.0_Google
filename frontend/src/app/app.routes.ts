import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Dashboard } from './dashboard/dashboard';
import { GenerarPracticaComponent } from './generar_practica/generar-practica.component';
import { rolGuard } from './auth/rol.guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard, canActivate: [rolGuard()] },
  {
    path: 'generar-practica',
    component: GenerarPracticaComponent,
    canActivate: [rolGuard('administrador', 'docente')]
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];