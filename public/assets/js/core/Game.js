/**
 * Game.js — motor principal del juego (clase central).
 *
 * Es el orquestador de todos los sistemas. Contiene el game loop y coordina:
 *   - Player         → movimiento y física del jugador local
 *   - RemotePlayer   → representación interpolada del rival
 *   - ShootingSystem → toda la lógica de disparo y armas
 *   - PickupSystem   → cápsulas, puertas, minas, invocaciones, zonas de fuego
 *   - RoundSystem    → ciclo de rondas, HP, game over
 *   - CollisionManager → detección de impactos entre proyectiles y jugadores
 *   - InputManager   → teclado, gamepad y controles táctiles
 *   - AudioManager   → singleton de audio (música + efectos)
 *   - UIManager      → HUD, banners de ronda, pantalla de game over
 *   - NetworkManager → Socket.io (se inyecta después con setNetworkManager)
 *
 * Flujo de vida:
 *   new Game()                  → constructor: inicializa elementos DOM y sistemas
 *   setNetworkManager(nm)       → vincula el socket al motor
 *   start(side)                 → arranca el game loop (requestAnimationFrame)
 *   stop() / reset() / destroy()→ limpieza progresiva
 *
 * Game loop (cada frame ~60fps):
 *   pollGamepad → player.update → remotePlayer.tick → tickProjectiles
 *   → checkCollisions → checkPickups → emitMove → requestAnimationFrame
 *
 * Sobre el HP: el servidor es autoritativo.
 *   El cliente solo emite 'player-hit' y recibe 'hp-update' / 'opponent-hp-update'.
 *   Nunca modifica this.lives directamente — solo lo hace setLocalHp() al llegar del server.
 */

import { Player } from '../entities/characters/Player.js';
import { GAME_CONFIG } from '../utils/Constants.js';

import { AudioManager } from '../managers/AudioManager.js';
import { InputManager } from '../managers/InputManager.js';
import { CollisionManager } from '../managers/CollisionManager.js';
import { UIManager } from '../managers/UIManager.js';
import { ShootingSystem } from '../systems/ShootingSystem.js';
import { PickupSystem }   from '../systems/CapsuleSystem.js';
import { RoundSystem }    from '../systems/RoundSystem.js';

const MAX_LIVES = 100;

class Game {
  constructor() {
    this.isRunning = false;
    this.maxLives = MAX_LIVES;
    this.lives = MAX_LIVES;
    this.isInvincible = false;
    this._invincibleTimer = null;

    this.projectiles = [];
    this.remoteProjectiles = [];
    this.remotePlayer = null;

    this.mines         = [];
    this.weaponCapsules = [];
    this.mysteryDoors  = [];

    this.canShoot = true;
    this._shootCooldown = null;

    this.canFight = false;  // false hasta que el server diga FIGHT
    this._side = 'left';

    this._destroyed = false;
    this._docListeners = [];

    this.networkManager = null;

    this.initializeElements();
    this.initializeManagers();
    this.initializeEntities();
  }

  initializeElements() {
    this.gameContainer  = document.getElementById('game-container');
    this.cubeElement    = document.getElementById('cube');
    this.floorElement   = document.getElementById('floor');
    this.screenGameover = document.getElementById('screen-gameover');

    if (!this.gameContainer || !this.cubeElement || !this.floorElement) {
      throw new Error('Required game elements not found in DOM');
    }
  }

  initializeManagers() {
    this.audioManager     = AudioManager.getInstance();
    this.collisionManager = new CollisionManager(this);
    this.uiManager        = new UIManager(this);
    this.shootingSystem   = new ShootingSystem(this);
    this.pickupSystem     = new PickupSystem(this);
    this.roundSystem      = new RoundSystem(this);
  }

  initializeEntities() {
    const sprites = window.__cuyMamboCharacter?.sprites || null;
    this.player = new Player(this.cubeElement, this.gameContainer, this.floorElement, sprites);
    this.inputManager = new InputManager(this.player, {
      onShootRays:  (chargeLevel) => this.shootingSystem.fire(chargeLevel),
      onCheatKill:  () => { if (this.networkManager) this.networkManager.emitHit(100); },
      isGameOver:   () => this.isGameOver,
      canFight:     () => this.canFight
    });
  }

  setNetworkManager(networkManager) {
    this.networkManager = networkManager;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  start(side = 'left') {
    if (this.isRunning) return;
    this.isRunning  = true;
    this._side      = side;
    this.canFight   = false;
    this.isGameOver = false;

    this._setSide(side);
    this._applyStage();
    this.pickupSystem.init();

    this.audioManager.playBackgroundMusic();
    this.gameLoop();
  }

  stop() {
    this.isRunning = false;
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    if (this._shootCooldown) { clearTimeout(this._shootCooldown); this._shootCooldown = null; }
    if (this._invincibleTimer) { clearTimeout(this._invincibleTimer); this._invincibleTimer = null; }
  }

  reset() {
    this.stop();

    this.lives = MAX_LIVES;
    this.isInvincible = false;
    this.cubeElement.classList.remove('invincible');
    this.cubeElement.classList.remove('victory-dance');
    this.cubeElement.style.backgroundImage = '';
    this.cubeElement.style.transition = '';
    this.cubeElement.style.width  = '';
    this.cubeElement.style.height = '';

    const remoteEl = document.getElementById('remote-player');
    if (remoteEl) {
      remoteEl.classList.remove('victory-dance');
      remoteEl.style.backgroundImage = '';
      remoteEl.style.transition = '';
      remoteEl.style.width  = '';
      remoteEl.style.height = '';
    }

    this.projectiles.forEach(p => p.remove());         this.projectiles = [];
    this.remoteProjectiles.forEach(p => p.remove());   this.remoteProjectiles = [];
    this.mines.forEach(m => m.remove());               this.mines = [];
    this.summonedCharacters?.forEach(s => s.remove()); this.summonedCharacters = [];
    this.pickupSystem?.cleanup();

    this.canShoot = true;

    if (this.player) this.player.reset();
    this.uiManager.updateLivesDisplay();
    this.uiManager.updateWeaponDisplay(null);
  }

  // ── Game loop ───────────────────────────────────────────────────────────────

  gameLoop() {
    if (!this.isRunning) return;

    this.inputManager.pollGamepad();
    this.player.update();
    this.remotePlayer?.tick();
    this.collisionManager.tickProjectiles();
    this.collisionManager.checkRemoteProjectileCollisions();
    this.collisionManager.checkLocalProjectileVsRemotePlayer();

    this.pickupSystem.checkCapsules();
    this.pickupSystem.checkDoors();
    this.pickupSystem.checkMines();
    this.pickupSystem.updateSummons();

    if (this.networkManager) {
      this.networkManager.emitMove(this.player);
    }

    // Muerte por caída al vacío
    if (this.player.position.y > this.gameContainer.offsetHeight + 10) {
      this.handleHit('void', 500); // Muerte instantánea
    }

    this._rafId = requestAnimationFrame(() => this.gameLoop());
  }

  // ── Hit handling ────────────────────────────────────────────────────────────

  handleHit(weaponType = 'default', sourceX = null) {
    if (this.isInvincible && weaponType !== 'void') return;
    if (this.player.isShielded && weaponType !== 'void') return;

    this.uiManager.screenShake();
    this.audioManager.playHit();
    if (weaponType === 'flame') {
      this.uiManager.showFireHit(this.cubeElement);
    } else {
      this.uiManager.showHitSpark(this.cubeElement);
    }

    const damage = GAME_CONFIG.damage[weaponType] ?? GAME_CONFIG.damage.weapon;

    if (this.networkManager) {
      this.networkManager.emitHit(damage, sourceX);
    }

    this.isInvincible = true;
    this.cubeElement.classList.add('invincible');
    if (this._invincibleTimer) clearTimeout(this._invincibleTimer);
    this._invincibleTimer = setTimeout(() => {
      this.isInvincible = false;
      this.cubeElement.classList.remove('invincible');
    }, 2500);
  }

  // ── Delegados a sistemas ──────────────────────────────────────────────────

  setLocalHp(hp)                        { this.roundSystem.setLocalHp(hp); }
  setRemoteHp(hp)                        { this.roundSystem.setRemoteHp(hp); }
  showGameOver(isWinner, winnerCharId)   { this.roundSystem.showGameOver(isWinner, winnerCharId); }
  showOpponentDisconnected()             { this.roundSystem.showOpponentDisconnected(); }
  onRoundAnnounce(round)                 { this.roundSystem.onAnnounce(round); }
  onRoundFight(round, rounds)            { this.roundSystem.onFight(round, rounds); }
  onRoundOver(iWon, winnerName, rounds)  { this.roundSystem.onOver(iWon, winnerName, rounds); }
  onOpponentCapsuleCollected(index)      { this.roundSystem.onOpponentCapsuleCollected(index); }
  onOpponentDoorOpened(index)            { this.roundSystem.onOpponentDoorOpened(index); }
  onOpponentMinePlaced(x, y)             { this.roundSystem.onOpponentMinePlaced(x, y); }


  // ── Helpers ─────────────────────────────────────────────────────────────────

  _applyStage() {
    const stage = window.__cuyMamboStage;
    const bg = stage?.background || 'assets/img/ui/Fondo.gif';
    this.gameContainer.style.backgroundImage = `url('${bg}')`;
  }

  _setSide(side) {
    const containerW = this.gameContainer.offsetWidth;
    const startX = side === 'left' ? 160 : containerW - 160 - 75;
    const startY = this.floorElement.offsetTop - GAME_CONFIG.dimensions.cubeSize;

    this.player.position.x = startX;
    this.player.position.y = startY;
    this.cubeElement.style.left       = `${startX}px`;
    this.cubeElement.style.top        = `${startY}px`;
    this.cubeElement.style.visibility = 'visible';

    this.player.currentDirection = side === 'left' ? 'right' : 'left';
    this.player.animationManager.setIdleImage(this.cubeElement, this.player.currentDirection);
  }

  _addDocListener(type, fn) {
    document.addEventListener(type, fn);
    this._docListeners.push({ type, fn });
  }

  _removeAllDocListeners() {
    for (const { type, fn } of this._docListeners) {
      document.removeEventListener(type, fn);
    }
    this._docListeners = [];
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────────

  destroy() {
    this._destroyed = true;
    this._removeAllDocListeners();
    this.stop();
    if (this.inputManager) this.inputManager.destroy();
    if (this.player) this.player.destroy();
    this.projectiles.forEach(p => p.remove());
    this.remoteProjectiles.forEach(p => p.remove());
    this.mines.forEach(m => m.remove());
    this.weaponCapsules.forEach(c => c.remove());
    this.mysteryDoors.forEach(d => d.remove());
    if (this.audioManager) this.audioManager.dispose();
  }
}

export { Game };
