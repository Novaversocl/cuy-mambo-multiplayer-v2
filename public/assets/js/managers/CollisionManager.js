/**
 * CollisionManager.js — detección de colisiones entre proyectiles y jugadores.
 *
 * Maneja dos flujos de colisión separados:
 *
 *   checkRemoteProjectileCollisions():
 *     Proyectiles del RIVAL impactando al jugador LOCAL.
 *     Si hay colisión → emite 'player-hit' al servidor (el server decide el daño).
 *     Solo detecta un impacto por frame para evitar doble daño.
 *
 *   checkLocalProjectileVsRemotePlayer():
 *     Proyectiles PROPIOS impactando al rival.
 *     NO envía nada al servidor — el rival detecta sus propios impactos por su lado.
 *     Solo genera feedback visual (explosión de partículas) y sonido.
 *     Esto evita sincronización doble y posibles cheats de daño.
 *
 *   tickProjectiles():
 *     Avanza la posición de todos los proyectiles (locales y remotos) cada frame
 *     y elimina los que ya no están activos (isActive = false).
 *
 * Sobre la arquitectura de colisiones:
 *   Cada cliente solo reporta los golpes que RECIBE, nunca los que inflige.
 *   El servidor valida y aplica el daño, luego notifica a ambos clientes.
 */

import { CollisionDetector } from '../utils/CollisionDetector.js';
import { ParticleExplosion } from '../utils/ParticleExplosion.js';

class CollisionManager {
  constructor(game) {
    this.game = game;
    this._lastHitSound = 0; // cooldown para el sonido de impacto al rival
  }

  // Avanza todos los proyectiles y elimina los inactivos.
  tickProjectiles() {
    this.game.projectiles       = this.game.projectiles.filter(p => { p.update(); return p.isActive; });
    this.game.remoteProjectiles = this.game.remoteProjectiles.filter(p => { p.update(); return p.isActive; });
  }

  // Proyectiles remotos (del rival) golpeando al jugador local.
  // El jugador local reporta el impacto al servidor.
  checkRemoteProjectileCollisions() {
    if (this.game.isInvincible) return;

    const playerRect = this.game.player.getRect();

    for (const rp of this.game.remoteProjectiles) {
      if (!rp.isActive) continue;
      if (CollisionDetector.checkCollision(playerRect, rp.getRect())) {
        const weaponType = rp.weaponType || 'default';
        rp.remove();
        this.game.player.applyKnockback(rp.x);
        this.game.handleHit(weaponType, rp.x);
        return; // solo un impacto por frame
      }
    }
  }

  // Proyectiles locales golpeando al jugador remoto (feedback visual).
  // No envía nada al servidor — el rival detecta el impacto por su lado.
  checkLocalProjectileVsRemotePlayer() {
    if (!this.game.remotePlayer) return;

    const containerRect = this.game.gameContainer.getBoundingClientRect();
    const remoteRect    = this.game.remotePlayer.getRect();

    this.game.projectiles = this.game.projectiles.filter(projectile => {
      if (!projectile.isActive) return false;
      if (!CollisionDetector.checkCollision(projectile.getRect(), remoteRect)) return true;

      // Aplicar empuje visual al rival
      this.game.remotePlayer.applyKnockback(projectile.x);

      // Guardar tipo de arma para que NetworkManager muestre el efecto correcto
      this.game._lastRemoteHitWeapon = projectile.weaponType || 'default';

      // Efecto visual en la posición del rival
      const rx = remoteRect.left - containerRect.left;
      const ry = remoteRect.top  - containerRect.top;
      const col = projectile.chargeLevel === 2 ? '#f60'
                : projectile.chargeLevel === 1 ? '#0ff' : '#ff4';
      ParticleExplosion.spawn(this.game.gameContainer, rx + 37, ry + 37, col);

      // Sonido solo una vez por ventana de invencibilidad (2.5s)
      const now = Date.now();
      if (now - this._lastHitSound > 2500) {
        this.game.audioManager.playEnemyDeath();
        this._lastHitSound = now;
      }

      if (!projectile.piercing) {
        projectile.remove();
        return false;
      }
      return projectile.isActive;
    });
  }
}

export { CollisionManager };
