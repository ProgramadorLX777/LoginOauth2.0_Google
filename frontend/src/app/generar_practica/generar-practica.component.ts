import { Component } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-generar-practica",
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="contenedor">
      <h2>Generar documento de práctica</h2>

      <form (ngSubmit)="generarPdf()">
        <label>Nombre completo</label>
        <input [(ngModel)]="datos.nombre_completo" name="nombre_completo" required />

        <label>Apellido completo</label>
        <input [(ngModel)]="datos.apellido_completo" name="apellido_completo" required />

        <label>Especialidad</label>
        <input [(ngModel)]="datos.especialidad" name="especialidad" required />

        <label>Curso</label>
        <input [(ngModel)]="datos.curso" name="curso" required />

        <label>Observaciones (una por línea)</label>
        <textarea [(ngModel)]="observacionesTexto" name="observaciones" rows="4"></textarea>

        <button type="submit" [disabled]="cargando">
          {{ cargando ? "Generando..." : "Generar PDF" }}
        </button>
      </form>

      <p *ngIf="error" class="error">{{ error }}</p>
    </div>
  `,
  styles: [`
    .contenedor { max-width: 420px; margin: 2rem auto; font-family: sans-serif; }
    label { display: block; margin-top: 0.75rem; font-weight: 600; }
    input, textarea { width: 100%; padding: 0.4rem; margin-top: 0.25rem; box-sizing: border-box; }
    button { margin-top: 1rem; padding: 0.5rem 1rem; }
    .error { color: red; margin-top: 1rem; }
  `],
})
export class GenerarPracticaComponent {
  datos = {
    nombre_completo: "",
    apellido_completo: "",
    especialidad: "",
    curso: "",
  };
  observacionesTexto = "";
  cargando = false;
  error = "";

  constructor(private http: HttpClient) {}

  generarPdf() {
    this.error = "";
    this.cargando = true;

    const observaciones = this.observacionesTexto
      .split("\n")
      .map((linea) => linea.trim())
      .filter((linea) => linea.length > 0);

    const payload = { ...this.datos, observaciones };

    this.http
      .post("http://localhost:3000/api/generar-documento", payload, { responseType: "blob" })
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `practica_${this.datos.apellido_completo}_${this.datos.nombre_completo}.pdf`;
          a.click();
          window.URL.revokeObjectURL(url);
          this.cargando = false;
        },
        error: (err) => {
          console.error(err);
          this.error = "No se pudo generar el PDF. Revisa los datos e intenta de nuevo.";
          this.cargando = false;
        },
      });
  }
}