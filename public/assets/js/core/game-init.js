/**
 * game-init.js — punto de entrada del motor de juego.
 *
 * Es inyectado dinámicamente por GameComponent (Angular) como <script type="module">.
 * Se ejecuta inmediatamente al cargarse (no espera DOMContentLoaded).
 *
 * Responsabilidades:
 *   1. Escalar el monitor en dispositivos móviles (scaleMobileMonitor).
 *   2. Crear la instancia de Game y exponerla en window.__cuyMamboInstance
 *      para que game-mp-init.js y Angular puedan acceder a ella.
 *
 * Después de este script se carga game-mp-init.js, que toma __cuyMamboInstance
 * y le agrega el NetworkManager (socket, RemotePlayer, etc.).
 */

import { Game } from './Game.js';

function scaleMobileMonitor() {
  if (!window.matchMedia('(pointer: coarse)').matches) return;
  const bezel = document.getElementById('monitor-bezel');
  if (!bezel) return;

  bezel.style.transform = 'none';
  bezel.style.marginBottom = '0';
  const naturalW = bezel.offsetWidth;
  const naturalH = bezel.offsetHeight;

  const touchControlsH = 170; // controles táctiles + botón START
  const paddingTop = 28;
  const availableH = window.innerHeight - touchControlsH - paddingTop;

  const scaleW = document.documentElement.clientWidth / naturalW;
  const scaleH = availableH / naturalH;
  const scale = Math.min(scaleW, scaleH);

  bezel.style.transform = `scale(${scale})`;
  bezel.style.marginBottom = `${-naturalH * (1 - scale)}px`;
}

scaleMobileMonitor();
if (window.__scaleMobileMonitor) {
  window.removeEventListener('resize', window.__scaleMobileMonitor);
}
window.__scaleMobileMonitor = scaleMobileMonitor;
window.addEventListener('resize', scaleMobileMonitor);

try {
  window.__cuyMamboInstance = new Game();
} catch (error) {
  console.error('Error initializing game:', error);
}
