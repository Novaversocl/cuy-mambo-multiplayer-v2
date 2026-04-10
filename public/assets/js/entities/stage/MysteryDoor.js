import { ParticleExplosion } from '../../utils/ParticleExplosion.js';

// Premios posibles al abrir la puerta
const DOOR_OUTCOMES = [
  { type: 'heal',    label: '+1 ❤️',    chance: 25 },
  { type: 'damage',  label: '-1 💀',    chance: 20 },
  { type: 'speed',   label: '⚡ SPEED', chance: 20 },
  { type: 'weapon',  label: '🔫 ARMA',  chance: 20 },
  { type: 'nothing', label: '😂 NADA',  chance: 15 },
];

function rollOutcome() {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const outcome of DOOR_OUTCOMES) {
    cumulative += outcome.chance;
    if (roll < cumulative) return outcome;
  }
  return DOOR_OUTCOMES[0];
}

class MysteryDoor {
  constructor(container, x, y) {
    this.container  = container;
    this.x          = x;
    this.y          = y;
    this.isActive   = true;
    this.isOpen     = false;
    this.respawnTime = 25000;
    this._respawnTimer = null;

    this.element = this._createElement();
    this.container.appendChild(this.element);
  }

  _createElement() {
    const el = document.createElement('div');
    el.className = 'mystery-door';
    el.style.left = (this.x - 20) + 'px';
    el.style.top  = (this.y - 50) + 'px';
    el.innerHTML = '<span class="door-icon">🚪</span><span class="door-label">?</span>';
    return el;
  }

  checkCollision(playerX, playerY, playerSize) {
    if (!this.isActive || this.isOpen) return false;
    return (
      playerX < this.x + 20 &&
      playerX + playerSize > this.x - 20 &&
      playerY < this.y + 20 &&
      playerY + playerSize > this.y - 20
    );
  }

  open() {
    if (!this.isActive || this.isOpen) return null;
    this.isOpen = true;
    this.isActive = false;

    const outcome = rollOutcome();

    // Animación de apertura
    this.element.classList.add('door-opening');
    const label = this.element.querySelector('.door-label');
    if (label) label.textContent = outcome.label;

    ParticleExplosion.spawn(this.container, this.x, this.y - 25, '#aa88ff', 10);

    setTimeout(() => {
      this.element.style.display = 'none';
      this._respawnTimer = setTimeout(() => this._respawn(), this.respawnTime);
    }, 1200);

    return outcome;
  }

  _respawn() {
    this.isOpen   = false;
    this.isActive = true;
    this.element.style.display = '';
    this.element.classList.remove('door-opening');
    const label = this.element.querySelector('.door-label');
    if (label) label.textContent = '?';
  }

  remove() {
    if (this._respawnTimer) clearTimeout(this._respawnTimer);
    this.element.remove();
  }
}

export { MysteryDoor };
