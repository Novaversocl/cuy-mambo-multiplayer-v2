/**
 * NetworkManager.js — capa de comunicación Socket.io del cliente.
 *
 * Recibe eventos del servidor y los traduce en acciones del motor de juego.
 * También expone métodos emit* para que el motor notifique al servidor.
 *
 * Eventos que ESCUCHA del servidor:
 *   hp-update               → actualiza HP local (servidor es autoritativo)
 *   opponent-hp-update      → actualiza HP visual del rival + efecto de golpe
 *   opponent-move           → mueve al RemotePlayer (interpolado con LERP)
 *   opponent-shoot/shotgun/flame → crea proyectiles remotos en el juego local
 *   opponent-capsule/door/mine  → sincroniza pickups con el estado del rival
 *   opponent-summon         → invoca personaje desde el lado del rival
 *   round-announce/fight/over   → ciclo de rondas
 *   game-over               → fin de la partida
 *   opponent-disconnected   → rival se desconectó
 *
 * Eventos que EMITE al servidor:
 *   player-move     → posición + sprite cada ~50ms (throttled)
 *   player-shoot/shotgun/flame → disparos propios
 *   player-hit      → golpe recibido (el servidor actualiza HP)
 *   capsule/door/mine-placed   → pickups recogidos o usados
 *   rematch / player-ready
 *
 * IMPORTANTE: el daño y el HP siempre los decide el servidor.
 * El cliente solo emite 'player-hit' con el daño y espera 'hp-update' de vuelta.
 */

import { Projectile } from '../entities/weapons/Projectile.js';

class NetworkManager {
  constructor(socket, game) {
    this.socket = socket;
    this.game   = game;

    this._lastMoveEmit  = 0;
    this._moveThrottle  = 50;
    this._onReturnToLobby = null;

    this._registerEvents();
  }

  _registerEvents() {

    this.socket.on('hp-update', ({ hp }) => {
      this.game.setLocalHp(hp);
    });

    this.socket.on('opponent-hp-update', ({ hp }) => {
      this.game.setRemoteHp(hp);
      if (this.game.remotePlayer) {
        this.game.remotePlayer.hit();
        const remoteEl = document.getElementById('remote-player');
        if (this.game._lastRemoteHitWeapon === 'flame') {
          this.game.uiManager.showFireHit(remoteEl);
        } else {
          this.game.uiManager.showHitSpark(remoteEl);
        }
        this.game._lastRemoteHitWeapon = null;
      }
    });

    this.socket.on('opponent-move', (data) => {
      if (this.game.remotePlayer && !this.game.isGameOver) {
        // Detectar salto del rival: estaba en suelo y ahora no
        if (this.game.remotePlayer._wasOnGround && !data.isOnGround) {
          this.game.audioManager.playSound('jump');
        }
        this.game.remotePlayer._wasOnGround = data.isOnGround;
        this.game.remotePlayer.applyState(data);
      }
    });

    // Disparo normal / ametralladora
    this.socket.on('opponent-shoot', ({ x, y, width, height, right, direction, chargeLevel, weaponType }) => {
      const fakeRect = {
        left:   x,
        top:    y,
        right:  right  ?? x + (width  ?? 75),
        bottom: y + (height ?? 75),
        width:  width  ?? 75,
        height: height ?? 75
      };
      const rp = new Projectile(
        this.game.gameContainer,
        fakeRect,
        direction,
        chargeLevel,
        false,
        0,
        weaponType || 'default'
      );
      this.game.remoteProjectiles.push(rp);
    });

    // Escopeta del rival → 5 perdigones
    this.socket.on('opponent-shotgun', ({ x, y, width, height, right, direction }) => {
      const fakeRect = {
        left:   x,
        top:    y,
        right:  right  ?? x + (width  ?? 75),
        bottom: y + (height ?? 75),
        width:  width  ?? 75,
        height: height ?? 75
      };
      const vyValues = [-3.5, -1.5, 0, 1.5, 3.5];
      for (const vy of vyValues) {
        this.game.remoteProjectiles.push(
          new Projectile(this.game.gameContainer, fakeRect, direction, 0, false, vy, 'pellet')
        );
      }
    });

    // Lanzallamas del rival → 3 llamas en abanico
    this.socket.on('opponent-flame', ({ x, y, width, height, right, direction }) => {
      const fakeRect = {
        left:   x,
        top:    y,
        right:  right  ?? x + (width  ?? 75),
        bottom: y + (height ?? 75),
        width:  width  ?? 75,
        height: height ?? 75
      };
      this.game.remoteProjectiles.push(
        new Projectile(this.game.gameContainer, fakeRect, direction, 0, false, 0, 'flame')
      );
    });

    // Rival recogió cápsula
    this.socket.on('opponent-capsule-collected', ({ index }) => {
      this.game.onOpponentCapsuleCollected(index);
    });

    // Rival abrió puerta
    this.socket.on('opponent-door-opened', ({ index }) => {
      this.game.onOpponentDoorOpened(index);
    });

    // Rival colocó mina
    this.socket.on('opponent-mine-placed', ({ x, y }) => {
      this.game.onOpponentMinePlaced(x, y);
    });

    // Rival invocó un personaje
    this.socket.on('opponent-summon', ({ rosterId, startX, direction }) => {
      this.game.pickupSystem.spawnSummon('remote', rosterId, startX, direction);
    });

    // Anuncio "ROUND X" — congelar disparo
    this.socket.on('round-announce', ({ round }) => {
      this.game.onRoundAnnounce(round);
    });

    // "FIGHT!" — habilitar disparo
    this.socket.on('round-fight', ({ round, rounds }) => {
      this.game.onRoundFight(round, rounds);
    });

    // Fin de ronda (no del match)
    this.socket.on('round-over', ({ winnerId, winnerName, rounds, nextRound }) => {
      const iWon = winnerId === this.socket.id;
      this.game.onRoundOver(iWon, winnerName, rounds, nextRound);
    });

    this.socket.on('game-over', ({ winnerId, winnerCharId }) => {
      const isWinner = winnerId === this.socket.id;
      this.game.showGameOver(isWinner, winnerCharId || '');
    });

    this.socket.on('opponent-disconnected', () => {
      this.game.showOpponentDisconnected();
    });

    this.socket.on('opponent-rematch', () => {
      this.game.uiManager._showMessage('¡RIVAL QUIERE REVANCHA!', '#00ff88', 2000);
    });

    // Escudo del rival — mostrar orbe visual
    this.socket.on('opponent-shield', ({ active }) => {
      const remoteEl = document.getElementById('remote-player');
      if (!remoteEl) return;
      if (active) {
        if (!remoteEl.querySelector('.shield-orb')) {
          const orb = document.createElement('div');
          orb.className = 'shield-orb';
          remoteEl.appendChild(orb);
          // Parpadeo en los últimos 2s
          setTimeout(() => orb.classList.add('expiring'), 8000);
          setTimeout(() => orb.remove(), 10000);
        }
      } else {
        remoteEl.querySelector('.shield-orb')?.remove();
      }
    });

    // Repulsor del rival — beam visual + daño al jugador local si está en el camino
    this.socket.on('opponent-repulsor', ({ direction }) => {
      const remoteEl = document.getElementById('remote-player');
      if (!remoteEl) return;
      const container  = this.game.gameContainer;
      const containerW = container.offsetWidth;

      const beam = document.createElement('div');
      beam.className = 'repulsor-beam';
      container.appendChild(beam);

      let active = true;
      const rafLoop = () => {
        if (!active) return;
        const rect    = remoteEl.getBoundingClientRect();
        const cRect   = container.getBoundingClientRect();
        const rX      = rect.left - cRect.left;
        const rY      = rect.top  - cRect.top;
        const rW      = rect.width;
        const rH      = rect.height;
        const beamTop = rY + rH * 0.58;
        const dir = this.game.remotePlayer?.direction || direction;
        beam.style.top = beamTop + 'px';
        if (dir === 'right') {
          beam.style.left  = (rX + rW) + 'px';
          beam.style.width = (containerW - rX - rW) + 'px';
          beam.style.background = `linear-gradient(to right, #ffee00 0%, #ffee00 85%, transparent 100%)`;
        } else {
          beam.style.left  = '0px';
          beam.style.width = rX + 'px';
          beam.style.background = `linear-gradient(to left, #ffee00 0%, #ffee00 85%, transparent 100%)`;
        }
        beam.style.boxShadow = `0 0 4px #ffffff, 0 0 12px #ffdd00, 0 0 28px #ffaa00aa, 0 0 55px #ff880044`;
        requestAnimationFrame(rafLoop);
      };
      requestAnimationFrame(rafLoop);

      // Detectar si el jugador LOCAL está en el camino del rayo — cada 500ms
      let ticks = 0;
      const dmgInterval = setInterval(() => {
        if (!active || this.game.isGameOver) return;
        ticks++;

        const localEl = this.game.cubeElement;
        if (localEl && !this.game.player.isShielded) {
          const cRect   = container.getBoundingClientRect();
          const lRect   = localEl.getBoundingClientRect();
          const remRect = remoteEl.getBoundingClientRect();

          const localX  = lRect.left  - cRect.left;
          const localY  = lRect.top   - cRect.top;
          const remoteX = remRect.left - cRect.left;
          const remoteY = remRect.top  - cRect.top;
          const beamY   = remoteY + remRect.height * 0.58;

          const inY = localY < beamY + 50 && localY + lRect.height > beamY - 50;
          const inX = direction === 'right'
            ? localX > remoteX + remRect.width - 10
            : localX + lRect.width < remoteX + 10;

          if (inY && inX) {
            this.game.audioManager.playHit();
            this.socket.emit('player-hit', { damage: 5 });
          }
        }

        if (ticks >= 6) clearInterval(dmgInterval);
      }, 500);

      setTimeout(() => { active = false; beam.remove(); clearInterval(dmgInterval); }, 3000);
    });
  }

  // ── Emisiones ───────────────────────────────────────────────────────────────

  emitMove(player) {
    const now = Date.now();
    if (now - this._lastMoveEmit < this._moveThrottle) return;
    this._lastMoveEmit = now;

    const el = player.element;
    this.socket.emit('player-move', {
      x:               player.position.x,
      y:               player.position.y,
      vx:              player.velocity.x,
      vy:              player.velocity.y,
      direction:       player.currentDirection,
      isOnGround:      player.isOnGround,
      sprite:          el.style.backgroundImage,
      spriteSize:      el.style.backgroundSize,
      spriteTransform: el.style.transform
    });
  }

  emitReady() {
    this.socket.emit('player-ready');
  }

  emitShoot(data) {
    this.socket.emit('player-shoot', data);
  }

  emitShotgun(data) {
    this.socket.emit('player-shotgun', data);
  }

  emitFlame(data) {
    this.socket.emit('player-flame', data);
  }

  emitHit(damage = 1, sourceX = null) {
    this.socket.emit('player-hit', { damage, sourceX });
  }

  emitHeal() {
    this.socket.emit('player-heal');
  }

  emitCapsuleCollected(index) {
    this.socket.emit('capsule-collected', { index });
  }

  emitDoorOpened(index) {
    this.socket.emit('door-opened', { index });
  }

  emitMinePlaced(data) {
    this.socket.emit('mine-placed', data);
  }

  emitSummon(data) {
    this.socket.emit('summon', data);
  }

  emitMineHitOpponent() {
    this.socket.emit('player-hit', { damage: 20 });
  }

  emitShield(active) {
    this.socket.emit('player-shield', { active });
  }

  emitRepulsor(data) {
    this.socket.emit('player-repulsor', data);
  }

  emitRepulsorEnd() {
    // no-op: el beam remoto se borra por timeout
  }

  emitRematch() {
    this.socket.emit('rematch');
    if (this._onReturnToLobby) this._onReturnToLobby();
  }

  returnToLobby() {
    if (this._onReturnToLobby) this._onReturnToLobby();
  }

  setReturnToLobbyCallback(fn) {
    this._onReturnToLobby = fn;
  }

  destroy() {
    this.socket.off('hp-update');
    this.socket.off('opponent-hp-update');
    this.socket.off('opponent-move');
    this.socket.off('opponent-shoot');
    this.socket.off('opponent-shotgun');
    this.socket.off('opponent-flame');
    this.socket.off('opponent-capsule-collected');
    this.socket.off('opponent-door-opened');
    this.socket.off('opponent-mine-placed');
    this.socket.off('round-announce');
    this.socket.off('round-fight');
    this.socket.off('round-over');
    this.socket.off('game-over');
    this.socket.off('opponent-disconnected');
    this.socket.off('opponent-rematch');
    this.socket.off('opponent-shield');
    this.socket.off('opponent-repulsor');
  }
}

export { NetworkManager };
