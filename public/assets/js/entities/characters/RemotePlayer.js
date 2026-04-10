// RemotePlayer — representa al jugador rival en el DOM.
// Su posición es actualizada por NetworkManager al recibir 'opponent-move'.

class RemotePlayer {
  constructor(element, sprites = null) {
    this.element  = element;
    this.position = { x: 0, y: 0 };  // posición renderizada actual
    this._target  = { x: 0, y: 0 };  // posición destino recibida por red
    this.direction = 'left';
    this.isActive  = true;
    this._initialized = false;        // false hasta recibir la primera posición

    this.element.classList.remove('hidden');
    this.element.classList.add('remote-player-active');

    if (sprites?.idle) {
      this.element.style.backgroundImage = `url('${sprites.idle}')`;
      this.element.style.backgroundSize  = 'cover';
    }
  }

  // Recibe el estado del servidor — guarda destino, aplica sprite inmediatamente
  applyState({ x, y, sprite, spriteSize, spriteTransform }) {
    this._target.x = x;
    this._target.y = y;

    // Primera actualización: snap directo para evitar que "vuele" desde (0,0)
    if (!this._initialized) {
      this.position.x = x;
      this.position.y = y;
      this._initialized = true;
    }

    if (sprite)          this.element.style.backgroundImage = sprite;
    if (spriteSize)      this.element.style.backgroundSize  = spriteSize;
    if (spriteTransform) this.element.style.transform       = spriteTransform;
  }

  // Llamado cada frame desde el game loop — interpola hacia el destino
  tick() {
    const LERP_X = 0.2;   // horizontal — suave
    const LERP_Y = 0.45;  // vertical — más rápido para saltos/caídas

    this.position.x += (this._target.x - this.position.x) * LERP_X;
    this.position.y += (this._target.y - this.position.y) * LERP_Y;

    this.element.style.left = `${this.position.x}px`;
    this.element.style.top  = `${this.position.y}px`;
  }

  // Efecto de parpadeo cuando el rival recibe un golpe
  hit() {
    this.element.classList.add('invincible');
    clearTimeout(this._hitTimer);
    this._hitTimer = setTimeout(() => {
      this.element.classList.remove('invincible');
    }, 2500);
  }

  applyKnockback(sourceX) {
    const strength = 12; 
    const direction = (this.position.x > sourceX) ? 1 : -1;
    
    // Empuja la posición actual inmediatamente
    this.position.x += direction * strength;
    this.position.y -= 5;
  }

  // Para colisiones (CollisionManager.checkLocalProjectileVsRemotePlayer)
  getRect() {
    return this.element.getBoundingClientRect();
  }

  remove() {
    this.isActive = false;
    this.element.classList.add('hidden');
    this.element.classList.remove('remote-player-active');
  }
}

export { RemotePlayer };
