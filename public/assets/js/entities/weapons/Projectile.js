// chargeLevel: 0 = normal, 1 = cargado (cian), 2 = súper (rojo)
// isRapidFire: true = disparo en abanico rojo (powerup 🔥)
// vy: velocidad vertical (para disparos diagonales del abanico)
// weaponType: 'default' | 'food' | 'pellet' | 'flame'
class Projectile {
  constructor(container, playerRect, direction, chargeLevel = 0, isRapidFire = false, vy = 0, weaponType = 'default') {
    this.container   = container;
    this.direction   = direction;
    this.chargeLevel = chargeLevel;
    this.isRapidFire = isRapidFire && chargeLevel === 0;
    this.piercing    = chargeLevel >= 1;
    this.isActive    = true;
    this.containerWidth  = container.offsetWidth;
    this.containerHeight = container.offsetHeight;
    this.vy         = vy;
    this.weaponType = weaponType;
    this.traveled   = 0;
    this.maxRange   = weaponType === 'pellet' ? 230
                    : weaponType === 'flame'  ? 320
                    : Infinity;

    this.element = this._createElement(playerRect);
    this.container.appendChild(this.element);
    this.x = parseFloat(this.element.style.left);
    this.y = parseFloat(this.element.style.top);
  }

  _createElement(playerRect) {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.zIndex   = '6';
    el.style.borderRadius = '50px';

    let w, h, bg, shadow, anim;

    if (this.chargeLevel === 2) {
      // ── SÚPER disparo rojo-naranja ──────────────────────────
      w = 58; h = 20;
      bg     = 'linear-gradient(to right, #ffffff 0%, #ff8800 25%, #ff2200 70%, #880000 100%)';
      shadow = '0 0 14px #ff4400, 0 0 28px #ff2200bb, 0 0 55px #ff000066';
      anim   = 'projPulseFast 0.1s ease-in-out infinite';
      this.speed = 14;
    } else if (this.chargeLevel === 1) {
      // ── Disparo cargado cian ────────────────────────────────
      w = 42; h = 15;
      bg     = 'linear-gradient(to right, #ffffff 0%, #88ffff 20%, #00eeff 60%, #0066ff 100%)';
      shadow = '0 0 12px #00eeff, 0 0 26px #00aaff99, 0 0 44px #0088ff44';
      anim   = 'projPulse 0.18s ease-in-out infinite';
      this.speed = 12;
    } else if (this.isRapidFire) {
      // ── Disparo rapidfire rojo (powerup 🔥) ─────────────────
      w = 30; h = 10;
      bg     = 'linear-gradient(to right, #ffffff 0%, #ff8888 20%, #ff2200 60%, #aa0000 100%)';
      shadow = '0 0 8px #ff2200, 0 0 18px #ff000099, 0 0 30px #ff000044';
      anim   = 'projPulseFast 0.14s ease-in-out infinite';
      this.speed = 17;
    } else if (this.weaponType === 'food') {
      // ── Lanzador de comida — emoji giratorio ─────────────────
      const foods = ['🍖', '🌮', '🍕', '🥩', '🍗', '🌯', '🥪'];
      this._foodEmoji = foods[Math.floor(Math.random() * foods.length)];
      w = 28; h = 28;
      bg     = 'transparent';
      shadow = 'none';
      anim   = 'foodSpin 0.35s linear infinite';
      this.speed = 13;
      el.style.borderRadius = '0';
      el.style.fontSize     = '22px';
      el.style.lineHeight   = '28px';
      el.style.textAlign    = 'center';
      el.style.userSelect   = 'none';
      el.textContent        = this._foodEmoji;
    } else if (this.weaponType === 'pellet') {
      // ── Escopeta — perdigón naranja corto alcance ───────────
      w = 9; h = 9;
      bg     = 'radial-gradient(circle, #ffffff 0%, #ff8800 50%, #cc4400 100%)';
      shadow = '0 0 6px #ff8800, 0 0 14px #ff440066';
      anim   = 'projPulseFast 0.1s ease-in-out infinite';
      this.speed = 14;
    } else if (this.weaponType === 'flame') {
      // ── Lanzallamas — bola de fuego amplia y lenta ──────────
      w = 52; h = 34;
      bg     = 'radial-gradient(ellipse at 30% 50%, #ffffff 0%, #ffee44 18%, #ff6600 50%, #cc2200 80%, #660000 100%)';
      shadow = '0 0 14px #ff6600, 0 0 30px #ff330088, 0 0 50px #ff110044';
      anim   = 'flamePulse 0.15s ease-in-out infinite alternate';
      this.speed = 5;
      el.style.borderRadius = '60% 40% 55% 45% / 45% 55% 40% 60%';
    } else {
      // ── Disparo normal amarillo ─────────────────────────────
      w = 26; h = 9;
      bg     = 'linear-gradient(to right, #ffffff 0%, #ffee88 30%, #ffe066 65%, #ff9900 100%)';
      shadow = '0 0 8px #ffe066, 0 0 18px #ffaa0088, 0 0 32px #ff880044';
      anim   = 'projPulse 0.22s ease-in-out infinite';
      this.speed = 15;
    }

    el.style.width      = w + 'px';
    el.style.height     = h + 'px';
    el.style.background = bg;
    el.style.boxShadow  = shadow;
    el.style.animation  = anim;
    this._w = w;
    this._h = h;

    const y = playerRect.top  + playerRect.height / 2 - h / 2 + 5;
    const x = this.direction === 'right'
      ? playerRect.right
      : playerRect.left - w;

    el.style.top  = y + 'px';
    el.style.left = x + 'px';
    return el;
  }

  update() {
    if (!this.isActive) return;
    this.x += this.direction === 'right' ? this.speed : -this.speed;
    this.y += this.vy;
    this.traveled += this.speed;
    this.element.style.left = this.x + 'px';
    if (this.vy !== 0) this.element.style.top = this.y + 'px';
    if (this.x > this.containerWidth || this.x + this._w < 0) this.remove();
    if (this.y > this.containerHeight || this.y + this._h < 0) this.remove();
    if (this.traveled >= this.maxRange) this.remove();
  }

  getRect() { return this.element.getBoundingClientRect(); }

  remove() {
    this.isActive = false;
    if (this.element.parentNode) this.element.parentNode.removeChild(this.element);
  }
}

export { Projectile };
