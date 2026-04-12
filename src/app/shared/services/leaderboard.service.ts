import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import { ILeaderboardEntry } from '../interfaces/leaderboard/ILeaderboardEntry';

/**
 * LeaderboardService — consulta el top 10 de jugadores al servidor.
 * Usado por ArcadeMenuComponent para mostrar el ranking.
 */
@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private readonly http = inject(HttpClient);

  /** Obtiene los 10 mejores jugadores ordenados por victorias */
  getTop10() {
    return this.http.get<ILeaderboardEntry[]>(`${environment.apiUrl}/leaderboard`);
  }
}
