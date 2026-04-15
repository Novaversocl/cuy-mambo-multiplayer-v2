import { ICharacter } from '../interfaces/character/ICharacter';

/**
 * ── PARA AGREGAR UN PERSONAJE NUEVO ──────────────────────────────────────────
 *
 * 1. Agrega los sprites en:  public/assets/img/personajes/<id>/
 * 2. Agrega el GIF de baile en: public/assets/img/bailes/<id>/
 * 3. Agrega la música en:    public/assets/Musica/
 * 4. Agrega un bloque nuevo en CHARACTERS_CONFIG abajo con todos los datos.
 * 5. Listo — no hay que tocar ningún otro archivo.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface ICharacterConfig extends ICharacter {
  gif:       string;   // GIF animado que se muestra en lobby y baile de victoria
  music:     string;   // Música que suena al seleccionar el personaje en lobby
  winMusic:  string;   // Música que suena al ganar (puede ser igual a music)
}

export const CHARACTERS_CONFIG: ICharacterConfig[] = [
  {
    id:      'cuy-mambo',
    name:    'Cuy Mambo',
    preview: 'assets/img/personajes/cuy-mambo/quieto.png',
    gif:     'assets/img/bailes/cuy-mambo/baile_cuy-mambo_1.gif',
    music:   'assets/Musica/win-cuy-mambo.mp3',
    winMusic:'assets/Musica/win-cuy-mambo.mp3',
    sprites: {
      walkRight: ['assets/img/personajes/cuy-mambo/camina-derecha-1.png', 'assets/img/personajes/cuy-mambo/camina-derecha-2.png'],
      walkLeft:  ['assets/img/personajes/cuy-mambo/camina-izquierda-1.png', 'assets/img/personajes/cuy-mambo/camina-izquierda-2.png'],
      jump:      'assets/img/personajes/cuy-mambo/salto.png',
    },
  },
  {
    id:      'mago',
    name:    'Cuy Mago',
    preview: 'assets/img/personajes/mago/camina-derecha-1.png',
    gif:     'assets/img/bailes/mago/baile_mago_1.gif',
    music:   'assets/Musica/win-mago.mp3',
    winMusic:'assets/Musica/win-mago.mp3',
    sprites: {
      walkRight: ['assets/img/personajes/mago/camina-derecha-1.png', 'assets/img/personajes/mago/camina-derecha-2.png'],
      walkLeft:  ['assets/img/personajes/mago/camina-izquierda-1.png', 'assets/img/personajes/mago/camina-izquierda-2.png'],
      jump:      'assets/img/personajes/mago/salto.png',
    },
  },
  {
    id:      'cuy-mambolina',
    name:    'Cuy Mambolina',
    preview: 'assets/img/personajes/cuy-mambolina/camina-derecha-1.png',
    gif:     'assets/img/bailes/cuy-mambolina/baile_cuy-mambolina_01.gif',
    music:   'assets/Musica/mambo_mambo.mp3',
    winMusic:'assets/Musica/mambo_mambo.mp3',
    sprites: {
      walkRight: ['assets/img/personajes/cuy-mambolina/camina-derecha-1.png', 'assets/img/personajes/cuy-mambolina/camina-derecha-2.png'],
      walkLeft:  ['assets/img/personajes/cuy-mambolina/camina-izquierda-1.png', 'assets/img/personajes/cuy-mambolina/camina-izquierda-2.png'],
      jump:      'assets/img/personajes/cuy-mambolina/salto.png',
    },
  },
];
