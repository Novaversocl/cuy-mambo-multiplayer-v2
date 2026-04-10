// SummonedCharacter — personaje invocado que camina hacia el rival y le quita HP

import { AudioManager } from '../../managers/AudioManager.js';

const SUMMON_ROSTER = [
  { id: 'ninja', src: 'assets/img/npc/invocaciones/chascon_ninja.gif' },
];

// Para agregar más: solo añade { id, src } a SUMMON_ROSTER y sube el GIF/PNG

const SPEED       = 3;    // px por frame
const SIZE        = 140;  // px (x2)
const DAMAGE      = 50;
const LIFETIME_MS = 6000; // desaparece si no choca en 6 segundos

class SummonedCharacter {
  /**
   * @param {HTMLElement} container
   * @param {number}  startX     — posición X inicial (px)
   * @param {number}  floorY     — Y del piso (offsetTop del floor)
   * @param {'left'|'right'} direction — hacia dónde camina
   * @param {string}  rosterEntry — id del personaje del roster
   * @param {'local'|'remote'} owner — quién invocó (no recibe daño)
   */
  constructor(container, startX, floorY, direction, rosterId, owner) {
    this.container = container;
    this.direction = direction;
    this.owner     = owner;
    this.active    = true;
    this.hasHit    = false;

    const entry = SUMMON_ROSTER.find(r => r.id === rosterId) || SUMMON_ROSTER[0];

    this.x = startX;
    this.y = floorY - SIZE - 0.5; // 14 = altura del floor element

    this.element = document.createElement('div');
    this.element.className = 'summoned-character';
    this.element.style.cssText = `
      position: absolute;
      width: ${SIZE}px;
      height: ${SIZE}px;
      left: ${this.x}px;
      top:  ${this.y}px;
      background-image: url('${entry.src}');
      background-size: auto 100%;
      background-repeat: no-repeat;
      background-position: center bottom;
      image-rendering: pixelated;
      z-index: 6;
      transform: scaleX(${direction === 'left' ? 1 : -1});
    `;

    // Efecto de entrada
    this.element.style.opacity = '0';
    container.appendChild(this.element);
    setTimeout(() => { if (this.element) this.element.style.transition = 'opacity 0.3s'; }, 0);
    setTimeout(() => { if (this.element) this.element.style.opacity = '1'; }, 50);

    // Sonido al aparecer (solo si es el ninja)
    if (entry.id === 'ninja') {
      AudioManager.getInstance().playBirdSound();
    }

    this._timer = setTimeout(() => this.remove(), LIFETIME_MS);
  }

  /**
   * @param {{ x: number, y: number, size: number }|null} playerPos — posición del jugador local
   * @param {Function} onHit
   */
  update(playerPos, onHit) {
    if (!this.active || this.hasHit) return;

    // Mover
    this.x += this.direction === 'left' ? -SPEED : SPEED;
    this.element.style.left = this.x + 'px';

    // Salió de pantalla
    const cw = this.container.offsetWidth;
    if (this.x < -SIZE || this.x > cw + SIZE) {
      this.remove();
      return;
    }

    // Solo el summon REMOTO detecta colisión con el jugador LOCAL
    // Usa coordenadas de juego (no DOM) igual que minas/proyectiles
    if (this.owner === 'remote' && playerPos && !this.hasHit) {
      const overlap =
        this.x            < playerPos.x + playerPos.size &&
        this.x + SIZE     > playerPos.x                  &&
        this.y            < playerPos.y + playerPos.size &&
        this.y + SIZE     > playerPos.y;

      if (overlap) {
        this.hasHit = true;
        onHit(DAMAGE);
        this._flashHit();
        setTimeout(() => this.remove(), 400);
      }
    }
  }

  _flashHit() {
    this.element.style.filter = 'brightness(3) drop-shadow(0 0 16px #ffffff)';
    setTimeout(() => {
      if (this.element) this.element.style.filter = '';
    }, 200);
  }

  remove() {
    if (!this.active) return;
    this.active = false;
    clearTimeout(this._timer);
    this.element.style.opacity = '0';
    setTimeout(() => { if (this.element.parentNode) this.element.remove(); }, 300);
  }
}

// Devuelve un id random del roster
function randomSummonId() {
  return SUMMON_ROSTER[Math.floor(Math.random() * SUMMON_ROSTER.length)].id;
}

export { SummonedCharacter, randomSummonId, SUMMON_ROSTER };
