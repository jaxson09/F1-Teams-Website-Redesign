# TGR Haas F1 Team — website redesign concept

An unofficial, fan-made redesign of the Haas F1 Team website. Not affiliated with or endorsed by Haas F1 Team, Formula 1 or any partner named.

Design direction: oversized condensed type, a bone / ink / red palette, handwritten annotations, a cursor-reactive hero and scroll-driven motion.

## Pages

| Page | What's on it |
| --- | --- |
| `index.html` | Hero, next-race countdown, standings, drivers, VF-26 teaser, story, news, store, fan club, partners |
| `drivers.html` | Full profiles: Bearman, Câmara, Hirakawa, Doohan |
| `car.html` | Interactive VF-26 walkaround, key numbers, tech sheet |
| `season.html` | Countdown, standings, filterable 22-round calendar |
| `team.html` | History timeline, leadership, bases, careers |
| `partners.html` | Partner tiers |

## Run it

The built site is in `docs/` — plain HTML, CSS and JS, no dependencies.

```sh
cd docs && python3 -m http.server 8000   # then open http://localhost:8000
```

To publish on GitHub Pages: Settings → Pages → deploy from branch, folder `/docs`.

## Edit it

- Content (standings, calendar, drivers, partners…): `src/data.mjs`
- Markup: `src/build.mjs`, then run `node src/build.mjs` to regenerate `docs/*.html`
- Styles and interactions: `docs/assets/style.css`, `docs/assets/main.js`

## Data notes

Content reflects public reporting as of 14 Nov 2026 (after Round 19, São Paulo).

- The calendar "highlights" column lists only results that could be verified; a blank cell does not mean nothing happened.
- Calendar dates come from the published 2026 schedule minus the Bahrain and Saudi Arabian rounds; individual dates were not re-checked one by one.
- The second race seat for the final three rounds was unannounced at the time of writing.
- News headlines, store, fan-club and careers copy are placeholder concept copy. Links to them go nowhere.
- There is no photography. The car is an original line drawing, partner names are set in type rather than logos, and flags are simplified.

Fonts (all SIL Open Font License): Big Shoulders Display, Instrument Sans, JetBrains Mono, Caveat Brush.
