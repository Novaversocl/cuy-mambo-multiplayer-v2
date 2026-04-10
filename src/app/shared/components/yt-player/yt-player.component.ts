import { Component, OnDestroy, OnInit, signal } from '@angular/core';

declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady: () => void; }
}

@Component({
  selector: 'app-yt-player',
  standalone: true,
  templateUrl: './yt-player.component.html',
  styleUrl: './yt-player.component.scss'
})
export class YtPlayerComponent implements OnInit, OnDestroy {
  private player: any = null;

  ngOnInit() {
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
    this.initPlayer();
  }

  private initPlayer() {
    const tryInit = () => {
      if (window.YT?.Player) {
        this.player = new window.YT.Player('yt-container', {
          videoId: 'hNJ92c5DiLA',
          width: '280',
          height: '158',
          playerVars: { rel: 0, modestbranding: 1, loop: 1, playlist: 'hNJ92c5DiLA' },
          events: {
            onReady: (e: any) => e.target.setVolume(30),
            onStateChange: (e: any) => {
              // 0 = ended → volver a reproducir
              if (e.data === 0) e.target.playVideo();
            }
          }
        });
      } else {
        setTimeout(tryInit, 300);
      }
    };
    setTimeout(tryInit, 150);
  }

  ngOnDestroy() {
    this.player?.destroy();
  }
}
