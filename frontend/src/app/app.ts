import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CargaOverlay } from './shared/carga-overlay';

@Component({
  imports: [RouterOutlet, CargaOverlay],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('frontend');
}