(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const store = {
    get: (k, session) => { try { return (session ? sessionStorage : localStorage).getItem(k); } catch { return null; } },
    set: (k, v, session) => { try { (session ? sessionStorage : localStorage).setItem(k, v); } catch { /* storage blocked */ } },
  };
  const body = document.body;
  const loader = $('#loader');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DURATION = 3500;   // loader length, ms (spec: 3–3.8 s)
  const PERIOD = 360;      // texture loop length, must match --P in style.css

  /* ---------- toast for placeholder links ---------- */
  let toastTimer;
  const toast = $('#toast');
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-stub]');
    if (!a) return;
    e.preventDefault();
    toast.textContent = 'Скоро добавим ссылку';
    toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('on'), 2200);
  });

  /* ---------- cookies + analytics slot ---------- */
  const cookie = $('#cookie');
  function loadAnalytics() {
    // Analytics slot: insert Yandex.Metrika / GA4 here (and add its host to the CSP in <head>).
    // Runs only after the visitor accepts cookies.
  }
  function applyConsent() { if (store.get('cookie-consent') === 'all') loadAnalytics(); }
  function choose(v) {
    const withdrawn = v === 'necessary' && store.get('cookie-consent') === 'all';
    store.set('cookie-consent', v);
    cookie.hidden = true;
    $('#cookie-settings').focus();
    if (withdrawn) location.reload(); // drop already-loaded analytics scripts
    else applyConsent();
  }
  $('#cookie-yes').addEventListener('click', () => choose('all'));
  $('#cookie-no').addEventListener('click', () => choose('necessary'));
  $('#cookie-settings').addEventListener('click', () => { cookie.hidden = false; $('#cookie-yes').focus(); });
  applyConsent();

  /* ---------- loader: car driving through a tunnel ---------- */
  const page = $('.page');
  let revealed = false;
  function reveal() {
    if (revealed) return;
    revealed = true;
    loader.setAttribute('aria-busy', 'false');
    body.classList.remove('loading');
    page.inert = false;
    loader.classList.add('is-out');
    setTimeout(() => { loader.hidden = true; }, 800);
    if (!store.get('cookie-consent')) setTimeout(() => { cookie.hidden = false; }, 1500);
  }

  if (reduce) {
    loader.hidden = true;
    if (!store.get('cookie-consent')) cookie.hidden = false;
    return;
  }
  body.classList.add('loading');
  page.inert = true; // keep keyboard focus off the page behind the loader
  setTimeout(reveal, DURATION + 1500); // rAF is paused in background tabs

  const ring = $('#ring');
  const pct = $('#pct');
  const tube = $('.tube');
  const rig = $('.rig');
  const flash = $('.flash');
  const flatTex = [...document.querySelectorAll('.floor .tex, .ceil .tex')];
  const wallTex = [...document.querySelectorAll('.wall .tex')];
  const RING = 276.5;
  const smooth = (x) => x * x * (3 - 2 * x);
  const clamp = (x) => Math.min(Math.max(x, 0), 1);
  // phones / weak CPUs get cheaper effects (see .lite in style.css)
  if (matchMedia('(max-width: 700px), (pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4) {
    loader.classList.add('lite');
  }
  let z = 0;
  let shown = -1;
  let flashOn = false;
  let last = performance.now();
  const t0 = last;

  (function frame(now) {
    const t = clamp((now - t0) / DURATION);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    z = (z + (260 + 3000 * t ** 3) * dt) % PERIOD;           // tunnel speed accelerates
    const launch = clamp((t - 0.86) / 0.14);                  // final burst of the car
    const k = 0.5 + 2.6 * t;                                  // camera shake grows with speed
    const sx = Math.sin(now / 37) * k + Math.sin(now / 91) * k * 0.6;
    const sy = Math.cos(now / 43) * k * 0.8;

    // Write transforms straight to the few animated nodes (no CSS-variable inheritance,
    // so the browser does not restyle the whole loader subtree every frame).
    const fy = `translate3d(0,${(z - PERIOD).toFixed(1)}px,0)`;
    const wx = `translate3d(${(-z).toFixed(1)}px,0,0)`;
    for (const e of flatTex) e.style.transform = fy;
    for (const e of wallTex) e.style.transform = wx;
    tube.style.transform = `translate3d(${sx.toFixed(2)}px,${sy.toFixed(2)}px,0) rotate(${(sx * 0.05).toFixed(3)}deg)`;
    rig.style.transform = `translate3d(0,0,${(-200 - 140 * t - 5200 * launch ** 3).toFixed(1)}px)`;
    const f = clamp((launch - 0.3) / 0.55);
    if (f > 0 || flashOn) { flash.style.opacity = f.toFixed(3); flashOn = f > 0; }
    ring.style.strokeDashoffset = (RING * (1 - smooth(t))).toFixed(1);
    const p = Math.round(smooth(t) * 100);
    if (p !== shown) { pct.textContent = p; shown = p; }

    if (t < 1) requestAnimationFrame(frame);
    else reveal();
  })(t0);
})();
