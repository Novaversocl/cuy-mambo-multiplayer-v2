/**
 * ── PARA AGREGAR UN ESCENARIO NUEVO ──────────────────────────────────────────
 *
 * 1. Agrega la imagen en: public/assets/img/ui/Escenarios/
 * 2. Agrega un bloque nuevo aquí abajo con id, name, preview, background.
 * 3. Listo — aparece automáticamente en el selector del lobby.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface IStage {
  id:         string;
  name:       string;
  preview:    string;  // miniatura que se muestra en el selector
  background: string;  // imagen/gif que se aplica como fondo del juego
}

export const STAGES_CONFIG: IStage[] = [
  {
    id:         'escenario-01',
    name:       'Escenario 1',
    preview:    'assets/img/ui/Escenarios/Escenario%2001.gif',
    background: 'assets/img/ui/Escenarios/Escenario%2001.gif',
  },
  {
    id:         'escenario-02',
    name:       'Escenario 2',
    preview:    'assets/img/ui/Escenarios/Escenario%2002.gif',
    background: 'assets/img/ui/Escenarios/Escenario%2002.gif',
  },
  {
    id:         'escenario-03',
    name:       'Escenario 3',
    preview:    'assets/img/ui/Escenarios/Escenario%2003.gif',
    background: 'assets/img/ui/Escenarios/Escenario%2003.gif',
  },
];
