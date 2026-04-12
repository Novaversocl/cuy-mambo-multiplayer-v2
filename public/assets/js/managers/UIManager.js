const DANCE_GIFS = {
  'mago':          'assets/img/bailes/mago/baile_mago_1.gif',
  'cuy-mambo':     'assets/img/bailes/cuy-mambo/baile_cuy-mambo_1.gif',
  'cuy-mambolina': 'assets/img/bailes/cuy-mambolina/baile_cuy-mambolina_01.gif',
};

class UIManager {
  constructor(game) {
    this.game = game;

    this.lifeElement      = document.getElementById('life');
    this.remoteHpElement  = document.getElementById('remote-hp');
    this.announcementEl   = document.getElementById('wave-announcement');
    this.screenGameover   = document.getElementById('screen-gameover');
    this.gameoverTitle    = document.getElementById('gameover-title');
  }

  // ── HP local (actualizado por NetworkManager al recibir hp-update) ──────────

  updateLivesDisplay() {
    const hp  = Math.max(0, this.game.lives);
    const pct = (hp / this.game.maxLives) * 100;
    const bar = document.getElementById('hp-bar-local');
    if (bar) bar.style.width = pct + '%';
  }

  updateRemoteHpDisplay(hp) {
    const v   = Math.max(0, hp);
    const pct = (v / this.game.maxLives) * 100;
    const bar = document.getElementById('hp-bar-remote');
    if (bar) bar.style.width = pct + '%';
  }

  // ── Actualizar nombre del rival en el HUD ───────────────────────────────────

  setOpponentName(name) {
    const label = document.getElementById('opponent-label');
    if (label) label.textContent = name.toUpperCase().slice(0, 6);
  }

  // ── Efectos ─────────────────────────────────────────────────────────────────

  showDamageNumber(damage, targetEl) {
    if (!targetEl || damage <= 0) return;
    const el = document.createElement('div');
    el.className = 'damage-number';
    el.textContent = `-${damage}`;

    const rect = targetEl.getBoundingClientRect();
    const containerRect = this.game.gameContainer.getBoundingClientRect();
    const x = rect.left - containerRect.left + rect.width / 2;
    const y = rect.top  - containerRect.top  - 8;

    el.style.left = `${x}px`;
    el.style.top  = `${y}px`;
    this.game.gameContainer.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  showFireHit(targetEl) {
    if (!targetEl) return;
    // Tinte naranja/rojo en el sprite
    targetEl.style.filter = 'brightness(8) sepia(1) saturate(20) hue-rotate(340deg)';
    setTimeout(() => { targetEl.style.filter = ''; }, 300);

    const left = parseFloat(targetEl.style.left) + targetEl.offsetWidth  / 2;
    const top  = parseFloat(targetEl.style.top)  + targetEl.offsetHeight / 2;
    const el = document.createElement('div');
    el.className  = 'hit-fire';
    el.style.left = `${left}px`;
    el.style.top  = `${top}px`;
    this.game.gameContainer.insertBefore(el, targetEl);
    el.addEventListener('animationend', () => el.remove());
  }

  showHitSpark(targetEl) {
    if (!targetEl) return;

    // Destello amarillo en el sprite (estilo Mega Man X)
    targetEl.style.filter = 'brightness(20) sepia(1) saturate(30) hue-rotate(-10deg)';
    setTimeout(() => { targetEl.style.filter = ''; }, 100);

    // Estrella detrás del personaje: insertamos antes de targetEl en el DOM
    const left = parseFloat(targetEl.style.left) + targetEl.offsetWidth  / 2;
    const top  = parseFloat(targetEl.style.top)  + targetEl.offsetHeight / 2;
    const el = document.createElement('div');
    el.className  = 'hit-flash';
    el.style.left = `${left}px`;
    el.style.top  = `${top}px`;
    this.game.gameContainer.insertBefore(el, targetEl);
    el.addEventListener('animationend', () => el.remove());
  }

  screenShake() {
    this.game.gameContainer.classList.remove('shaking');
    void this.game.gameContainer.offsetWidth;
    this.game.gameContainer.classList.add('shaking');
    setTimeout(() => this.game.gameContainer.classList.remove('shaking'), 320);
  }

  _showMessage(text, color = '#ff4444', duration = 1600) {
    if (!this.announcementEl) return;
    this.announcementEl.style.color   = color;
    this.announcementEl.textContent   = text;
    this.announcementEl.style.opacity = '1';
    setTimeout(() => { this.announcementEl.style.opacity = '0'; }, duration);
  }

  // ── Game Over ────────────────────────────────────────────────────────────────

  handleGameOver(isWinner, winnerCharId = '') {
    this.game.audioManager.stopSound('background');

    // Actualizar estrellas finales
    const p1El = document.getElementById('round-score-p1');
    const p2El = document.getElementById('round-score-p2');
    if (p1El) p1El.textContent = isWinner ? '★★' : '☆☆';
    if (p2El) p2El.textContent = isWinner ? '☆☆' : '★★';

    const winnerId = isWinner ? (window.__cuyMamboCharacter?.id || '') : winnerCharId;
    if (winnerId === 'mago') {
      const discoOverlay = document.createElement('div');
      discoOverlay.id = 'disco-overlay';
      discoOverlay.style.cssText = `
        position: absolute; inset: 0;
        background: url('assets/img/ui/disco.gif') center / cover no-repeat;
        z-index: 2;
        pointer-events: none;
      `;
      this.game.gameContainer.appendChild(discoOverlay);
    }

    if (isWinner) {
      const charId = window.__cuyMamboCharacter?.id || '';
      this.game.audioManager.playEndSound('win', charId);
      this._playVictoryDance();
    } else {
      // El perdedor escucha la música del ganador y ve su baile en remotePlayer
      this.game.audioManager.playEndSound('win', winnerCharId);
      this._playRemoteVictoryDance(winnerCharId);
      this.screenShake();
    }

    if (this.gameoverTitle) {
      this.gameoverTitle.textContent = isWinner ? 'YOU WIN!' : 'GAME OVER';
      this.gameoverTitle.style.color = isWinner ? '#00ff88' : '#ff4444';
    }

    if (this.screenGameover) this.screenGameover.classList.remove('hidden');

    const retryBtn = document.getElementById('btn-retry');
    if (retryBtn) {
      retryBtn.onclick = () => {
        if (this.game.networkManager) this.game.networkManager.emitRematch();
      };
    }

    const lobbyBtn = document.getElementById('btn-lobby');
    if (lobbyBtn) {
      lobbyBtn.onclick = () => {
        if (this.game.networkManager) this.game.networkManager.returnToLobby();
      };
    }
  }

  // ── Arma activa del jugador local ───────────────────────────────────────────

  updateWeaponDisplay(weaponType) {
    let el = document.getElementById('hud-weapon');
    if (!el) {
      el = document.createElement('div');
      el.id = 'hud-weapon';
      this.game.gameContainer.appendChild(el);
    }
    if (!weaponType) {
      el.textContent = '';
      el.style.display = 'none';
    } else {
      const icons = { food: '🍖', shotgun: '💥', mine: '💣', flamethrower: '🔥' };
      el.textContent = icons[weaponType] || '';
      el.style.display = 'block';
    }
  }

  // ── Rondas ──────────────────────────────────────────────────────────────────

  showRoundAnnounce(round) {
    const el = this._getRoundBanner();
    el.innerHTML = `ROUND ${round}`;
    el.style.display = 'flex';
    el.className = 'round-banner round-banner-number';
    this.game.audioManager.playRoundAnnounce(round);
  }

  showFight(rounds, mySocketId) {
    const el = this._getRoundBanner();
    el.innerHTML = '¡FIGHT!';
    el.className = 'round-banner round-banner-fight';
    this.game.audioManager.playFight();

    // Actualizar marcador de rondas
    this._updateRoundScore(rounds, mySocketId);

    setTimeout(() => {
      el.style.display = 'none';
    }, 1000);
  }

  showRoundOver(iWon, winnerName, _rounds) {
    const el = this._getRoundBanner();
    el.innerHTML = iWon ? '¡GANASTE LA RONDA!' : `${winnerName.toUpperCase()} GANA LA RONDA`;
    el.className = `round-banner ${iWon ? 'round-banner-win' : 'round-banner-lose'}`;
    el.style.display = 'flex';
    if (iWon) this.game.audioManager.playRoundWin();
  }

  _playVictoryDance() {
    const charId    = window.__cuyMamboCharacter?.id || '';
    const el        = this.game.cubeElement;
    const floor     = this.game.floorElement;
    const container = this.game.gameContainer;

    const bigSize = 75 * 3;
    const centerX = (container.offsetWidth - bigSize) / 2;
    const centerY = floor.offsetTop - bigSize;

    el.style.transition        = 'left 0.4s ease, top 0.4s ease, width 0.4s ease, height 0.4s ease';
    el.style.zIndex            = '20';
    el.style.left              = centerX + 'px';
    el.style.top               = centerY + 'px';
    el.style.width             = bigSize + 'px';
    el.style.height            = bigSize + 'px';
    el.style.backgroundSize    = 'auto 100%';
    el.style.backgroundPosition = 'center bottom';
    el.style.backgroundRepeat  = 'no-repeat';

    const gif = DANCE_GIFS[charId];
    if (gif) {
      el.style.backgroundImage = `url('${gif}')`;
    } else {
      el.classList.add('victory-dance');
    }
  }

  _playRemoteVictoryDance(charId) {
    const remoteEl  = document.getElementById('remote-player');
    if (!remoteEl) return;
    const floor     = this.game.floorElement;
    const container = this.game.gameContainer;

    const bigSize = 75 * 3;
    const centerX = (container.offsetWidth - bigSize) / 2;
    const centerY = floor.offsetTop - bigSize;

    remoteEl.style.transition        = 'left 0.4s ease, top 0.4s ease, width 0.4s ease, height 0.4s ease';
    remoteEl.style.zIndex            = '20';
    remoteEl.style.left              = centerX + 'px';
    remoteEl.style.top               = centerY + 'px';
    remoteEl.style.width             = bigSize + 'px';
    remoteEl.style.height            = bigSize + 'px';
    remoteEl.style.backgroundSize    = 'auto 100%';
    remoteEl.style.backgroundPosition = 'center bottom';
    remoteEl.style.backgroundRepeat  = 'no-repeat';

    const gif = DANCE_GIFS[charId];
    if (gif) {
      remoteEl.style.backgroundImage = `url('${gif}')`;
    } else {
      remoteEl.classList.add('victory-dance');
    }
  }

  _getRoundBanner() {
    let el = document.getElementById('round-banner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'round-banner';
      this.game.gameContainer.appendChild(el);
    }
    return el;
  }

  _updateRoundScore(rounds, mySocketId) {
    const ids     = Object.keys(rounds);
    const myWins  = mySocketId ? (rounds[mySocketId] ?? 0) : 0;
    const oppId   = ids.find(id => id !== mySocketId);
    const oppWins = oppId ? rounds[oppId] : 0;

    const p1El = document.getElementById('round-score-p1');
    const p2El = document.getElementById('round-score-p2');
    if (p1El) p1El.textContent = '★'.repeat(myWins)  + '☆'.repeat(Math.max(0, 2 - myWins));
    if (p2El) p2El.textContent = '★'.repeat(oppWins) + '☆'.repeat(Math.max(0, 2 - oppWins));
  }

  showOpponentDisconnected() {
    this._showMessage('RIVAL DESCONECTADO', '#ff8800', 3000);
    setTimeout(() => {
      if (this.screenGameover) this.screenGameover.classList.remove('hidden');
      if (this.gameoverTitle) {
        this.gameoverTitle.textContent = 'RIVAL SE FUE';
        this.gameoverTitle.style.color = '#ff8800';
      }

      const retryBtn = document.getElementById('btn-retry');
      if (retryBtn) {
        retryBtn.onclick = () => {
          if (this.game.networkManager) this.game.networkManager.emitRematch();
        };
      }

      const lobbyBtn = document.getElementById('btn-lobby');
      if (lobbyBtn) {
        lobbyBtn.onclick = () => {
          if (this.game.networkManager) this.game.networkManager.returnToLobby();
        };
      }
    }, 1500);
  }
}

export { UIManager };
