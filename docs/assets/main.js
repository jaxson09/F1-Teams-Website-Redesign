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
    cds.forEach((c) => { $('[data-u=d]', c).textContent = two(dd); $('[data-u=h]', c).textContent = two(hh); $('[data-u=m]', c).textContent = two(mm); $('[data-u=s]', c).textContent = two(s); });
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
