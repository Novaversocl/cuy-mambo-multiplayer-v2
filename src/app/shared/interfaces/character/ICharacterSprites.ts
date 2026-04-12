/** Rutas a los sprites de animación de un personaje */
export interface ICharacterSprites {
  /** Frames de caminar hacia la derecha */
  walkRight: string[];
  /** Frames de caminar hacia la izquierda */
  walkLeft:  string[];
  /** Sprite del salto */
  jump:      string;
}
