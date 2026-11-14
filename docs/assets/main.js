/* TGR Haas F1 Team concept — page interactions. No dependencies.
   The 3D car lives in car3d.js and is only loaded on pages that use it. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* header: solid once you leave the top, hides while scrolling down */
  const hdr = $('.hdr');
  const mbtn = $('.hdr__menu');
  const menu = $('#menu');
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY, open = mbtn.getAttribute('aria-expanded') === 'true';
    hdr.classList.toggle('is-solid', y > 24 || open);
    hdr.classList.toggle('is-hidden', !open && y > 500 && y > lastY + 4);
    if (y < lastY - 4) hdr.classList.remove('is-hidden');
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* mobile menu */
  const setMenu = (open) => {
    mbtn.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) { menu.hidden = false; requestAnimationFrame(() => menu.classList.add('is-open')); }
    else { menu.classList.remove('is-open'); setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 300); }
    onScroll();
  };
  mbtn.addEventListener('click', () => setMenu(mbtn.getAttribute('aria-expanded') !== 'true'));
  addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));

  /* headings: split on line breaks so each line rises out of a mask */
  $$('.sh__t, .phero__t').forEach((el) => {
    el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i).map((l, i) => `<span class="ln"><span style="--i:${i}">${l}</span></span>`).join('');
  });
  $$('.tbl-wrap').forEach((w) => { w.setAttribute('data-reveal', ''); $$('tbody tr', w).forEach((tr, i) => tr.style.setProperty('--i', i)); });

  /* scroll progress bar and gentle parallax on full-bleed photos */
  const prog = $('.prog');
  const layers = reduce ? [] : $$('.hero__bg');
  const onMove = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (prog) prog.style.setProperty('--p', max > 0 ? (scrollY / max).toFixed(4) : 0);
    layers.forEach((el) => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const t = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      el.style.transform = `translate3d(0, ${(Math.max(0, -t) * 9).toFixed(2)}%, 0)`;
    });
  };
  addEventListener('scroll', onMove, { passive: true });
  addEventListener('resize', onMove);
  onMove();

  /* reveal on scroll */
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    $$('[data-count]', e.target).forEach(count);
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
  $$('[data-reveal]').forEach((el) => io.observe(el));

  function count(el) {
    const end = +el.dataset.count;
    if (reduce || !isFinite(end) || el.dataset.done) return;
    el.dataset.done = 1;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / 1200);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* countdown to lights out */
  const two = (n) => String(n).padStart(2, '0');
  const cds = $$('[data-countdown]');
  const shorts = $$('[data-countdown-short]');
  const target = new Date(cds[0] ? cds[0].dataset.countdown : '2026-11-22T04:00:00Z').getTime();
  const tick = () => {
    let s = Math.max(0, Math.floor((target - Date.now()) / 1000));
    const over = s === 0;
    const dd = Math.floor(s / 86400); s -= dd * 86400;
    const hh = Math.floor(s / 3600); s -= hh * 3600;
    const mm = Math.floor(s / 60); s -= mm * 60;
    cds.forEach((c) => [['d', dd], ['h', hh], ['m', mm], ['s', s]].forEach(([u, v]) => {
      const el = $(`[data-u=${u}]`, c), txt = two(v);
      if (el.textContent === txt) return;
      el.textContent = txt;
      if (!reduce) { el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); }
    }));
    shorts.forEach((el) => (el.textContent = over ? 'Lights out' : `${dd}d ${two(hh)}h ${two(mm)}m`));
  };
  tick();
  setInterval(tick, 1000);

  /* race start in the visitor's own time zone */
  $$('[data-localtime]').forEach((el) => {
    try {
      const f = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
      el.textContent = `${f.format(new Date(el.dataset.localtime))} (your time)`;
    } catch (e) {}
  });

  /* live local time at each base */
  const clocks = $$('time[data-tz]');
  if (clocks.length) {
    const paint = () => clocks.forEach((el) => {
      try { el.textContent = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: el.dataset.tz }).format(new Date()); } catch (e) {}
    });
    paint();
    setInterval(paint, 15000);
  }

  /* cards that light up under the cursor, and portraits that lean toward it */
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine) {
    $$('.face, .duo__c, .pgrid a, .people li, .tiles > div, .reel__c, .mode, .moves li').forEach((el) => {
      el.classList.add('spot');
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', e.clientX - r.left + 'px');
        el.style.setProperty('--my', e.clientY - r.top + 'px');
      });
    });
    if (!reduce) $$('.face').forEach((el) => {
      el.classList.add('tilt');
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(900px) rotateY(' + (px * 5).toFixed(2) + 'deg) rotateX(' + (-py * 4).toFixed(2) + 'deg)';
      });
      el.addEventListener('pointerleave', () => (el.style.transform = ''));
    });
  }

  /* season reel: arrows, drag to scroll, and start on the next race */
  $$('[data-reel]').forEach((reel) => {
    const track = $('.reel__track', reel), prev = $('[data-reel-prev]', reel), next = $('[data-reel-next]', reel);
    const step = () => Math.max(260, track.clientWidth * 0.7);
    const sync = () => { prev.disabled = track.scrollLeft < 4; next.disabled = track.scrollLeft > track.scrollWidth - track.clientWidth - 4; };
    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: reduce ? 'auto' : 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: reduce ? 'auto' : 'smooth' }));
    track.addEventListener('scroll', sync, { passive: true });
    const cur = $('[data-reel-next-race]', track);
    if (cur) track.scrollLeft = Math.max(0, cur.offsetLeft - track.offsetLeft - track.clientWidth / 2 + cur.clientWidth / 2);
    sync();
    let down = false, x0 = 0, s0 = 0, moved = 0;
    track.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; moved = 0; x0 = e.clientX; s0 = track.scrollLeft; });
    addEventListener('pointermove', (e) => { if (!down) return; moved = Math.abs(e.clientX - x0); if (moved > 4) track.classList.add('is-drag'); track.scrollLeft = s0 - (e.clientX - x0); });
    addEventListener('pointerup', () => { down = false; track.classList.remove('is-drag'); });
  });

  /* line chart: crosshair and tooltip that follow the pointer, round by round */
  $$('[data-chart]').forEach((fig) => {
    const cfg = JSON.parse($('script[type="application/json"]', fig).textContent);
    const svg = $('svg', fig), hover = $('.chart__hover', fig), tip = $('.chart__tip', fig), plot = $('.chart__plot', fig);
    const cross = $('.chart__cross', hover), dots = $$('.chart__dot', hover);
    const x = (i) => cfg.L + ((cfg.W - cfg.L - cfg.R) * i) / cfg.n, y = (v) => cfg.T + (cfg.H - cfg.T - cfg.B) * (1 - v / cfg.max);
    const show = (clientX) => {
      const r = svg.getBoundingClientRect();
      const vx = ((clientX - r.left) / r.width) * cfg.W;
      const i = Math.min(cfg.rows.length, Math.max(1, Math.round(((vx - cfg.L) / (cfg.W - cfg.L - cfg.R)) * cfg.n)));
      const q = cfg.rows[i - 1];
      hover.removeAttribute('hidden'); tip.hidden = false;
      cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i));
      dots[0].setAttribute('cx', x(i)); dots[0].setAttribute('cy', y(q.a));
      dots[1].setAttribute('cx', x(i)); dots[1].setAttribute('cy', y(q.h));
      tip.innerHTML = '<b>Round ' + q.r + ' · ' + q.gp + '</b>' +
        '<p><i style="background:var(--c-haas)"></i>Haas<strong>' + q.h + '</strong><em>+' + q.dh + '</em></p>' +
        '<p><i style="background:var(--c-audi)"></i>Audi<strong>' + q.a + '</strong><em>+' + q.da + '</em></p>';
      const px = (x(i) / cfg.W) * r.width, w = tip.offsetWidth;
      tip.style.left = Math.min(plot.clientWidth - w, Math.max(0, px + 14 + w > plot.clientWidth ? px - w - 14 : px + 14)) + 'px';
    };
    const hide = () => { hover.setAttribute('hidden', ''); tip.hidden = true; };
    svg.addEventListener('pointermove', (e) => show(e.clientX));
    svg.addEventListener('pointerdown', (e) => show(e.clientX));
    svg.addEventListener('pointerleave', hide);
  });

  /* season table filter */
  $$('[data-filter]').forEach((b) => b.addEventListener('click', () => {
    $$('[data-filter]').forEach((x) => x.classList.toggle('is-on', x === b));
    const f = b.dataset.filter;
    $$('.tbl tbody tr').forEach((tr) => tr.classList.toggle('is-out', !(f === 'all' || (f === 'upcoming' && tr.dataset.state === 'upcoming') || (f === 'points' && tr.dataset.pts === '1'))));
  }));

  /* newsletter: front-end only in this concept */
  $$('[data-newsletter]').forEach((form) => form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('input', form), msg = $('.nl__msg', form);
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
    msg.classList.toggle('ok', ok);
    msg.textContent = ok ? 'You’re on the list.' : 'That email address doesn’t look right.';
    if (ok) input.value = '';
  }));
})();
