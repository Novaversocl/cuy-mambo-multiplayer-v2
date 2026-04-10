// game-mp-init.js — inicializa la capa multijugador.
// Se carga como módulo script después de game-init.js.
// Lee el socket y los parámetros de partida desde window (inyectados por Angular).

import { NetworkManager } from '../managers/NetworkManager.js';
import { RemotePlayer }   from '../entities/characters/RemotePlayer.js';

const game             = window.__cuyMamboInstance;
const socket           = window.__cuyMamboSocket;
const side             = window.__cuyMamboSide             || 'left';
const opponentName     = window.__cuyMamboOpponentName     || 'P2';
const playerName       = window.__cuyMamboPlayerName       || 'P1';
const opponentCharacter = window.__cuyMamboOpponentCharacter || null;

if (!game || !socket) {
  console.error('[game-mp-init] Faltan game o socket en window.');
} else {
  // Crear RemotePlayer sobre el div #remote-player del HTML
  const remoteEl = document.getElementById('remote-player');
  if (remoteEl) {
    game.remotePlayer = new RemotePlayer(remoteEl, opponentCharacter?.sprites || null);
  }

  // Crear NetworkManager y vincularlo al motor del juego
  const nm = new NetworkManager(socket, game);

  // El callback de "volver al lobby" lo registra Angular en window
  nm.setReturnToLobbyCallback(() => {
    if (typeof window.__cuyMamboReturnToLobby === 'function') {
      window.__cuyMamboReturnToLobby();
    }
  });

  game.setNetworkManager(nm);
  game.uiManager.setOpponentName(opponentName);
  game.start(side);

  // Avisar al servidor que este cliente está listo
  socket.emit('player-ready');

  // Asignar nombres sobre los personajes
  const localLabel  = document.getElementById('local-player-name');
  const remoteLabel = document.getElementById('remote-player-name');
  if (localLabel)  localLabel.textContent  = playerName.toUpperCase().slice(0, 8);
  if (remoteLabel) remoteLabel.textContent = opponentName.toUpperCase().slice(0, 8);

  // Nombres en el marcador central
  const matchP1 = document.getElementById('match-p1');
  const matchP2 = document.getElementById('match-p2');
  if (matchP1) matchP1.textContent = playerName.toUpperCase().slice(0, 8);
  if (matchP2) matchP2.textContent = opponentName.toUpperCase().slice(0, 8);

  // Exponer para que Angular pueda destruirlo en ngOnDestroy
  window.__cuyMamboNetworkManager = nm;
}
