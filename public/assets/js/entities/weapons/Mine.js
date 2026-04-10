import { ParticleExplosion } from '../../utils/ParticleExplosion.js';

class Mine {
  constructor(container, x, y, ownerId) {
    this.container = container;
    this.x        = x;
    this.y        = y;
    this.ownerId  = ownerId; // 'local' | 'remote'
    this.isActive = true;
    this.radius   = 70; // radio de explosion en px

    this.element = this._createElement();
    this.container.appendChild(this.element);
  }

  _createElement() {
    const el = document.createElement('div');
    el.className = 'mine';
    el.style.left = (this.x - 10) + 'px';
    el.style.top  = (this.y - 10) + 'px';
    return el;
  }

  // Devuelve true si el rect dado está dentro del radio de explosión
  checkCollision(rect) {
    if (!this.isActive) return false;
    const containerRect = this.container.getBoundingClientRect();
    const centerX = rect.left - containerRect.left + rect.width  / 2;
    const centerY = rect.top  - containerRect.top  + rect.height / 2;
    const dx = centerX - this.x;
    const dy = centerY - this.y;
    return Math.sqrt(dx * dx + dy * dy) < this.radius;
  }

  explode() {
    if (!this.isActive) return;
    this.isActive = false;
    ParticleExplosion.spawn(this.container, this.x, this.y, '#ff6600', 18);
    ParticleExplosion.spawn(this.container, this.x, this.y, '#ffcc00', 12);
    this.element.remove();
  }

  remove() {
    this.isActive = false;
    this.element.remove();
  }
}

export { Mine };
