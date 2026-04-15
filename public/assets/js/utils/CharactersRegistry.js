/**
 * ── PARA AGREGAR UN PERSONAJE NUEVO ──────────────────────────────────────────
 *
 * 1. Agrega los sprites en:     public/assets/img/personajes/<id>/
 * 2. Agrega el GIF de baile en: public/assets/img/bailes/<id>/
 * 3. Agrega la música en:       public/assets/Musica/
 * 4. Agrega un bloque nuevo aquí abajo con todos los datos.
 * 5. Listo — no hay que tocar ningún otro archivo del motor.
 *
 * NOTA: el equivalente Angular está en src/app/shared/config/characters.config.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const CHARACTERS_REGISTRY = [
  {
    id:      'cuy-mambo',
    danceGif:'assets/img/bailes/cuy-mambo/baile_cuy-mambo_1.gif',
    winMusic:'assets/Musica/win-cuy-mambo.mp3',
  },
  {
    id:      'mago',
    danceGif:'assets/img/bailes/mago/baile_mago_1.gif',
    winMusic:'assets/Musica/win-mago.mp3',
  },
  {
    id:      'cuy-mambolina',
    danceGif:'assets/img/bailes/cuy-mambolina/baile_cuy-mambolina_01.gif',
    winMusic:'assets/Musica/mambo_mambo.mp3',
  },
];

// Mapas derivados para acceso rápido por id
export const DANCE_GIFS  = Object.fromEntries(CHARACTERS_REGISTRY.map(c => [c.id, c.danceGif]));
export const WIN_MUSIC   = Object.fromEntries(CHARACTERS_REGISTRY.map(c => [c.id, c.winMusic]));
