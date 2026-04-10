import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'arcade-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass],
  templateUrl: './arcade-button.component.html',
  styleUrl: './arcade-button.component.scss',
})
export class ArcadeButtonComponent {
  label = input<string>('');
  variant = input<'default' | 'primary'>('default');
  size = input<'sm' | 'm' | 'l'>('m');
  blink = input<boolean>(false);
  active = input<boolean>(false);
  showIcon = input<boolean>(true);

  classes = computed(() => ({
    'menu-item': true,
    [`size-${this.size()}`]: true,
    'primary': this.variant() === 'primary',
    'blink-slow': this.blink(),
    'active': this.active(),
  }));
}
