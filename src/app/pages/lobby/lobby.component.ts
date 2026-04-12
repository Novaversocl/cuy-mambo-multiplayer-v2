import { Component, NgZone, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../shared/services/socket.service';
import { ICharacter } from '../../shared/interfaces/character/ICharacter';
import { ArcadeButtonComponent } from '../../shared/components/arcade-button/arcade-button.component';
import { Spinner } from '../../shared/components/spinner/spinner';
import type { Socket } from 'socket.io-client';

/**
 * LobbyComponent — pantalla de selección de personaje y emparejamiento.
 *
 * Estados posibles (LobbyState):
 *   'form'    → el jugador ingresa su nombre y elige personaje
 *   'waiting' → se envió 'join-lobby', esperando a un rival
 *   'found'   → el servidor emitió 'game-start', redirige al juego en 1.2s
 *
 * Flujo principal:
 *   ngOnInit → conecta socket → escucha eventos del servidor
 *   joinLobby() → emite 'join-lobby' con nombre + personaje elegido
 *   'game-start' → guarda payload en SocketService → navega a /game
 *
 * Sonidos: generados con Web Audio API (sin archivos externos).
 *   playHover  → hover sobre personaje
 *   playSelect → seleccionar personaje
 *   playSearch → al buscar partida
 *   playFound  → fanfare al encontrar rival
 */

/** Posibles pantallas dentro del lobby */
type LobbyState = 'connecting' | 'form' | 'waiting' | 'found' | 'server-error';

// Función auxiliar para crear un AudioContext (con fallback webkit para Safari)
const ctx = () => new (window.AudioContext || (window as any).webkitAudioContext)();

function playHover() {
  const ac = ctx();
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.connect(g); g.connect(ac.destination);
  o.frequency.setValueAtTime(600, ac.currentTime);
  o.frequency.linearRampToValueAtTime(700, ac.currentTime + 0.05);
  g.gain.setValueAtTime(0.08, ac.currentTime);
  g.gain.linearRampToValueAtTime(0, ac.currentTime + 0.06);
  o.start(); o.stop(ac.currentTime + 0.06);
}

function playSelect() {
  const ac = ctx();
  [0, 0.07, 0.14].forEach((t, i) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.type = 'square';
    o.frequency.setValueAtTime([440, 550, 880][i], ac.currentTime + t);
    g.gain.setValueAtTime(0.12, ac.currentTime + t);
    g.gain.linearRampToValueAtTime(0, ac.currentTime + t + 0.1);
    o.start(ac.currentTime + t);
    o.stop(ac.currentTime + t + 0.1);
  });
}

function playSearch() {
  const ac = ctx();
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.connect(g); g.connect(ac.destination);
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(200, ac.currentTime);
  o.frequency.exponentialRampToValueAtTime(600, ac.currentTime + 0.25);
  g.gain.setValueAtTime(0.15, ac.currentTime);
  g.gain.linearRampToValueAtTime(0, ac.currentTime + 0.3);
  o.start(); o.stop(ac.currentTime + 0.3);
}

function playFound() {
  const ac = ctx();
  [[523, 0], [659, 0.15], [784, 0.3], [1047, 0.45]].forEach(([freq, t]) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.type = 'square';
    o.frequency.setValueAtTime(freq, ac.currentTime + t);
    g.gain.setValueAtTime(0.15, ac.currentTime + t);
    g.gain.linearRampToValueAtTime(0, ac.currentTime + t + 0.18);
    o.start(ac.currentTime + t);
    o.stop(ac.currentTime + t + 0.18);
  });
}

const CHARACTER_GIFS: Record<string, string> = {
  'cuy-mambo':    'assets/img/bailes/cuy-mambo/baile_cuy-mambo_1.gif',
  'mago':         'assets/img/bailes/mago/baile_mago_1.gif',
  'cuy-mambolina':'assets/img/bailes/cuy-mambolina/baile_cuy-mambolina_01.gif',
};

const CHARACTER_MUSIC: Record<string, string> = {
  'cuy-mambo':    'assets/Musica/win-cuy-mambo.mp3',
  'mago':         'assets/Musica/win-mago.mp3',
  'cuy-mambolina':'assets/Musica/mambo_mambo.mp3',
};

const CHARACTERS: ICharacter[] = [
  {
    id: 'cuy-mambo',
    name: 'Cuy Mambo',
    preview: 'assets/img/personajes/cuy-mambo/quieto.png',
    sprites: {
      walkRight: ['assets/img/personajes/cuy-mambo/camina-derecha-1.png', 'assets/img/personajes/cuy-mambo/camina-derecha-2.png'],
      walkLeft:  ['assets/img/personajes/cuy-mambo/camina-izquierda-1.png', 'assets/img/personajes/cuy-mambo/camina-izquierda-2.png'],
      jump:      'assets/img/personajes/cuy-mambo/salto.png'
    }
  },
  {
    id: 'mago',
    name: 'Cuy Mago',
    preview: 'assets/img/personajes/mago/camina-derecha-1.png',
    sprites: {
      walkRight: ['assets/img/personajes/mago/camina-derecha-1.png', 'assets/img/personajes/mago/camina-derecha-2.png'],
      walkLeft:  ['assets/img/personajes/mago/camina-izquierda-1.png', 'assets/img/personajes/mago/camina-izquierda-2.png'],
      jump:      'assets/img/personajes/mago/salto.png'
    }
  },
  {
    id: 'cuy-mambolina',
    name: 'Cuy Mambolina',
    preview: 'assets/img/personajes/cuy-mambolina/camina-derecha-1.png',
    sprites: {
      walkRight: ['assets/img/personajes/cuy-mambolina/camina-derecha-1.png', 'assets/img/personajes/cuy-mambolina/camina-derecha-2.png'],
      walkLeft:  ['assets/img/personajes/cuy-mambolina/camina-izquierda-1.png', 'assets/img/personajes/cuy-mambolina/camina-izquierda-2.png'],
      jump:      'assets/img/personajes/cuy-mambolina/salto.png'
    },
    locked: false
  }
];

@Component({
  selector: 'app-lobby',
  imports: [FormsModule, ArcadeButtonComponent, Spinner],
  templateUrl: './lobby.component.html',
  styleUrl: './lobby.component.scss'
})
export class LobbyComponent implements OnInit, OnDestroy {
  private router    = inject(Router);
  private socketSvc = inject(SocketService);
  private ngZone    = inject(NgZone);

  state             = signal<LobbyState>('connecting');
  playerName        = signal('');
  errorMsg          = signal('');
  waitingPlayers    = signal<string[]>([]);
  selectedCharacter = signal<ICharacter>(CHARACTERS[0]);

  readonly characters    = CHARACTERS;
  readonly characterGifs = CHARACTER_GIFS;

  private socket: Socket | null = null;
  private joining = false;
  private bgMusic: HTMLAudioElement | null = null;
  private connectTimeout: ReturnType<typeof setTimeout> | null = null;
  musicMuted = signal(false);

  ngOnInit() {
    this._playICharacterMusic(this.selectedCharacter().id);
    this.socketSvc.disconnect();
    this.socket = this.socketSvc.connect();

    this.connectTimeout = setTimeout(() => {
      if (this.state() === 'connecting') {
        this.ngZone.run(() => this.state.set('server-error'));
      }
    }, 60000);

    this.socket.on('connect', () => {
      this.ngZone.run(() => {
        if (this.state() === 'connecting') {
          if (this.connectTimeout) clearTimeout(this.connectTimeout);
          this.state.set('form');
        }
      });
    });

    this.socket.on('update-lobby', ({ waiting }: { waiting: string[] }) => {
      this.ngZone.run(() => this.waitingPlayers.set(waiting));
    });

    this.socket.on('lobby-waiting', () => {
      this.ngZone.run(() => this.state.set('waiting'));
    });

    this.socket.on('game-start', (payload) => {
      this.ngZone.run(() => {
        this._stopMusic();
        playFound();
        this.state.set('found');
        this.socketSvc.gameStart = payload;
        setTimeout(() => this.router.navigate(['/game']), 1200);
      });
    });

this.socket.on('lobby-error', ({ message }: { message: string }) => {
      this.ngZone.run(() => {
        this.joining = false;
        this.errorMsg.set(message);
      });
    });

    this.socket.on('disconnect', () => {
      this.ngZone.run(() => {
        this.joining = false;
        this.state.set('form');
        this.errorMsg.set('Desconectado del servidor. Reintenta.');
      });
    });
  }

hoverCharacter() {
    playHover();
  }

  selectCharacter(character: ICharacter) {
    if (this.selectedCharacter().id === character.id) return;
    playSelect();
    this.selectedCharacter.set(character);
    this._playICharacterMusic(character.id);
  }

  toggleMusic() {
    const muted = !this.musicMuted();
    this.musicMuted.set(muted);
    if (this.bgMusic) this.bgMusic.muted = muted;
  }

  private _playICharacterMusic(charId: string) {
    if (this.bgMusic) {
      this.bgMusic.pause();
      this.bgMusic.currentTime = 0;
    }
    const src = CHARACTER_MUSIC[charId];
    if (!src) return;
    this.bgMusic        = new Audio(src);
    this.bgMusic.volume = 0.4;
    this.bgMusic.loop   = true;
    this.bgMusic.muted  = this.musicMuted();
    this.bgMusic.play().catch(() => {});
  }

  private _stopMusic() {
    if (this.bgMusic) {
      this.bgMusic.pause();
      this.bgMusic = null;
    }
  }

  joinLobby() {
    if (this.joining) return;

    const name = this.playerName().trim();
    if (!name) {
      this.errorMsg.set('Ingresa tu nombre para jugar');
      return;
    }

    this.joining = true;
    this.errorMsg.set('');
    playSearch();
    this.socketSvc.playerName = name;
    this.socketSvc.selectedCharacter = this.selectedCharacter();

    if (this.socket!.connected) {
      this.socket!.emit('join-lobby', { name, character: this.selectedCharacter() });
    } else {
      this.socket!.once('connect', () => {
        this.socket!.emit('join-lobby', { name, character: this.selectedCharacter() });
      });
    }
  }

  ngOnDestroy() {
    this._stopMusic();
    if (this.connectTimeout) clearTimeout(this.connectTimeout);
    if (this.socket) {
      this.socket.off('connect');
      this.socket.off('lobby-waiting');
      this.socket.off('update-lobby');
      this.socket.off('game-start');
this.socket.off('lobby-error');
      this.socket.off('disconnect');
    }
  }
}
