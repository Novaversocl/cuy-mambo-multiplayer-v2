import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';

export interface LeaderboardEntry {
  name:    string;
  wins:    number;
  charId:  string;
  lastWin: string;
}

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private readonly http = inject(HttpClient);

  getTop10() {
    return this.http.get<LeaderboardEntry[]>(`${environment.apiUrl}/leaderboard`);
  }
}
