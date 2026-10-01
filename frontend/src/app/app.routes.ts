import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Dashboard } from './dashboard/dashboard';
import { GenerarPracticaComponent } from './generar_practica/generar-practica.component';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard },
  { path: 'generar-practica', component: GenerarPracticaComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];