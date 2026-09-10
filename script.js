/* ==========================================================================
   NEBULA — JOURNEY THROUGH THE UNKNOWN
   script.js

   Organised as:
   1. Global state & feature detection
   2. Loader sequence
   3. Starfield generation (canvas-based, tileable)
   4. Particle field generation
   5. Parallax engine (rAF driven)
   6. Scroll progress + active section tracking
   7. Navigation
   8. Scroll-reveal system (IntersectionObserver)
   9. Custom cursor
   10. Mouse parallax input
   11. Reduced motion handling
   12. Resize handling
   13. Init
   ========================================================================== */

(() => {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* 1. GLOBAL STATE & FEATURE DETECTION                                  */
  /* ------------------------------------------------------------------ */

  const state = {
    isTouch: window.matchMedia('(hover: none), (pointer: coarse)').matches,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    scrollY: window.scrollY,
    viewportH: window.innerHeight,
    viewportW: window.innerWidth,
    mouseX: 0, // normalised -1 .. 1
    mouseY: 0, // normalised -1 .. 1
    ticking: false,
    sections: [],
    parallaxEls: [],
  };

  const root = document.documentElement;

  /* ------------------------------------------------------------------ */
  /* 2. LOADER SEQUENCE                                                   */
  /* ------------------------------------------------------------------ */

  function runLoader () {
    const loader = document.getElementById('loader');
    const fill = document.getElementById('loaderFill');
    const percentLabel = document.getElementById('loaderPercent');

    if (!loader || !fill || !percentLabel) return;

    let progress = 0;
    const duration = state.reducedMotion ? 400 : 1400;
    const start = performance.now();

    function tick (now) {
      const elapsed = now - start;
      progress = Math.min(100, Math.round((elapsed / duration) * 100));
      fill.style.width = progress + '%';
      percentLabel.textContent = progress + '%';

      if (progress < 100) {
        requestAnimationFrame(tick);
      } else {
        setTimeout(() => {
          loader.classList.add('is-hidden');
          document.body.style.overflow = '';
        }, 200);
      }
    }

    document.body.style.overflow = 'hidden';
    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------------ */
  /* 3. STARFIELD GENERATION                                              */
  /* ------------------------------------------------------------------ */

  /**
   * Draws a tileable field of stars onto an offscreen canvas and returns
   * a data URL. Using a repeating background image (instead of thousands
   * of DOM nodes) keeps the starfield cheap to paint and cheap to move —
   * moving the layer is a single composited transform.
   */
  function createStarTile ({ size, count, minR, maxR, minOpacity, maxOpacity, glow }) {
    const canvas = document.createElement('canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    for (let i = 0; i < count; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = minR + Math.random() * (maxR - minR);
      const o = minOpacity + Math.random() * (maxOpacity - minOpacity);

      if (glow && Math.random() > 0.85) {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
        gradient.addColorStop(0, `rgba(180, 200, 255, ${o})`);
        gradient.addColorStop(1, 'rgba(180, 200, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, r * 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.fillStyle = `rgba(244, 243, 251, ${o})`;
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    return { dataUrl: canvas.toDataURL('image/png'), size };
  }

  function initStarfield () {
    const layers = [
      { selector: '.star-far', size: 420, count: 70, minR: 0.4, maxR: 0.9, minOpacity: 0.3, maxOpacity: 0.6, glow: false },
      { selector: '.star-mid', size: 360, count: 55, minR: 0.7, maxR: 1.4, minOpacity: 0.4, maxOpacity: 0.8, glow: false },
      { selector: '.star-near', size: 300, count: 34, minR: 1, maxR: 2, minOpacity: 0.5, maxOpacity: 1, glow: true },
    ];

    layers.forEach(({ selector, ...opts }) => {
      const el = document.querySelector(selector);
      if (!el) return;
      const { dataUrl, size } = createStarTile(opts);
      el.style.backgroundImage = `url(${dataUrl})`;
      el.style.backgroundSize = `${size}px ${size}px`;
      // store the tile size so the parallax loop can wrap the offset seamlessly
      el.dataset.tileSize = String(size);
    });
  }

  /* ------------------------------------------------------------------ */
  /* 4. PARTICLE FIELD GENERATION                                         */
  /* ------------------------------------------------------------------ */

  function createParticles (container, count) {
    if (!container) return;
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('span');
      particle.className = 'particle';

      const size = (Math.random() * 2.4 + 1).toFixed(2);
      const top = (Math.random() * 100).toFixed(2);
      const left = (Math.random() * 100).toFixed(2);
      const duration = (Math.random() * 6 + 5).toFixed(2);
      const delay = (Math.random() * 5).toFixed(2);
      const driftX = (Math.random() * 30 - 15).toFixed(1);
      const driftY = (Math.random() * 40 + 10).toFixed(1);

      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.top = `${top}%`;
      particle.style.left = `${left}%`;
      particle.style.animationDuration = `${duration}s`;
      particle.style.animationDelay = `${delay}s`;
      particle.style.setProperty('--drift-x', `${driftX}px`);
      particle.style.setProperty('--drift-y', `-${driftY}px`);

      fragment.appendChild(particle);
    }

    container.appendChild(fragment);
  }

  function initParticleFields () {
    document.querySelectorAll('.particles-layer[data-particle-count]').forEach((container) => {
      // fewer particles on small screens for performance + visual balance
      const baseCount = parseInt(container.dataset.particleCount, 10) || 12;
      const scale = state.viewportW < 480 ? 0.4 : state.viewportW < 768 ? 0.65 : 1;
      const count = Math.max(4, Math.round(baseCount * scale));
      createParticles(container, count);
    });
  }

  /* ------------------------------------------------------------------ */
  /* 5. PARALLAX ENGINE                                                   */
  /* ------------------------------------------------------------------ */

  function cacheParallaxElements () {
    state.parallaxEls = Array.from(document.querySelectorAll('.parallax')).map((el) => {
      const section = el.closest('.section');
      return {
        el,
        section,
        speed: parseFloat(el.dataset.speed) || 0,
        mouseFactor: parseFloat(el.dataset.mouse) || 0,
      };
    });

    state.sections = Array.from(document.querySelectorAll('.section[data-index]'));
  }

  /**
   * The core parallax calculation. For every tracked element we read the
   * bounding box of its PARENT SECTION (never the element itself, and
   * never an already-transformed node) so that each frame's offset is
   * derived purely from real scroll position — this avoids feedback loops
   * where a transform would compound on top of itself.
   */
  function updateParallax () {
    if (state.reducedMotion) return;

    const mouseMaxPx = 22; // ceiling for mouse-driven displacement

    state.parallaxEls.forEach(({ el, section, speed, mouseFactor }) => {
      if (!section) return;
      const rect = section.getBoundingClientRect();

      // scroll-driven offset: elements with a higher "speed" travel further
      // per pixel scrolled, producing the layered depth effect.
      const scrollOffset = rect.top * speed;

      let transform = `translate3d(0, ${scrollOffset.toFixed(2)}px, 0)`;

      if (mouseFactor && !state.isTouch) {
        const mx = (state.mouseX * mouseMaxPx * mouseFactor).toFixed(2);
        const my = (state.mouseY * mouseMaxPx * mouseFactor).toFixed(2);
        transform = `translate3d(${mx}px, ${(scrollOffset + parseFloat(my)).toFixed(2)}px, 0)`;
      }

      el.style.transform = transform;
    });
  }

  /**
   * The global starfield layers are fixed to the viewport and use a
   * repeating background image, so instead of translating them freely we
   * wrap the offset at the tile size — this keeps the pattern seamless
   * while still reading as slow independent motion.
   */
  function updateStarLayers () {
    if (state.reducedMotion) return;

    document.querySelectorAll('.star-layer').forEach((layer) => {
      const speed = parseFloat(layer.dataset.speed) || 0;
      const tileSize = parseFloat(layer.dataset.tileSize) || 400;
      const raw = state.scrollY * speed;
      const wrapped = raw % tileSize;
      layer.style.transform = `translate3d(0, ${(-wrapped).toFixed(2)}px, 0)`;
    });
  }

  /* ------------------------------------------------------------------ */
  /* 6. SCROLL PROGRESS + ACTIVE SECTION                                  */
  /* ------------------------------------------------------------------ */

  function updateProgress () {
    const docHeight = document.documentElement.scrollHeight - state.viewportH;
    const ratio = docHeight > 0 ? Math.min(1, Math.max(0, state.scrollY / docHeight)) : 0;

    const fill = document.getElementById('progressFill');
    if (fill) fill.style.width = `${ratio * 100}%`;

    const center = state.scrollY + state.viewportH * 0.5;
    let activeSection = state.sections[0];

    state.sections.forEach((section) => {
      if (section.offsetTop <= center) activeSection = section;
    });

    if (!activeSection) return;

    const index = activeSection.dataset.index;
    const label = document.getElementById('progressCurrent');
    if (label) label.textContent = index.padStart(2, '0');

    const targetId = activeSection.id;
    document.querySelectorAll('.nav-links a').forEach((link) => {
      link.classList.toggle('is-active', link.dataset.target === targetId);
    });
  }

  /* ------------------------------------------------------------------ */
  /* 7. NAVIGATION                                                        */
  /* ------------------------------------------------------------------ */

  function initNav () {
    // Smooth in-page scroll is already handled by CSS `scroll-behavior`,
    // but we intercept clicks so keyboard/reduced-motion users still get
    // a reliable jump even if smooth scrolling is disabled.
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const targetId = link.getAttribute('href').slice(1);
        const target = document.getElementById(targetId);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({
          behavior: state.reducedMotion ? 'auto' : 'smooth',
          block: 'start',
        });
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* 8. SCROLL-REVEAL SYSTEM                                              */
  /* ------------------------------------------------------------------ */

  function initRevealObserver () {
    const revealEls = document.querySelectorAll('.reveal');

    if (!('IntersectionObserver' in window)) {
      // graceful fallback: show everything immediately
      revealEls.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' }
    );

    revealEls.forEach((el) => observer.observe(el));
  }

  /* ------------------------------------------------------------------ */
  /* 9. CUSTOM CURSOR                                                     */
  /* ------------------------------------------------------------------ */

  function initCustomCursor () {
    if (state.isTouch) return;

    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    if (!dot || !ring) return;

    let dotX = window.innerWidth / 2;
    let dotY = window.innerHeight / 2;
    let ringX = dotX;
    let ringY = dotY;
    let targetX = dotX;
    let targetY = dotY;

    document.addEventListener('mousemove', (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
      document.body.classList.add('cursor-ready');
    });

    document.querySelectorAll('[data-cursor="hover"]').forEach((el) => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });

    function animateCursor () {
      // dot tracks instantly, ring eases behind it for a soft trailing feel
      dotX = targetX;
      dotY = targetY;
      ringX += (targetX - ringX) * 0.18;
      ringY += (targetY - ringY) * 0.18;

      dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;

      requestAnimationFrame(animateCursor);
    }

    requestAnimationFrame(animateCursor);
  }

  /* ------------------------------------------------------------------ */
  /* 10. MOUSE PARALLAX INPUT                                             */
  /* ------------------------------------------------------------------ */

  function initMouseParallax () {
    if (state.isTouch || state.reducedMotion) return;

    window.addEventListener('mousemove', (event) => {
      // normalise to -1..1 relative to viewport centre
      state.mouseX = (event.clientX / state.viewportW) * 2 - 1;
      state.mouseY = (event.clientY / state.viewportH) * 2 - 1;
    }, { passive: true });
  }

  /* ------------------------------------------------------------------ */
  /* 11. MAIN RENDER LOOP (rAF-driven, single source of truth)            */
  /* ------------------------------------------------------------------ */

  function renderFrame () {
    state.scrollY = window.scrollY;
    updateParallax();
    updateStarLayers();
    updateProgress();
    state.ticking = false;
  }

  function requestTick () {
    if (!state.ticking) {
      state.ticking = true;
      requestAnimationFrame(renderFrame);
    }
  }

  function initScrollLoop () {
    window.addEventListener('scroll', requestTick, { passive: true });
    // also keep the mouse-parallax layers live between scroll events
    if (!state.isTouch && !state.reducedMotion) {
      setInterval(requestTick, 60);
    }
    requestTick();
  }

  /* ------------------------------------------------------------------ */
  /* 12. RESIZE HANDLING                                                  */
  /* ------------------------------------------------------------------ */

  function initResizeHandling () {
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        state.viewportW = window.innerWidth;
        state.viewportH = window.innerHeight;
        cacheParallaxElements();
        requestTick();
      }, 150);
    });
  }

  /* ------------------------------------------------------------------ */
  /* 13. INIT                                                             */
  /* ------------------------------------------------------------------ */

  function init () {
    runLoader();
    initStarfield();
    initParticleFields();
    cacheParallaxElements();
    initNav();
    initRevealObserver();
    initCustomCursor();
    initMouseParallax();
    initScrollLoop();
    initResizeHandling();

    // keep the reduced-motion preference reactive if the user changes it mid-session
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (event) => {
      state.reducedMotion = event.matches;
      if (state.reducedMotion) {
        document.querySelectorAll('.parallax, .star-layer').forEach((el) => {
          el.style.transform = 'none';
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
