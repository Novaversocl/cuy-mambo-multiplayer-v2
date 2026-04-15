/**
 * ShootingSystem.js — toda la lógica de disparo y colocación de minas.
 *
 * Centraliza los 5 tipos de disparo del juego:
 *   default      → proyectil normal/cargado (3 niveles de carga)
 *   food         → lanzacomida (proyectil con animación de giro)
 *   flamethrower → llama corta con spread, consume munición
 *   shotgun      → 5 perdigones en abanico, consume munición
 *   mine         → coloca una mina en el suelo (máx 2 activas)
 *
 * Cooldowns (ms) definidos en SHOOT_COOLDOWNS:
 *   default nivel 0 → 150ms,  nivel 1 → 400ms,  nivel 2 → 600ms
 *   food → 160ms,  flamethrower → 280ms,  shotgun → 500ms
 *
 * Por cada disparo:
 *   1. Crea el Projectile localmente
 *   2. Emite el evento al servidor via NetworkManager (para que el rival lo vea)
 *   3. Activa el cooldown (canShoot = false hasta que expira el timer)
 *
 * _spawnMuzzleFlash() genera el efecto visual de destello en la punta del arma,
 * creando rayos DOM temporales que se autoeliminan a los 80ms.
 */

import { Projectile } from '../entities/weapons/Projectile.js';
import { Mine }       from '../entities/weapons/Mine.js';
import { WEAPON_COOLDOWNS } from '../utils/WeaponsRegistry.js';

const SHOTGUN_SPREAD = [-3.5, -1.5, 0, 1.5, 3.5];

const SHOOT_COOLDOWNS = {
  default:      { 0: 150, 1: 400, 2: 600 },
  food:         WEAPON_COOLDOWNS.food,
  flamethrower: WEAPON_COOLDOWNS.flamethrower,
  shotgun:      WEAPON_COOLDOWNS.shotgun,
};

export class ShootingSystem {
  constructor(game) {
    this.game = game;
  }

  get _canFire() {
    const g = this.game;
    return g.isRunning && g.canShoot && g.canFight;
  }

  fire(chargeLevel = 0) {
    if (!this._canFire) return;

    const weapon = this.game.player.activeWeapon;

    if (weapon === 'mine')      { this._placeMine();         return; }
    if (weapon === 'shotgun')   { this._fireShotgun();       return; }
    if (weapon === 'flamethrower') { this._fireFlamethrower(); return; }
    if (weapon === 'food')      { this._fireFood();          return; }
    if (weapon === 'repulsor')  { this._fireRepulsor();      return; }

    this._fireDefault(chargeLevel);
  }

  // ── Disparo normal / cargado ─────────────────────────────────────────────────

  _fireDefault(chargeLevel) {
    const { player, audioManager, networkManager, projectiles, gameContainer } = this.game;
    const playerRect = player.getCSSRect();
    const dir        = player.currentDirection;

    this.game.canShoot = false;
    audioManager.playShoot(chargeLevel);
    projectiles.push(new Projectile(gameContainer, playerRect, dir, chargeLevel, false));
    this._spawnMuzzleFlash(playerRect, dir, false);

    networkManager?.emitShoot({
      x: playerRect.left, y: playerRect.top,
      width: playerRect.width, height: playerRect.height,
      right: playerRect.right,
      direction: dir, chargeLevel,
      weaponType: 'default',
      projectileId: Date.now(),
    });

    this._setCooldown(SHOOT_COOLDOWNS.default[chargeLevel] ?? 150);
  }

  // ── Lanzacomida ──────────────────────────────────────────────────────────────

  _fireFood() {
    const { player, audioManager, networkManager, projectiles, gameContainer } = this.game;
    const playerRect = player.getCSSRect();
    const dir        = player.currentDirection;

    this.game.canShoot = false;
    audioManager.playShoot(0);
    projectiles.push(new Projectile(gameContainer, playerRect, dir, 0, false, 0, 'food'));

    networkManager?.emitShoot({
      x: playerRect.left, y: playerRect.top,
      width: playerRect.width, height: playerRect.height,
      right: playerRect.right,
      direction: dir, chargeLevel: 0,
      weaponType: 'food',
      projectileId: Date.now(),
    });

    this._setCooldown(SHOOT_COOLDOWNS.food);
  }

  // ── Lanzallamas ──────────────────────────────────────────────────────────────

  _fireFlamethrower() {
    const { player, audioManager, networkManager, projectiles, gameContainer, uiManager } = this.game;

    if (player.weaponAmmo <= 0) {
      player._clearWeapon();
      uiManager.updateWeaponDisplay(null);
      return;
    }

    const playerRect = player.getCSSRect();
    const dir        = player.currentDirection;

    this.game.canShoot = false;
    player.weaponAmmo--;
    audioManager.playShoot(0);
    projectiles.push(new Projectile(gameContainer, playerRect, dir, 0, false, 0, 'flame'));
    this._spawnMuzzleFlash(playerRect, dir, true);

    networkManager?.emitFlame({
      x: playerRect.left, y: playerRect.top,
      width: playerRect.width, height: playerRect.height,
      right: playerRect.right, direction: dir,
      projectileId: Date.now(),
    });

    this._setCooldown(SHOOT_COOLDOWNS.flamethrower);
  }

  // ── Escopeta ─────────────────────────────────────────────────────────────────

  _fireShotgun() {
    const { player, audioManager, networkManager, projectiles, gameContainer, uiManager } = this.game;

    if (!this.game.canShoot) return;
    if (player.weaponAmmo <= 0) {
      player._clearWeapon();
      uiManager.updateWeaponDisplay(null);
      return;
    }

    const playerRect = player.getCSSRect();
    const dir        = player.currentDirection;

    this.game.canShoot = false;
    player.weaponAmmo--;

    for (const vy of SHOTGUN_SPREAD) {
      projectiles.push(new Projectile(gameContainer, playerRect, dir, 0, false, vy, 'pellet'));
    }

    audioManager.playShoot(1);
    this._spawnMuzzleFlash(playerRect, dir, true);

    networkManager?.emitShotgun({
      x: playerRect.left, y: playerRect.top,
      width: playerRect.width, height: playerRect.height,
      right: playerRect.right, direction: dir,
      projectileId: Date.now(),
    });

    this._setCooldown(SHOOT_COOLDOWNS.shotgun);
  }

  // ── Repulsor ─────────────────────────────────────────────────────────────────

  _fireRepulsor() {
    if (!this._canFire) return;
    const { player, networkManager, gameContainer, uiManager, audioManager } = this.game;

    this.game.canShoot = false;
    player._clearWeapon();
    uiManager.updateWeaponDisplay(null);

    const containerW  = gameContainer.offsetWidth;
    const initialDir  = player.currentDirection; // dirección al momento de disparar

    // Crear beam visual
    const beam = document.createElement('div');
    beam.className = 'repulsor-beam';
    gameContainer.appendChild(beam);

    audioManager.playRepulsor();

    const updateBeam = () => {
      const r   = player.getCSSRect();
      const dir = player.currentDirection;
      // Un poco más abajo del centro
      const beamTop = r.top + r.height * 0.53;
      beam.style.top = beamTop + 'px';
      if (dir === 'right') {
        beam.style.left  = r.right + 'px';
        beam.style.width = (containerW - r.right) + 'px';
        beam.style.background = `linear-gradient(to right, #ffee00 0%, #ffee00 85%, transparent 100%)`;
      } else {
        beam.style.left  = '0px';
        beam.style.width = r.left + 'px';
        beam.style.background = `linear-gradient(to left, #ffee00 0%, #ffee00 85%, transparent 100%)`;
      }
      beam.style.boxShadow = `0 0 4px #ffffff, 0 0 12px #ffdd00, 0 0 28px #ffaa00aa, 0 0 55px #ff880044`;
    };

    // RAF para mover el beam con el jugador
    let active = true;
    const rafLoop = () => {
      if (!active) return;
      updateBeam();
      requestAnimationFrame(rafLoop);
    };
    requestAnimationFrame(rafLoop);

    // El daño lo detecta la pantalla del rival (opponent-repulsor en NetworkManager)
    // Aquí solo controlamos el fin del beam local
    setTimeout(() => {
      active = false;
      beam.remove();
      this.game.canShoot = true;
      networkManager?.emitRepulsorEnd();
    }, 3000);

    networkManager?.emitRepulsor({ direction: initialDir });
  }

  // ── Mina ─────────────────────────────────────────────────────────────────────

  _placeMine() {
    const { player, networkManager, gameContainer, uiManager } = this.game;

    if (player.weaponAmmo <= 0 || player.minesPlaced >= player.maxMines) return;

    player.minesPlaced++;
    player.weaponAmmo--;
    if (player.weaponAmmo <= 0) {
      player._clearWeapon();
      uiManager.updateWeaponDisplay(null);
    }

    const px = player.position.x + player.cubeSize / 2;
    const py = player.position.y + player.cubeSize - 5;

    this.game.mines.push(new Mine(gameContainer, px, py, 'local'));
    networkManager?.emitMinePlaced({ x: px, y: py });
  }

  // ── Muzzle flash ─────────────────────────────────────────────────────────────

  _spawnMuzzleFlash(playerRect, direction, large = false) {
    const duration = 80;
    const rayCount = large ? 7 : 5;
    const spread   = 70;
    const maxLen   = large ? 50 : 34;
    const minLen   = large ? 18 : 12;
    const rayH     = large ? 6  : 4;
    const coreSize = large ? 10 : 7;
    const color    = Math.random() < 0.5 ? '#ff2200' : '#ffcc00';
    const nudge    = 12;

    const tipX = direction === 'right' ? playerRect.right + nudge : playerRect.left - nudge;
    const tipY = playerRect.top + playerRect.height / 2 + 5;

    const wrap = document.createElement('div');
    wrap.style.cssText = [
      'position:absolute',
      `left:${tipX}px`, `top:${tipY}px`,
      'width:0', 'height:0',
      'pointer-events:none', 'z-index:10',
      `animation:muzzleFlash ${duration}ms ease-out forwards`,
    ].join(';');

    const baseAngle = direction === 'right' ? 0 : 180;
    for (let i = 0; i < rayCount; i++) {
      const t        = rayCount === 1 ? 0.5 : i / (rayCount - 1);
      const angleDeg = baseAngle + (-spread / 2 + t * spread);
      const centerT  = 1 - Math.abs(t - 0.5) * 2;
      const len      = Math.round(minLen + (maxLen - minLen) * centerT);

      const ray = document.createElement('div');
      ray.style.cssText = [
        'position:absolute',
        `width:${len}px`, `height:${rayH}px`,
        'left:0px', `top:${-rayH / 2}px`,
        `background:linear-gradient(to right,#fff 0%,#fff 18%,${color} 55%,${color}00 100%)`,
        'border-radius:0 50% 50% 0',
        `transform:rotate(${angleDeg}deg)`,
        'transform-origin:0 50%',
      ].join(';');
      wrap.appendChild(ray);
    }

    const core = document.createElement('div');
    core.style.cssText = [
      'position:absolute',
      `width:${coreSize}px`, `height:${coreSize}px`,
      `left:${-coreSize / 2}px`, `top:${-coreSize / 2}px`,
      'background:#ffffff',
      `box-shadow:0 0 4px #fff,0 0 10px #fff,0 0 18px ${color}`,
      'border-radius:50%',
    ].join(';');
    wrap.appendChild(core);

    this.game.gameContainer.appendChild(wrap);
    setTimeout(() => wrap.remove(), duration + 10);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  _setCooldown(ms) {
    if (this.game._shootCooldown) clearTimeout(this.game._shootCooldown);
    this.game._shootCooldown = setTimeout(() => { this.game.canShoot = true; }, ms);
  }
}
