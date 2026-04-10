/**
 * InputManager.js — captura de entrada del jugador (teclado, gamepad y táctil).
 *
 * Unifica tres fuentes de input en una misma interfaz hacia Player y Game:
 *
 *   Teclado:
 *     ← →        → moverse
 *     Espacio     → saltar
 *     Enter (hold)→ cargar disparo; soltar → disparar
 *     * (asterisco) → cheat: matar al rival instantáneamente (solo dev)
 *     ↑           → maullido (Easter egg)
 *
 *   Gamepad (Xinput / Standard Layout):
 *     Stick izquierdo / D-pad ← → → moverse
 *     Botón A / D-pad ↑       → saltar
 *     Botón B o X (hold/soltar) → cargar y disparar
 *
 *   Táctil (móvil):
 *     Botones en pantalla: ← → saltar disparar
 *     Botón START → simula Enter
 *
 * Sistema de carga de disparo:
 *   0–3s   mantenido → disparo normal  (chargeLevel 0)
 *   3–8s   mantenido → disparo cargado (chargeLevel 1, efecto cyan)
 *   +8s    mantenido → disparo máximo  (chargeLevel 2, efecto rojo)
 *
 * pollGamepad() debe llamarse cada frame desde Game.gameLoop() ya que
 * la Gamepad API no emite eventos — hay que leerla activamente.
 */

import { GAME_CONFIG } from '../utils/Constants.js';
import { AudioManager } from './AudioManager.js';

// Gamepad button indices (standard layout)
const PAD = {
  A: 0,       // A (Xbox) / Cruz (PS) → saltar
  B: 1,       // B / Círculo → disparar
  X: 2,       // X / Cuadrado → disparar (alternativo)
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
};
const AXIS_DEADZONE = 0.3;

class InputManager {
  constructor(player, gameCallbacks = {}) {
    this.player = player;
    this.gameCallbacks = gameCallbacks;
    this.audioManager = AudioManager.getInstance();
    this.pressedKeys = new Set();
    this.movementKeys = new Set();

    this._chargeLevel    = 0;    // 0 = none, 1 = cyan, 2 = red
    this._chargeTimer1   = null; // timer para nivel 1 (3s)
    this._chargeTimer2   = null; // timer para nivel 2 (3+5=8s)
    this._padChargeLevel = 0;
    this._padChargeTimer1 = null;
    this._padChargeTimer2 = null;

    // Gamepad state tracking (previous frame)
    this._padPrev = {};

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.boundKeyDown = (event) => this.handleKeyDown(event);
    this.boundKeyUp = (event) => this.handleKeyUp(event);

    document.addEventListener('keydown', this.boundKeyDown);
    document.addEventListener('keyup', this.boundKeyUp);

    this.setupTouchControls();
  }

  setupTouchControls() {
    const btnLeft  = document.getElementById('btn-touch-left');
    const btnRight = document.getElementById('btn-touch-right');
    const btnJump  = document.getElementById('btn-touch-jump');
    const btnShoot = document.getElementById('btn-touch-shoot');
    const btnStart = document.getElementById('btn-touch-start');

    if (!btnLeft) return;

    const opts = { passive: false };

    // Izquierda
    btnLeft.addEventListener('pointerdown',  (e) => { e.preventDefault(); this.player.startMoving('left'); }, opts);
    btnLeft.addEventListener('pointerup',    (e) => { e.preventDefault(); this.player.stopMoving('left');  }, opts);
    btnLeft.addEventListener('pointerleave', (e) => { e.preventDefault(); this.player.stopMoving('left');  }, opts);

    // Derecha
    btnRight.addEventListener('pointerdown',  (e) => { e.preventDefault(); this.player.startMoving('right'); }, opts);
    btnRight.addEventListener('pointerup',    (e) => { e.preventDefault(); this.player.stopMoving('right');  }, opts);
    btnRight.addEventListener('pointerleave', (e) => { e.preventDefault(); this.player.stopMoving('right');  }, opts);

    // Saltar
    btnJump.addEventListener('pointerdown', (e) => { e.preventDefault(); this.player.jump(); }, opts);

    // Disparar (hold = carga, soltar = dispara)
    btnShoot.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this._chargeLevel = 0;
      this._chargeTimer1 = setTimeout(() => {
        this._chargeLevel = 1;
        this.player.element.classList.add('charging-level1');
      }, 3000);
      this._chargeTimer2 = setTimeout(() => {
        this._chargeLevel = 2;
        this.player.element.classList.remove('charging-level1');
        this.player.element.classList.add('charging-level2');
      }, 8000);
    }, opts);

    const releaseShoot = (e) => {
      e.preventDefault();
      clearTimeout(this._chargeTimer1); this._chargeTimer1 = null;
      clearTimeout(this._chargeTimer2); this._chargeTimer2 = null;
      this.player.element.classList.remove('charging-level1', 'charging-level2');
      if (this.gameCallbacks.onShootRays) {
        const level = this._chargeLevel;
        this._chargeLevel = 0;
        this.gameCallbacks.onShootRays(level);
      }
    };
    btnShoot.addEventListener('pointerup',    releaseShoot, opts);
    btnShoot.addEventListener('pointerleave', releaseShoot, opts);

    // START — simula tecla Enter para avanzar pantallas y disparar
    if (btnStart) {
      btnStart.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 13, bubbles: true }));
      }, opts);
      btnStart.addEventListener('pointerup', (e) => {
        e.preventDefault();
        document.dispatchEvent(new KeyboardEvent('keyup', { keyCode: 13, bubbles: true }));
      }, opts);
    }
  }

  handleKeyDown(event) {
    if (this.gameCallbacks?.isGameOver?.()) return;
    if (!this.gameCallbacks?.canFight?.()) return;
    const keyCode = event.keyCode;

    this.pressedKeys.add(keyCode);

    switch (keyCode) {
      case GAME_CONFIG.keys.LEFT:
        if (!this.movementKeys.has(keyCode)) {
          this.movementKeys.add(keyCode);
          this.player.startMoving('left');
        }
        break;

      case GAME_CONFIG.keys.RIGHT:
        if (!this.movementKeys.has(keyCode)) {
          this.movementKeys.add(keyCode);
          this.player.startMoving('right');
        }
        break;

      case GAME_CONFIG.keys.SPACE:
        if (!this.pressedKeys.has('SPACE_PRESSED')) {
          this.pressedKeys.add('SPACE_PRESSED');
          this.player.jump();
        }
        break;

      default:
        if (event.key === '*' && !this.pressedKeys.has('CHEAT_KILL')) {
          this.pressedKeys.add('CHEAT_KILL');
          if (this.gameCallbacks?.onCheatKill) this.gameCallbacks.onCheatKill();
        }
        break;

      case GAME_CONFIG.keys.ENTER:
        if (!this.pressedKeys.has('ENTER_PRESSED')) {
          this.pressedKeys.add('ENTER_PRESSED');
          this._chargeLevel = 0;
          this._chargeTimer1 = setTimeout(() => {
            this._chargeLevel = 1;
            this.player.element.classList.add('charging-level1');
          }, 3000);
          this._chargeTimer2 = setTimeout(() => {
            this._chargeLevel = 2;
            this.player.element.classList.remove('charging-level1');
            this.player.element.classList.add('charging-level2');
          }, 8000);
        }
        break;
    }
  }

  handleKeyUp(event) {
    const keyCode = event.keyCode;
    this.pressedKeys.delete(keyCode);
    this.movementKeys.delete(keyCode);

    if (event.key === '*') this.pressedKeys.delete('CHEAT_KILL');

    switch (keyCode) {
      case GAME_CONFIG.keys.LEFT:
        this.player.stopMoving('left');
        break;

      case GAME_CONFIG.keys.RIGHT:
        this.player.stopMoving('right');
        break;

      case GAME_CONFIG.keys.SPACE:
        this.pressedKeys.delete('SPACE_PRESSED');
        break;

      case GAME_CONFIG.keys.ENTER:
        this.pressedKeys.delete('ENTER_PRESSED');
        clearTimeout(this._chargeTimer1); this._chargeTimer1 = null;
        clearTimeout(this._chargeTimer2); this._chargeTimer2 = null;
        this.player.element.classList.remove('charging-level1', 'charging-level2');
        if (this.gameCallbacks.onShootRays) {
          const level = this._chargeLevel;
          this._chargeLevel = 0;
          this.gameCallbacks.onShootRays(level);
        }
        break;
    }
  }

  // Llamado cada frame desde Game.gameLoop()
  pollGamepad() {
    if (!this.gameCallbacks?.canFight?.()) return;
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (!gp) return;

    const prev = this._padPrev;
    const btn = (i) => gp.buttons[i]?.pressed ?? false;
    const axisX = gp.axes[0] ?? 0; // stick izquierdo horizontal

    // --- Movimiento: stick izquierdo o D-pad ---
    const wantsLeft  = axisX < -AXIS_DEADZONE || btn(PAD.DPAD_LEFT);
    const wantsRight = axisX >  AXIS_DEADZONE || btn(PAD.DPAD_RIGHT);

    if (wantsLeft && !prev.left) {
      this.player.startMoving('left');
    } else if (!wantsLeft && prev.left) {
      this.player.stopMoving('left');
    }

    if (wantsRight && !prev.right) {
      this.player.startMoving('right');
    } else if (!wantsRight && prev.right) {
      this.player.stopMoving('right');
    }

    // --- Saltar: botón A / Cruz (flanco de subida) ---
    const wantsJump = btn(PAD.A) || btn(PAD.DPAD_UP);
    if (wantsJump && !prev.jump) {
      this.player.jump();
    }

    // --- Disparar: botón B / X ---
    const wantsShoot = btn(PAD.B) || btn(PAD.X);
    if (wantsShoot && !prev.shoot) {
      this._padChargeLevel = 0;
      this._padChargeTimer1 = setTimeout(() => {
        this._padChargeLevel = 1;
        this.player.element.classList.add('charging-level1');
      }, 3000);
      this._padChargeTimer2 = setTimeout(() => {
        this._padChargeLevel = 2;
        this.player.element.classList.remove('charging-level1');
        this.player.element.classList.add('charging-level2');
      }, 8000);
    } else if (!wantsShoot && prev.shoot) {
      clearTimeout(this._padChargeTimer1); this._padChargeTimer1 = null;
      clearTimeout(this._padChargeTimer2); this._padChargeTimer2 = null;
      this.player.element.classList.remove('charging-level1', 'charging-level2');
      if (this.gameCallbacks.onShootRays) {
        const level = this._padChargeLevel;
        this._padChargeLevel = 0;
        this.gameCallbacks.onShootRays(level);
      }
    }

    // Guardar estado actual para el siguiente frame
    this._padPrev = {
      left:  wantsLeft,
      right: wantsRight,
      jump:  wantsJump,
      shoot: wantsShoot,
    };
  }

  isKeyPressed(keyCode) {
    return this.pressedKeys.has(keyCode);
  }

  removeEventListeners() {
    if (this.boundKeyDown) {
      document.removeEventListener('keydown', this.boundKeyDown);
    }
    if (this.boundKeyUp) {
      document.removeEventListener('keyup', this.boundKeyUp);
    }
  }

  destroy() {
    this.removeEventListeners();
    this.pressedKeys.clear();
    this.movementKeys.clear();
  }
}

export { InputManager };
