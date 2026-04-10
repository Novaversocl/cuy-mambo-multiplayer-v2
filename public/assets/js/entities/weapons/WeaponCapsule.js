// Tipos: 'food' | 'shotgun' | 'mine' | 'flamethrower' | 'summon' | 'shield' | 'repulsor'
const CAPSULE_ICONS = {
  food:         '🍖',
  shotgun:      '💥',
  mine:         '💣',
  flamethrower: '🔥',
  summon:       '❓',
  shield:       '🛡️',
  repulsor:     '⚡',
};

const CAPSULE_COLORS = {
  food:         '#44dd44',
  shotgun:      '#ff8800',
  mine:         '#cc0000',
  flamethrower: '#ff4400',
  summon:       '#cc44ff',
  shield:       '#00eeff',
  repulsor:     '#4488ff',
};

class WeaponCapsule {
  constructor(container, x, y, type, respawnTime = 20000) {
    this.container   = container;
    this.x           = x;
    this.y           = y;
    this.type        = type;
    this.isActive    = true;
    this.respawnTime = respawnTime;
    this._respawnTimer = null;

    this.element = this._createElement();
    this.container.appendChild(this.element);
  }

  _createElement() {
    const el = document.createElement('div');
    el.className = 'weapon-capsule';
    el.dataset.type = this.type;
    el.style.left  = (this.x - 16) + 'px';
    el.style.top   = (this.y - 16) + 'px';
    el.style.borderColor = CAPSULE_COLORS[this.type];
    el.style.boxShadow   = `0 0 10px ${CAPSULE_COLORS[this.type]}88`;
    el.textContent = CAPSULE_ICONS[this.type];
    return el;
  }

  // Verifica si el player (rect CSS) toca la cápsula
  checkCollision(playerX, playerY, playerSize) {
    if (!this.isActive) return false;
    return (
      playerX < this.x + 16 &&
      playerX + playerSize > this.x - 16 &&
      playerY < this.y + 16 &&
      playerY + playerSize > this.y - 16
    );
  }

  collect() {
    if (!this.isActive) return;
    this.isActive = false;
    this.element.style.display = 'none';
    this._respawnTimer = setTimeout(() => this._respawn(), this.respawnTime);
  }

  _respawn() {
    this.isActive = true;
    this.element.style.display = '';
  }

  remove() {
    if (this._respawnTimer) clearTimeout(this._respawnTimer);
    this.isActive = false;
    this.element.remove();
  }
}

export { WeaponCapsule };
