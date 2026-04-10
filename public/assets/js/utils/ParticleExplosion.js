class ParticleExplosion {
  /**
   * Spawna una explosión de píxeles en (x, y) dentro de container.
   * @param {HTMLElement} container
   * @param {number} x  - posición relativa al container
   * @param {number} y  - posición relativa al container
   * @param {string} color - color CSS de las partículas
   * @param {number} count - cantidad de partículas (default 16)
   */
  static spawn(container, x, y, color = '#ffe066', count = 16) {
    const particles = [];

    for (let i = 0; i < count; i++) {
      // Ángulo distribuido uniformemente + pequeño jitter
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 1.8 + Math.random() * 3.5;
      const size  = 3 + Math.floor(Math.random() * 4); // 3–6 px
      const life  = 380 + Math.random() * 280;

      const el = document.createElement('div');
      el.style.cssText = [
        'position:absolute',
        `width:${size}px`,
        `height:${size}px`,
        `background:${color}`,
        'pointer-events:none',
        'z-index:15',
        `left:${x}px`,
        `top:${y}px`,
        'image-rendering:pixelated',
        'will-change:transform,opacity',
      ].join(';');
      container.appendChild(el);

      particles.push({
        el,
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 0.14,
        maxLife: life,
      });
    }

    const start = performance.now();

    const animate = (now) => {
      const elapsed = now - start;
      let anyAlive = false;

      for (const p of particles) {
        if (!p.el.parentNode) continue;

        const t = elapsed / p.maxLife;
        if (t >= 1) {
          p.el.remove();
          continue;
        }

        anyAlive = true;
        p.vy += p.gravity;
        p.x  += p.vx;
        p.y  += p.vy;

        p.el.style.left    = p.x + 'px';
        p.el.style.top     = p.y + 'px';
        p.el.style.opacity = (1 - t).toFixed(3);
      }

      if (anyAlive) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }
}

export { ParticleExplosion };
