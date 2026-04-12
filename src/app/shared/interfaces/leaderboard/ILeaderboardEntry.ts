/** Entrada del leaderboard persistido en el servidor */
export interface ILeaderboardEntry {
  /** Nombre del jugador */
  name:    string;
  /** Total de victorias acumuladas */
  wins:    number;
  /** ID del personaje usado en la última victoria */
  charId:  string;
  /** Fecha ISO de la última victoria */
  lastWin: string;
}
