import { GAME_CONFIG } from '../utils/Constants.js';

class AnimationManager {
  constructor(sprites = null) {
    this.activeIntervals = new Map();
    this._walkFrame = { right: 0, left: 0 };
    this.sprites = sprites;
  }

  setSprites(sprites) {
    this.sprites = sprites;
  }

  static setImageWithStyles(element, imagePath, customSize = null, flipHorizontal = false) {
    element.style.backgroundImage = `url('${imagePath}')`;
    element.style.backgroundSize = customSize || "100% 100%";
    element.style.backgroundRepeat = "no-repeat";
    element.style.backgroundPosition = "center";
    element.style.transform = flipHorizontal ? "scaleX(-1)" : "scaleX(1)";

    // Contra-voltear la etiqueta de nombre para que no se invierta con el sprite
    const label = element.querySelector('.player-label');
    if (label) label.style.transform = flipHorizontal ? 'scaleX(-1) translateX(50%)' : 'translateX(-50%)';
  }

  static setImageCover(element, imagePath) {
    element.style.backgroundImage = `url('${imagePath}')`;
    element.style.backgroundSize = "cover";
    element.style.transform = "scaleX(1)";
  }

  createWalkAnimation(element, direction, intervalKey) {
    this.stopAnimation(intervalKey);

    const images = direction === 'right'
      ? this.sprites.walkRight
      : this.sprites.walkLeft;

    // Avanzar al siguiente frame desde donde quedó la última llamada,
    // así un tap rápido siempre muestra un frame distinto al anterior
    this._walkFrame[direction] = (this._walkFrame[direction] + 1) % images.length;
    let currentImageIndex = this._walkFrame[direction];

    // Mostrar el frame de inmediato
    AnimationManager.setImageWithStyles(element, images[currentImageIndex], "100%", false);

    const interval = setInterval(() => {
      currentImageIndex = (currentImageIndex + 1) % images.length;
      this._walkFrame[direction] = currentImageIndex;
      AnimationManager.setImageWithStyles(element, images[currentImageIndex], "100%", false);
    }, GAME_CONFIG.timing.animationSpeed);

    this.activeIntervals.set(intervalKey, interval);
    return interval;
  }

  stopAnimation(intervalKey) {
    if (this.activeIntervals.has(intervalKey)) {
      clearInterval(this.activeIntervals.get(intervalKey));
      this.activeIntervals.delete(intervalKey);
    }
  }

  stopAllAnimations() {
    this.activeIntervals.forEach(interval => clearInterval(interval));
    this.activeIntervals.clear();
    this._walkFrame = { right: 0, left: 0 };
  }

  setIdleImage(element, direction = 'right') {
    const imagePath = direction === 'right'
      ? this.sprites.walkRight[0]
      : this.sprites.walkLeft[0];

    AnimationManager.setImageWithStyles(element, imagePath, null, false);
  }

  updateJumpDirection(element, direction) {
    this.setJumpImage(element, direction);
  }

  setJumpImage(element, direction = 'right') {
    const imagePath = this.sprites.jump;
    const flipHorizontal = direction === 'left';
    
    AnimationManager.setImageWithStyles(element, imagePath, "100%", flipHorizontal);
  }
}

export { AnimationManager };