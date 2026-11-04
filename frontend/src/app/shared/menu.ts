import { Rol } from '../auth/auth.service';

export interface ItemMenu {
  titulo: string;
  descripcion: string;
  icono: string;
  ruta: string | null; // null = todavía no existe la pantalla
  roles: Rol[];
}

export const MENU: ItemMenu[] = [
  { titulo: 'Usuarios', descripcion: 'Agregar y administrar usuarios del sistema', icono: 'group', ruta: null, roles: ['administrador'] },
  { titulo: 'Estudiantes', descripcion: 'Ver y gestionar estudiantes', icono: 'school', ruta: null, roles: ['administrador'] },
  { titulo: 'Docentes', descripcion: 'Gestionar docentes tutores', icono: 'badge', ruta: '/admin/docentes', roles: ['administrador'] },
  { titulo: 'Generaciones', descripcion: 'Crear y administrar generaciones', icono: 'calendar_month', ruta: '/admin/generaciones', roles: ['administrador'] },
  { titulo: 'Especialidades', descripcion: 'Catálogo de especialidades y menciones', icono: 'category', ruta: '/admin/especialidades', roles: ['administrador'] },
  { titulo: 'Mis estudiantes', descripcion: 'Estudiantes de los que eres profesor tutor', icono: 'groups', ruta: '/mis-estudiantes', roles: ['docente'] },
  { titulo: 'Centros de práctica', descripcion: 'Empresas donde se realizan las prácticas', icono: 'apartment', ruta: null, roles: ['administrador', 'docente'] },
  { titulo: 'Generar práctica', descripcion: 'Generar el documento de práctica en PDF', icono: 'picture_as_pdf', ruta: '/generar-practica', roles: ['administrador', 'docente'] },
  { titulo: 'Mi perfil', descripcion: 'Ver y completar mis datos personales', icono: 'person', ruta: '/mi-perfil', roles: ['estudiante'] },
  { titulo: 'Mis documentos', descripcion: 'Descargar y subir documentos de tu práctica', icono: 'upload_file', ruta: '/mis-documentos', roles: ['estudiante'] },
  { titulo: 'Mi empresa', descripcion: 'Informa tu centro de práctica y tu supervisor', icono: 'business', ruta: '/mi-empresa', roles: ['estudiante'] },
];