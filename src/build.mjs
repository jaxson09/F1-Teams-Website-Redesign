// Static site generator: `node src/build.mjs` writes the HTML pages into /docs.
// No dependencies. Content is in data.mjs; styles and scripts are in docs/assets.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as d from './data.mjs';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');
mkdirSync(out, { recursive: true });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const pad = (n) => String(n).padStart(2, '0');
const C = d.standings.constructors;
const NR = d.nextRace;

/* ---------- shared pieces ---------- */

const arrow = `<svg class="arr" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`;
const link = (href, label, cls = '') => `<a class="cta ${cls}" href="${href}"><span>${label}</span>${arrow}</a>`;
const commons = (file) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`;
const credit = (p) => `<a class="credit" href="${commons(p.file)}" rel="noopener">Photo: ${p.by} · ${p.lic}</a>`;

const photo = (id, { cls = '', sizes = '100vw', eager = false, cap = true, pos = '' } = {}) => {
  const p = d.photos[id];
  return `<figure class="ph ${cls}"><img src="assets/img/${id}-1920.jpg" srcset="assets/img/${id}-960.jpg 960w, assets/img/${id}-1920.jpg 1920w" sizes="${sizes}" alt="${esc(p.alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"${pos ? ` style="object-position:${pos}"` : ''}>${cap ? `<figcaption>${credit(p)}</figcaption>` : ''}</figure>`;
};

const logo = `<span class="logo"><b>HAAS</b><i>TGR · F1 Team</i></span>`;

const head = (title, desc, page, { three = false, dark = true } = {}) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#08080a">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="assets/img/bear1-1920.jpg">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="assets/fonts/archivo.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/style.css">
${three ? `<script type="importmap">{"imports":{"three":"./assets/vendor/three.module.min.js"}}</script>\n<link rel="modulepreload" href="assets/vendor/three.module.min.js">` : ''}
<script>document.documentElement.classList.add('js')</script>
</head>
<body data-page="${page}">
<a class="skip" href="#main">Skip to content</a>
<div class="prog" aria-hidden="true"></div>
<header class="hdr">
  <a class="hdr__logo" href="index.html" aria-label="TGR Haas F1 Team, home">${logo}</a>
  <nav class="hdr__nav" aria-label="Main">${d.nav.slice(1).map((n) => `<a href="${n.href}"${n.href === page ? ' aria-current="page"' : ''}>${n.label}</a>`).join('')}</nav>
  <a class="hdr__race" href="season.html"><span class="live"></span><span>R${NR.round} ${NR.short}</span><b data-countdown-short></b></a>
  <button class="hdr__menu" aria-expanded="false" aria-controls="menu" aria-label="Menu"><i></i><i></i></button>
</header>
<div class="menu" id="menu" hidden>
  <nav aria-label="Mobile">${d.nav.map((n, i) => `<a href="${n.href}" style="--i:${i}"${n.href === page ? ' aria-current="page"' : ''}><small>${pad(i + 1)}</small>${n.label}</a>`).join('')}</nav>
  <p class="menu__foot"><span class="live"></span> Round ${NR.round} · ${NR.name} · ${NR.localLabel}</p>
</div>
<main id="main">`;

const foot = (three) => `</main>
<footer class="ftr">
  <div class="wrap ftr__top">
    <div class="ftr__brand">${logo}<p>Kannapolis · Banbury · Maranello</p></div>
    <form class="nl" data-newsletter novalidate>
      <label for="nl-email">Race previews and results, straight to your inbox</label>
      <div class="nl__row"><input id="nl-email" type="email" name="email" placeholder="Email address" autocomplete="email" required><button type="submit">Subscribe ${arrow}</button></div>
      <p class="nl__msg" role="status" aria-live="polite"></p>
    </form>
  </div>
  <div class="wrap ftr__cols">
    <div><h2>Team</h2>${d.nav.slice(1).map((n) => `<a href="${n.href}">${n.label}</a>`).join('')}</div>
    <div><h2>More</h2><a href="index.html#news">News</a><a href="index.html#store">Store</a><a href="index.html#store">Fan club</a><a href="team.html#careers">Careers</a></div>
    <div><h2>Follow</h2><a href="#">Instagram</a><a href="#">X</a><a href="#">TikTok</a><a href="#">YouTube</a></div>
    <div><h2>Legal</h2><a href="#">Privacy</a><a href="#">Cookies</a><a href="credits.html">Photo credits</a></div>
  </div>
  <div class="wrap ftr__legal">
    <p><strong>Unofficial design concept.</strong> A fan-made redesign exercise, not affiliated with or endorsed by Haas F1 Team, Formula 1 or any partner named. Trademarks belong to their owners. The 3D car is an original model, not team data.</p>
  </div>
</footer>
<script src="assets/main.js" defer></script>
${three ? '<script type="module" src="assets/car3d.js"></script>' : ''}
</body>
</html>`;

const page = (file, title, desc, body, opts = {}) => {
  writeFileSync(join(out, file), head(title, desc, file, opts) + body + foot(opts.three));
  console.log('built', file);
};

const secHead = (label, title, extra = '') => `<header class="sh"><p class="label" data-reveal>${label}</p><h2 class="display sh__t" data-reveal>${title}</h2>${extra}</header>`;

const pageHero = (label, title, sub, img) => `
<section class="phero${img ? ' phero--img' : ''}">
  ${img ? photo(img, { cls: 'phero__bg', eager: true }) : ''}
  <div class="wrap phero__in">
    <p class="label">${label}</p>
    <h1 class="display phero__t">${title}</h1>
    <p class="phero__sub">${sub}</p>
  </div>
</section>`;

/* ---------- reusable sections ---------- */

const countdown = `<div class="cd" data-countdown="${NR.startUTC}" role="timer" aria-label="Countdown to lights out"><div><b data-u="d">00</b><span>Days</span></div><div><b data-u="h">00</b><span>Hours</span></div><div><b data-u="m">00</b><span>Min</span></div><div><b data-u="s">00</b><span>Sec</span></div></div>`;

const raceBlock = (cta = true) => `
<div class="race" data-reveal>
  <p class="label"><span class="live"></span>Next race · Round ${NR.round} of ${NR.total}</p>
  <h3 class="display race__t">${NR.name.replace(' Grand Prix', '')}<small>Grand Prix</small></h3>
  <p class="race__when"><span data-localtime="${NR.startUTC}">${NR.localLabel}</span> · ${NR.circuit}</p>
  ${countdown}
  <dl class="facts">${NR.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
  ${cta ? link('season.html', 'Calendar and results') : ''}
</div>`;

const standBlock = () => `
<div class="stand" data-reveal>
  <p class="label">Constructors’ Championship</p>
  <p class="stand__pos display"><small>P</small>${C.pos}</p>
  <p class="stand__pts"><b>${C.pts}</b> points · ${C.behind.team} ${C.pts - C.behind.pts} behind in eighth</p>
  <ul class="bars">${d.standings.scorers
    .map((s) => `<li><span>${s.name}<em>${s.note}</em></span><i><u style="--w:${(s.pts / C.pts) * 100}%"></u></i><b>${s.pts}</b></li>`)
    .join('')}</ul>
  <p class="fine">${d.site.asOf}</p>
</div>`;

const maxC = d.constructors[0][1];
const champBlock = () => `<ol class="champ">${d.constructors
  .map(([n, p], i) => `<li class="${n === 'Haas' ? 'is-us' : ''}" data-reveal><span>${pad(i + 1)}</span><b>${n}</b><i><u style="--w:${Math.max(0.4, (p / maxC) * 100)}%"></u></i><em>${p}</em></li>`)
  .join('')}</ol>`;
const driversBlock = () => `<ol class="champ champ--d">${d.driversTable
  .map(([pos, n, t, p], i, a) => `${i && pos - a[i - 1][0] > 1 ? '<li class="gap" aria-hidden="true">···</li>' : ''}<li class="${t === 'Haas' ? 'is-us' : ''}" data-reveal><span>${pad(pos)}</span><b>${n}<small>${t}</small></b><em>${p}</em></li>`)
  .join('')}</ol>`;
const champSection = (label) => `
<section class="sec" id="championship">
  <div class="wrap">
    ${secHead(label, 'Where we stand.', `<p class="sh__sub" data-reveal>Seventh, three points clear of Audi, with 69-point Alpine out of reach. Three races decide it.</p>`)}
    <div class="champs">
      <div><p class="label">Constructors · ${d.site.asOf}</p>${champBlock()}</div>
      <div><p class="label">Drivers · leaders and the midfield</p>${driversBlock()}</div>
    </div>
  </div>
</section>`;
const lastBlock = () => `<div class="last" data-reveal><p class="label">Last race · Round ${d.lastRace.round} · ${d.lastRace.date}</p><h3 class="display">${d.lastRace.name}</h3><ul>${d.lastRace.results.map(([n, r]) => `<li><b>${r}</b><span>${n}</span></li>`).join('')}</ul><p>${d.lastRace.note}</p></div>`;
const cls = (v) => (typeof v !== 'number' ? 'ret' : v <= 10 ? 'pts' : 'out');
const res = (v) => (v === undefined ? '' : typeof v === 'number' ? `P${v}` : v);
const formStrip = (label) => `<div class="form" data-reveal>
  <p class="label">${label}</p>
  <ol class="form__s">${d.calendar.map((c, i) => `<li class="${c.a === undefined ? 'tbd' : cls(c.a)}" style="--i:${i}" title="R${c.r} ${c.gp}: ${res(c.a) || 'to come'}"><b>${c.a === undefined ? '' : typeof c.a === 'number' ? c.a : 'R'}</b><span>${c.r}</span></li>`).join('')}</ol>
  <p class="fine"><i class="k pts"></i>Points <i class="k out"></i>Classified <i class="k ret"></i>Retired <i class="k tbd"></i>To come</p>
</div>`;
const driverResults = (x) => {
  if (x.code === 'a') return formStrip('2026 · race finish by round');
  const rs = d.calendar.filter((c) => c.b && c.b[0] === x.who);
  if (!rs.length) return '';
  return `<div class="form" data-reveal><p class="label">2026 · race results</p><ul class="starts">${rs.map((c) => `<li><span class="r r--${cls(c.b[1])}">${res(c.b[1])}</span><b>${c.gp}</b><em>Round ${c.r} · ${c.date}</em></li>`).join('')}</ul></div>`;
};

/* ---------- HOME ---------- */

page(
  'index.html',
  'TGR Haas F1 Team',
  'TGR Haas F1 Team: drivers, the VF-26 in 3D, the 2026 calendar, results, standings and partners. Unofficial design concept.',
  `
<section class="hero">
  ${photo('bear1', { cls: 'hero__bg', eager: true, pos: '40% 50%' })}
  <div class="wrap hero__in">
    <p class="label">2026 FIA Formula One World Championship</p>
    <h1 class="display hero__t"><span>Machined</span><span>to race<i>.</i></span></h1>
  </div>
  <div class="hero__bar">
    <a href="season.html" class="hero__cell hero__cell--wide"><span class="label"><span class="live"></span>Next · R${NR.round} ${NR.short}</span><b data-countdown-short>—</b></a>
    <div class="hero__cell"><span class="label">Constructors</span><b>P${C.pos}</b></div>
    <div class="hero__cell"><span class="label">Points</span><b>${C.pts}</b></div>
    <a href="drivers.html#bearman" class="hero__cell"><span class="label">Leading scorer</span><b>Bearman <small>23</small></b></a>
  </div>
</section>

<section class="sec" id="now">
  <div class="wrap">
    ${secHead('01 · This week', 'Three to go.<br>Seventh to defend.')}
    <div class="now">${raceBlock()}${standBlock()}</div>
    ${lastBlock()}
  </div>
</section>
${champSection('02 · Standings')}

<section class="sec" id="drivers">
  <div class="wrap">
    ${secHead('03 · Drivers', 'Who drives.', `<p class="sh__sub" data-reveal>Bearman leads the scoring. With four race drivers used this season, the limit, the second seat for the last three rounds goes to Hirakawa or Câmara.</p>`)}
    <div class="faces">
      ${d.drivers
        .map(
          (x, i) => `
      <a class="face" href="drivers.html#${x.id}" data-reveal style="--d:${i * 90}ms">
        ${photo(x.portrait, { cls: 'face__ph', sizes: '(min-width: 900px) 25vw, 50vw', cap: false })}
        <div class="face__in">
          <p class="label">${x.role}${x.num ? ` · #${x.num}` : ''}</p>
          <h3 class="display"><small>${x.first}</small>${x.last}</h3>
          <dl class="facts">${x.stats.slice(0, 2).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
        </div>
      </a>`
        )
        .join('')}
    </div>
    <p class="fine">Portraits: Wikimedia Commons, see <a href="credits.html">photo credits</a>. Some pre-date the driver joining the team.</p>
  </div>
</section>

<section class="sec carsec" id="car" data-car-ui>
  <div class="wrap carsec__head">
    ${secHead('04 · The machine', 'VF-26', `<p class="sh__sub" data-reveal>${d.car.intro}</p>`)}
  </div>
  <div class="stage" data-car3d="teaser" aria-label="Interactive 3D model of the VF-26. Drag to rotate.">
    <p class="stage__hint">Drag to rotate</p>
    <noscript>${photo('bear3', { cap: false })}</noscript>
  </div>
  <div class="wrap">
    <div class="kpis">${d.car.kpis.map(([n, u, t]) => `<div data-reveal><p class="display"><span data-count="${n}">${n}</span><small>${u}</small></p><span>${t}</span></div>`).join('')}</div>
    <div class="carsec__cta" data-reveal>${link('car.html', 'Open the full explorer', 'cta--solid')}<p class="fine">X-ray, exploded view and active aero, in your browser.</p></div>
  </div>
</section>

<section class="sec" id="news">
  <div class="wrap">
    ${secHead('05 · News', 'From the garage.')}
    <div class="news">
      <a class="news__lead" href="#news" data-reveal>
        ${photo(d.news[0].photo, { cls: 'news__ph', sizes: '(min-width: 900px) 50vw, 100vw', cap: false })}
        <p class="label">${d.news[0].tag} · ${d.news[0].date}</p>
        <h3>${d.news[0].title}</h3>
      </a>
      <ul class="news__list">${d.news
        .slice(1)
        .map((n) => `<li data-reveal><a href="#news"><p class="label">${n.tag} · ${n.date}</p><h3>${n.title}</h3>${arrow}</a></li>`)
        .join('')}</ul>
    </div>
  </div>
</section>

<section class="band">
  ${photo('bear3', { cls: 'band__bg', pos: '50% 60%' })}
  <div class="wrap band__in">
    <p class="label" data-reveal>06 · Who we are</p>
    <p class="display band__t" data-reveal>The smallest team on the grid. Built across three countries. Racing the biggest names in motorsport since 2016.</p>
    <div class="band__row" data-reveal>
      <dl class="facts facts--lg"><div><dt>First race</dt><dd>2016</dd></div><div><dt>Best result</dt><dd>P4</dd></div><div><dt>Bases</dt><dd>3</dd></div></dl>
      ${link('team.html', 'Our story')}
    </div>
  </div>
</section>

<section class="sec" id="store">
  <div class="wrap duo">
    <a class="duo__c" href="#store" data-reveal><p class="label">07 · Store</p><h3 class="display">The 2026 kit</h3><p>Team polo, race-day jacket and caps, by Castore.</p><span class="cta"><span>Shop the collection</span>${arrow}</span></a>
    <a class="duo__c" href="#store" data-reveal><p class="label">08 · Fan club</p><h3 class="display">Join the pit crew</h3><p>Free membership, ticket ballots and behind-the-garage films.</p><span class="cta"><span>Become a member</span>${arrow}</span></a>
  </div>
</section>

<section class="sec sec--tight">
  <div class="wrap">
    <div class="pstrip__h"><p class="label">09 · Partners</p>${link('partners.html', 'All partners')}</div>
    <ul class="pstrip">${d.partners.flatMap((t) => t.items).map(([n]) => `<li>${n}</li>`).join('')}</ul>
  </div>
</section>
`,
  { three: true }
);

/* ---------- DRIVERS ---------- */

page(
  'drivers.html',
  'Drivers · TGR Haas F1 Team',
  'Oliver Bearman, Rafael Câmara, Ryo Hirakawa and Jack Doohan: the drivers of TGR Haas F1 Team.',
  pageHero('Drivers', 'Who drives.', 'Four drivers are part of the 2026 story. Here is each of them, with the numbers that matter.', 'bear4') +
    `<nav class="subnav" aria-label="Drivers"><div class="wrap">${d.drivers.map((x) => `<a href="#${x.id}">${x.num ? `<small>${x.num}</small>` : ''}${x.last}</a>`).join('')}</div></nav>` +
    d.drivers
      .map(
        (x, i) => `
<section class="prof" id="${x.id}">
  <div class="wrap">
    <div class="prof__head">
      <div>
        <p class="label" data-reveal>${pad(i + 1)} · ${x.role}</p>
        <h2 class="display prof__n" data-reveal><small>${x.first}</small>${x.last}</h2>
      </div>
      ${x.num ? `<p class="prof__num display" aria-label="Car number ${x.num}">${x.num}</p>` : ''}
    </div>
    <div class="prof__media" data-reveal>${photo(x.portrait, { cls: 'prof__ph prof__ph--p', sizes: '(min-width: 1000px) 34vw, 100vw' })}${photo(x.photo, { cls: 'prof__ph', sizes: '(min-width: 1000px) 62vw, 100vw' })}</div>${x.photoNote ? `<p class="fine">${x.photoNote}.</p>` : ''}
    <div class="prof__grid">
      <div>
        <p class="prof__line" data-reveal>${x.line}</p>
        ${x.bio.map((p) => `<p class="prof__bio" data-reveal>${p}</p>`).join('')}
        <p class="fine" data-reveal>${x.country} · Born ${x.born}, ${x.place}</p>
      </div>
      <div>
        <dl class="tiles" data-reveal>${x.stats.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
        <ol class="tl">${x.timeline.map(([y, t]) => `<li data-reveal><b>${y}</b><span>${t}</span></li>`).join('')}</ol>
      </div>
    </div>
    ${driverResults(x)}
  </div>
</section>`
      )
      .join('') +
    `
<section class="sec sec--tight"><div class="wrap note" data-reveal>
  <p class="label">Line-up note</p>
  <p>Esteban Ocon raced for the team in Rounds 1–18 and scored 7 points. The team confirmed he will not return to a race seat this season. Teams may use four race drivers in a season and Haas has used four, so the seat alongside Oliver Bearman for Las Vegas, Qatar and Abu Dhabi goes to Ryo Hirakawa or Rafael Câmara. It had not been announced at the time of writing.</p>
</div></section>`
);

/* ---------- CAR ---------- */

const hs = d.car.hotspots;
page(
  'car.html',
  'VF-26 · TGR Haas F1 Team',
  'Explore the Haas VF-26 in 3D: active aerodynamics, an x-ray of the power unit, an exploded view and the full technical specification.',
  `
<section class="xp" data-car-ui data-aero-mode="corner">
  <div class="xp__stage" data-car3d="explorer" aria-label="Interactive 3D model of the VF-26. Drag to rotate.">
    ${hs.map((h, i) => `<button class="hot${i === 0 ? ' is-on' : ''}" data-hot="${h.id}" aria-label="${esc(h.title)}"><span>${i + 1}</span></button>`).join('')}
    <noscript>${photo('bear3', { cap: false })}</noscript>
  </div>
  <header class="xp__head">
    <p class="label">The machine · 2026</p>
    <h1 class="display xp__t">VF-26</h1>
    <p class="xp__hint">Drag to rotate · tap a number</p>
  </header>
  <aside class="xp__panel" aria-live="polite">
    ${hs
      .map(
        (h, i) => `<article class="xp__card${i === 0 ? ' is-on' : ''}" data-hotcard="${h.id}">
      <p class="label">${pad(i + 1)} / ${pad(hs.length)}</p>
      <h2>${h.title}</h2>
      <p class="xp__stat display">${h.stat[0]}<small>${h.stat[1]}</small></p>
      <p>${h.text}</p>
    </article>`
      )
      .join('')}
    <div class="xp__step"><button data-hotprev aria-label="Previous feature">${arrow}</button><button data-hotnext aria-label="Next feature">${arrow}</button></div>
  </aside>
  <div class="xp__legend" aria-hidden="true">${d.car.inner.map(([n, t, c]) => `<p><i style="background:${c}"></i><b>${n}</b><span>${t}</span></p>`).join('')}</div>
  <div class="xp__dock">
    <div class="seg" role="group" aria-label="Camera view">
      <button class="is-on" data-view="hero">3/4</button><button data-view="side">Side</button><button data-view="front">Front</button><button data-view="rear">Rear</button><button data-view="top">Top</button>
    </div>
    <div class="seg seg--aero" role="group" aria-label="Active aero mode">
      <button class="is-on" data-aero="corner">Corner mode</button><button data-aero="straight">Straight mode</button>
    </div>
    <button class="tog" data-xray aria-pressed="false">X-ray</button>
    <label class="rng"><span>Explode</span><input type="range" min="0" max="100" value="0" data-explode aria-label="Exploded view amount"></label>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    ${secHead('01 · Active aero', 'Two cars in one.', `<p class="sh__sub" data-reveal>DRS is gone. In 2026 every car changes shape on every straight: both wings open to shed drag, then close again for the corner.</p>`)}
    <div class="modes">
      ${Object.entries(d.car.aero)
        .map(
          ([k, m]) => `<div class="mode" data-reveal><p class="label">${k === 'corner' ? 'High downforce' : 'Low drag'}</p><h3 class="display">${m.label}</h3><p>${m.text}</p>
        <ul class="bars bars--lg"><li><span>Drag</span><i><u style="--w:${m.drag}%"></u></i><b>${m.drag}</b></li><li><span>Downforce</span><i><u style="--w:${m.down}%"></u></i><b>${m.down}</b></li></ul></div>`
        )
        .join('')}
    </div>
    <p class="fine" data-reveal>Bars are an illustrative index (corner mode = 100), not measured team data.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    ${secHead('02 · New rules', '2025 against 2026.')}
    <div class="cmp" role="table" aria-label="2025 and 2026 regulations compared">
      <div class="cmp__r cmp__r--h" role="row"><span role="columnheader">Measure</span><span role="columnheader">2025</span><span role="columnheader">2026</span><span role="columnheader">Change</span></div>
      ${d.car.compare
        .map(([l, a, b, u, n]) => {
          const m = Math.max(a, b);
          return `<div class="cmp__r" role="row" data-reveal><span role="cell" class="cmp__l">${l}<em>${n}</em></span>
        <span role="cell" class="cmp__v"><i><u style="--w:${(a / m) * 100}%"></u></i><b>${a}<small>${u}</small></b></span>
        <span role="cell" class="cmp__v cmp__v--new"><i><u style="--w:${(b / m) * 100}%"></u></i><b>${b}<small>${u}</small></b></span>
        <span role="cell" class="cmp__d">${b > a ? '+' : '−'}${Math.abs(Math.round(((b - a) / a) * 100))}%</span></div>`;
        })
        .join('')}
    </div>
  </div>
</section>

<section class="sec">
  <div class="wrap spec">
    ${secHead('03 · Specification', 'Tech sheet.')}
    <dl class="spec__l">${d.car.specs.map(([k, v]) => `<div data-reveal><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
  </div>
</section>

<section class="sec sec--flush">
  <div class="wrap">${secHead('04 · On track', 'The real thing.', `<p class="sh__sub" data-reveal>The VF-26 at the Red Bull Ring, June 2026.</p>`)}</div>
  <div class="gal">${['bear3', 'bear2', 'hira2', 'bear4'].map((id, i) => photo(id, { cls: `gal__i gal__i--${i}`, sizes: '(min-width: 900px) 50vw, 100vw' })).join('')}</div>
</section>
`,
  { three: true }
);

/* ---------- SEASON ---------- */

const done = d.calendar.filter((c) => c.a !== undefined);
const racePts = (c) => d.pts(c.a) + d.pts(c.sa, true) + d.pts(c.b[1]) + d.pts(c.sb, true);
const bea = done.map((c) => c.a);
const fin = bea.filter((v) => typeof v === 'number');
const h2h = done.filter((c) => c.b[0] === 'Ocon').reduce((acc, c) => {
  const a = typeof c.a === 'number' ? c.a : 99, b = typeof c.b[1] === 'number' ? c.b[1] : 99;
  if (a < b) acc[0]++; else if (b < a) acc[1]++;
  return acc;
}, [0, 0]);
const tiles = [
  ['Races run', `${done.length}<small>of ${NR.total}</small>`],
  ['Points', `${C.pts}`],
  ['Best finish', `P${Math.min(...fin)}<small>China</small>`],
  ['Rounds in the points', `${done.filter((c) => racePts(c) > 0).length}`],
  ['Double points', `${done.filter((c) => d.pts(c.a) > 0 && d.pts(c.b[1]) > 0).length}<small>Baku</small>`],
  ['Bearman v Ocon', `${h2h[0]}–${h2h[1]}<small>races, R1–18</small>`],
];

page(
  'season.html',
  '2026 Season · TGR Haas F1 Team',
  'The 2026 Formula 1 calendar, every Haas result, the next race countdown and championship standings.',
  pageHero('2026 season', 'Twenty-three rounds.', `Twenty down, three to go. Seventh in the Constructors’ Championship on ${C.pts} points, three ahead of Audi.`, 'bear2') +
    `
<section class="sec"><div class="wrap now">${raceBlock(false)}${standBlock()}</div></section>

<section class="sec">
  <div class="wrap">
    ${secHead('01 · The season in numbers', 'So far.')}
    <dl class="tiles tiles--6">${tiles.map(([k, v]) => `<div data-reveal><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    ${formStrip('Bearman · race finish by round')}
    </div>
</section>

${champSection('02 · Standings')}

<section class="sec" id="calendar">
  <div class="wrap">
    ${secHead('03 · Calendar and results', 'Every round.', `<div class="seg" role="group" aria-label="Filter rounds" data-reveal><button class="is-on" data-filter="all">All</button><button data-filter="points">Points</button><button data-filter="upcoming">Upcoming</button></div>`)}
    <div class="tbl-wrap">
    <table class="tbl">
      <thead><tr><th>Rd</th><th>Grand Prix</th><th>Date</th><th>#87 Bearman</th><th>Second car</th><th class="num">Pts</th></tr></thead>
      <tbody>
      ${d.calendar
        .map((c) => {
          const up = c.a === undefined;
          const p = up ? 0 : racePts(c);
          return `<tr class="${c.next ? 'is-next' : ''}${up ? ' is-up' : ''}" data-state="${up ? 'upcoming' : 'done'}" data-pts="${p > 0 ? 1 : 0}">
        <td class="mono">${pad(c.r)}</td>
        <td><b>${c.gp}</b>${c.sprint ? '<em class="tag">Sprint</em>' : ''}<span>${c.venue}</span></td>
        <td class="mono">${c.date}</td>
        ${up ? `<td colspan="2">${c.next ? `<span class="pill"><span class="live"></span>Next race</span>` : '<span class="muted">To come</span>'}</td>` : `<td><span class="r r--${cls(c.a)}">${res(c.a)}</span>${c.sa ? `<span class="r r--sp">Sprint P${c.sa}</span>` : ''}</td>
        <td><span class="r r--${cls(c.b[1])}">${res(c.b[1])}</span><span class="who">${c.b[0]}</span></td>`}
        <td class="num">${up ? '' : p || '<span class="muted">0</span>'}</td>
      </tr>`;
        })
        .join('\n      ')}
      </tbody>
      <tfoot><tr><td colspan="5">Total after ${done.length} rounds</td><td class="num">${done.reduce((s, c) => s + racePts(c), 0)}</td></tr></tfoot>
    </table>
    </div>
    <p class="fine">Dates are race days. The Bahrain Grand Prix was postponed and run at Sepang, Malaysia; the Saudi Arabian Grand Prix was cancelled. Source: Wikipedia season tables, through Round 20.</p>
  </div>
</section>
`
);

/* ---------- TEAM ---------- */

page(
  'team.html',
  'Team · TGR Haas F1 Team',
  'The story, people and bases behind TGR Haas F1 Team, plus careers.',
  pageHero('The team', 'Small team.<br>Big swing.', 'Founded by a machine-tool builder from California. Run from North Carolina, Oxfordshire and Maranello. Racing in Formula 1 since 2016.', 'hira1') +
    `
<section class="sec">
  <div class="wrap lead">
    <div><p class="label" data-reveal>01 · Origin</p>
    <p class="lead__t" data-reveal>Gene Haas built a company making machines that make other machines. In 2016 he pointed that precision at the hardest racing series on earth. Eleven seasons on, the team is still here and still independent.</p></div>
    <div class="lead__ph" data-reveal>${photo('gene', { sizes: '(min-width: 900px) 30vw, 100vw' })}<p class="fine">Gene Haas, Founder &amp; Chairman.</p></div>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    ${secHead('02 · History', 'Seven moments.')}
    <ol class="hist">${d.timeline.map(([y, t, p]) => `<li data-reveal><b class="display">${y}</b><div><h3>${t}</h3><p>${p}</p></div></li>`).join('')}</ol>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    ${secHead('03 · Season by season', 'Eleven years.', `<p class="sh__sub" data-reveal>Points and championship position for every car the team has built.</p>`)}
    <div class="seasons" role="table" aria-label="Haas results by season">
      <div class="seasons__r seasons__r--h" role="row"><span role="columnheader">Year</span><span role="columnheader">Car</span><span role="columnheader">Points</span><span role="columnheader">Position</span></div>
      ${d.history.map(([y, c, p, pos, n]) => `<div class="seasons__r${pos === 5 ? ' is-best' : ''}" role="row" data-reveal><b role="cell" class="display">${y}</b><span role="cell">${c}${n ? `<em>${n}</em>` : ''}</span><span role="cell" class="seasons__b"><i><u style="--w:${(p / Math.max(...d.history.map((h) => h[2]))) * 100}%"></u></i><b>${p}</b></span><span role="cell" class="seasons__p">P${pos}</span></div>`).join('')}
    </div>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    ${secHead('04 · Leadership', 'Who’s in charge.')}
    <ul class="people">${d.leadership.map(([n, r]) => `<li data-reveal><p class="label">${r}</p><h3 class="display">${n}</h3></li>`).join('')}</ul>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    ${secHead('05 · Bases', 'Three homes.')}
    <ul class="people people--bases">${d.bases.map((b, i) => `<li data-reveal><p class="label">${pad(i + 1)} · ${b.role}</p><h3 class="display">${b.city}</h3><p>${b.region}</p></li>`).join('')}</ul>
  </div>
</section>

<section class="sec" id="careers">
  <div class="wrap">
    ${secHead('06 · Careers', 'Come and build it.', `<p class="sh__sub" data-reveal>On a small team your work reaches the car quickly, and everyone can see whose it was.</p>`)}
    <ul class="jobs">${d.careers.map(([t, l]) => `<li data-reveal><a href="#careers"><span>${t}</span><em>${l}</em>${arrow}</a></li>`).join('')}</ul>
  </div>
</section>
`
);

/* ---------- PARTNERS ---------- */

page(
  'partners.html',
  'Partners · TGR Haas F1 Team',
  'The partners behind TGR Haas F1 Team, led by title partner Toyota Gazoo Racing.',
  pageHero('Partners', 'Backed by<br>the best.', 'None of the car’s thousands of parts reach the grid without the companies on this page.', 'bear3') +
    d.partners
      .map(
        (t, i) => `
<section class="sec${i ? ' sec--tight' : ''}">
  <div class="wrap">
    <p class="label" data-reveal>${pad(i + 1)} · ${t.tier}</p>
    <ul class="pgrid${i === 0 ? ' pgrid--title' : ''}">${t.items.map(([n, r]) => `<li data-reveal><a href="#"><h3 class="display">${n}</h3><p class="label">${r}</p>${arrow}</a></li>`).join('')}</ul>
  </div>
</section>`
      )
      .join('') +
    `
<section class="sec"><div class="wrap cta-band" data-reveal>
  <h2 class="display">Put your name on the car.</h2>
  ${link('#', 'Talk to partnerships about 2027', 'cta--solid')}
</div></section>`
);

/* ---------- CREDITS ---------- */

page(
  'credits.html',
  'Photo credits · TGR Haas F1 Team',
  'Photo credits and licences for the images used on this site.',
  `<section class="phero"><div class="wrap phero__in"><p class="label">Credits</p><h1 class="display phero__t">Photo credits.</h1><p class="phero__sub">Every photograph on this site comes from Wikimedia Commons and is used under its Creative Commons licence. Images were resized and cropped; they remain under the same licence.</p></div></section>
<section class="sec sec--tight"><div class="wrap">
  <ul class="creds">${Object.entries(d.photos)
    .map(([id, p]) => `<li><img src="assets/img/${id}-960.jpg" alt="" loading="lazy"><div><h2>${esc(p.file)}</h2><p>${p.alt}. ${p.where}.</p><p class="label">By ${p.by} · <a href="${p.lic === 'CC0' ? 'https://creativecommons.org/publicdomain/zero/1.0/' : `https://creativecommons.org/licenses/by-sa/${p.lic.slice(-3)}/`}">${p.lic}</a> · <a href="${commons(p.file)}">Original on Wikimedia Commons</a></p></div></li>`)
    .join('')}</ul>
  <p class="fine">Fonts: Archivo and JetBrains Mono (SIL Open Font License). 3D rendering: three.js (MIT). The 3D car is an original model built for this concept.</p>
</div></section>`
);

writeFileSync(
  join(out, 'assets', 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#08080a"/><path d="M14 16h10v12h16V16h10v32H40V37H24v11H14z" fill="#f2f0ea"/><rect x="14" y="52" width="36" height="4" fill="#e4002b"/></svg>`
);
writeFileSync(join(out, '.nojekyll'), '');
