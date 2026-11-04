import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Dashboard } from './dashboard/dashboard';
import { GenerarPracticaComponent } from './generar_practica/generar-practica.component';
import { MiPerfil } from './mi-perfil/mi-perfil';
import { MisDocumentos } from './mis-documentos/mis-documentos';
import { rolGuard } from './auth/rol.guard';
import { MisEstudiantes } from './mis-estudiantes/mis-estudiantes';
import { MiEmpresa } from './mi-empresa/mi-empresa';
import { AdminGeneraciones } from './admin/admin-generaciones';
import { AdminEspecialidades } from './admin/admin-especialidades';
import { AdminDocentes } from './admin/admin-docentes';
import { Shell } from './shell/shell';

export const routes: Routes = [
  { path: 'login', component: Login },
  {
    path: '',
    component: Shell,
    canActivate: [rolGuard()],
    children: [
      { path: 'dashboard', component: Dashboard },
      { path: 'generar-practica', component: GenerarPracticaComponent, canActivate: [rolGuard('administrador', 'docente')] },
      { path: 'mi-perfil', component: MiPerfil, canActivate: [rolGuard('estudiante')] },
      { path: 'mis-documentos', component: MisDocumentos, canActivate: [rolGuard('estudiante')] },
      { path: 'mi-empresa', component: MiEmpresa, canActivate: [rolGuard('estudiante')] },
      { path: 'mis-estudiantes', component: MisEstudiantes, canActivate: [rolGuard('docente')] },
      {
        path: 'admin',
        canActivate: [rolGuard('administrador')],
        canActivateChild: [rolGuard('administrador')],
        children: [
          { path: 'generaciones', component: AdminGeneraciones },
          { path: 'especialidades', component: AdminEspecialidades },
          { path: 'docentes', component: AdminDocentes },
          { path: '', redirectTo: 'generaciones', pathMatch: 'full' },
        ],
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];