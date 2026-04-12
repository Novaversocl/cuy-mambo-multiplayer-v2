import { AfterViewInit, Component, ElementRef, OnDestroy, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { SocketService } from '../../shared/services/socket.service';

/**
 * GameComponent — pantalla principal del juego.
 *
 * Este componente actúa como puente entre Angular y el motor de juego vanilla JS.
 * No contiene lógica de juego propia; su trabajo es:
 *   1. Verificar que haya una partida activa (gameStart); si no, redirige al lobby.
 *   2. Precargar imágenes críticas para evitar flashes al iniciar.
 *   3. Inyectar dinámicamente los scripts del motor (game-init.js, game-mp-init.js)
 *      y el CSS del juego, que NO forman parte del bundle de Angular.
 *   4. Exponer en window.__ los datos necesarios para que el motor JS los lea.
 *   5. En ngOnDestroy, limpiar todos los scripts, estilos y globales inyectados.
 *
 * Flujo de carga:
 *   _preloadImages → _injectStyles → _injectGameScript → _injectMpScript
 */

// Tipos para los globales de window que usa el motor del juego
declare global {
  interface Window {
    __cuyMamboInstance?:          { destroy(): void; networkManager?: { destroy(): void } };
    __cuyMamboNetworkManager?:    { destroy(): void };
    __cuyMamboSocket?:            unknown;
    __cuyMamboSide?:              'left' | 'right';
    __cuyMamboOpponentName?:      string;
    __cuyMamboPlayerName?:        string;
    __cuyMamboReturnToLobby?:     () => void;
    __scaleMobileMonitor?:        () => void;
    __cuyMamboCharacter?:         unknown;
    __cuyMamboOpponentCharacter?: unknown;
  }
}

@Component({
  selector: 'app-game',
  imports: [],
  host: { class: 'loading' },
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss'
})
export class GameComponent implements AfterViewInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private el         = inject(ElementRef);
  private router     = inject(Router);
  private socketSvc  = inject(SocketService);

  isReady = signal(false);

  private gameScriptEl: HTMLScriptElement | null = null;
  private mpScriptEl:   HTMLScriptElement | null = null;
  private linkEl:       HTMLLinkElement   | null = null;
  private preloadLinks: HTMLLinkElement[]        = [];

  private readonly GAME_IMAGES = [
    // cuy-mambo
    '/assets/img/personajes/cuy-mambo/quieto.png',
    '/assets/img/personajes/cuy-mambo/camina-derecha-1.png',
    '/assets/img/personajes/cuy-mambo/camina-derecha-2.png',
    '/assets/img/personajes/cuy-mambo/camina-izquierda-1.png',
    '/assets/img/personajes/cuy-mambo/camina-izquierda-2.png',
    '/assets/img/personajes/cuy-mambo/salto.png',
    // mago
    '/assets/img/personajes/mago/camina-derecha-1.png',
    '/assets/img/personajes/mago/camina-derecha-2.png',
    '/assets/img/personajes/mago/camina-izquierda-1.png',
    '/assets/img/personajes/mago/camina-izquierda-2.png',
    '/assets/img/personajes/mago/salto.png',
    // ui
    '/assets/img/ui/Fondo.gif',
  ];

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    // Sin datos de partida → redirigir al lobby
    if (!this.socketSvc.gameStart) {
      this.router.navigate(['/lobby']);
      return;
    }

    this._preloadImages();
    this._injectStyles();
  }

  private _preloadImages() {
    for (const src of this.GAME_IMAGES) {
      const link = document.createElement('link');
      link.rel   = 'preload';
      link.as    = 'image';
      link.href  = src;
      document.head.appendChild(link);
      this.preloadLinks.push(link);
    }
  }

  private _injectStyles() {
    this.linkEl      = document.createElement('link');
    this.linkEl.rel  = 'stylesheet';
    this.linkEl.href = '/assets/css/style.css';
    this.linkEl.onload = () => {
      window.dispatchEvent(new Event('resize'));
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        this.el.nativeElement.classList.remove('loading');
        this.isReady.set(true);
        this._injectGameScript();
      }, 100);
    };
    document.head.appendChild(this.linkEl);
  }

  private _injectGameScript() {
    // 1) Exponer los datos de partida en window para que game-mp-init.js los lea
    const payload = this.socketSvc.gameStart!;
    window.__cuyMamboSocket           = this.socketSvc.getSocket();
    window.__cuyMamboSide             = payload.side;
    window.__cuyMamboOpponentName     = payload.opponentName;
    window.__cuyMamboPlayerName       = this.socketSvc.playerName;
    window.__cuyMamboReturnToLobby    = () => this.router.navigate(['/lobby']);
    window.__cuyMamboCharacter        = payload.character;
    window.__cuyMamboOpponentCharacter = payload.opponentCharacter;

    // 2) Cargar el motor del juego (crea window.__cuyMamboInstance)
    this.gameScriptEl      = document.createElement('script');
    this.gameScriptEl.type = 'module';
    this.gameScriptEl.src  = `/assets/js/core/game-init.js?t=${Date.now()}`;

    // 3) Cuando el motor esté listo, cargar la capa multijugador
    this.gameScriptEl.onload = () => {
      // Pequeña espera para que el constructor de Game() termine
      setTimeout(() => this._injectMpScript(), 100);
    };

    document.body.appendChild(this.gameScriptEl);
  }

  private _injectMpScript() {
    this.mpScriptEl      = document.createElement('script');
    this.mpScriptEl.type = 'module';
    this.mpScriptEl.src  = `/assets/js/core/game-mp-init.js?t=${Date.now()}`;
    document.body.appendChild(this.mpScriptEl);
  }

  ngOnDestroy() {
    if (!isPlatformBrowser(this.platformId)) return;

    // Limpiar scripts
    for (const el of [this.gameScriptEl, this.mpScriptEl]) {
      if (el && document.body.contains(el)) document.body.removeChild(el);
    }
    if (this.linkEl && document.head.contains(this.linkEl)) {
      document.head.removeChild(this.linkEl);
    }
    for (const link of this.preloadLinks) {
      if (document.head.contains(link)) document.head.removeChild(link);
    }
    this.preloadLinks = [];

    // Destruir NetworkManager y motor del juego
    window.__cuyMamboNetworkManager?.destroy();
    window.__cuyMamboInstance?.destroy();

    // Limpiar globales
    delete window.__cuyMamboInstance;
    delete window.__cuyMamboNetworkManager;
    delete window.__cuyMamboSocket;
    delete window.__cuyMamboSide;
    delete window.__cuyMamboOpponentName;
    delete window.__cuyMamboReturnToLobby;
    delete window.__cuyMamboCharacter;
    delete window.__cuyMamboOpponentCharacter;
  }
}
