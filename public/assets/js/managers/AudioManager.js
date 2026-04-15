import { GAME_CONFIG } from '../utils/Constants.js';
import { WIN_MUSIC, CHARACTERS_REGISTRY } from '../utils/CharactersRegistry.js';

class AudioManager {
  constructor() {
    this.audioElements = new Map();
    this.isInitialized = false;
    this._preload();
  }

  _preload() {
    // Audios críticos — se descargan en background al iniciar
    const audioPreloads = [
      ['door-open',          'assets/Musica/door-open.mp3'],
      ...CHARACTERS_REGISTRY.map(c => [`end-win-${c.id}`, c.winMusic]),
      ['end-lose',           'assets/Musica/lose.mp3'],
      ['round-1',            'assets/Musica/round-1-announce.mp3'],
      ['round-2',            'assets/Musica/round-2-announce.mp3'],
      ['round-3',            'assets/Musica/round-final-announce.mp3'],
      ['pajaro',             'assets/Musica/summon-ninja.mp3'],
      ['big-laser',          'assets/Musica/big-laser.mp3'],
    ];
    audioPreloads.forEach(([id, src]) => {
      const a = this.createAudio(id, src);
      a.preload = 'auto';
      a.load();
    });

    // Sprites de personajes + GIFs — precargados para evitar lag en primer uso
    const imgPreloads = [
      // cuy-mambo
      'assets/img/personajes/cuy-mambo/camina-derecha-1.png',
      'assets/img/personajes/cuy-mambo/camina-derecha-2.png',
      'assets/img/personajes/cuy-mambo/camina-izquierda-1.png',
      'assets/img/personajes/cuy-mambo/camina-izquierda-2.png',
      'assets/img/personajes/cuy-mambo/salto.png',
      // mago
      'assets/img/personajes/mago/camina-derecha-1.png',
      'assets/img/personajes/mago/camina-derecha-2.png',
      'assets/img/personajes/mago/camina-izquierda-1.png',
      'assets/img/personajes/mago/camina-izquierda-2.png',
      'assets/img/personajes/mago/salto.png',
      // bailes
      'assets/img/bailes/cuy-mambo/baile_cuy-mambo_1.gif',
      'assets/img/bailes/mago/baile_mago_1.gif',
      // npc
      'assets/img/npc/invocaciones/chascon_ninja.gif',
    ];
    imgPreloads.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }

  static instance = null;

  static getInstance() {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  createAudio(id, src) {
    if (this.audioElements.has(id)) {
      return this.audioElements.get(id);
    }

    const audio = new Audio();
    audio.src = src;
    if (id === 'intro' || id === 'background') {
      audio.volume = 0.1;
    }
    this.audioElements.set(id, audio);
    return audio;
  }

  playSound(soundKey) {
    const soundPath = GAME_CONFIG.sounds[soundKey];
    if (!soundPath) {
      console.warn(`Sound '${soundKey}' not found in configuration`);
      return;
    }

    const audio = this.createAudio(soundKey, soundPath);
    audio.currentTime = 0;
    if (soundKey === 'jump') {
      audio.volume       = 0.7;
      audio.playbackRate = 1.5;
    }
    audio.play().catch(error => {
      console.warn(`Error playing sound '${soundKey}':`, error);
    });
  }

  playBackgroundMusic() {
    this.playSound('background');
  }

  stopSound(soundKey) {
    if (this.audioElements.has(soundKey)) {
      const audio = this.audioElements.get(soundKey);
      audio.pause();
      audio.currentTime = 0;
    }
  }

  setVolume(soundKey, volume) {
    if (this.audioElements.has(soundKey)) {
      this.audioElements.get(soundKey).volume = Math.max(0, Math.min(1, volume));
    }
  }

  // ── Web Audio synth ────────────────────────────────────────

  _ctx() {
    if (!this._audioCtx) {
      this._audioCtx = new (window.AudioContext || window['webkitAudioContext'])();
    }
    if (this._audioCtx.state === 'suspended') this._audioCtx.resume();
    return this._audioCtx;
  }

  _tone(freq, duration, type = 'square', vol = 0.25, freqEnd = null) {
    try {
      const ctx  = this._ctx();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (freqEnd) osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + duration);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (_) {}
  }

  playBootBeep() {
    this._tone(900, 0.045, 'square', 0.12);
  }

  // Sonido de ficha insertada: dos tonos rápidos metálicos
  playCoinInsert() {
    try {
      this._ctx();
      // Primer tono (clink)
      this._tone(1200, 0.08, 'square', 0.25, 1800);
      // Segundo tono un poco después (clank)
      setTimeout(() => {
        this._tone(800, 0.1, 'square', 0.2, 400);
      }, 60);
    } catch (_) {}
  }

  // Disparo del jugador: normal / cargado cian / súper rojo
  playShoot(chargeLevel = 0) {
    try {
      const ctx = this._ctx();
      const now = ctx.currentTime;

      if (chargeLevel === 2) {
        // súper: boom grave
        this._tone(120, 0.25, 'sawtooth', 0.4, 40);
        setTimeout(() => this._tone(300, 0.12, 'square', 0.2, 80), 40);
      } else if (chargeLevel === 1) {
        // cargado: punch medio
        this._tone(400, 0.14, 'sawtooth', 0.3, 120);
      } else {
        // normal: metralleta seca
        // 1) ruido highpass muy corto (crack)
        const samples = Math.floor(ctx.sampleRate * 0.018);
        const buf  = ctx.createBuffer(1, samples, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1;

        const src = ctx.createBufferSource();
        src.buffer = buf;

        const hpf = ctx.createBiquadFilter();
        hpf.type = 'highpass';
        hpf.frequency.value = 1800;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

        src.connect(hpf); hpf.connect(gain); gain.connect(ctx.destination);
        src.start(); src.stop(now + 0.02);

        // 2) sweep descendente rápido (el "whip" de la bala)
        this._tone(600, 0.022, 'sawtooth', 0.2, 150);
      }
    } catch (_) {}
  }

  // Explosión de bomba en el suelo
  playBombExplosion() {
    try {
      const ctx     = this._ctx();
      const samples = Math.floor(ctx.sampleRate * 0.22);
      const buffer  = ctx.createBuffer(1, samples, ctx.sampleRate);
      const data    = buffer.getChannelData(0);
      for (let i = 0; i < samples; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / samples, 1.5);
      const src  = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      // tono bajo que refuerza el boom
      this._tone(80, 0.18, 'sine', 0.3, 30);
    } catch (_) {}
  }

  // Frase del jefe al aparecer — voz grave y amenazante
  playBossSpawn() {
    if (!window.speechSynthesis) return;
    const frases = [
      'Nadie... me puede... detener',
      'Esto... es el fin... para ti',
      'Ahora verás... quién manda aquí',
      'Yo soy... el verdadero poder',
      'Tú no eres... rival para mí',
    ];
    const text  = frases[Math.floor(Math.random() * frases.length)];

    // Seleccionar la voz más grave disponible
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find(v => v.lang.startsWith('es') && v.name.toLowerCase().includes('male'))
                 || voices.find(v => v.lang.startsWith('es'))
                 || null;

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang   = 'es-ES';
    utter.rate   = 0.65;   // muy lento, amenazante
    utter.pitch  = 0.1;    // lo más grave posible
    utter.volume = 1.0;
    if (esVoice) utter.voice = esVoice;
    window.speechSynthesis.speak(utter);
  }

  // Explosión de mina
  playMineExplosion() {
    try {
      const ctx     = this._ctx();
      const now     = ctx.currentTime;
      const samples = Math.floor(ctx.sampleRate * 0.35);
      const buffer  = ctx.createBuffer(1, samples, ctx.sampleRate);
      const data    = buffer.getChannelData(0);
      for (let i = 0; i < samples; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / samples, 1.2);
      }
      const src  = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      // Boom grave que refuerza la explosión
      this._tone(60, 0.3, 'sine', 0.5, 20);
      this._tone(120, 0.15, 'sawtooth', 0.3, 30);
    } catch (_) {}
  }

  // Puerta misteriosa
  playDoorOpen() {
    const audio = this.createAudio('door-open', 'assets/Musica/door-open.mp3');
    audio.currentTime = 0;
    audio.volume = 0.8;
    audio.play().catch(() => {});
  }

  // Sonido de pájaro para el Chascón Ninja
  playBirdSound() {
    const audio = this.createAudio('pajaro', 'assets/Musica/summon-ninja.mp3');
    audio.currentTime = 0;
    audio.volume = 0.6;
    audio.play().catch(() => {});
  }

  // Recoger arma del suelo
  playWeaponPickup() {
    try {
      this._ctx();
      // Tres tonos ascendentes rápidos — típico power-up de arcade
      this._tone(440, 0.08, 'square', 0.2);
      setTimeout(() => this._tone(660, 0.08, 'square', 0.2), 80);
      setTimeout(() => this._tone(880, 0.12, 'square', 0.25), 160);
    } catch (_) {}
  }

  // Sonido al ganar una ronda
  playRoundWin() {
    const audio = this.createAudio('round-win', 'assets/Musica/round-win.mp3');
    audio.currentTime = 0;
    audio.volume = 0.9;
    audio.play().catch(() => {});
  }

  // Sonido de fin de partida
  playEndSound(result, charId = '') {
    let src;
    if (result === 'win') {
      src = WIN_MUSIC[charId] || 'assets/Musica/win-mago.mp3';
    } else {
      src = 'assets/Musica/lose.mp3';
    }
    const audio = this.createAudio(`end-${result}-${charId || 'default'}`, src);
    audio.currentTime = 0;
    audio.volume = 0.8;
    audio.loop = true;
    audio.play().catch(() => {});
  }

  // Anuncio de ronda — MP3 por número de ronda
  playRoundAnnounce(round) {
    const srcs = {
      1: 'assets/Musica/round-1-announce.mp3',
      2: 'assets/Musica/round-2-announce.mp3',
      3: 'assets/Musica/round-final-announce.mp3',
    };
    const src = srcs[round] || srcs[1];
    const audio = this.createAudio(`round-${round}`, src);
    audio.currentTime = 0;
    audio.volume = 1.0;
    audio.play().catch(() => {});
  }

  // FIGHT ya está incluido en los MP3 de ronda
  playFight() {}

  // Salto de enemigo
  playEnemyJump() {
    this._tone(160, 0.07, 'square', 0.09, 300);
  }

  // Grito de muerte — gruñidos/gritos sin palabras
  playEnemyDeath() {
    if (!window.speechSynthesis) return;
    const text = 'auch';
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang   = 'es-ES';
    utter.rate   = 2.5 + Math.random() * 0.5;
    utter.pitch  = 0.5 + Math.random() * 1.5;
    utter.volume = 0.8;
    window.speechSynthesis.speak(utter);
  }

  // Disparo de enemigos/CatBoss
  playEnemyShoot(isCharged = false) {
    if (isCharged) {
      this._tone(160, 0.14, 'sawtooth', 0.2, 260);
    } else {
      this._tone(240, 0.07, 'sawtooth', 0.13);
    }
  }

  // Repulsor láser
  playRepulsor() {
    const audio = this.createAudio('big-laser', 'assets/Musica/big-laser.mp3');
    audio.currentTime = 0;
    audio.volume = 0.8;
    audio.play().catch(() => {});
  }

  // Recibir daño: ruido blanco corto
  playHit() {
    try {
      const ctx        = this._ctx();
      const samples    = Math.floor(ctx.sampleRate * 0.14);
      const buffer     = ctx.createBuffer(1, samples, ctx.sampleRate);
      const data       = buffer.getChannelData(0);
      for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1;
      const src  = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch (_) {}
  }

  // Crujido del bloque balance (madera bajo tensión)
  playBalanceCrack() {
    try {
      const ctx = this._ctx();
      const now = ctx.currentTime;
      // Ruido corto filtrado para simular crujido de madera
      const samples = Math.floor(ctx.sampleRate * 0.08);
      const buffer  = ctx.createBuffer(1, samples, ctx.sampleRate);
      const data    = buffer.getChannelData(0);
      for (let i = 0; i < samples; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / samples, 0.5);
      }
      const src  = ctx.createBufferSource();
      src.buffer = buffer;
      const bpf  = ctx.createBiquadFilter();
      bpf.type   = 'bandpass';
      bpf.frequency.value = 300;
      bpf.Q.value = 0.8;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      src.connect(bpf); bpf.connect(gain); gain.connect(ctx.destination);
      src.start();
      // Tono grave de tensión
      this._tone(120, 0.12, 'sawtooth', 0.15, 80);
    } catch (_) {}
  }

  // Lanzamiento catapulta — whoosh grave + impacto
  playBalanceLaunch() {
    try {
      // Whoosh ascendente
      this._tone(80, 0.18, 'sawtooth', 0.35, 400);
      setTimeout(() => this._tone(300, 0.09, 'square', 0.2, 600), 60);
      // Crack de ruptura
      setTimeout(() => {
        const ctx = this._ctx();
        const now = ctx.currentTime;
        const samples = Math.floor(ctx.sampleRate * 0.05);
        const buffer  = ctx.createBuffer(1, samples, ctx.sampleRate);
        const data    = buffer.getChannelData(0);
        for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1;
        const src  = ctx.createBufferSource();
        src.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        src.connect(gain); gain.connect(ctx.destination);
        src.start();
      }, 100);
    } catch (_) {}
  }

  dispose() {
    this.audioElements.forEach(audio => {
      audio.pause();
      audio.src = '';
    });
    this.audioElements.clear();
    if (this._audioCtx) { this._audioCtx.close(); this._audioCtx = null; }
    AudioManager.instance = null;
  }
}

export { AudioManager };
