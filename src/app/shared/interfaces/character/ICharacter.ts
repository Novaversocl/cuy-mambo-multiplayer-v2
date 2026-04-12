import { ICharacterSprites } from './ICharacterSprites';

/** Datos completos de un personaje seleccionable en el lobby */
export interface ICharacter {
  /** Identificador único del personaje (ej: 'cuy-mambo', 'mago') */
  id:      string;
  /** Nombre visible en la UI */
  name:    string;
  /** Ruta a la imagen estática de previsualización */
  preview: string;
  /** Rutas a los sprites de animación */
  sprites: ICharacterSprites;
}
