# TGR Haas F1 Team — website redesign concept

An unofficial, fan-made redesign of the Haas F1 Team website. Not affiliated with or endorsed by Haas F1 Team, Formula 1 or any partner named.

Dark, photo-led design with one typeface (Archivo, at two widths), one accent colour, real photography and an interactive 3D car.

## Pages

| Page | What's on it |
| --- | --- |
| `index.html` | Photo hero, next-race countdown, last race, championship tables, driver portraits, 3D car teaser, news, store, fan club, partners |
| `drivers.html` | Profiles with portraits, car photos and 2026 results: Bearman, Câmara, Hirakawa, Doohan |
| `car.html` | 3D explorer (hotspots, camera views, active-aero modes, x-ray, exploded view), 2025 v 2026 comparison, tech sheet, photo gallery |
| `season.html` | Countdown, standings, season stats, every result for both cars, filterable calendar |
| `team.html` | Origin, history, season-by-season record, leadership, bases, careers |
| `partners.html` | Partner tiers |
| `credits.html` | Photo credits and licences |

## Run it

The built site is in `docs/` — plain HTML, CSS and JS. It must be served over HTTP (the 3D car uses ES modules, which browsers block from `file://`).

```sh
cd docs && python3 -m http.server 8000   # then open http://localhost:8000
```

To publish on GitHub Pages: Settings → Pages → deploy from branch, folder `/docs`.

## Edit it

- Content (results, calendar, drivers, partners, photo credits): `src/data.mjs`
- Markup: `src/build.mjs`, then run `node src/build.mjs` to regenerate `docs/*.html`
- Styles and page interactions: `docs/assets/style.css`, `docs/assets/main.js`
- The 3D car: `docs/assets/car3d.js`

## The 3D car

The car is an original model generated in code with three.js (lofted body sections, aerofoil wings, lathed tyres). It is built to the real overall dimensions, but it is not a scan or CAD of the real VF-26, and its livery is an approximation without sponsor logos. To use a purchased artist-made model instead, load its `.glb` in `car3d.js` in place of `buildCar()`.

## Photos

All photographs come from Wikimedia Commons under Creative Commons licences (mostly CC BY-SA 4.0). Some driver portraits pre-date the driver joining the team. They were resized; they remain under their original licences. Full credits are on `credits.html` and in `src/data.mjs`. If you reuse them, keep the attribution and licence.

## Data notes

Results, calendar and points were taken from Wikipedia's 2026 season tables on 14 Nov 2026 (through Round 20, São Paulo).

- The second race seat for the final three rounds was unannounced at the time of writing.
- The 2025 v 2026 figures are regulation values; combustion power is approximate. The drag/downforce bars for the aero modes are an illustrative index, not measured data.
- News headlines, store, fan-club and careers copy are placeholder concept copy, and those links go nowhere.

Fonts: Archivo, JetBrains Mono (SIL Open Font License). three.js (MIT).
