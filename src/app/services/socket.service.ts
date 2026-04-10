import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

// ── Interfaces que definen la estructura de los datos compartidos ─────────────

/** Rutas a los sprites de animación de un personaje */
export interface CharacterSprites {
  walkRight: string[];
  walkLeft: string[];
  jump: string;
}

/** Datos completos de un personaje seleccionable */
export interface Character {
  id: string;
  name: string;
  preview: string;  // imagen estática para previsualizar
  sprites: CharacterSprites;
}

/** Payload que envía el servidor al iniciar una partida */
export interface GameStartPayload {
  side: 'left' | 'right';   // lado del mapa asignado al jugador
  opponentName: string;
  hp: number;
  character: Character;
  opponentCharacter: Character;
}

/**
 * SocketService — singleton que mantiene la conexión Socket.io activa
 * durante toda la sesión (lobby + partida).
 *
 * LobbyComponent llama a connect() al montarse.
 * GameComponent lee gameStart y getSocket() para inicializar el motor.
 * Al destruir GameComponent, llama a disconnect() para limpiar todo.
 */
@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;

  // Datos de la partida en curso, seteados por LobbyComponent al recibir 'game-start'
  gameStart: GameStartPayload | null = null;
  playerName = '';
  selectedCharacter: Character | null = null;

  // Prod → URL fija de Render (environment.prod.ts)
  // Dev  → misma IP/hostname que el frontend en puerto 3000
  //        permite probar desde móvil en la misma red WiFi
  readonly SERVER_URL = environment.production
    ? environment.socketUrl
    : `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3000`;

  /** Abre la conexión WebSocket. Reutiliza la existente si ya está activa. */
  connect(): Socket {
    if (!this.socket || this.socket.disconnected) {
      this.socket = io(this.SERVER_URL, {
        // En producción fuerza WebSocket puro (Render free no soporta long-polling bien)
        transports: environment.production ? ['websocket'] : ['websocket', 'polling']
      });
    }
    return this.socket;
  }

  /** Devuelve el socket actual (puede ser null si no se ha conectado aún) */
  getSocket(): Socket | null {
    return this.socket;
  }

  /** Cierra la conexión y limpia el estado de la partida anterior */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.gameStart = null;
    this.playerName = '';
  }
}
