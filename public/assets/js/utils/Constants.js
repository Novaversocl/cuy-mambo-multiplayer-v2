/**
 * Constants.js — configuración global del motor de juego.
 *
 * GAME_CONFIG contiene todos los valores numéricos y rutas de assets
 * que usa el motor. Modificar aquí afecta a todo el juego:
 *
 *   physics:    gravedad, fuerza de salto, velocidad máxima, aceleración
 *   dimensions: tamaño del personaje (75px) y altura del suelo
 *   images:     rutas de sprites por defecto (se sobreescriben con el personaje seleccionado)
 *   sounds:     rutas de archivos de audio
 *   keys:       keyCodes del teclado (←37, ↑38, →39, espacio32, enter13)
 *   timing:     velocidades de animación y delays varios
 *
 * CHARACTERS: lista de personajes disponibles para seleccionar en el lobby.
 *   Cada personaje tiene sprites de caminar (izq/der), salto e imagen de preview.
 *   Si se agrega un personaje nuevo, también debe agregarse en lobby.component.ts.
 */

const CHARACTERS = [
  {
    id: 'cuy-mambo',
    name: 'Cuy Mambo',
    preview: 'assets/img/personajes/cuy-mambo/quieto.png',
    sprites: {
      walkRight: ['assets/img/personajes/cuy-mambo/camina-derecha-1.png', 'assets/img/personajes/cuy-mambo/camina-derecha-2.png'],
      walkLeft:  ['assets/img/personajes/cuy-mambo/camina-izquierda-1.png', 'assets/img/personajes/cuy-mambo/camina-izquierda-2.png'],
      jump:      'assets/img/personajes/cuy-mambo/salto.png'
    }
  },
  {
    id: 'mago',
    name: 'Cuy Mago',
    preview: 'assets/img/personajes/mago/camina-derecha-1.png',
    sprites: {
      walkRight: ['assets/img/personajes/mago/camina-derecha-1.png', 'assets/img/personajes/mago/camina-derecha-2.png'],
      walkLeft:  ['assets/img/personajes/mago/camina-izquierda-1.png', 'assets/img/personajes/mago/camina-izquierda-2.png'],
      jump:      'assets/img/personajes/mago/salto.png'
    }
  }
];

const GAME_CONFIG = {
  physics: {
    gravity: 0.5,
    jumpForce: 10,
    maxSpeedX: 6,
    accelerationX: 0.8
  },

  dimensions: {
    cubeSize: 75,
    floorHeight: 10
  },

  images: {
    player: {
      walkRight: ['assets/img/personajes/cuy-mambo/camina-derecha-1.png', 'assets/img/personajes/cuy-mambo/camina-derecha-2.png'],
      walkLeft: ['assets/img/personajes/cuy-mambo/camina-izquierda-1.png', 'assets/img/personajes/cuy-mambo/camina-izquierda-2.png'],
      jump: 'assets/img/personajes/cuy-mambo/salto.png'
    },
  },

  sounds: {
    background: 'assets/Musica/battle-theme-1.mp3',
    jump:       'assets/Musica/jump.mp3',
  },

  keys: {
    LEFT: 37,

    RIGHT: 39,
    SPACE: 32,
    ENTER: 13
  },

  timing: {
    animationSpeed: 100,
    npcSpeed: 850,
    backgroundMusicDelay: 2000,
    gameTime: 100
  },

  colors: {
    transparent: 'transparent'
  }
};

const HI_SCORE_KEY = 'catRetro2D_hiScore';

export { CHARACTERS, GAME_CONFIG, HI_SCORE_KEY };
