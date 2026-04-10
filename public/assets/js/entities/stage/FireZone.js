// FireZone — zona de fuego CSS con ciclo: aviso → peligro → desaparece

const DAMAGE_PER_SECOND = 8;
const ZONE_WIDTH        = 120;
const ZONE_HEIGHT_MAX   = 48;  // altura cuando está peligrosa
const WARN_DURATION     = 3000; // ms creciendo (sin daño)
const DANGER_DURATION   = 3500; // ms peligrosa (con daño)
const SHRINK_DURATION   = 600;  // ms achicándose

const ACTIVE_DURATION   = WARN_DURATION + DANGER_DURATION + SHRINK_DURATION;
const INACTIVE_DURATION = 3000;

class FireZone {
  constructor(container, x, y) {
    this.container = container;
    this.x         = x;
    this.y         = y;
    this.active    = false;
    this.dangerous = false;
    this._timer    = null;
    this._lastDmg  = 0;

    this.element = document.createElement('div');
    this.element.className = 'fire-zone';
    this.element.style.cssText = `
      position: absolute;
      left: ${x}px;
      bottom: 30px;
      width: ${ZONE_WIDTH}px;
      height: 0px;
      pointer-events: none;
      z-index: 2;
      display: none;
      transition: height ${WARN_DURATION}ms ease-out;
    `;

    // Llamas CSS — 3 columnas de fuego
    for (let i = 0; i < 5; i++) {
      const flame = document.createElement('div');
      flame.className = 'fire-flame';
      flame.style.cssText = `
        position: absolute;
        bottom: 0;
        left: ${i * 22 + 4}px;
        width: 18px;
        animation-delay: ${i * 0.12}s;
      `;
      this.element.appendChild(flame);
    }

    container.appendChild(this.element);
  }

  activate() {
    if (this.active) return;
    this.active    = true;
    this.dangerous = false;

    // Mostrar y crecer
    this.element.style.display = 'block';
    this.element.classList.remove('fire-danger', 'fire-shrink');
    this.element.classList.add('fire-warning');

    // Forzar reflow para que la transición funcione
    void this.element.offsetHeight;
    this.element.style.height = ZONE_HEIGHT_MAX + 'px';

    // Fase peligrosa
    this._timer = setTimeout(() => {
      this.dangerous = true;
      this.element.classList.remove('fire-warning');
      this.element.classList.add('fire-danger');

      // Fase achicarse
      this._timer = setTimeout(() => {
        this.dangerous = false;
        this.element.classList.remove('fire-danger');
        this.element.classList.add('fire-shrink');
        this.element.style.transition = `height ${SHRINK_DURATION}ms ease-in`;
        this.element.style.height = '0px';

        this._timer = setTimeout(() => this.deactivate(), SHRINK_DURATION);
      }, DANGER_DURATION);
    }, WARN_DURATION);
  }

  deactivate() {
    this.active    = false;
    this.dangerous = false;
    this.element.style.display = 'none';
    this.element.style.height  = '0px';
    this.element.style.transition = `height ${WARN_DURATION}ms ease-out`;
    this.element.classList.remove('fire-warning', 'fire-danger', 'fire-shrink');
    clearTimeout(this._timer);
  }

  isPlayerOver(px, py, pSize) {
    if (!this.active) return false;
    const zoneTop = this.container.offsetHeight - 20 - ZONE_HEIGHT_MAX;
    return (
      px         < this.x + ZONE_WIDTH &&
      px + pSize > this.x              &&
      py + pSize > zoneTop             &&
      py         < zoneTop + ZONE_HEIGHT_MAX
    );
  }

  checkPlayer(px, py, pSize) {
    if (!this.active || !this.dangerous) return 0;

    const zoneTop = this.container.offsetHeight - 20 - ZONE_HEIGHT_MAX;

    const overlap =
      px         < this.x + ZONE_WIDTH &&
      px + pSize > this.x              &&
      py + pSize > zoneTop             &&
      py         < zoneTop + ZONE_HEIGHT_MAX;

    if (!overlap) return 0;

    const now = Date.now();
    if (now - this._lastDmg < 1000) return 0;
    this._lastDmg = now;
    return DAMAGE_PER_SECOND;
  }

  remove() {
    clearTimeout(this._timer);
    this.element.remove();
  }
}

export { FireZone, ACTIVE_DURATION, INACTIVE_DURATION };
