import { Routes } from '@angular/router';

/**
 * Rutas de la aplicación — todas usan lazy loading (loadComponent).
 * Cada página se carga solo cuando el usuario navega a ella,
 * reduciendo el bundle inicial.
 *
 * Flujo normal del usuario:
 *   / (home) → /menu → /lobby → /game
 *
 * Rutas:
 *   ''         → HomeComponent      — pantalla de inicio (insert coin)
 *   'menu'     → ArcadeMenuComponent — menú principal estilo arcade
 *   'lobby'    → LobbyComponent      — selección de personaje + matchmaking
 *   'game'     → GameComponent       — partida multijugador
 *   'controls' → ControlsComponent   — guía de controles
 *   'about'    → AboutComponent      — créditos / acerca de
 *   '**'       → redirige a ''       — cualquier ruta inválida va al inicio
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'lobby',
    loadComponent: () => import('./pages/lobby/lobby.component').then(m => m.LobbyComponent)
  },
  {
    path: 'menu',
    loadComponent: () => import('./pages/arcade-menu/arcade-menu.component').then(m => m.ArcadeMenuComponent)
  },
  {
    path: 'game',
    loadComponent: () => import('./pages/game/game.component').then(m => m.GameComponent)
  },
  {
    path: 'controls',
    loadComponent: () => import('./pages/controls/controls.component').then(m => m.ControlsComponent)
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about.component').then(m => m.AboutComponent)
  },
  { path: '**', redirectTo: '' }
];
