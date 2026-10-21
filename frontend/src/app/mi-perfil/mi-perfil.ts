import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EstudianteService, PerfilEstudiante } from '../estudiante/estudiante.service';

const FONO = /^[0-9+\s-]{8,15}$/;

@Component({
  selector: 'app-mi-perfil',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './mi-perfil.html',
  styleUrl: './mi-perfil.css',
})
export class MiPerfil implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(EstudianteService);

  perfil = signal<PerfilEstudiante | null>(null);
  mensaje = signal('');
  error = signal('');
  guardando = signal(false);

  form = this.fb.nonNullable.group({
    direccion: ['', [Validators.required, Validators.maxLength(100)]],
    comuna: ['', [Validators.required, Validators.maxLength(100)]],
    correo: ['', [Validators.email, Validators.maxLength(100)]],
    telefono_estudiante: ['', [Validators.pattern(FONO)]],
    celular_estudiante: ['', [Validators.pattern(FONO)]],
  });

  ngOnInit() {
    this.api.obtenerPerfil().subscribe({
      next: p => {
        this.perfil.set(p);
        this.form.patchValue({
          direccion: p.direccion,
          comuna: p.comuna,
          correo: p.correo ?? '',
          telefono_estudiante: p.telefono_estudiante ?? '',
          celular_estudiante: p.celular_estudiante ?? '',
        });
      },
      error: () => this.error.set('No se pudo cargar tu perfil.'),
    });
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.mensaje.set('');
    this.error.set('');

    this.api.guardarPerfil(this.form.getRawValue()).subscribe({
      next: () => {
        this.mensaje.set('Tus datos se guardaron correctamente.');
        this.guardando.set(false);
      },
      error: () => {
        this.error.set('No se pudo guardar. Revisa los datos e inténtalo de nuevo.');
        this.guardando.set(false);
      },
    });
  }
}