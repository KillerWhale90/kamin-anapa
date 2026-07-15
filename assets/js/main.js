/* ============================================================
   Красивые Камины — интерактив
   Lenis + GSAP ScrollTrigger. Эффект «прохода к камину».
   ============================================================ */
(function () {
  'use strict';
  // всегда открываемся с начала страницы: браузерное восстановление прошлой
  // позиции скролла вместе с pin-анимацией героя выглядит как резкий
  // самопроизвольный прыжок вниз при загрузке
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------- Header scroll state ---------- */
  const header = $('.site-header');
  const onScrollHeader = () => header && header.classList.toggle('scrolled', window.scrollY > 40);
  onScrollHeader();
  window.addEventListener('scroll', onScrollHeader, { passive: true });

  /* ---------- Mobile nav ---------- */
  const burger = $('.burger'), nav = $('.nav');
  if (burger && nav) {
    burger.addEventListener('click', () => nav.classList.toggle('open'));
    $$('a', nav).forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
  }

  /* ---------- Rotating headline word (per-letter burn) ---------- */
  const rotator = $('.rotator');
  if (rotator) {
    const words = (rotator.dataset.words || '').split('|').map(w => w.trim()).filter(Boolean);
    if (words.length) {
      // невидимый sizer на самое длинное слово — держит ширину, нет горизонтального скачка
      const longest = words.reduce((a, b) => (b.length > a.length ? b : a), '');
      const sizer = document.createElement('span');
      sizer.className = 'rotator__item sizer';
      sizer.textContent = longest;
      const item = document.createElement('span');
      item.className = 'rotator__item is-in';
      rotator.append(sizer, item);

      const render = (text) => {
        item.innerHTML = '';
        [...text].forEach((ch, idx) => {
          const s = document.createElement('span');
          s.className = 'char';
          s.style.setProperty('--i', idx);
          s.textContent = ch === ' ' ? ' ' : ch;
          item.appendChild(s);
        });
      };

      let i = 0;
      render(words[0]);
      if (!prefersReduced) {
        setInterval(() => {
          const burnMs = item.children.length * 50 + 720; // ждём пока догорит последняя буква
          item.classList.remove('is-in');
          item.classList.add('is-out');
          setTimeout(() => {
            i = (i + 1) % words.length;
            render(words[i]);
            item.classList.remove('is-out');
            item.classList.add('is-in');
          }, burnMs);
        }, 3600);
      }
    }
  }

  /* ---------- Ember particles ---------- */
  const canvas = $('.embers-canvas');
  if (canvas && !prefersReduced) {
    const ctx = canvas.getContext('2d');
    let w, h, parts = [], raf;
    const resize = () => {
      w = canvas.width = canvas.offsetWidth * devicePixelRatio;
      h = canvas.height = canvas.offsetHeight * devicePixelRatio;
    };
    // initial=true → распределяем по всей высоте; иначе рождаем НИЖЕ экрана (плавно вплывут)
    const spawn = (initial) => ({
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 20 + Math.random() * 140,
      r: (Math.random() * 1.9 + .7) * devicePixelRatio,
      vy: -(Math.random() * .55 + .2) * devicePixelRatio,
      vx: (Math.random() - .5) * .3 * devicePixelRatio,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: .008 + Math.random() * .02,
      flicker: Math.random() * Math.PI * 2,
      hue: 16 + Math.random() * 24
    });
    const N = Math.min(110, Math.round(window.innerWidth / 11));
    const init = () => { resize(); parts = Array.from({ length: N }, () => spawn(true)); };
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter'; // аддитивное свечение углей
      for (const p of parts) {
        p.sway += p.swaySpeed;
        p.x += p.vx + Math.sin(p.sway) * .3 * devicePixelRatio;
        p.y += p.vy;
        p.flicker += .2;
        // мягкое затухание у ВСЕХ кромок — поле искр без резких границ
        const fadeIn = Math.min(1, (h - p.y) / (h * .18));  // снизу (плавно вплывают)
        const fadeOut = Math.min(1, p.y / (h * .45));       // сверху (гаснут)
        const fadeL = Math.min(1, p.x / (w * .14));         // слева
        const fadeR = Math.min(1, (w - p.x) / (w * .14));   // справа
        let a = Math.max(0, Math.min(fadeIn, fadeOut, fadeL, fadeR));
        a *= .55 + .45 * Math.sin(p.flicker);
        const rr = p.r * 3.2;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
        g.addColorStop(0, `hsla(${p.hue},100%,66%,${a})`);
        g.addColorStop(.4, `hsla(${p.hue},100%,55%,${a * .5})`);
        g.addColorStop(1, `hsla(${p.hue},100%,50%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
        ctx.fill();
        if (p.y < -20) Object.assign(p, spawn(false));
      }
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(tick);
    };
    init(); tick();
    window.addEventListener('resize', () => { cancelAnimationFrame(raf); init(); tick(); });
  }

  /* ---------- Reveal on scroll (IntersectionObserver fallback) ---------- */
  // класс «in» снимаем при уходе блока с экрана, чтобы анимация появления
  // срабатывала каждый раз (в обе стороны прокрутки), а не однократно
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => e.target.classList.toggle('in', e.isIntersecting));
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  $$('.reveal, .line-mask').forEach(el => io.observe(el));

  /* ---------- Counters ---------- */
  const counters = $$('[data-count]');
  const cio = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, target = parseFloat(el.dataset.count), dur = 1400, t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur), val = target * (1 - Math.pow(1 - p, 3));
        el.textContent = Number.isInteger(target) ? Math.round(val) : val.toFixed(0);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step); cio.unobserve(el);
    });
  }, { threshold: 0.6 });
  counters.forEach(c => cio.observe(c));

  /* ---------- Marquee: бесшовная лента через scrollLeft ---------- */
  // клонируем карточки, НЕ переписывая innerHTML: innerHTML += пересоздаёт
  // оригиналы, из-за чего недогруженные картинки сбрасываются и мигают
  const marquee = $('.marquee');
  const marqueeClip = $('.marquee-clip');
  if (marquee) {
    Array.from(marquee.children).forEach(c => {
      const dup = c.cloneNode(true);
      dup.setAttribute('aria-hidden', 'true');
      marquee.appendChild(dup);
    });
  }
  if (marquee && marqueeClip && !prefersReduced) {
    const SPEED = 32; // px/сек (~80 сек на полный круг)
    let x = 0, paused = false, last = null, period = 0, applied = -1, running = false, raf = 0;
    // пауза по наведению — только для настоящей мыши (на таче hover «залипает»)
    if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
      marqueeClip.addEventListener('mouseenter', () => { paused = true; });
      marqueeClip.addEventListener('mouseleave', () => { paused = false; });
    }
    // период повтора = расстояние от первой карточки до её клона.
    // Меряем ОДИН раз: чтение offsetLeft в каждом кадре заставляло браузер
    // пересчитывать layout 60 раз/сек — на телефонах это душило CSS-переходы
    // появления секций (reveal), они срабатывали без анимации
    const measure = () => { period = marquee.children[marquee.children.length / 2].offsetLeft; };
    window.addEventListener('resize', () => { period = 0; }, { passive: true });
    const tick = (t) => {
      if (!running) return;
      if (last === null) last = t;
      const dt = Math.min(64, t - last);
      last = t;
      if (!paused) {
        if (!period) measure();
        x += SPEED * dt / 1000;
        if (period > 0 && x >= period) x -= period;
        const px = Math.round(x);
        if (px !== applied) { applied = px; marqueeClip.scrollLeft = px; }
      }
      raf = requestAnimationFrame(tick);
    };
    // крутим ленту только пока она видна на экране
    const vio = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && !running) { running = true; last = null; raf = requestAnimationFrame(tick); }
        else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
      });
    });
    vio.observe(marqueeClip);
  }

  /* ---------- Magnetic primary buttons ---------- */
  if (!prefersReduced && matchMedia('(pointer:fine)').matches) {
    $$('.btn--primary').forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        btn.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px, ${(e.clientY - r.top - r.height / 2) * .3 - 3}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------- Smooth scroll + hero parallax (GSAP) ---------- */
  window.addEventListener('load', () => {
    const hasGSAP = window.gsap && window.ScrollTrigger && window.Lenis;
    if (!hasGSAP || prefersReduced) { document.documentElement.classList.add('no-gsap'); return; }

    const lenis = new Lenis({ duration: 1.15, smoothWheel: true, lerp: 0.09 });
    gsap.registerPlugin(ScrollTrigger);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);

    // smooth-scroll for in-page anchors
    $$('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id.length > 1 && $(id)) { e.preventDefault(); lenis.scrollTo(id, { offset: -70 }); }
      });
    });

    /* HERO — видео-фон + приближение к камину по скроллу */
    const hero = $('.hero');
    const heroVideo = $('.hero__video');
    if (hero && heroVideo) {
      // запустить видео (на случай блокировки автоплея): пробуем на каждом
      // касании/клике/скролле, пока реально не заиграет (энергосбережение iOS,
      // экономия трафика Android и т.п. отклоняют первые попытки)
      const tryPlay = () => { if (heroVideo.paused) { const p = heroVideo.play(); if (p) p.catch(() => {}); } };
      const gestures = ['click', 'touchstart', 'touchend', 'scroll'];
      heroVideo.addEventListener('loadeddata', tryPlay);
      heroVideo.addEventListener('canplay', tryPlay);
      gestures.forEach(ev => document.addEventListener(ev, tryPlay, { passive: true }));
      heroVideo.addEventListener('playing', () => {
        gestures.forEach(ev => document.removeEventListener(ev, tryPlay));
      }, { once: true });
    }

    // Пин-зум героя — только на десктопе/планшете (на мобильных pinned-scroll дёргается)
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    if (hero && heroVideo && isDesktop) {
      // настраиваемые параметры (можно править панелью ?tune)
      let zoomVal = 1.9;

      // scrub 0.3 (было 1): при быстрой прокрутке анимация запаздывала на ~1с,
      // пин отпускал хиро раньше, чем затемнение доходило до конца, —
      // полупрозрачное видео «отклеивалось» рывком
      // 170% — исходная неспешность зума; черноту режем не дистанцией,
      // а поздним стартом затемнения (см. тайминги хвоста ниже)
      const tl = gsap.timeline({
        scrollTrigger: { trigger: hero, start: 'top top', end: '+=170%', scrub: 0.3, pin: true, anticipatePin: 1 }
      });
      // приближение к камину: масштаб видео растёт
      tl.to('.hero__video', { scale: () => zoomVal, ease: 'none' }, 0)
        .to('.hero__video', { filter: 'brightness(1.05) saturate(1.15)', ease: 'none' }, 0)
        .to('.hero__glow', { scale: 1.15, opacity: 1, ease: 'power1.in' }, 0)
        .to('.hero__content', { y: -80, opacity: 0, ease: 'power1.in' }, 0)
        .to('.scroll-hint', { opacity: 0, duration: .12 }, 0)
        // в конце кадр продолжает движение — уходит ВВЕРХ и параллельно затемняется;
        // затемнение завершается к 85% дистанции пина: достаточно поздно, чтобы
        // чернота не тянулась, и с запасом от рывка при резком скролле (scrub 0.3)
        .to('.hero__video', { yPercent: -68, ease: 'power1.in', duration: .45 }, .5)
        .to('.hero__fadeout', { opacity: 1, ease: 'sine.in', duration: .3 }, .55);

      // ---- скрытый настройщик: открывается через ?tune ----
      const tuner = $('.ctrls');
      if (tuner) {
        const zoom = $('#tZoom'), ox = $('#tX'), oy = $('#tY');
        const zv = $('#tZv'), xv = $('#tXv'), yv = $('#tYv');
        const apply = () => {
          zoomVal = parseFloat(zoom.value);
          zv.textContent = zoomVal.toFixed(2) + '×'; xv.textContent = ox.value + '%'; yv.textContent = oy.value + '%';
          document.documentElement.style.setProperty('--zoom-origin', ox.value + '% ' + oy.value + '%');
          ScrollTrigger.refresh();
        };
        [zoom, ox, oy].forEach(el => el.addEventListener('input', apply));
        if (/[?&]tune/.test(location.search)) tuner.classList.add('show');
        apply();
      }
    }

    /* Параллакс фонов отдельных секций */
    $$('[data-parallax]').forEach(el => {
      gsap.to(el, {
        yPercent: parseFloat(el.dataset.parallax) || 12,
        ease: 'none',
        scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    /* Лёгкий зум фонов категорий при появлении */
    ScrollTrigger.refresh();
  });
})();
