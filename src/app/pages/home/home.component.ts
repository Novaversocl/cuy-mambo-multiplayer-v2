import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { YtPlayerComponent } from '../../shared/components/yt-player/yt-player.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [YtPlayerComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  private router = inject(Router);

  isFlashing = false;
  isNight = false;
  isGlitching = false;
  isStatic = false;

  private glitchTimeout: any;
  private staticTimeout: any;

  ngOnInit() {
    this.scheduleGlitch();
    this.scheduleStatic();
  }

  private scheduleGlitch() {
    const delay = 6000 + Math.random() * 9000;
    this.glitchTimeout = setTimeout(() => {
      this.isGlitching = true;
      setTimeout(() => {
        this.isGlitching = false;
        this.scheduleGlitch();
      }, 350);
    }, delay);
  }

  private scheduleStatic() {
    const delay = 12000 + Math.random() * 10000;
    this.staticTimeout = setTimeout(() => {
      this.isStatic = true;
      setTimeout(() => {
        this.isStatic = false;
        this.scheduleStatic();
      }, 180);
    }, delay);
  }

  toggleNight() {
    this.isNight = !this.isNight;
  }

  onInsertCoin() {
    if (this.isFlashing) return;
    this.isFlashing = true;
    setTimeout(() => this.router.navigate(['/menu']), 500);
  }

  ngOnDestroy() {
    clearTimeout(this.glitchTimeout);
    clearTimeout(this.staticTimeout);
  }
}
