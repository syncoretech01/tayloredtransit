/* ==========================================================================
   TAYLORED TRANSIT — interaction layer

   Motion policy:
   · Entrance reveals are a single 14px rise + fade, fired ONCE by one
     IntersectionObserver. Never scrubbed, never tied to scroll position.
   · Scroll-driven motion is reserved for exactly two moments — the equipment
     disassembly and the network scroller — plus a gentle hero camera drift.
   · Nothing animates opacity or filters on text while it is being read.
   ========================================================================== */
import { createHero } from './hero-scene.js';
import { createTanker } from './tanker-scene.js';

const { gsap } = window;
gsap.registerPlugin(window.ScrollTrigger, window.ScrollToPlugin);
const ST = window.ScrollTrigger;

const q  = (s, r = document) => r.querySelector(s);
const qa = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE  = window.matchMedia('(pointer:coarse)').matches;

gsap.defaults({ ease: 'power3.out' });
ST.config({ ignoreMobileResize: true });

/* ==========================================================================
   REVEALS — one observer for the whole page, CSS does the animating
   ========================================================================== */
function initReveal(){
  const targets = qa('[data-reveal], [data-stagger]');
  if(REDUCED || !('IntersectionObserver' in window)){
    targets.forEach(t => t.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(entries => {
    for(const entry of entries){
      if(!entry.isIntersecting) continue;
      const el = entry.target;
      if(el.hasAttribute('data-stagger')){
        [...el.children].forEach((kid, i) => kid.style.setProperty('--d', (i * 0.06).toFixed(2) + 's'));
      }
      el.classList.add('in');
      io.unobserve(el);
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  targets.forEach(t => io.observe(t));
}

/* ==========================================================================
   CURSOR
   ========================================================================== */
function initCursor(){
  const dot = q('#cursorDot'), ring = q('#cursorRing'), label = q('#cursorLabel');
  if(!dot || COARSE || REDUCED) return;

  const p = { x: innerWidth / 2, y: innerHeight / 2, rx: innerWidth / 2, ry: innerHeight / 2 };
  window.addEventListener('pointermove', e => { p.x = e.clientX; p.y = e.clientY; }, { passive: true });

  gsap.ticker.add(() => {
    p.rx += (p.x - p.rx) * 0.18;
    p.ry += (p.y - p.ry) * 0.18;
    dot.style.transform  = `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%,-50%)`;
    ring.style.transform = `translate3d(${p.rx}px, ${p.ry}px, 0) translate(-50%,-50%)`;
  });

  const labels = { view: 'EXPLORE', drag: 'DRAG' };
  qa('[data-cursor]').forEach(el => {
    const type = el.dataset.cursor;
    el.addEventListener('pointerenter', () => {
      document.body.classList.add('cur-' + type);
      if(labels[type]) label.textContent = labels[type];
    });
    el.addEventListener('pointerleave', () => document.body.classList.remove('cur-' + type));
  });
}

/* ==========================================================================
   MAGNETIC BUTTONS — primary calls to action only
   ========================================================================== */
function initMagnetic(){
  if(COARSE || REDUCED) return;
  qa('.magnetic').forEach(el => {
    const inner = el.querySelector('span') || el;
    const move = e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * 0.22;
      const y = (e.clientY - (r.top + r.height / 2)) * 0.22;
      gsap.to(el,    { x, y, duration: .6, ease: 'power3.out' });
      gsap.to(inner, { x: x * 0.25, y: y * 0.25, duration: .6, ease: 'power3.out' });
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', () => gsap.to([el, inner], { x: 0, y: 0, duration: .8, ease: 'power3.out' }));
  });
}

/* ==========================================================================
   PRELOADER
   ========================================================================== */
function preload(onDone){
  const pre = q('#preloader');
  const num = q('#preNum'), bar = q('#preBar'), lbl = q('#preLabel');

  const stages = ['INITIALIZING', 'VERIFYING CARRIER AUTHORITY', 'LOADING NETWORK COVERAGE', 'READY'];

  const counter = { v: 0 };
  const tl = gsap.timeline({ onComplete(){ pre.style.display = 'none'; onDone(); } });

  tl.fromTo('.pre__logo', { opacity: 0, y: 16, scale: .97 },
                          { opacity: 1, y: 0, scale: 1, duration: 1.1, ease: 'expo.out' })
    .to(counter, {
      v: 100, duration: 1.5, ease: 'power2.inOut',
      onUpdate(){
        const v = Math.round(counter.v);
        num.textContent = v;
        bar.style.transform = `scaleX(${counter.v / 100})`;
        const s = stages[clamp(Math.floor(v / 26), 0, 3)];
        if(lbl.textContent !== s) lbl.textContent = s;
      }
    }, 0.3)
    .to('.pre__inner', { y: -20, opacity: 0, duration: .6, ease: 'power3.in' }, '+=.1')
    .to('.pre__curtain', { yPercent: -100, duration: .9, ease: 'expo.inOut' }, '-=.4')
    .add(() => document.body.classList.remove('is-loading'), '-=.7');

  if(REDUCED) tl.progress(1);
}

/* ==========================================================================
   NAV — one rAF-throttled scroll listener drives nav state + progress bar
   ========================================================================== */
function initNav(){
  const nav = q('#nav'), menu = q('#menu'), burger = q('#burger'), prog = q('#scrollProg');
  let lastY = 0, queued = false, maxScroll = 1;

  const measure = () => { maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight); };
  measure();
  window.addEventListener('resize', measure);
  ST.addEventListener('refresh', measure);

  const frame = () => {
    const y = window.scrollY;
    prog.style.transform = `scaleX(${clamp(y / maxScroll, 0, 1)})`;
    nav.classList.toggle('is-stuck', y > 40);
    nav.classList.toggle('is-hidden', y > lastY && y > 500 && !document.body.classList.contains('menu-open'));
    lastY = y; queued = false;
  };
  window.addEventListener('scroll', () => {
    if(!queued){ queued = true; requestAnimationFrame(frame); }
  }, { passive: true });

  /* mobile menu */
  const links = qa('.menu__link');
  gsap.set(links, { y: 28, opacity: 0 });
  const mtl = gsap.timeline({ paused: true })
    .to('.menu__bg', { clipPath: 'inset(0 0 0% 0)', duration: .7, ease: 'expo.inOut' })
    .to(links, { opacity: 1, y: 0, duration: .6, stagger: .05, ease: 'expo.out' }, '-=.36');

  let open = false;
  const toggle = () => {
    open = !open;
    document.body.classList.toggle('menu-open', open);
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    open ? mtl.play() : mtl.reverse();
  };
  burger?.addEventListener('click', toggle);
  links.forEach(l => l.addEventListener('click', () => open && toggle()));

  /* anchors */
  qa('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      e.preventDefault();
      if(id.length < 2){ gsap.to(window, { scrollTo: 0, duration: 1, ease: 'power3.inOut' }); return; }
      const t = q(id);
      if(t) gsap.to(window, { scrollTo: { y: t, autoKill: false }, duration: 1.1, ease: 'power3.inOut' });
    });
  });

}

/* ==========================================================================
   HERO
   ========================================================================== */
function initHero(hero){
  gsap.set('.hero__title .line > span', { yPercent: 115 });
  gsap.set(['.hero__eyebrow', '.hero__lede'], { opacity: 0, y: 18 });
  gsap.set('.hero__cta > *', { opacity: 0, y: 20 });
  gsap.set('.hud__item', { opacity: 0, x: 20 });
  gsap.set('.hero__scroll, .hero__ticker', { opacity: 0 });

  gsap.timeline({ defaults: { ease: 'expo.out' } })
    .to('.hero__eyebrow', { opacity: 1, y: 0, duration: .8 })
    .to('.hero__title .line > span', { yPercent: 0, duration: 1.2, stagger: .075 }, '-=.55')
    .to('.hero__lede', { opacity: 1, y: 0, duration: .8 }, '-=.75')
    .to('.hero__cta > *', { opacity: 1, y: 0, duration: .7, stagger: .07 }, '-=.6')
    .to('.hud__item', { opacity: 1, x: 0, duration: .7, stagger: .07 }, '-=.6')
    .to('.hero__scroll, .hero__ticker', { opacity: 1, duration: .6 }, '-=.45');

  hero.reveal(gsap);

  // [ScrollTrigger 1/3] gentle camera drift — WebGL only, no DOM, no text
  ST.create({
    trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true,
    onUpdate: self => hero.setScroll(self.progress)
  });

  marquee(q('#tickerTrack'), [
    'DOT-407 STAINLESS', 'DOT-412 CORROSIVE', 'ISO TANK DRAYAGE', 'TIME-CRITICAL',
    'HAZMAT ENDORSED', 'STEAM JACKETED', 'CROSS-BORDER CA / MX', '24/7 DISPATCH',
    'FOOD-GRADE SANITARY', 'PLANT-TO-PLANT SHUTTLE'
  ]);
}

/* width is measured on resize only — never inside the tick */
function marquee(track, items, speed = 48){
  if(!track || REDUCED) return;
  const html = items.map(t => `<span>${t}</span>`).join('');
  track.innerHTML = html + html + html;

  let half = 0, x = 0, live = true;
  const measure = () => { half = track.scrollWidth / 3; };
  measure();
  window.addEventListener('resize', measure);

  if('IntersectionObserver' in window){
    new IntersectionObserver(([e]) => { live = e.isIntersecting; }, { threshold: 0 })
      .observe(track.parentElement || track);
  }
  gsap.ticker.add((time, delta) => {
    if(!live || !half) return;
    x -= (speed * delta) / 1000;
    if(x <= -half) x += half;
    track.style.transform = `translate3d(${x}px,0,0)`;
  });
}

/* ==========================================================================
   EQUIPMENT ANATOMY — signature scroll moment 1 of 2
   ========================================================================== */
function initAnatomy(tanker){
  const hots = qa('.ana__hot');
  const bar = q('#anaProg'), txt = q('#anaProgTxt');
  tanker.bindHotspots(hots);
  hots.forEach(h => { h.style.opacity = 0; });

  const flat = document.documentElement.classList.contains('no-webgl');
  const compact = window.matchMedia('(max-width:900px)');
  const states = ['ASSEMBLED', 'RELEASING', 'DISASSEMBLED — 06 SYSTEMS'];
  let lastState = -1;

  // [ScrollTrigger 2/3]
  ST.create({
    trigger: '.anatomy', start: 'top top', end: 'bottom bottom', scrub: .6,
    onUpdate(self){
      const p = self.progress;
      tanker.setExplode(gsap.utils.clamp(0, 1, gsap.utils.mapRange(0.12, 0.52, 0, 1, p)));
      bar.style.transform = `scaleX(${p})`;

      const st = p < 0.14 ? 0 : p < 0.5 ? 1 : 2;
      if(st !== lastState){ lastState = st; txt.textContent = states[st]; }

      if(compact.matches){
        const seg = gsap.utils.clamp(0, 0.999, gsap.utils.mapRange(0.22, 0.92, 0, 1, p));
        const active = Math.floor(seg * hots.length);
        hots.forEach((el, i) => { el.style.opacity = (p > 0.2 && i === active) ? 1 : 0; });
      }else{
        hots.forEach((el, i) => {
          const start = flat ? 0.14 + i * 0.08 : 0.3 + i * 0.06;
          el.style.opacity = gsap.utils.clamp(0, 1, gsap.utils.mapRange(start, start + 0.06, 0, 1, p));
        });
      }
    }
  });
}

/* ==========================================================================
   NETWORK — signature scroll moment 2 of 2
   ========================================================================== */
function initNetwork(){
  const pin = q('#netPin'), track = q('#netTrack');
  if(!pin || !track) return;
  const dist = () => Math.max(0, track.scrollWidth - innerWidth + 40);

  // [ScrollTrigger 3/3]
  gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: {
      trigger: '.network', start: 'top top',
      end: () => '+=' + (dist() + innerHeight * 0.2),
      pin, scrub: .6, invalidateOnRefresh: true, anticipatePin: 1
    }
  });
}

/* ==========================================================================
   COUNTERS
   ========================================================================== */
function initCounters(){
  const els = qa('.count');
  if(!els.length) return;
  if(REDUCED || !('IntersectionObserver' in window)){
    els.forEach(el => { el.textContent = (el.dataset.prefix || '') + el.dataset.count; });
    return;
  }
  const io = new IntersectionObserver(entries => {
    for(const e of entries){
      if(!e.isIntersecting) continue;
      const el = e.target;
      io.unobserve(el);
      const end = parseFloat(el.dataset.count), pre = el.dataset.prefix || '';
      const o = { v: 0 };
      gsap.to(o, { v: end, duration: 1.6, ease: 'power2.out', onUpdate(){ el.textContent = pre + Math.round(o.v); } });
    }
  }, { threshold: 0.4 });
  els.forEach(el => io.observe(el));
}

/* ==========================================================================
   FLEET — user-driven, not scroll-driven
   ========================================================================== */
function initFleet(){
  const ring = q('#fleetRing'), stage = q('#fleetStage');
  const cards = qa('.fcard', ring || document);
  const dotsWrap = q('#fleetDots');
  if(!ring || !cards.length) return;

  const n = cards.length, step = 360 / n;
  let radius = 0, index = 0, rot = 0, autoT = null;

  const layout = () => {
    radius = Math.round((cards[0].offsetWidth / 2) / Math.tan(Math.PI / n) * 1.28);
    cards.forEach((c, i) => { c.style.transform = `rotateY(${i * step}deg) translateZ(${radius}px)`; });
  };

  const dots = cards.map((_, i) => {
    const b = document.createElement('button');
    b.setAttribute('aria-label', 'Equipment class ' + (i + 1));
    b.addEventListener('click', () => go(i, true));
    dotsWrap.appendChild(b);
    return b;
  });

  const paint = () => {
    const active = ((index % n) + n) % n;
    cards.forEach((c, i) => c.classList.toggle('is-active', i === active));
    dots.forEach((d, i) => d.classList.toggle('on', i === active));
  };

  function go(i, user){
    index = i; rot = -index * step;
    gsap.to(ring, { rotateY: rot, duration: .9, ease: 'power3.out' });
    paint();
    if(user) restart();
  }
  const next = () => go(index + 1), prev = () => go(index - 1);
  q('#fleetNext')?.addEventListener('click', () => { next(); restart(); });
  q('#fleetPrev')?.addEventListener('click', () => { prev(); restart(); });

  let dragging = false, startX = 0, startRot = 0;
  const down = e => {
    dragging = true;
    startX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    startRot = rot; gsap.killTweensOf(ring); stop();
  };
  const move = e => {
    if(!dragging) return;
    const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    rot = startRot + (x - startX) * 0.22;
    gsap.set(ring, { rotateY: rot });
  };
  const up = () => { if(dragging){ dragging = false; go(Math.round(-rot / step), true); } };
  stage.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('pointerup', up);
  stage.addEventListener('touchstart', down, { passive: true });
  stage.addEventListener('touchmove', move, { passive: true });
  stage.addEventListener('touchend', up);

  const stop = () => { if(autoT){ clearInterval(autoT); autoT = null; } };
  const restart = () => { stop(); if(!REDUCED) autoT = setInterval(next, 6000); };

  layout(); paint();
  window.addEventListener('resize', () => { layout(); gsap.set(ring, { rotateY: rot }); });

  if('IntersectionObserver' in window){
    new IntersectionObserver(([e]) => e.isIntersecting ? restart() : stop(), { threshold: 0.25 }).observe(stage);
  }
  window.addEventListener('keydown', e => {
    const r = stage.getBoundingClientRect();
    if(r.bottom < 0 || r.top > innerHeight) return;
    if(e.key === 'ArrowRight'){ next(); restart(); }
    if(e.key === 'ArrowLeft'){ prev(); restart(); }
  });
}

/* ==========================================================================
   QUOTE FORM
   ========================================================================== */
function initForm(){
  const form = q('#quoteForm'), note = q('#formNote');
  if(!form) return;
  const selected = new Set();

  qa('.chip').forEach(c => c.addEventListener('click', () => {
    c.classList.toggle('on');
    c.classList.contains('on') ? selected.add(c.dataset.chip) : selected.delete(c.dataset.chip);
  }));

  form.addEventListener('submit', e => {
    e.preventDefault();
    let bad = null;
    qa('input[required], textarea[required]', form).forEach(input => {
      const field = input.closest('.field');
      const ok = input.type === 'email'
        ? /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim())
        : input.value.trim().length > 1;
      field.classList.toggle('err', !ok);
      if(!ok && !bad) bad = field;
    });

    if(bad){
      note.textContent = 'PLEASE COMPLETE THE HIGHLIGHTED FIELDS';
      note.className = 'quote__note mono bad';
      bad.querySelector('input, textarea')?.focus();
      return;
    }

    const btn = q('button[type=submit] span', form);
    btn.textContent = 'Sending…';
    note.className = 'quote__note mono';
    note.textContent = 'TRANSMITTING REQUEST';

    // front-end only — wire this to your CRM / mail endpoint
    setTimeout(() => {
      btn.textContent = 'Request Received';
      note.textContent = `THANK YOU — DISPATCH WILL RESPOND SHORTLY${selected.size ? ' · ' + [...selected].join(' · ').toUpperCase() : ''}`;
      note.className = 'quote__note mono ok';
      form.reset();
    }, 900);
  });

  qa('.field input, .field textarea', form).forEach(i =>
    i.addEventListener('input', () => i.closest('.field').classList.remove('err')));
}

/* ==========================================================================
   BOOT
   ========================================================================== */
const NOOP_HERO   = { tick(){}, setScroll(){}, reveal(){}, pause(){}, resume(){} };
const NOOP_TANKER = { tick(){}, setExplode(){}, bindHotspots(){}, partCount: 0 };

function safe(fn, fallback){
  try{ return fn() || fallback; }
  catch(err){ console.warn('3D module failed to start:', err); return fallback; }
}

function boot(){
  const hero   = safe(() => createHero(q('#heroCanvas')), NOOP_HERO);
  const tanker = safe(() => createTanker(q('#anaCanvas')), NOOP_TANKER);
  document.documentElement.classList.toggle('no-webgl', hero === NOOP_HERO || tanker === NOOP_TANKER);

  // each scene renders only while its own section is on screen
  let heroOn = true, anaOn = false;
  if('IntersectionObserver' in window){
    new IntersectionObserver(([e]) => { heroOn = e.isIntersecting; }, { threshold: 0 }).observe(q('.hero'));
    new IntersectionObserver(([e]) => { anaOn  = e.isIntersecting; }, { threshold: 0 }).observe(q('.anatomy'));
  }
  gsap.ticker.add(() => { if(heroOn) hero.tick(); if(anaOn) tanker.tick(); });

  initReveal();
  initCursor();
  initNav();
  initAnatomy(tanker);
  initNetwork();
  initCounters();
  initFleet();
  initForm();
  initMagnetic();

  const y = q('#year'); if(y) y.textContent = new Date().getFullYear();

  preload(() => { initHero(hero); ST.refresh(); });
  window.addEventListener('load', () => ST.refresh());
  document.fonts?.ready.then(() => ST.refresh());
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
