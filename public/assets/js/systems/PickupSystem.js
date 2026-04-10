/**
 * PickupSystem.js — gestión de todos los objetos recogibles del mapa.
 *
 * Se reinicializa en cada ronda (init + cleanup) para limpiar el DOM correctamente.
 * ⚠️ Siempre llamar cleanup() ANTES de init() para evitar acumulación de elementos DOM.
 *
 * Tipos de pickups:
 *
 *   WeaponCapsule — cápsulas flotantes con armas:
 *     food (40s respawn), shotgun (35s), mine (45s), flamethrower (50s), summon (60s)
 *     Al recogerse, se notifica al servidor con emitCapsuleCollected(index).
 *
 *   MysteryDoor — puertas de misterio (2 en el mapa):
 *     Al abrirse dan un resultado aleatorio: curar, daño, velocidad o arma aleatoria.
 *     Se notifica con emitDoorOpened(index).
 *
 *   Mine — minas colocadas por cualquier jugador:
 *     Las minas locales detectan colisión con el rival y emiten emitMineHitOpponent().
 *     Las minas remotas detectan colisión con el jugador local y llaman handleHit().
 *
 *   SummonedCharacter — personaje invocado que camina y causa daño:
 *     'local'  → ataca al rival remoto (emite player-hit)
 *     'remote' → ataca al jugador local (llama emitHit)
 *
 *   FireZone — zona de fuego en el centro del mapa:
 *     Se activa/desactiva cíclicamente. Causa daño por segundo al estar encima.
 */

import { WeaponCapsule }                    from '../entities/weapons/WeaponCapsule.js';
import { MysteryDoor }                      from '../entities/stage/MysteryDoor.js';
import { SummonedCharacter, randomSummonId } from '../entities/characters/SummonedCharacter.js';

const WEAPON_LABELS = {
  food:         '🍖 LANZACOMIDA',
  shotgun:      '💥 ESCOPETA',
  mine:         '💣 MINA',
  flamethrower: '🔥 LANZALLAMAS',
  shield:       '🛡️ ESCUDO',
  repulsor:     '⚡ REPULSOR',
};

const DOOR_WEAPON_TYPES = ['food', 'shotgun', 'mine', 'flamethrower'];

export class PickupSystem {
  constructor(game) {
    this.game = game;
  }

  // ── Init ─────────────────────────────────────────────────────────────────────

  init() {
    const { gameContainer, floorElement } = this.game;
    const cw     = gameContainer.offsetWidth;
    const floorY = floorElement.offsetTop;

    this.game.weaponCapsules = [
      new WeaponCapsule(gameContainer, Math.round(cw * 0.20), floorY - 20, 'food',         40000),
      new WeaponCapsule(gameContainer, Math.round(cw * 0.80), floorY - 20, 'shotgun',      35000),
      new WeaponCapsule(gameContainer, Math.round(cw * 0.50), 330,         'mine',         45000),
      new WeaponCapsule(gameContainer, Math.round(cw * 0.50), 225,         'flamethrower', 50000),
      new WeaponCapsule(gameContainer, Math.round(cw * 0.35), floorY - 20, 'summon',       60000),
      new WeaponCapsule(gameContainer, Math.round(cw * 0.65), floorY - 20, 'shield',       20000),
      new WeaponCapsule(gameContainer, Math.round(cw * 0.25), 225,         'repulsor',     55000),
    ];

    this.game.summonedCharacters = [];
    this.game.fireZones = [];

    this.game.mysteryDoors = [
      new MysteryDoor(gameContainer, Math.round(cw * 0.12), floorY - 20),
      new MysteryDoor(gameContainer, Math.round(cw * 0.88), floorY - 20),
    ];
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────────

  cleanup() {
    this.game.weaponCapsules.forEach(c => c.remove()); this.game.weaponCapsules = [];
    this.game.mysteryDoors.forEach(d => d.remove());   this.game.mysteryDoors   = [];
    clearTimeout(this.game._fireTimer);
    this.game.fireZones?.forEach(z => z.remove());     this.game.fireZones = [];
    this.game.audioManager.stopFireCrackle();
  }

  // ── Capsule collisions ────────────────────────────────────────────────────────

  checkCapsules() {
    const { player, audioManager, networkManager, uiManager } = this.game;
    const { x, y } = player.position;
    const size = player.cubeSize;

    this.game.weaponCapsules.forEach((cap, i) => {
      if (!cap.checkCollision(x, y, size)) return;

      cap.collect();
      audioManager.playWeaponPickup();
      networkManager?.emitCapsuleCollected(i);

      if (cap.type === 'summon') {
        this.spawnSummon('local');
      } else if (cap.type === 'shield') {
        player.activateShield();
        uiManager._showMessage('🛡️ ESCUDO ACTIVADO', '#00eeff', 2000);
        networkManager?.emitShield(true);
      } else if (cap.type === 'repulsor') {
        player.equipWeapon('repulsor');
        uiManager.updateWeaponDisplay('repulsor');
      } else {
        player.equipWeapon(cap.type);
        uiManager.updateWeaponDisplay(cap.type);
      }
    });
  }

  // ── Door collisions ───────────────────────────────────────────────────────────

  checkDoors() {
    const { player, audioManager, networkManager } = this.game;
    const { x, y } = player.position;
    const size = player.cubeSize;

    this.game.mysteryDoors.forEach((door, i) => {
      if (!door.checkCollision(x, y, size)) return;
      const outcome = door.open();
      if (!outcome) return;

      audioManager.playDoorOpen();
      this._applyDoorOutcome(outcome);
      networkManager?.emitDoorOpened(i);
    });
  }

  _applyDoorOutcome(outcome) {
    const { player, uiManager, networkManager } = this.game;
    uiManager._showMessage(outcome.label, '#aa88ff', 2000);

    if      (outcome.type === 'heal')   { networkManager?.emitHeal(); }
    else if (outcome.type === 'damage') { this.game.handleHit('door'); }
    else if (outcome.type === 'speed')  { player.applyPowerup('speed'); }
    else if (outcome.type === 'weapon') {
      const picked = DOOR_WEAPON_TYPES[Math.floor(Math.random() * DOOR_WEAPON_TYPES.length)];
      player.equipWeapon(picked);
      uiManager.updateWeaponDisplay(picked);
    }
  }

  // ── Mine collisions ───────────────────────────────────────────────────────────

  checkMines() {
    const { mines, remotePlayer, cubeElement, audioManager, networkManager } = this.game;

    for (const mine of mines) {
      if (!mine.isActive) continue;

      if (mine.ownerId === 'local') {
        if (remotePlayer) {
          const rect = remotePlayer.element.getBoundingClientRect();
          if (mine.checkCollision(rect)) {
            mine.explode();
            audioManager.playMineExplosion();
            networkManager?.emitMineHitOpponent();
          }
        }
      } else {
        const rect = cubeElement.getBoundingClientRect();
        if (mine.checkCollision(rect)) {
          mine.explode();
          audioManager.playMineExplosion();
          this.game.handleHit('mine');
        }
      }
    }

    this.game.mines = mines.filter(m => m.isActive);
  }

  // ── Summon ────────────────────────────────────────────────────────────────────

  spawnSummon(owner, rosterId = null, startX = null, direction = null) {
    const { gameContainer, floorElement, networkManager } = this.game;
    const cw       = gameContainer.offsetWidth;
    const floorY   = floorElement.offsetTop;
    const id       = rosterId || randomSummonId();
    const fromLeft = direction ? direction === 'right' : Math.random() < 0.5;
    const x        = startX !== null ? startX : (fromLeft ? -80 : cw + 10);
    const dir      = fromLeft ? 'right' : 'left';

    this.game.summonedCharacters.push(
      new SummonedCharacter(gameContainer, x, floorY, dir, id, owner)
    );

    if (owner === 'local') {
      networkManager?.emitSummon({ rosterId: id, startX: x, direction: dir });
    }
  }

  updateSummons() {
    const { player, networkManager, audioManager } = this.game;
    const localPos = { x: player.position.x, y: player.position.y, size: player.cubeSize };

    this.game.summonedCharacters = this.game.summonedCharacters.filter(s => {
      if (!s.active) return false;
      const pos = s.owner === 'remote' ? localPos : null;
      s.update(pos, (dmg) => {
        networkManager?.emitHit(dmg);
        audioManager.playMineExplosion();
      });
      return s.active;
    });
  }

  _summonFlash() {
    const flash = document.createElement('div');
    flash.style.cssText = `
      position:absolute; inset:0; z-index:50;
      background:radial-gradient(circle,#cc44ff88 0%,transparent 70%);
      pointer-events:none; animation:summonFlash 0.5s ease-out forwards;
    `;
    this.game.gameContainer.appendChild(flash);
    setTimeout(() => flash.remove(), 500);
  }

  // ── Fire zones ────────────────────────────────────────────────────────────────

  startFireRotation() {
    if (!this.game.fireZones?.length) return;

    const cycle = () => {
      if (!this.game.isRunning) return;
      this.game.fireZones[0].activate();
      this.game._fireTimer = setTimeout(() => {
        if (!this.game.isRunning) return;
        this.game.fireZones[0].deactivate();
        this.game._fireTimer = setTimeout(cycle, this._inactiveDuration);
      }, this._activeDuration);
    };

    this.game._fireTimer = setTimeout(cycle, 5000);
  }

  checkFireZones() {
    const { fireZones, canFight, player, networkManager, audioManager } = this.game;
    if (!fireZones?.length || !canFight) return;

    const { x, y } = player.position;
    const size = player.cubeSize;
    let anyActive = false;

    for (const zone of fireZones) {
      if (zone.active) anyActive = true;
      if (zone.isPlayerOver(x, y, size)) {
        const dmg = zone.checkPlayer(x, y, size);
        if (dmg > 0) networkManager?.emitHit(dmg);
      }
    }

    anyActive ? audioManager.playFireCrackle() : audioManager.stopFireCrackle();
  }
}
