/* TGR Haas F1 Team concept — interactions. No dependencies. */
(() => {
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---- preloader: five lights, then lights out (first page of a session only) ---- */
  const seen = root.classList.contains('seen');
  const go = () => {
    root.classList.add('ready');
    try { sessionStorage.setItem('haas-seen', '1'); } catch (e) {}
  };
  if (seen || reduce) go();
  else setTimeout(go, 1500);

  /* ---- split headings into masked lines ---- */
  $$('[data-split]').forEach((el) => {
    el.innerHTML = el.innerHTML
      .split(/<br\s*\/?>/i)
      .map((l, i) => `<span class="ln"><span class="ln__i" style="--i:${i}">${l}</span></span>`)
      .join('');
  });

  /* ---- scroll reveals ---- */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      $$('[data-count]', e.target).concat(e.target.matches('[data-count]') ? [e.target] : []).forEach(count);
      io.unobserve(e.target);
    }),
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
  );
  const observeAll = () => $$('[data-reveal], [data-split]').forEach((el) => io.observe(el));
  // Hold reveals until the preloader has lifted so the first screen animates in view.
  setTimeout(observeAll, seen || reduce ? 0 : 1650);

  /* ---- number counters ---- */
  function count(el) {
    if (el.dataset.done) return;
    el.dataset.done = 1;
    const end = +el.dataset.count;
    if (reduce || !isFinite(end)) return;
    const start = end > 1900 && end < 2100 ? end - 40 : 0;
    const t0 = performance.now();
    const dur = 1400;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(lerp(start, end, 1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---- menu ---- */
  const menu = $('#menu');
  const mbtn = $('.menubtn');
  const setMenu = (open) => {
    mbtn.setAttribute('aria-expanded', open);
    $('.menubtn__txt').textContent = open ? 'Close' : 'Menu';
    if (open) menu.hidden = false;
    requestAnimationFrame(() => menu.classList.toggle('is-open', open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (!open) setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 650);
  };
  mbtn.addEventListener('click', () => setMenu(mbtn.getAttribute('aria-expanded') !== 'true'));
  addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));

  /* ---- header hides on scroll down, returns on scroll up ---- */
  const hdr = $('.hdr');
  let lastY = 0;
  addEventListener('scroll', () => {
    const y = scrollY;
    hdr.classList.toggle('is-hidden', y > 400 && y > lastY && mbtn.getAttribute('aria-expanded') !== 'true');
    lastY = y;
  }, { passive: true });

  /* ---- countdown ---- */
  const two = (n) => String(n).padStart(2, '0');
  const cd = $('[data-countdown]');
  const target = new Date(cd ? cd.dataset.countdown : '2026-11-22T04:00:00Z').getTime();
  const shorts = $$('[data-countdown-short]');
  const tick = () => {
    let s = Math.max(0, Math.floor((target - Date.now()) / 1000));
    const dd = Math.floor(s / 86400); s -= dd * 86400;
    const hh = Math.floor(s / 3600); s -= hh * 3600;
    const mm = Math.floor(s / 60); s -= mm * 60;
    $$('[data-countdown]').forEach((c) => {
      $('[data-u=d]', c).textContent = two(dd); $('[data-u=h]', c).textContent = two(hh);
      $('[data-u=m]', c).textContent = two(mm); $('[data-u=s]', c).textContent = two(s);
    });
    const txt = target <= Date.now() ? 'Race week done' : `${dd}d ${two(hh)}h ${two(mm)}m`;
    shorts.forEach((el) => (el.textContent = txt));
  };
  tick();
  setInterval(tick, 1000);

  /* ---- show the race start in the visitor's own time zone ---- */
  $$('[data-localtime]').forEach((el) => {
    try {
      const dt = new Date(el.dataset.localtime);
      const fmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
      el.textContent = `${fmt.format(dt)} · your time`;
    } catch (e) {}
  });

  /* ---- custom cursor + magnetic buttons ---- */
  if (fine && !reduce) {
    const cur = $('.cursor');
    const label = $('.cursor__label');
    let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
    addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; cur.classList.add('is-live'); }, { passive: true });
    document.addEventListener('mouseleave', () => cur.classList.remove('is-live'));
    const loop = () => {
      cx = lerp(cx, mx, 0.22); cy = lerp(cy, my, 0.22);
      cur.style.transform = `translate3d(${cx}px,${cy}px,0)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener('mouseover', (e) => {
      const lab = e.target.closest('[data-cursor]');
      const link = e.target.closest('a, button');
      cur.classList.toggle('is-label', !!lab);
      cur.classList.toggle('is-link', !lab && !!link);
      if (lab) label.textContent = lab.dataset.cursor;
    });
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.2}px,${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transition = 'transform .6s cubic-bezier(.2,.8,.2,1)'; el.style.transform = ''; setTimeout(() => (el.style.transition = ''), 600); });
    });
  }

  /* ---- hero: blob that reveals the red layer under the cursor ---- */
  const hero = $('[data-hero]');
  if (hero) {
    const under = $('.hero__layer--under', hero);
    // three trailing circles at different speeds read as one soft, stretchy blob
    const blobs = [{ k: 0.16, r: 0.17 }, { k: 0.09, r: 0.125 }, { k: 0.05, r: 0.085 }].map((b) => ({ ...b, x: 0, y: 0 }));
    let tx = 0, ty = 0, driven = false, size = 0, t = 0, visible = true;
    const rect = () => hero.getBoundingClientRect();
    hero.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const r = rect(); tx = e.clientX - r.left; ty = e.clientY - r.top; driven = true;
    });
    hero.addEventListener('pointerleave', () => (driven = false));
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(hero);
    const init = rect();
    blobs.forEach((b) => { b.x = init.width * 0.72; b.y = init.height * 0.6; });
    const frame = () => {
      requestAnimationFrame(frame);
      if (!visible) return;
      const r = rect();
      t += 0.008;
      if (!driven) { // idle: wander on its own, so touch devices still get the effect
        tx = r.width * (0.62 + 0.26 * Math.sin(t * 1.3));
        ty = r.height * (0.56 + 0.22 * Math.cos(t * 1.7));
      }
      size = lerp(size, root.classList.contains('ready') ? 1 : 0, 0.04);
      const base = Math.min(r.width, r.height * 1.4);
      blobs.forEach((b, i) => {
        b.x = lerp(b.x, tx, b.k); b.y = lerp(b.y, ty, b.k);
        under.style.setProperty(`--x${i + 1}`, b.x.toFixed(1) + 'px');
        under.style.setProperty(`--y${i + 1}`, b.y.toFixed(1) + 'px');
        under.style.setProperty(`--r${i + 1}`, (base * b.r * size * (1 + 0.06 * Math.sin(t * 6 + i * 2))).toFixed(1) + 'px');
      });
    };
    if (reduce) { under.style.setProperty('--r1', '0px'); } else frame();
  }

  /* ---- scroll-driven bits: word fill + car drift ---- */
  const fills = $$('[data-wordfill]').map((el) => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
    return { el, words: $$('.w', el) };
  });
  const par = $$('[data-parallax]');
  const onScroll = () => {
    const vh = innerHeight;
    fills.forEach(({ el, words }) => {
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < n));
    });
    if (!reduce) par.forEach((el) => {
      const r = el.getBoundingClientRect();
      const p = (r.top + r.height / 2 - vh / 2) / vh;
      const car = el.firstElementChild;
      if (car) car.style.transform = `translateX(${(-p * 9).toFixed(2)}%)`;
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---- car explorer ---- */
  const exp = $('[data-explorer]');
  if (exp) {
    const hots = $$('[data-hot]', exp);
    let cur = 0;
    const show = (i) => {
      cur = (i + hots.length) % hots.length;
      hots.forEach((h, j) => h.classList.toggle('is-on', j === cur));
      $$('[data-hotcard]', exp).forEach((c, j) => c.classList.toggle('is-on', j === cur));
    };
    hots.forEach((h, i) => h.addEventListener('click', () => show(i)));
    $('[data-hotnext]', exp).addEventListener('click', () => show(cur + 1));
    $('[data-hotprev]', exp).addEventListener('click', () => show(cur - 1));
  }

  /* ---- calendar filter ---- */
  $$('[data-filter]').forEach((b) => b.addEventListener('click', () => {
    $$('[data-filter]').forEach((x) => x.classList.toggle('is-on', x === b));
    const f = b.dataset.filter;
    $$('.cal__row').forEach((row) => {
      const keep = f === 'all' || (f === 'upcoming' && row.dataset.state === 'upcoming') || (f === 'highlights' && row.dataset.hl === '1');
      row.classList.toggle('is-out', !keep);
      if (keep) row.classList.add('is-in');
    });
  }));

  /* ---- newsletter (front-end only in this concept) ---- */
  $$('[data-newsletter]').forEach((form) => form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('input', form);
    const msg = $('.nl__msg', form);
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
    msg.classList.toggle('ok', ok);
    msg.textContent = ok ? 'You’re on the list. See you on the grid.' : 'That email doesn’t look right — try again.';
    if (ok) input.value = '';
  }));
})();
