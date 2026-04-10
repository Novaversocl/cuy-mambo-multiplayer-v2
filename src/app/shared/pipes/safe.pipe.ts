import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

/**
 * SafePipe — permite usar URLs externas en iframes y src sin que Angular las bloquee.
 *
 * Angular bloquea por seguridad cualquier URL que no reconozca como segura.
 * Este pipe le indica al sanitizador que confíe en la URL recibida.
 *
 * Uso en template:
 *   <iframe [src]="url | safe"></iframe>
 *
 * ⚠️ Usar solo con URLs conocidas y confiables (ej: YouTube embed).
 *    No aplicar a URLs que vengan del usuario sin validar.
 */
@Pipe({ name: 'safe', standalone: true })
export class SafePipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(url: string) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
