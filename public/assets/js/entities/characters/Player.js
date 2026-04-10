/**
 * Player.js — jugador local controlado por el usuario.
 *
 * Maneja física, animaciones y estado de armas/powerups del jugador local.
 * Solo representa al jugador de ESTA pantalla — el rival está en RemotePlayer.js.
 *
 * Física (update() llamado cada frame):
 *   - Movimiento horizontal con aceleración y fricción
 *   - Gravedad + detección de aterrizaje en suelo y plataformas
 *   - Permite salir del borde de pantalla para caer al vacío (muerte)
 *   - Doble salto opcional (powerup)
 *
 * Armas disponibles (equipWeapon):
 *   'food'        → lanzacomida, duración 10s
 *   'shotgun'     → 8 disparos
 *   'mine'        → 2 minas colocables
 *   'flamethrower'→ 10 llamas, duración 10s
 *
 * Powerups (applyPowerup):
 *   'rapidfire'  → cooldown de disparo reducido, 5s
 *   'speed'      → velocidad x1.5, 4s
 *   'doublejump' → permite un salto extra en el aire, 5s
 *
 * Las posiciones se manejan en coordenadas CSS (px desde esquina superior izquierda
 * del game-container), NO en coordenadas de la pantalla del navegador.
 */

import { GAME_CONFIG } from '../../utils/Constants.js';
import { AudioManager } from '../../managers/AudioManager.js';
import { AnimationManager } from '../../managers/AnimationManager.js';

class Player {
  constructor(element, gameContainer, floor, sprites = null) {
    this.element = element;
    this.gameContainer = gameContainer;
    this.floor = floor;
    this.audioManager = AudioManager.getInstance();
    this.animationManager = new AnimationManager(sprites);

    this.initializeProperties();
    this.setInitialAppearance();
  }

  initializeProperties() {
    this.gameWidth = this.gameContainer.offsetWidth;
    this.cubeSize = GAME_CONFIG.dimensions.cubeSize;

    this.position = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };

    this.maxSpeedX = GAME_CONFIG.physics.maxSpeedX;
    this.accelerationX = GAME_CONFIG.physics.accelerationX;
    this.friction = 0.85;

    this.isOnGround = true;
    this.gravity = GAME_CONFIG.physics.gravity;
    this.jumpForce = GAME_CONFIG.physics.jumpForce;

    this.currentDirection = 'right';
    this.isMovingLeft = false;
    this.isMovingRight = false;
    this.shouldChangeColor = false;

    // Powerup states
    this.rapidFireActive = false;
    this.speedBoosted = false;
    this.canDoubleJump = false;
    this.doubleJumpUsed = false;
    this._powerupTimers = [];

    // Weapon state
    this.activeWeapon  = null;  // null | 'machinegun' | 'shotgun' | 'mine'
    this.weaponAmmo    = 0;
    this.minesPlaced   = 0;
    this.maxMines      = 2;
    this._weaponTimer  = null;

    // Shield state
    this.isShielded     = false;
    this._shieldOrb     = null;
    this._shieldTimer   = null;
    this._shieldExpTimer = null;
  }

  setInitialPosition() {
    this.position.x = (this.gameWidth - this.cubeSize) / 2;
    this.position.y = this.floor.offsetTop - this.cubeSize;
    this.updateDOMPosition();
  }

  setInitialAppearance() {
    this.element.style.backgroundColor = GAME_CONFIG.colors.transparent;
    AnimationManager.setImageCover(this.element, this.animationManager.sprites.walkRight[0]);
  }

  startMoving(direction) {
    this.currentDirection = direction;
    
    if (direction === 'left') {
      this.isMovingLeft = true;
      if (this.isOnGround && !this.animationManager.activeIntervals.has('walkLeft')) {
        this.animationManager.stopAnimation('walkRight');
        this.animationManager.createWalkAnimation(this.element, 'left', 'walkLeft');
      } else if (!this.isOnGround) {
        this.animationManager.updateJumpDirection(this.element, 'left');
      }
    } else if (direction === 'right') {
      this.isMovingRight = true;
      if (this.isOnGround && !this.animationManager.activeIntervals.has('walkRight')) {
        this.animationManager.stopAnimation('walkLeft');
        this.animationManager.createWalkAnimation(this.element, 'right', 'walkRight');
      } else if (!this.isOnGround) {
        this.animationManager.updateJumpDirection(this.element, 'right');
      }
    }
  }

  stopMoving(direction) {
    if (direction === 'left') {
      this.isMovingLeft = false;
      this.animationManager.stopAnimation('walkLeft');
    } else if (direction === 'right') {
      this.isMovingRight = false;
      this.animationManager.stopAnimation('walkRight');
    }

    if (!this.isMovingLeft && !this.isMovingRight && this.isOnGround) {
      this.animationManager.setIdleImage(this.element, this.currentDirection);
    }
  }

  jump() {
    if (this.isOnGround) {
      this.doubleJumpUsed = false;
      this.animationManager.stopAnimation('walkLeft');
      this.animationManager.stopAnimation('walkRight');
      this.animationManager.setJumpImage(this.element, this.currentDirection);
      this.element.style.backgroundColor = GAME_CONFIG.colors.transparent;
      this.shouldChangeColor = true;
      this.velocity.y = -this.jumpForce;
      this.isOnGround = false;
      this.audioManager.playSound('jump');
    } else if (this.canDoubleJump && !this.doubleJumpUsed) {
      this.doubleJumpUsed = true;
      this.velocity.y = -this.jumpForce;
      this.animationManager.setJumpImage(this.element, this.currentDirection);
      this.audioManager.playSound('jump');
    }
  }

  applyKnockback(sourceX) {
    const strength = 12; 
    const direction = (this.position.x + (this.cubeSize / 2) > sourceX) ? 1 : -1;
    
    this.velocity.x = direction * strength;
    
    if (this.isOnGround) {
      this.velocity.y = -5;
      this.isOnGround = false;
    }
  }

  equipWeapon(type) {
    if (this._weaponTimer) clearTimeout(this._weaponTimer);
    this.activeWeapon = type;
    if (type === 'food') {
      this.weaponAmmo   = Infinity;
      this._weaponTimer = setTimeout(() => this._clearWeapon(), 10000);
    } else if (type === 'shotgun') {
      this.weaponAmmo = 8;
    } else if (type === 'mine') {
      this.weaponAmmo  = 2;
      this.minesPlaced = 0;
    } else if (type === 'flamethrower') {
      this.weaponAmmo   = 10;
      this._weaponTimer = setTimeout(() => this._clearWeapon(), 10000);
    }
  }

  _clearWeapon() {
    this.activeWeapon = null;
    this.weaponAmmo   = 0;
    this.minesPlaced  = 0;
  }

  activateShield() {
    if (this._shieldTimer) clearTimeout(this._shieldTimer);
    if (this._shieldExpTimer) clearTimeout(this._shieldExpTimer);

    this.isShielded = true;

    if (!this._shieldOrb) {
      this._shieldOrb = document.createElement('div');
      this._shieldOrb.className = 'shield-orb';
      this.element.appendChild(this._shieldOrb);
    }
    this._shieldOrb.classList.remove('expiring');

    // Avisar que está por expirar en los últimos 2s
    this._shieldExpTimer = setTimeout(() => {
      if (this._shieldOrb) this._shieldOrb.classList.add('expiring');
    }, 8000);

    this._shieldTimer = setTimeout(() => this.deactivateShield(), 10000);
  }

  deactivateShield() {
    this.isShielded = false;
    if (this._shieldOrb) {
      this._shieldOrb.remove();
      this._shieldOrb = null;
    }
    if (this._shieldTimer)   clearTimeout(this._shieldTimer);
    if (this._shieldExpTimer) clearTimeout(this._shieldExpTimer);
  }

  applyPowerup(type) {
    this._clearPowerupTimer(type);

    if (type === 'rapidfire') {
      this.rapidFireActive = true;
      const t = setTimeout(() => { this.rapidFireActive = false; }, 5000);
      this._powerupTimers.push({ type, timer: t });
    } else if (type === 'speed') {
      this.speedBoosted = true;
      const t = setTimeout(() => { this.speedBoosted = false; }, 4000);
      this._powerupTimers.push({ type, timer: t });
    } else if (type === 'doublejump') {
      this.canDoubleJump = true;
      this.doubleJumpUsed = false;
      const t = setTimeout(() => { this.canDoubleJump = false; }, 5000);
      this._powerupTimers.push({ type, timer: t });
    }
  }

  _clearPowerupTimer(type) {
    this._powerupTimers = this._powerupTimers.filter(entry => {
      if (entry.type === type) {
        clearTimeout(entry.timer);
        return false;
      }
      return true;
    });
  }

  update() {
    const currentMaxSpeed = this.speedBoosted ? this.maxSpeedX * 1.5 : this.maxSpeedX;

    if (this.isMovingLeft) {
      this.velocity.x -= this.accelerationX;
      this.velocity.x = Math.max(this.velocity.x, -currentMaxSpeed);
    } else if (this.isMovingRight) {
      this.velocity.x += this.accelerationX;
      this.velocity.x = Math.min(this.velocity.x, currentMaxSpeed);
    } else {
      this.velocity.x *= this.friction;
      if (Math.abs(this.velocity.x) < 0.1) {
        this.velocity.x = 0;
      }
    }

    this.position.x += this.velocity.x;
    // Permitimos salir de pantalla un poco al caer
    this.position.x = Math.max(-150, Math.min(this.position.x, this.gameWidth + 75));

    // Verificar cada frame si el jugador sigue con soporte debajo
    if (this.isOnGround) {
      const groundLevel = this.floor.offsetTop - this.cubeSize;
      const pMidX = this.position.x + (this.cubeSize / 2);
      
      // Comprobar si está sobre el tramo de suelo central
      const onMainFloor = (pMidX >= 100 && pMidX <= 700);
      let supported = (this.position.y >= groundLevel - 2) && onMainFloor;

      if (!supported) {
        const platforms = document.querySelectorAll('.platform');
        for (const platform of platforms) {
          const px = platform.offsetLeft;
          const py = platform.offsetTop;
          const pw = platform.offsetWidth;
          const playerBottom = this.position.y + this.cubeSize;
          const playerLeft   = this.position.x;
          const playerRight  = this.position.x + this.cubeSize;

          if (Math.abs(playerBottom - py) <= 3 &&
              playerRight > px + 4 && playerLeft < px + pw - 4) {
            supported = true;
            break;
          }
        }
      }

      if (!supported) {
        this.isOnGround = false;
      }
    }

    if (!this.isOnGround) {
      this.velocity.y += this.gravity;
      this.position.y += this.velocity.y;

      const groundLevel = this.floor.offsetTop - this.cubeSize;

      // Colisión con plataformas (solo al caer)
      if (this.velocity.y > 0) {
        const platforms = document.querySelectorAll('.platform');
        for (const platform of platforms) {
          const px = platform.offsetLeft;
          const py = platform.offsetTop;
          const pw = platform.offsetWidth;
          const playerBottom = this.position.y + this.cubeSize;
          const playerLeft   = this.position.x;
          const playerRight  = this.position.x + this.cubeSize;

          if (playerBottom >= py && playerBottom <= py + 20 &&
              playerRight > px + 4 && playerLeft < px + pw - 4) {
            this.position.y = py - this.cubeSize;
            this.velocity.y = 0;
            this.isOnGround = true;
            this.handleLandingAnimation();
            break;
          }
        }
      }

      if (!this.isOnGround && this.position.y >= groundLevel) {
        // Solo aterrizar si hay suelo real debajo (entre 100px y 700px)
        const pMidX = this.position.x + (this.cubeSize / 2);
        if (pMidX >= 100 && pMidX <= 700) {
          this.position.y = groundLevel;
          this.velocity.y = 0;
          this.isOnGround = true;

          if (this.shouldChangeColor) {
            this.showAlert().then(() => {
              this.element.style.backgroundColor = GAME_CONFIG.colors.transparent;
              this.shouldChangeColor = false;
              this.handleLandingAnimation();
            });
          } else {
            this.handleLandingAnimation();
          }
        }
      }
    }

    this.updateDOMPosition();
  }

  updateDOMPosition() {
    this.element.style.left = this.position.x + 'px';
    this.element.style.top = this.position.y + 'px';
  }

  handleLandingAnimation() {
    if (this.isMovingLeft) {
      this.animationManager.stopAnimation('walkRight');
      this.animationManager.createWalkAnimation(this.element, 'left', 'walkLeft');
    } else if (this.isMovingRight) {
      this.animationManager.stopAnimation('walkLeft');
      this.animationManager.createWalkAnimation(this.element, 'right', 'walkRight');
    } else {
      this.animationManager.setIdleImage(this.element, this.currentDirection);
    }
  }

  showAlert() {
    return new Promise(resolve => {
      resolve();
    });
  }

  getRect() {
    return this.element.getBoundingClientRect();
  }

  getCSSRect() {
    return {
      left:   this.position.x,
      top:    this.position.y,
      right:  this.position.x + this.cubeSize,
      bottom: this.position.y + this.cubeSize,
      width:  this.cubeSize,
      height: this.cubeSize
    };
  }

  reset() {
    this._powerupTimers.forEach(entry => clearTimeout(entry.timer));
    this._powerupTimers = [];
    this.deactivateShield();
    this.animationManager.stopAllAnimations();
    this.initializeProperties();
    this.setInitialPosition();
    this.setInitialAppearance();
  }

  destroy() {
    this.animationManager.stopAllAnimations();
  }
}

export { Player };