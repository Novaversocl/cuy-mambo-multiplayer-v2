/**
 * RoundSystem.js — ciclo de rondas y gestión de HP.
 *
 * Controla el flujo de una partida al mejor de N rondas:
 *
 *   onAnnounce(round) → "ROUND X":
 *     Congela el combate, resetea HP a 100, limpia proyectiles/minas/summons,
 *     reinicia pickups y muestra el banner de ronda.
 *
 *   onFight(round, rounds) → "FIGHT!":
 *     Habilita el combate (canFight = true).
 *
 *   onOver(iWon, winnerName, rounds):
 *     Muestra quién ganó la ronda y el marcador de rondas ganadas.
 *
 *   showGameOver(isWinner, winnerCharId):
 *     Detiene el motor y muestra pantalla final con baile de victoria o derrota.
 *
 *   showOpponentDisconnected():
 *     El rival se fue — detiene el motor y muestra aviso.
 *
 * HP:
 *   El servidor es autoritativo. setLocalHp / setRemoteHp solo actualizan la UI.
 *   Los eventos de sincronización con el rival (capsule/door/mine) están aquí
 *   para mantener el estado visual consistente en ambas pantallas.
 */

import { Mine } from '../entities/weapons/Mine.js';

const MAX_LIVES = 100;

export class RoundSystem {
  constructor(game) {
    this.game = game;
    this._prevLocalHp  = MAX_LIVES;
    this._prevRemoteHp = MAX_LIVES;
  }

  // ── HP ───────────────────────────────────────────────────────────────────────

  setLocalHp(hp) {
    const damage = this._prevLocalHp - hp;
    this._prevLocalHp = hp;
    this.game.lives = hp;
    this.game.uiManager.updateLivesDisplay();
    if (damage > 0) {
      this.game.uiManager.showDamageNumber(damage, this.game.cubeElement);
    }
  }

  setRemoteHp(hp) {
    const damage = this._prevRemoteHp - hp;
    this._prevRemoteHp = hp;
    this.game.uiManager.updateRemoteHpDisplay(hp);
    if (damage > 0) {
      const remoteEl = document.getElementById('remote-player');
      this.game.uiManager.showDamageNumber(damage, remoteEl);
    }
  }

  // ── Round lifecycle ──────────────────────────────────────────────────────────

  onAnnounce(round) {
    this._prevLocalHp  = MAX_LIVES;
    this._prevRemoteHp = MAX_LIVES;
    const g = this.game;
    g.canFight = false;
    g.canShoot = true;
    g.lives    = MAX_LIVES;
    g.isInvincible = false;
    g.cubeElement.classList.remove('invincible');

    g.projectiles.forEach(p => p.remove());         g.projectiles = [];
    g.remoteProjectiles.forEach(p => p.remove());   g.remoteProjectiles = [];
    g.mines.forEach(m => m.remove());               g.mines = [];
    g.summonedCharacters?.forEach(s => s.remove()); g.summonedCharacters = [];

    g.player?.reset();
    g._setSide(g._side);

    g.pickupSystem.cleanup();
    g.pickupSystem.init();

    g.uiManager.updateLivesDisplay();
    g.uiManager.updateWeaponDisplay(null);
    g.uiManager.showRoundAnnounce(round);
  }

  onFight(_round, rounds) {
    this.game.canFight = true;
    this.game.uiManager.showFight(rounds, this.game.networkManager?.socket?.id);
  }

  onOver(iWon, winnerName, rounds) {
    this.game.canFight = false;
    this.game.uiManager.showRoundOver(iWon, winnerName, rounds);
  }

  // ── Game over ────────────────────────────────────────────────────────────────

  showGameOver(isWinner, winnerCharId = '') {
    this.game.isGameOver = true;
    this.game.stop();
    this.game.uiManager.handleGameOver(isWinner, winnerCharId);
  }

  showOpponentDisconnected() {
    this.game.stop();
    this.game.uiManager.showOpponentDisconnected();
  }

  // ── Opponent events (sincronización visual) ──────────────────────────────────

  onOpponentCapsuleCollected(index) {
    this.game.weaponCapsules[index]?.collect();
  }

  onOpponentDoorOpened(index) {
    this.game.mysteryDoors[index]?.open();
  }

  onOpponentMinePlaced(x, y) {
    this.game.mines.push(new Mine(this.game.gameContainer, x, y, 'remote'));
  }
}
