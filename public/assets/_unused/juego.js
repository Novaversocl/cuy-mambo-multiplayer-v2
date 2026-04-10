import { Game } from './core/Game.js';

let gameInstance = null;

function scaleMobileMonitor() {
  if (!window.matchMedia('(pointer: coarse)').matches) return;
  const bezel = document.getElementById('monitor-bezel');
  if (!bezel) return;

  // Medir tamaño natural (sin transform)
  bezel.style.transform = 'none';
  bezel.style.marginBottom = '0';
  const naturalW = bezel.offsetWidth;
  const naturalH = bezel.offsetHeight;

  const scale = document.documentElement.clientWidth / naturalW;
  bezel.style.transform = `scale(${scale})`;
  bezel.style.marginBottom = `${-naturalH * (1 - scale)}px`;
}

window.addEventListener("DOMContentLoaded", function () {
  scaleMobileMonitor();
  window.addEventListener('resize', scaleMobileMonitor);

  try {
    gameInstance = new Game();
  } catch (error) {
    console.error("Error initializing game:", error);
    alert("Error al inicializar el juego. Revisa la consola para más detalles.");
  }
});

window.addEventListener("beforeunload", function() {
  if (gameInstance) {
    gameInstance.destroy();
  }
});
