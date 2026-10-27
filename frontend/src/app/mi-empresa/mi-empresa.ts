import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatosPractica, Empresa, PracticaService, PracticaVigente } from '../estudiante/practica.service';

const FONO = /^[0-9+\s-]{8,15}$/;

const ETAPAS: Record<string, string> = {
  buscando_centro: 'Buscando centro de práctica',
  centro_informado: 'Centro de práctica informado',
  documentacion_inicial: 'Documentación inicial',
  autorizado_para_iniciar: 'Autorizado para iniciar',
  practica_iniciada: 'Práctica iniciada',
  practica_finalizada: 'Práctica finalizada',
  documentacion_final: 'Documentación final',
  expediente_completo: 'Expediente completo',
  aprobado_para_titulacion: 'Aprobado para titulación',
  titulado: 'Titulado',
};

@Component({
  selector: 'app-mi-empresa',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="contenedor">
      <a routerLink="/dashboard">← Volver al menú</a>
      <h2>Mi empresa y práctica</h2>

      @if (mensaje()) { <p class="ok">{{ mensaje() }}</p> }
      @if (error()) { <p class="error">{{ error() }}</p> }
      @if (cargando()) { <p>Cargando...</p> }

      @if (!cargando()) {

        @if (practica(); as p) {
          @if (!editando()) {
            <p class="ok">✅ Tu centro de práctica está informado.</p>
            <p><strong>Etapa:</strong> {{ etapa(p.etapa) }}</p>

            <section class="bloque">
              <h3>Empresa</h3>
              <dl>
                <dt>Razón social</dt><dd>{{ p.razon_social }}</dd>
                <dt>Nombre de fantasía</dt><dd>{{ p.nombre_fantasia ?? '—' }}</dd>
                <dt>RUT</dt><dd>{{ p.rut_empresa }}</dd>
                <dt>Rubro</dt><dd>{{ p.giro ?? '—' }}</dd>
                <dt>Dirección</dt><dd>{{ p.direccion }} {{ p.numero_direccion }}, {{ p.comuna }}, {{ p.region }}</dd>
              </dl>
            </section>

            <section class="bloque">
              <h3>Mi práctica</h3>
              <dl>
                <dt>Sucursal</dt><dd>{{ p.sucursal ?? '—' }}</dd>
                <dt>Departamento</dt><dd>{{ p.departamento }}</dd>
                <dt>Jefe directo</dt><dd>{{ p.jefe_directo }} ({{ p.cargo_jefe_directo }})</dd>
              </dl>
            </section>

            <section class="bloque">
              <h3>Supervisor de la práctica</h3>
              <dl>
                <dt>Nombre</dt><dd>{{ p.supervisor_nombre }}</dd>
                <dt>RUT</dt><dd>{{ p.rut_supervisor }}</dd>
                <dt>Cargo</dt><dd>{{ p.supervisor_cargo }}</dd>
                <dt>Teléfono</dt><dd>{{ p.supervisor_telefono }}</dd>
                <dt>Correo</dt><dd>{{ p.supervisor_correo }}</dd>
              </dl>
            </section>

            @if (editable()) {
              <button type="button" (click)="editar()">Editar mis datos</button>
            } @else {
              <p class="ayuda">Tu práctica ya avanzó de etapa. Si necesitas un cambio, habla con tu profesor tutor.</p>
            }
          }
        }

        @if (!practica() || editando()) {

          @if (!empresa()) {
            <section class="bloque">
              <h3>1. Busca tu empresa por RUT</h3>
              <p class="ayuda">Ejemplo: 76.123.456-0</p>
              <div class="fila">
                <input [formControl]="rutBusqueda" placeholder="RUT de la empresa" (keyup.enter)="buscar()" />
                <button type="button" (click)="buscar()" [disabled]="buscando()">
                  {{ buscando() ? 'Buscando...' : 'Buscar' }}
                </button>
              </div>
              @if (noEncontrada()) {
                <p class="aviso">
                  No encontramos una empresa con ese RUT. Revisa el número o consulta a tu profesor tutor.
                </p>
              }
              @if (editando()) {
                <button type="button" class="secundario" (click)="cancelar()">Cancelar</button>
              }
            </section>
          } @else {

            @if (empresa(); as e) {
              <section class="bloque">
                <h3>Empresa encontrada</h3>
                <p class="ayuda">Estos datos no puedes modificarlos.</p>
                <dl>
                  <dt>Razón social</dt><dd>{{ e.razon_social }}</dd>
                  <dt>Nombre de fantasía</dt><dd>{{ e.nombre_fantasia ?? '—' }}</dd>
                  <dt>RUT</dt><dd>{{ e.rut_empresa }}</dd>
                  <dt>Rubro</dt><dd>{{ e.giro ?? '—' }}</dd>
                  <dt>Dirección</dt><dd>{{ e.direccion }} {{ e.numero_direccion }}, {{ e.comuna }}, {{ e.region }}</dd>
                </dl>
                <button type="button" class="secundario" (click)="cambiarEmpresa()">Buscar otra empresa</button>
              </section>
            }

            <form class="bloque" [formGroup]="form" (ngSubmit)="guardar()">
              <h3>2. Mi práctica en esta empresa</h3>

              <label>Sucursal (opcional)
                <input formControlName="sucursal" maxlength="150" />
              </label>

              <label>Departamento o sección donde harás la práctica
                <input formControlName="departamento" maxlength="100" />
              </label>
              @if (invalido('departamento')) { <small class="error">Obligatorio.</small> }

              <label>Jefe directo
                <input formControlName="jefe_directo" maxlength="100" />
              </label>
              @if (invalido('jefe_directo')) { <small class="error">Obligatorio.</small> }

              <label>Cargo del jefe directo
                <input formControlName="cargo_jefe_directo" maxlength="100" />
              </label>
              @if (invalido('cargo_jefe_directo')) { <small class="error">Obligatorio.</small> }

              <h3>3. Supervisor de la práctica</h3>
              <p class="ayuda">Es la persona de la empresa que supervisa tu práctica.</p>

              <label>RUT
                <input formControlName="sup_rut" placeholder="12.345.678-5" />
              </label>
              @if (invalido('sup_rut')) { <small class="error">Obligatorio.</small> }

              <label>Nombre completo
                <input formControlName="sup_nombre" maxlength="100" />
              </label>
              @if (invalido('sup_nombre')) { <small class="error">Obligatorio.</small> }

              <label>Cargo
                <input formControlName="sup_cargo" maxlength="100" />
              </label>
              @if (invalido('sup_cargo')) { <small class="error">Obligatorio.</small> }

              <label>Teléfono
                <input formControlName="sup_telefono" maxlength="15" />
              </label>
              @if (invalido('sup_telefono')) { <small class="error">Usa solo números (8 a 15 dígitos).</small> }

              <label>Correo
                <input formControlName="sup_correo" type="email" maxlength="100" />
              </label>
              @if (invalido('sup_correo')) { <small class="error">Ingresa un correo válido.</small> }

              <div class="fila">
                <button type="submit" [disabled]="guardando()">
                  {{ guardando() ? 'Guardando...' : 'Guardar' }}
                </button>
                @if (editando()) {
                  <button type="button" class="secundario" (click)="cancelar()">Cancelar</button>
                }
              </div>
            </form>
          }
        }
      }
    </div>
  `,
  styles: [`
    .contenedor { max-width: 720px; margin: 0 auto; padding: 24px; }
    .bloque { border: 1px solid #ccc; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .ayuda { font-size: 0.9em; opacity: 0.75; }
    dl { display: grid; grid-template-columns: 180px 1fr; gap: 6px 12px; margin: 0; }
    dt { font-weight: 600; }
    dd { margin: 0; }
    label { display: block; margin-top: 12px; }
    input { display: block; width: 100%; padding: 8px; margin-top: 4px; box-sizing: border-box; }
    .fila { display: flex; gap: 8px; align-items: center; }
    .fila input { margin-top: 0; }
    button { margin-top: 12px; padding: 8px 16px; }
    .fila button { margin-top: 0; }
    .secundario { background: transparent; border: 1px solid #888; }
    .error { color: #b00020; }
    .ok { color: #1b7a32; }
    .aviso { background: #fff8e1; border-left: 4px solid #f9a825; padding: 8px 12px; color: #5d4300; }
  `],
})
export class MiEmpresa implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(PracticaService);

  cargando = signal(true);
  practica = signal<PracticaVigente | null>(null);
  editable = signal(true);
  editando = signal(false);
  empresa = signal<Empresa | null>(null);
  buscando = signal(false);
  noEncontrada = signal(false);
  guardando = signal(false);
  mensaje = signal('');
  error = signal('');

  rutBusqueda = this.fb.nonNullable.control('', Validators.required);

  form = this.fb.nonNullable.group({
    sucursal: ['', Validators.maxLength(150)],
    departamento: ['', [Validators.required, Validators.maxLength(100)]],
    jefe_directo: ['', [Validators.required, Validators.maxLength(100)]],
    cargo_jefe_directo: ['', [Validators.required, Validators.maxLength(100)]],
    sup_rut: ['', Validators.required],
    sup_nombre: ['', [Validators.required, Validators.maxLength(100)]],
    sup_cargo: ['', [Validators.required, Validators.maxLength(100)]],
    sup_telefono: ['', [Validators.required, Validators.pattern(FONO)]],
    sup_correo: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
  });

  ngOnInit() {
    this.cargarPractica();
  }

  etapa(codigo: string) {
    return ETAPAS[codigo] ?? codigo;
  }

  invalido(campo: string) {
    const c = this.form.get(campo);
    return !!c && c.touched && c.invalid;
  }

  cargarPractica() {
    this.api.miPractica().subscribe({
      next: r => {
        this.practica.set(r.practica);
        this.editable.set(r.editable);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar tu información.');
        this.cargando.set(false);
      },
    });
  }

  buscar() {
    this.error.set('');
    this.noEncontrada.set(false);
    const rut = this.rutBusqueda.value.trim();
    if (!rut) {
      this.error.set('Ingresa el RUT de la empresa.');
      return;
    }
    this.buscando.set(true);
    this.api.buscarEmpresa(rut).subscribe({
      next: r => {
        this.buscando.set(false);
        if (r.existe && r.empresa) this.empresa.set(r.empresa);
        else this.noEncontrada.set(true);
      },
      error: e => {
        this.buscando.set(false);
        this.error.set(e.error?.error ?? 'No se pudo buscar la empresa.');
      },
    });
  }

  cambiarEmpresa() {
    this.empresa.set(null);
    this.rutBusqueda.reset('');
    this.noEncontrada.set(false);
  }

  editar() {
    const p = this.practica();
    if (!p) return;
    this.mensaje.set('');
    this.error.set('');
    this.empresa.set({
      id_centro_practica: p.id_centro_practica,
      rut_empresa: p.rut_empresa,
      razon_social: p.razon_social,
      nombre_fantasia: p.nombre_fantasia,
      giro: p.giro,
      direccion: p.direccion,
      numero_direccion: p.numero_direccion,
      comuna: p.comuna,
      region: p.region,
      telefono: p.telefono_empresa,
      correo: p.correo_empresa,
      sitio_web: p.sitio_web,
    });
    this.form.patchValue({
      sucursal: p.sucursal ?? '',
      departamento: p.departamento,
      jefe_directo: p.jefe_directo ?? '',
      cargo_jefe_directo: p.cargo_jefe_directo ?? '',
      sup_rut: p.rut_supervisor,
      sup_nombre: p.supervisor_nombre,
      sup_cargo: p.supervisor_cargo,
      sup_telefono: p.supervisor_telefono ?? '',
      sup_correo: p.supervisor_correo,
    });
    this.editando.set(true);
  }

  cancelar() {
    this.editando.set(false);
    this.empresa.set(null);
    this.error.set('');
    this.noEncontrada.set(false);
    this.form.reset();
    this.rutBusqueda.reset('');
  }

  guardar() {
    const e = this.empresa();
    if (!e) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const datos: DatosPractica = {
      rut_empresa: e.rut_empresa,
      sucursal: v.sucursal,
      departamento: v.departamento,
      jefe_directo: v.jefe_directo,
      cargo_jefe_directo: v.cargo_jefe_directo,
      supervisor: {
        rut: v.sup_rut,
        nombre_completo: v.sup_nombre,
        cargo: v.sup_cargo,
        telefono: v.sup_telefono,
        correo: v.sup_correo,
      },
    };

    this.guardando.set(true);
    this.mensaje.set('');
    this.error.set('');

    this.api.guardarPractica(datos).subscribe({
      next: () => {
        this.guardando.set(false);
        this.mensaje.set('Tu práctica se guardó correctamente.');
        this.cancelar();
        this.cargarPractica();
      },
      error: err => {
        this.guardando.set(false);
        this.error.set(err.error?.error ?? 'No se pudo guardar. Inténtalo de nuevo.');
      },
    });
  }
}