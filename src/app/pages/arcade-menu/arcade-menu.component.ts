import { Component, HostListener, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { ArcadeButtonComponent } from '../../shared/components/arcade-button/arcade-button.component';
import { Spinner } from '../../shared/components/spinner/spinner';
import { LeaderboardService } from '../../shared/services/leaderboard.service';
import { ILeaderboardEntry } from '../../shared/interfaces/leaderboard/ILeaderboardEntry';

/**
 * ArcadeMenuComponent — menú principal estilo arcade.
 *
 * Muestra las opciones: JUGAR, CONTROLES, ACERCA DE.
 * Soporta navegación con teclado (↑ ↓ Enter) y con mouse (hover + click).
 *
 * En ngOnInit hace un prefetch del CSS del juego para que esté listo
 * cuando el jugador navegue a /game.
 */
@Component({
  selector: 'app-arcade-menu',
  imports: [ArcadeButtonComponent, Spinner],
  templateUrl: './arcade-menu.component.html',
  styleUrl: './arcade-menu.component.scss'
})
export class ArcadeMenuComponent implements OnInit {
  router             = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private lbService  = inject(LeaderboardService);

  showLeaderboard = signal(false);
  leaderboard     = signal<ILeaderboardEntry[]>([]);
  isLoading       = signal(false);

  openLeaderboard() {
    this.showLeaderboard.set(true);
    this.isLoading.set(true);
    this.lbService.getTop10().subscribe({
      next:     data => this.leaderboard.set(data),
      error:    ()   => { this.leaderboard.set([]); this.isLoading.set(false); },
      complete: ()   => this.isLoading.set(false),
    });
  }

  closeLeaderboard() {
    this.showLeaderboard.set(false);
  }

  charIcon(charId: string): string {
    const icons: Record<string, string> = {
      'cuy-mambo': '🐹',
      'mago':      '🧙',
    };
    return icons[charId] ?? '🎮';
  }

  async ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'style';
    link.href = '/assets/css/style.css';
    document.head.appendChild(link);
  }

  menuItems = [
    { label: '▶ JUGAR',        route: '/game',     blink: true,  variant: 'primary' as const, action: '' },
    { label: 'CONTROLES',      route: '/controls', blink: false, variant: 'default' as const, action: '' },
    { label: '🏆 CAMPEONES', route: '', blink: false, variant: 'default' as const, action: 'leaderboard' },
    { label: 'ACERCA DE',      route: '/about',    blink: false, variant: 'default' as const, action: '' },
  ];

  activeIndex = signal(0);

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.update(i => (i + 1) % this.menuItems.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.update(i => (i - 1 + this.menuItems.length) % this.menuItems.length);
    } else if (event.key === 'Enter') {
      const item = this.menuItems[this.activeIndex()];
      this.navigate(item.route, this.activeIndex(), item.action);
    }
  }

  navigate(route: string, index: number, action = '') {
    this.activeIndex.set(index);
    if (action === 'leaderboard') { this.openLeaderboard(); return; }
    this.router.navigate([route]);
  }

  onHover(index: number) {
    if (this.activeIndex() !== index) {
      this.activeIndex.set(index);
    }
  }
}
