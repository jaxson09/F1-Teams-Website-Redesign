// Static site generator: `node src/build.mjs` writes the HTML pages into /docs.
// No dependencies. Edit content in data.mjs, markup here, styles/scripts in docs/assets.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as d from './data.mjs';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');
mkdirSync(out, { recursive: true });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const pad = (n) => String(n).padStart(2, '0');

/* ---------- shared pieces ---------- */

const arrow = `<svg class="arr" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M8 5h11v11" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;

const btn = (href, label, cls = '') =>
  `<a class="btn ${cls}" href="${href}" data-magnetic><span class="btn__label">${label}</span><span class="btn__icon">${arrow}</span></a>`;

const wordmark = `<span class="wm" aria-label="Haas"><span class="wm__tgr">TGR</span><span class="wm__haas">HAAS</span><span class="wm__f1">F1 Team</span></span>`;

const flag = (c) => `<span class="flag flag--${c}" aria-hidden="true"></span>`;

// Top-down line drawing of a 2026-style car. Nose points right.
const carSVG = (cls = '') => `
<svg class="carsvg ${cls}" viewBox="0 0 1200 420" role="img" aria-label="Top-down line drawing of the VF-26">
  <g class="carsvg__floor"><path d="M250 118 C380 104 560 104 700 132 L770 168 L770 252 L700 288 C560 316 380 316 250 302 Z"/></g>
  <g class="carsvg__tyres">
    <rect x="118" y="58" width="128" height="72" rx="16"/><rect x="118" y="290" width="128" height="72" rx="16"/>
    <rect x="838" y="68" width="112" height="60" rx="14"/><rect x="838" y="292" width="112" height="60" rx="14"/>
  </g>
  <g class="carsvg__arms">
    <path d="M182 130 240 196M182 130 300 186M182 290 240 224M182 290 300 234"/>
    <path d="M894 128 800 196M894 128 870 200M894 292 800 224M894 292 870 220M894 128 930 203M894 292 930 217"/>
  </g>
  <g class="carsvg__wings">
    <path d="M52 112h66v196H52zM70 112v196M92 112v196"/>
    <path d="M1048 84 C1098 96 1128 150 1134 210 C1128 270 1098 324 1048 336 L1040 336 L1040 84 Z"/>
    <path d="M1062 92 C1096 120 1108 170 1110 210 C1108 250 1096 300 1062 328M1082 104 C1106 140 1118 180 1120 210 C1118 240 1106 280 1082 316"/>
    <path d="M1040 84h-22v36h22M1040 336h-22v-36h22"/>
  </g>
  <g class="carsvg__body">
    <path d="M118 194 C200 190 260 186 320 170 C380 150 430 128 520 126 C600 126 640 150 680 172 C760 184 900 196 1040 202 L1060 210 L1040 218 C900 224 760 236 680 248 C640 270 600 294 520 294 C430 292 380 270 320 250 C260 234 200 230 118 226 Z"/>
    <path class="carsvg__detail" d="M300 210 C380 196 470 192 560 196M300 210 C380 224 470 228 560 224M120 210H300"/>
    <path class="carsvg__detail" d="M470 138 C520 150 540 170 548 188M470 282 C520 270 540 250 548 232"/>
  </g>
  <g class="carsvg__cockpit">
    <path d="M560 188 C600 180 650 186 676 210 C650 234 600 240 560 232 C548 222 548 198 560 188Z"/>
    <path class="carsvg__halo" d="M566 186 C620 172 680 190 700 210 C680 230 620 248 566 234M700 210H742"/>
  </g>
  <g class="carsvg__accent"><path d="M118 210H52M1060 210h74"/><circle cx="612" cy="210" r="13"/></g>
</svg>`;

const ticker = (items, cls = '') => {
  const run = items.map((t) => `<span class="ticker__item">${t}</span><span class="ticker__star" aria-hidden="true">✺</span>`).join('');
  return `<div class="ticker ${cls}" aria-hidden="true"><div class="ticker__track">${run}${run}${run}${run}</div></div>`;
};

const head = (title, desc, page) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#0f0f11">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="assets/fonts/display.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/sans.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/style.css">
<script>document.documentElement.classList.add('js');try{if(sessionStorage.getItem('haas-seen'))document.documentElement.classList.add('seen')}catch(e){}</script>
</head>
<body data-page="${page}">
<a class="skip" href="#main">Skip to content</a>
<div class="lights" aria-hidden="true"><div class="lights__row"><i></i><i></i><i></i><i></i><i></i></div><p class="lights__txt">Lights out</p></div>
<div class="cursor" aria-hidden="true"><span class="cursor__label"></span></div>
<header class="hdr">
  <a class="hdr__logo" href="index.html" aria-label="TGR Haas F1 Team — home">${wordmark}</a>
  <a class="hdr__race" href="season.html"><span class="dot"></span><span>R${d.nextRace.round} · ${d.nextRace.short}</span><span class="hdr__cd" data-countdown-short></span></a>
  <div class="hdr__right">
    <a class="hdr__store" href="index.html#store">Store</a>
    <button class="menubtn" aria-expanded="false" aria-controls="menu"><span class="menubtn__txt">Menu</span><span class="menubtn__bars"><i></i><i></i></span></button>
  </div>
</header>
<nav class="menu" id="menu" aria-label="Main" hidden>
  <div class="menu__inner">
    <ul class="menu__list">
      ${d.nav
        .map(
          (n, i) =>
            `<li style="--i:${i}"><a href="${n.href}"${n.href.startsWith(page) ? ' aria-current="page"' : ''}><span class="menu__n">${pad(i + 1)}</span><span class="menu__l">${n.label}</span><span class="menu__note">${n.note}</span></a></li>`
        )
        .join('\n      ')}
    </ul>
    <aside class="menu__side">
      <p class="eyebrow">Next race</p>
      <p class="menu__race">${d.nextRace.name}</p>
      <p class="mono">${d.nextRace.localLabel}</p>
      <div class="menu__links">
        <a href="index.html#store">Store</a><a href="index.html#fans">Fan club</a><a href="index.html#news">News</a><a href="team.html#careers">Careers</a>
      </div>
      <div class="menu__social"><a href="#">Instagram</a><a href="#">X</a><a href="#">TikTok</a><a href="#">YouTube</a></div>
    </aside>
  </div>
</nav>
<main id="main">`;

const foot = () => `</main>
<footer class="ftr">
  ${ticker(['Machined to race', 'Kannapolis', 'Banbury', 'Maranello', 'Est. 2016'], 'ticker--ftr')}
  <div class="ftr__grid wrap">
    <div class="ftr__col ftr__col--wide">
      <p class="eyebrow">Stay in the slipstream</p>
      <form class="nl" data-newsletter novalidate>
        <label class="sr" for="nl-email">Email address</label>
        <input id="nl-email" type="email" name="email" placeholder="you@email.com" autocomplete="email" required>
        <button type="submit" aria-label="Subscribe">${arrow}</button>
        <p class="nl__msg" role="status" aria-live="polite"></p>
      </form>
      <p class="small muted">Race previews, results and the odd bit of garage gossip. No spam.</p>
    </div>
    <div class="ftr__col"><p class="eyebrow">Team</p>${d.nav.map((n) => `<a href="${n.href}">${n.label}</a>`).join('')}</div>
    <div class="ftr__col"><p class="eyebrow">More</p><a href="index.html#news">News</a><a href="index.html#store">Store</a><a href="index.html#fans">Fan club</a><a href="team.html#careers">Careers</a><a href="#">Media centre</a></div>
    <div class="ftr__col"><p class="eyebrow">Follow</p><a href="#">Instagram</a><a href="#">X / Twitter</a><a href="#">TikTok</a><a href="#">YouTube</a><a href="#">LinkedIn</a></div>
  </div>
  <div class="ftr__big" aria-hidden="true">HAAS</div>
  <div class="ftr__legal wrap">
    <p><strong>Unofficial design concept.</strong> A fan-made redesign exercise, not affiliated with or endorsed by Haas F1 Team, Formula 1 or any partner named. All trademarks belong to their owners.</p>
    <p><a href="#">Privacy</a><a href="#">Cookies</a><a href="#">Terms</a><a href="#">Accessibility</a><a href="#main">Back to top ↑</a></p>
  </div>
</footer>
<script src="assets/main.js" defer></script>
</body>
</html>`;

const page = (file, title, desc, body) => {
  writeFileSync(join(out, file), head(title, desc, file) + body + foot());
  console.log('built', file);
};

const pageHero = (eyebrow, title, sub, extra = '') => `
<section class="phero">
  <div class="wrap">
    <p class="eyebrow" data-reveal>${eyebrow}</p>
    <h1 class="phero__title" data-split>${title}</h1>
    <p class="phero__sub" data-reveal>${sub}</p>
    ${extra}
  </div>
</section>`;

/* ---------- reusable sections ---------- */

const driverCard = (x, i) => `
<a class="dcard dcard--${x.theme}" href="drivers.html#${x.id}" data-reveal style="--d:${i * 80}ms" data-cursor="Profile">
  <div class="dcard__top"><span class="mono">${x.role}</span>${flag(x.flag)}</div>
  <div class="dcard__num" aria-hidden="true">${x.num || x.mono}</div>
  <div class="dcard__name"><span>${x.first}</span><strong>${x.last}</strong></div>
  <p class="dcard__line hand">${x.line}</p>
  <dl class="dcard__stats">${x.stats
    .slice(0, 2)
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
    .join('')}</dl>
</a>`;

const raceCard = () => `
<div class="race" data-reveal>
  <div class="race__head">
    <p class="eyebrow"><span class="dot"></span> Next race · Round ${d.nextRace.round} of ${d.nextRace.total}</p>
    <p class="mono race__local" data-localtime="${d.nextRace.startUTC}">${d.nextRace.localLabel}</p>
  </div>
  <h2 class="race__title">${d.nextRace.short.replace(' ', '<br>')}</h2>
  <p class="race__circuit">${d.nextRace.circuit}</p>
  <div class="cd" data-countdown="${d.nextRace.startUTC}" aria-label="Countdown to lights out">
    <div><b data-u="d">00</b><span>Days</span></div><div><b data-u="h">00</b><span>Hrs</span></div><div><b data-u="m">00</b><span>Min</span></div><div><b data-u="s">00</b><span>Sec</span></div>
  </div>
  <dl class="race__facts">${d.nextRace.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
  ${btn('season.html', 'Full calendar', 'btn--light')}
</div>`;

const standingsCard = () => `
<div class="stand" data-reveal style="--d:120ms">
  <p class="eyebrow">Constructors’ Championship</p>
  <div class="stand__pos"><span class="stand__p">P</span><span data-count="${d.standings.constructors.pos}">${d.standings.constructors.pos}</span></div>
  <p class="stand__pts"><b data-count="${d.standings.constructors.pts}">${d.standings.constructors.pts}</b> points <span class="muted">· ${d.standings.constructors.behind.team} ${d.standings.constructors.pts - d.standings.constructors.behind.pts} behind</span></p>
  <ul class="stand__list">
    ${d.standings.scorers
      .map(
        (s) =>
          `<li><span>${s.name}${s.note ? ` <em>${s.note}</em>` : ''}</span><span class="bar"><i style="--w:${(s.pts / d.standings.constructors.pts) * 100}%"></i></span><b>${s.pts}</b></li>`
      )
      .join('')}
  </ul>
  <p class="small muted">${d.site.asOf}</p>
</div>`;

const partnerWall = () =>
  ticker(d.partners.flatMap((t) => t.items.map(([n]) => n)), 'ticker--partners');

/* ---------- HOME ---------- */

const heroLayer = (cls, hidden) => `
<div class="hero__layer ${cls}"${hidden ? ' aria-hidden="true"' : ''}>
  <div class="hero__meta">
    <span class="mono">2026 FIA Formula One World Championship</span>
    <span class="mono">${d.site.asOf}</span>
  </div>
  <${hidden ? 'div' : 'h1'} class="hero__title"><span class="hero__l1">Machined</span><span class="hero__l2"><em class="hand">to</em> race<i>.</i></span></${hidden ? 'div' : 'h1'}>
  ${carSVG('hero__car')}
  <p class="hero__note hand">${cls.includes('under') ? 'keep looking ↗' : 'move your cursor ↘'}</p>
</div>`;

page(
  'index.html',
  'TGR Haas F1 Team — Machined to race',
  'The home of TGR Haas F1 Team: drivers, the VF-26, the 2026 calendar, standings, news and partners. Unofficial design concept.',
  `
<section class="hero" data-hero>
  ${heroLayer('hero__layer--base', false)}
  ${heroLayer('hero__layer--under', true)}
  <div class="hero__foot">
    <div class="hero__chip"><span class="mono">Constructors</span><b>P${d.standings.constructors.pos}</b></div>
    <div class="hero__chip"><span class="mono">Points</span><b>${d.standings.constructors.pts}</b></div>
    <div class="hero__chip hero__chip--wide"><span class="mono"><span class="dot"></span> Next · ${d.nextRace.short}</span><b data-countdown-short>—</b></div>
    <a class="hero__scroll" href="#now" aria-label="Scroll to content"><span></span></a>
  </div>
</section>

${ticker([`Round ${d.nextRace.round} · ${d.nextRace.name}`, d.nextRace.localLabel, `P${d.standings.constructors.pos} in the Constructors’`, `${d.standings.constructors.pts} points`, 'Bearman P5 in Shanghai', 'Câmara confirmed for 2027'])}

<section class="sec sec--dark" id="now">
  <div class="wrap">
    <div class="sechead">
      <p class="eyebrow" data-reveal>01 — Right now</p>
      <h2 class="h-xl" data-split>Three to go.<br>Seventh to defend.</h2>
    </div>
    <div class="now">${raceCard()}${standingsCard()}</div>
  </div>
</section>

<section class="sec" id="drivers">
  <div class="wrap">
    <div class="sechead sechead--row">
      <div><p class="eyebrow" data-reveal>02 — Drivers</p><h2 class="h-xl" data-split>Who drives.</h2></div>
      <p class="lede" data-reveal>A 21-year-old leading the scoring, a champion arriving early, and a Le Mans winner on call. The second seat for Las Vegas is yet to be announced.</p>
    </div>
    <div class="dgrid">${d.drivers.slice(0, 3).map(driverCard).join('')}</div>
    <div class="center" data-reveal>${btn('drivers.html', 'All drivers')}</div>
  </div>
</section>

<section class="sec sec--dark carsec" id="car">
  <div class="wrap">
    <div class="sechead sechead--row">
      <div><p class="eyebrow" data-reveal>03 — The machine</p><h2 class="h-xxl" data-split>VF-26</h2></div>
      <p class="lede" data-reveal>${d.car.intro}</p>
    </div>
    <div class="carstage" data-reveal data-parallax>${carSVG('carstage__car')}<span class="carstage__tag hand">nose →</span></div>
    <div class="kpis">${d.car.headline
      .map(([n, u, t], i) => `<div class="kpi" data-reveal style="--d:${i * 70}ms"><p class="kpi__n"><span data-count="${n}">${n}</span><small>${u}</small></p><p class="kpi__t">${t}</p></div>`)
      .join('')}</div>
    <div class="center" data-reveal>${btn('car.html', 'Explore the car', 'btn--light')}</div>
  </div>
</section>

<section class="sec story" id="story">
  <div class="wrap">
    <p class="eyebrow" data-reveal>04 — Who we are</p>
    <p class="story__text" data-wordfill>We are the smallest team in Formula 1 and we like it that way. Born in a machine-tool shop in North Carolina, built across three countries, and stubborn enough to line up against the biggest names in motorsport every other Sunday.</p>
    <div class="story__row">
      <div class="story__stats">
        <div data-reveal><b data-count="2016">2016</b><span>First Grand Prix — points on debut</span></div>
        <div data-reveal style="--d:80ms"><b data-count="3">3</b><span>Bases: Kannapolis, Banbury, Maranello</span></div>
        <div data-reveal style="--d:160ms"><b>P<span data-count="4">4</span></b><span>Best race result — twice</span></div>
      </div>
      <div data-reveal>${btn('team.html', 'Our story')}</div>
    </div>
  </div>
</section>

<section class="sec sec--tint" id="news">
  <div class="wrap">
    <div class="sechead sechead--row">
      <div><p class="eyebrow" data-reveal>05 — News</p><h2 class="h-xl" data-split>From the garage.</h2></div>
      <div data-reveal>${btn('#news', 'All news')}</div>
    </div>
    <div class="news">${d.news
      .map(
        (n, i) => `
      <a class="ncard${n.big ? ' ncard--big' : ''}" href="#news" data-reveal style="--d:${i * 60}ms" data-cursor="Read">
        <div class="ncard__art" aria-hidden="true"><span>${pad(i + 1)}</span></div>
        <div class="ncard__body"><p class="mono"><span class="tag">${n.tag}</span>${n.date} · ${n.read}</p><h3>${n.title}</h3></div>
      </a>`
      )
      .join('')}</div>
  </div>
</section>

<section class="sec split" id="store">
  <div class="split__half split__half--red" data-reveal>
    <p class="eyebrow">06 — Store</p>
    <h2 class="h-lg">The 2026 kit.<br>By Castore.</h2>
    <p>Team polo, race-day jacket, caps and the Las Vegas special edition. Wear what the garage wears.</p>
    ${btn('#store', 'Shop the collection', 'btn--light')}
    <div class="split__ghost" aria-hidden="true">87</div>
  </div>
  <div class="split__half split__half--ink" id="fans" data-reveal style="--d:100ms">
    <p class="eyebrow">07 — Fan club</p>
    <h2 class="h-lg">Join the<br>pit crew.</h2>
    <p>Free membership. Ticket ballots, behind-the-garage films, and member-only drops.</p>
    ${btn('#fans', 'Become a member', 'btn--light')}
    <div class="split__ghost" aria-hidden="true">+1</div>
  </div>
</section>

<section class="sec sec--partners">
  <div class="wrap sechead sechead--row">
    <div><p class="eyebrow" data-reveal>08 — Partners</p><h2 class="h-lg" data-split>Backed by the best.</h2></div>
    <div data-reveal>${btn('partners.html', 'All partners')}</div>
  </div>
  ${partnerWall()}
</section>
`
);

/* ---------- DRIVERS ---------- */

page(
  'drivers.html',
  'Drivers — TGR Haas F1 Team',
  'Oliver Bearman, Rafael Câmara, Ryo Hirakawa and Jack Doohan: the drivers of TGR Haas F1 Team.',
  pageHero('Drivers', 'Who<br>drives.', 'Four drivers have a place in the 2026 story. Here is each of them, with the numbers that matter.', `<div class="chips" data-reveal>${d.drivers.map((x) => `<a class="chip" href="#${x.id}">${x.last}</a>`).join('')}</div>`) +
    d.drivers
      .map(
        (x, i) => `
<section class="dprof dprof--${x.theme}" id="${x.id}">
  <div class="dprof__ghost" aria-hidden="true">${x.num || x.mono}</div>
  <div class="wrap dprof__grid">
    <div class="dprof__id">
      <p class="eyebrow" data-reveal>${pad(i + 1)} — ${x.role}</p>
      <h2 class="dprof__name" data-split><small>${x.first}</small><br>${x.last}</h2>
      <p class="dprof__line hand" data-reveal>${x.line}</p>
      <p class="mono" data-reveal>${flag(x.flag)} ${x.country} · ${x.born}${x.num ? ` · #${x.num}` : ''}</p>
    </div>
    <div class="dprof__body">
      <dl class="statgrid">${x.stats.map(([k, v], j) => `<div data-reveal style="--d:${j * 60}ms"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      ${x.bio.map((p) => `<p class="dprof__bio" data-reveal>${p}</p>`).join('')}
      <ol class="tl tl--mini">${x.timeline.map(([y, t]) => `<li data-reveal><span class="mono">${y}</span><p>${t}</p></li>`).join('')}</ol>
    </div>
  </div>
</section>`
      )
      .join('') +
    `
<section class="sec sec--tint">
  <div class="wrap note" data-reveal>
    <p class="eyebrow">Line-up note</p>
    <p class="lede">Esteban Ocon raced for the team in Rounds 1–17 and scored 7 points. The team confirmed he will not return to a race seat this season. The driver alongside Oliver Bearman for Las Vegas, Qatar and Abu Dhabi will be announced here first.</p>
  </div>
</section>`
);

/* ---------- CAR ---------- */

page(
  'car.html',
  'VF-26 — TGR Haas F1 Team',
  'Explore the Haas VF-26: active aerodynamics, the Ferrari 067/6 power unit and the full technical specification.',
  `
<section class="phero phero--dark carhero">
  <div class="wrap">
    <p class="eyebrow" data-reveal>The machine · 2026</p>
    <h1 class="phero__title phero__title--huge" data-split>VF-26</h1>
    <p class="phero__sub" data-reveal>${d.car.intro}</p>
  </div>
</section>

<section class="sec sec--dark explore">
  <div class="wrap">
    <div class="sechead sechead--row">
      <div><p class="eyebrow" data-reveal>01 — Walkaround</p><h2 class="h-lg" data-split>Tap a point.<br>Learn the car.</h2></div>
      <p class="lede" data-reveal>Six things that are new for 2026 and where to find them on the car.</p>
    </div>
    <div class="exp" data-explorer>
      <div class="exp__stage">
        ${carSVG('exp__car')}
        ${d.car.hotspots.map((h, i) => `<button class="hot${i === 0 ? ' is-on' : ''}" style="left:${h.x}%;top:${h.y}%" data-hot="${h.id}" aria-label="${esc(h.title)}"><span>${i + 1}</span></button>`).join('')}
      </div>
      <div class="exp__panel" aria-live="polite">
        ${d.car.hotspots.map((h, i) => `<article class="exp__card${i === 0 ? ' is-on' : ''}" data-hotcard="${h.id}"><p class="mono">${pad(i + 1)} / ${pad(d.car.hotspots.length)}</p><h3>${h.title}</h3><p>${h.text}</p></article>`).join('')}
        <div class="exp__nav"><button data-hotprev aria-label="Previous">←</button><button data-hotnext aria-label="Next">→</button></div>
      </div>
    </div>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <div class="sechead"><p class="eyebrow" data-reveal>02 — By the numbers</p><h2 class="h-xl" data-split>Smaller. Lighter.<br>Half electric.</h2></div>
    <div class="kpis kpis--light">${d.car.headline
      .map(([n, u, t], i) => `<div class="kpi" data-reveal style="--d:${i * 70}ms"><p class="kpi__n"><span data-count="${n}">${n}</span><small>${u}</small></p><p class="kpi__t">${t}</p></div>`)
      .join('')}</div>
  </div>
</section>

<section class="sec sec--tint">
  <div class="wrap specwrap">
    <div class="sechead"><p class="eyebrow" data-reveal>03 — Specification</p><h2 class="h-lg" data-split>Tech sheet.</h2><p class="hand specwrap__note" data-reveal>the bits engineers ask about</p></div>
    <dl class="spec">${d.car.specs.map(([k, v]) => `<div data-reveal><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
  </div>
</section>
`
);

/* ---------- SEASON ---------- */

const done = (c) => c.r < d.nextRace.round;

page(
  'season.html',
  '2026 Season — TGR Haas F1 Team',
  'The 2026 Formula 1 calendar, next race countdown and championship standings for TGR Haas F1 Team.',
  pageHero('2026 season', 'Twenty-two<br>rounds.', `Nineteen down, three to go. ${d.site.asOf}: P${d.standings.constructors.pos} in the Constructors’ Championship on ${d.standings.constructors.pts} points.`) +
    `
<section class="sec sec--dark">
  <div class="wrap now">${raceCard().replace(btn('season.html', 'Full calendar', 'btn--light'), '')}${standingsCard()}</div>
</section>

<section class="sec" id="calendar">
  <div class="wrap">
    <div class="sechead sechead--row">
      <div><p class="eyebrow" data-reveal>Calendar</p><h2 class="h-xl" data-split>Every round.</h2></div>
      <div class="filter" data-reveal role="group" aria-label="Filter rounds">
        <button class="is-on" data-filter="all">All</button><button data-filter="upcoming">Upcoming</button><button data-filter="highlights">Highlights</button>
      </div>
    </div>
    <ol class="cal">
      ${d.calendar
        .map(
          (c) => `<li class="cal__row${c.next ? ' is-next' : ''}${done(c) ? ' is-done' : ''}${c.star ? ' is-star' : ''}" data-state="${done(c) ? 'done' : 'upcoming'}" data-hl="${c.hl && done(c) ? 1 : 0}" data-reveal>
        <span class="cal__r mono">R${pad(c.r)}</span>
        <span class="cal__gp"><strong>${c.gp}</strong><em>${c.city}</em></span>
        <span class="cal__date mono">${c.date}</span>
        <span class="cal__hl">${c.hl}</span>
        <span class="cal__st">${c.next ? '<b class="pill pill--red">Next</b>' : done(c) ? '<b class="pill">Done</b>' : '<b class="pill pill--line">Soon</b>'}</span>
      </li>`
        )
        .join('\n      ')}
    </ol>
    <p class="small muted" data-reveal>Dates are race days. The Bahrain and Saudi Arabian rounds did not take place in 2026. The highlights column lists standout results, not every finish.</p>
  </div>
</section>
`
);

/* ---------- TEAM ---------- */

page(
  'team.html',
  'Team — TGR Haas F1 Team',
  'The story, people and bases behind TGR Haas F1 Team, plus careers.',
  pageHero('The team', 'Small team.<br>Big swing.', 'Founded by a machine-tool builder from California. Run from North Carolina, Oxfordshire and Maranello. Racing in Formula 1 since 2016.') +
    `
<section class="sec story">
  <div class="wrap">
    <p class="story__text" data-wordfill>Gene Haas built an empire making machines that make other machines. In 2016 he pointed that precision at the hardest racing series on earth. Ten seasons on, we are still here, still independent and still punching up.</p>
  </div>
</section>

<section class="sec sec--dark">
  <div class="wrap">
    <div class="sechead"><p class="eyebrow" data-reveal>01 — History</p><h2 class="h-xl" data-split>Ten seasons,<br>seven moments.</h2></div>
    <ol class="tl">${d.timeline.map(([y, t, p]) => `<li data-reveal><span class="tl__y">${y}</span><div><h3>${t}</h3><p>${p}</p></div></li>`).join('')}</ol>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <div class="sechead"><p class="eyebrow" data-reveal>02 — Leadership</p><h2 class="h-xl" data-split>Who’s in charge.</h2></div>
    <div class="people">${d.leadership.map(([n, r], i) => `<div class="person" data-reveal style="--d:${i * 80}ms"><div class="person__mono" aria-hidden="true">${n.split(' ').map((w) => w[0]).join('')}</div><h3>${n}</h3><p class="mono">${r}</p></div>`).join('')}</div>
  </div>
</section>

<section class="sec sec--tint">
  <div class="wrap">
    <div class="sechead"><p class="eyebrow" data-reveal>03 — Bases</p><h2 class="h-xl" data-split>Three homes.</h2></div>
    <div class="bases">${d.bases.map((b, i) => `<div class="base" data-reveal style="--d:${i * 80}ms"><p class="mono">${pad(i + 1)} · ${b.role}</p><h3>${b.city}</h3><p class="base__r">${b.region}</p><p>${b.note}</p></div>`).join('')}</div>
  </div>
</section>

<section class="sec sec--red" id="careers">
  <div class="wrap">
    <div class="sechead sechead--row">
      <div><p class="eyebrow" data-reveal>04 — Careers</p><h2 class="h-xl" data-split>Come and<br>build it.</h2></div>
      <p class="lede" data-reveal>On a small team your work reaches the car quickly, and everyone can see whose it was. Pick a department to see open roles.</p>
    </div>
    <ul class="jobs">${d.careers.map(([t, l]) => `<li data-reveal><a href="#careers" data-cursor="View"><span>${t}</span><span class="mono">${l}</span>${arrow}</a></li>`).join('')}</ul>
  </div>
</section>
`
);

/* ---------- PARTNERS ---------- */

page(
  'partners.html',
  'Partners — TGR Haas F1 Team',
  'The partners behind TGR Haas F1 Team, led by title partner Toyota Gazoo Racing.',
  pageHero('Partners', 'Backed by<br>the best.', 'A Formula 1 car has around 14,000 parts and none of them get to the grid without the companies on this page.') +
    d.partners
      .map(
        (t, i) => `
<section class="sec ${i === 0 ? 'sec--dark' : i === 1 ? '' : 'sec--tint'}">
  <div class="wrap">
    <p class="eyebrow" data-reveal>${pad(i + 1)} — ${t.tier}</p>
    <div class="pgrid pgrid--${i === 0 ? 'title' : 'std'}">${t.items.map(([n, r], j) => `<a class="pcard" href="#" data-reveal style="--d:${j * 50}ms" data-cursor="Visit"><h3>${n}</h3><p class="mono">${r}</p>${arrow}</a>`).join('')}</div>
  </div>
</section>`
      )
      .join('') +
    `
<section class="sec sec--red">
  <div class="wrap center-col">
    <h2 class="h-xl" data-split>Put your name<br>on the car.</h2>
    <p class="lede" data-reveal>Talk to our partnerships team about 2027.</p>
    <div data-reveal>${btn('#', 'Become a partner', 'btn--light')}</div>
  </div>
</section>`
);

writeFileSync(
  join(out, 'assets', 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0f0f11"/><path d="M16 16h9v12h14V16h9v32h-9V36H25v12h-9z" fill="#f1eee8"/><rect x="16" y="52" width="32" height="4" fill="#e4002b"/></svg>`
);
writeFileSync(join(out, '.nojekyll'), '');
