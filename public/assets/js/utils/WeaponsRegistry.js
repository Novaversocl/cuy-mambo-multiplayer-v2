/**
 * ── PARA AGREGAR UN ARMA NUEVA ────────────────────────────────────────────────
 *
 * 1. Agrega un bloque aquí con: id, icon, cooldown, damage.
 * 2. Implementa _fireNuevaArma() en ShootingSystem.js.
 * 3. Agrega emit/receive en NetworkManager.js.
 * 4. Listo — icon y sonido se leen desde aquí automáticamente.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const WEAPONS_REGISTRY = [
  {
    id:       'food',
    icon:     '🍖',
    cooldown: 160,
    damage:   20,
  },
  {
    id:       'shotgun',
    icon:     '💥',
    cooldown: 500,
    damage:   20,
  },
  {
    id:       'mine',
    icon:     '💣',
    cooldown: 0,
    damage:   20,
  },
  {
    id:       'flamethrower',
    icon:     '🔥',
    cooldown: 280,
    damage:   20,
  },
  {
    id:       'repulsor',
    icon:     '⚡',
    cooldown: 0,
    damage:   20,
  },
];

// Mapas derivados para acceso rápido por id
export const WEAPON_ICONS     = Object.fromEntries(WEAPONS_REGISTRY.map(w => [w.id, w.icon]));
export const WEAPON_COOLDOWNS = Object.fromEntries(WEAPONS_REGISTRY.map(w => [w.id, w.cooldown]));
export const WEAPON_DAMAGE    = Object.fromEntries(WEAPONS_REGISTRY.map(w => [w.id, w.damage]));
