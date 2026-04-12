import { ICharacter } from '../character/ICharacter';

/** Payload que envía el servidor al iniciar una partida */
export interface IGameStartPayload {
  /** Lado del mapa asignado al jugador */
  side:              'left' | 'right';
  /** Nombre del rival */
  opponentName:      string;
  /** HP inicial */
  hp:                number;
  /** Personaje del jugador local */
  character:         ICharacter;
  /** Personaje del rival */
  opponentCharacter: ICharacter;
}
