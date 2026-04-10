import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * App — componente raíz de la aplicación.
 *
 * Es el punto de entrada que Angular monta en el <app-root> del index.html.
 * Solo contiene un <router-outlet>, que es donde Angular renderiza
 * la página correspondiente a la ruta activa (home, lobby, game, etc.).
 * No tiene lógica propia — toda está en los componentes de cada página.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('cuy-mambo-angular');
}
