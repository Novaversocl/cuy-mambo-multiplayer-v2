# Cuy Mambo Multiplayer

Juego de pelea 2D multijugador en tiempo real. Dos jugadores se conectan desde distintos dispositivos y se enfrentan en un mapa con plataformas, armas y zonas de peligro.

Construido con **Angular 21** como frontend y un motor de juego en **JavaScript vanilla** que corre en el navegador. El multijugador usa **Socket.io** con un servidor Node.js separado.

---

## Tecnologías

| Capa | Tecnología |
|------|------------|
| Frontend (UI) | Angular 21 standalone components |
| Motor de juego | JavaScript vanilla (ES modules) |
| Multijugador | Socket.io client |
| Estilos | SCSS con variables y mixins propios |
| Pruebas | Vitest |
| Package manager | pnpm |

---

## Requisitos

- Node.js v18 o superior
- pnpm (o npm)
- El servidor de juego corriendo en el puerto 3000

---

## Instalación

```bash
pnpm install
```

---

## Iniciar en desarrollo

### 1. Levantar el servidor (repositorio separado)

```bash
# en la carpeta del servidor
npm run dev
```

El servidor escucha en `http://localhost:3000`.

### 2. Levantar el frontend

```bash
pnpm start
```

Abre `http://localhost:4200` en el navegador.

### Acceso desde celular / red local

Para probar desde un celular conectado a la misma red WiFi:

```bash
pnpm run start:lan
```

Luego abre `http://<IP-de-tu-PC>:4200` desde el celular.

---

## Compilar para producción

```bash
pnpm run build
```

Los archivos quedan en `dist/`. El frontend se despliega en **Vercel** y el servidor en **Render**.

---

## Estructura del proyecto

```
src/
├── app/
│   ├── pages/
│   │   ├── home/          # Pantalla de inicio (insert coin)
│   │   ├── arcade-menu/   # Menú principal con leaderboard y spinner de carga
│   │   ├── lobby/         # Selección de personaje + matchmaking
│   │   ├── game/          # Componente puente Angular ↔ motor JS
│   │   ├── controls/      # Guía de controles
│   │   └── about/         # Créditos
│   ├── services/
│   │   ├── socket.service.ts       # Singleton Socket.io (persiste entre lobby y juego)
│   │   └── leaderboard.service.ts  # Consulta top 10 al servidor via @env/environment
│   └── shared/
│       ├── components/
│       │   ├── arcade-button/ # Botón reutilizable del menú
│       │   └── yt-player/     # Reproductor de YouTube embebido
│       └── pipes/
│           └── safe.pipe.ts   # Bypass del sanitizador para URLs de iframes
├── environments/
│   ├── environment.ts         # Config desarrollo (alias @env/environment)
│   └── environment.prod.ts    # Config producción
├── styles/
│   ├── _variables.scss    # Colores, fuentes y breakpoints (SCSS + CSS custom props)
│   ├── _mixins.scss       # Mixins: crt-scanlines, neon-text, media queries
│   ├── _reset.scss        # Reset base + tema oscuro global
│   └── common.scss        # Clases utilitarias (.blink-slow, @keyframes blink)
└── styles.scss            # Barrel de estilos globales

public/assets/
├── js/
│   ├── core/
│   │   └── Game.js            # Motor principal — orquesta todos los sistemas
│   ├── entities/
│   │   ├── characters/
│   │   │   ├── Player.js          # Jugador local (física, animación, armas)
│   │   │   └── RemotePlayer.js    # Rival (interpolación LERP desde red)
│   │   ├── weapons/
│   │   │   ├── Projectile.js      # Proyectiles de todos los tipos
│   │   │   ├── Mine.js            # Minas colocables
│   │   │   └── WeaponCapsule.js   # Cápsulas de armas flotantes
│   │   └── stage/
│   │       ├── MysteryDoor.js     # Puertas con resultado aleatorio
│   │       ├── FireZone.js        # Zona de fuego central
│   │       └── SummonedCharacter.js # Personaje invocado
│   ├── systems/
│   │   ├── ShootingSystem.js  # Lógica de disparo (6 tipos de arma)
│   │   ├── PickupSystem.js    # Cápsulas, puertas, minas, invocaciones
│   │   └── RoundSystem.js     # Ciclo de rondas y HP
│   ├── managers/
│   │   ├── NetworkManager.js   # Eventos Socket.io (escucha + emite)
│   │   ├── CollisionManager.js # Detección de impactos + tipo de arma para efectos
│   │   ├── InputManager.js     # Teclado, gamepad y táctil
│   │   ├── AudioManager.js     # Música y efectos de sonido (Web Audio API + mp3)
│   │   ├── UIManager.js        # HUD, banners, efectos de golpe (hit flash, fire hit)
│   │   └── AnimationManager.js # Sprites y animaciones del personaje
│   ├── utils/
│   │   ├── Constants.js        # Configuración global (física, teclas, assets)
│   │   ├── CollisionDetector.js# Detección AABB
│   │   └── ParticleExplosion.js# Efecto de partículas al impacto
│   ├── game-init.js            # Crea la instancia de Game (cargado por Angular)
│   └── game-mp-init.js         # Conecta NetworkManager + RemotePlayer al motor
└── css/
    ├── game.css               # Estilos del juego (jugadores, HUD, armas, efectos)
    └── animations.css         # @keyframes de proyectiles y efectos visuales
```

---

## Arquitectura multijugador

El juego usa un modelo **cliente–servidor autoritativo para el HP**:

```
Jugador A                  Servidor                  Jugador B
   │                          │                          │
   │── player-move ──────────>│── opponent-move ────────>│
   │── player-shoot ─────────>│── opponent-shoot ───────>│
   │                          │                          │
   │<──── hp-update ──────────│<── player-hit ───────────│
   │── opponent-hp-update ───>│                          │
```

- Cada cliente reporta los golpes que **recibe**, no los que inflige.
- El servidor valida y aplica el daño, luego notifica a ambos.
- Las posiciones del rival se interpolan con **LERP** en cada frame para movimiento suave.

---

## Controles

| Acción | Teclado | Gamepad |
|--------|---------|---------|
| Mover | ← → | Stick izq / D-pad |
| Saltar | Espacio | Botón A |
| Disparar | Enter (soltar) | Botón B/X (soltar) |
| Disparo cargado | Enter (mantener 3s / 8s) | igual |
| Sonido (Easter egg) | ↑ | — |

En móvil aparecen botones táctiles en pantalla automáticamente.

---

## Armas

| Arma | Cómo obtenerla | Descripción |
|------|---------------|-------------|
| Lanzacomida | Cápsula | Proyectil con giro, duración 10s |
| Escopeta | Cápsula | 5 perdigones en abanico, 8 disparos |
| Mina | Cápsula | Coloca hasta 2 minas en el suelo |
| Lanzallamas | Cápsula | Llama corta, 10 disparos, duración 10s |
| Repulsor | Cápsula | Rayo láser amarillo continuo de 3s, daño por zona |
| Invocación | Cápsula | Invoca un personaje que camina y ataca |
| Puerta misterio | Puertas laterales | Cura, daño, velocidad o arma aleatoria |

---

## Efectos visuales de impacto

Los efectos se muestran en **ambos jugadores** según el arma que causó el golpe:

| Arma recibida | Efecto visual | Duración |
|--------------|---------------|----------|
| Cualquiera (default, escopeta, mina…) | Estrella de 18 puntas amarilla/naranja (estilo Mega Man X) | 0.1s |
| Lanzallamas | Llama naranja/roja | 0.1s |

- El sprite del personaje golpeado destella brevemente en amarillo (o naranja para fuego).
- El efecto aparece **detrás** del personaje, visible en ambas pantallas.

---

## Personajes

| ID | Nombre |
|----|--------|
| `cuy-mambo` | Cuy Mambo |
| `mago` | Cuy Mago |

Para agregar un personaje nuevo: añadir sprites en `public/assets/img/personajes/`,
agregar la entrada en `Constants.js` y en `lobby.component.ts`.

---

## Scripts disponibles

```bash
pnpm start          # Servidor de desarrollo en localhost:4200
pnpm run start:lan  # Expuesto en red local (0.0.0.0)
pnpm run build      # Build de producción en dist/
pnpm test           # Pruebas unitarias con Vitest
```
