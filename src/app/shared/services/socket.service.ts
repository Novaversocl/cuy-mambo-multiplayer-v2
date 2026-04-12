import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { ICharacter } from '../interfaces/character/ICharacter';
import { IGameStartPayload } from '../interfaces/game/IGameStartPayload';

/**
 * SocketService — singleton que mantiene la conexión Socket.io activa
 * durante toda la sesión (lobby + partida).
 *
 * Flujo:
 *   LobbyComponent  → connect() al montarse
 *   GameComponent   → getSocket() para inicializar el motor JS
 *   GameComponent   → disconnect() al destruirse para limpiar el estado
 */
@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;

  /** Payload recibido al iniciar la partida, leído por GameComponent */
  gameStart:         IGameStartPayload | null = null;
  /** Nombre del jugador local, seteado en el lobby */
  playerName         = '';
  /** Personaje seleccionado, seteado en el lobby */
  selectedCharacter: ICharacter | null = null;

  /** URL del servidor según entorno (producción → Render, desarrollo → red local) */
  readonly SERVER_URL = environment.production
    ? environment.socketUrl
    : `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3000`;

  connect(): Socket {
    if (!this.socket || this.socket.disconnected) {
      this.socket = io(this.SERVER_URL, {
        transports: environment.production ? ['websocket'] : ['websocket', 'polling']
      });
    }
    return this.socket;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.gameStart    = null;
    this.playerName   = '';
  }
}
