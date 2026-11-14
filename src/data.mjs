// All site content lives here. Facts were checked against public reporting on
// 14 Nov 2026 (after Round 19, São Paulo). Anything that could not be verified
// is deliberately left out rather than guessed — see README "Data notes".

export const site = {
  name: 'TGR Haas F1 Team',
  short: 'Haas',
  tagline: 'Machined to race.',
  asOf: 'After Round 19 · São Paulo',
};

export const nav = [
  { href: 'index.html', label: 'Home', note: 'Start line' },
  { href: 'drivers.html', label: 'Drivers', note: 'Who drives' },
  { href: 'car.html', label: 'VF-26', note: 'The machine' },
  { href: 'season.html', label: 'Season', note: 'Calendar & standings' },
  { href: 'team.html', label: 'Team', note: 'Story, people, careers' },
  { href: 'partners.html', label: 'Partners', note: 'Who backs us' },
];

export const standings = {
  constructors: { pos: 7, pts: 31, behind: { team: 'Audi', pts: 28 } },
  scorers: [
    { name: 'Oliver Bearman', pts: 23, pos: 13 },
    { name: 'Esteban Ocon', pts: 7, pos: 16, note: 'Rounds 1–17' },
    { name: 'Ryo Hirakawa', pts: 1, note: 'Round 18' },
  ],
};

// Las Vegas GP: Sat 21 Nov, 20:00 local (PST) = Sun 22 Nov 04:00 UTC.
export const nextRace = {
  round: 20,
  total: 22,
  name: 'Las Vegas Grand Prix',
  short: 'Las Vegas',
  circuit: 'Las Vegas Strip Circuit',
  startUTC: '2026-11-22T04:00:00Z',
  localLabel: 'Sat 21 Nov · 20:00 PST',
  facts: [
    ['Length', '6.201 km'],
    ['Laps', '50'],
    ['Corners', '17'],
    ['Layout', 'Street · night'],
  ],
};

// 2026 calendar as run: Bahrain and Saudi Arabia did not take place, leaving 22 rounds.
// `hl` = verified Haas highlight for that round. Empty means "nothing we could verify",
// not "nothing happened".
export const calendar = [
  { r: 1, gp: 'Australia', city: 'Melbourne', date: '8 Mar', hl: 'Bearman P7 — points on opening day' },
  { r: 2, gp: 'China', city: 'Shanghai', date: '15 Mar', hl: 'Bearman P5 — best result of the season', star: true },
  { r: 3, gp: 'Japan', city: 'Suzuka', date: '29 Mar', hl: 'Ocon P10' },
  { r: 4, gp: 'Miami', city: 'Miami Gardens', date: '3 May', hl: '' },
  { r: 5, gp: 'Canada', city: 'Montréal', date: '24 May', hl: '' },
  { r: 6, gp: 'Monaco', city: 'Monte Carlo', date: '7 Jun', hl: '' },
  { r: 7, gp: 'Barcelona-Catalunya', city: 'Barcelona', date: '14 Jun', hl: '' },
  { r: 8, gp: 'Austria', city: 'Spielberg', date: '28 Jun', hl: '' },
  { r: 9, gp: 'Great Britain', city: 'Silverstone', date: '5 Jul', hl: '' },
  { r: 10, gp: 'Belgium', city: 'Spa-Francorchamps', date: '19 Jul', hl: '' },
  { r: 11, gp: 'Hungary', city: 'Budapest', date: '26 Jul', hl: '' },
  { r: 12, gp: 'Netherlands', city: 'Zandvoort', date: '23 Aug', hl: '' },
  { r: 13, gp: 'Italy', city: 'Monza', date: '6 Sep', hl: '' },
  { r: 14, gp: 'Spain', city: 'Madrid', date: '13 Sep', hl: '' },
  { r: 15, gp: 'Azerbaijan', city: 'Baku', date: '26 Sep', hl: 'Ocon P8, Bearman P9 — first double points of 2026', star: true },
  { r: 16, gp: 'Singapore', city: 'Marina Bay', date: '11 Oct', hl: '' },
  { r: 17, gp: 'United States', city: 'Austin', date: '25 Oct', hl: 'Home race' },
  { r: 18, gp: 'Mexico City', city: 'Mexico City', date: '1 Nov', hl: 'Hirakawa P10 — a point on his Grand Prix debut' },
  { r: 19, gp: 'São Paulo', city: 'Interlagos', date: '8 Nov', hl: 'Câmara makes his F1 debut at home' },
  { r: 20, gp: 'Las Vegas', city: 'Las Vegas', date: '21 Nov', hl: 'Home race · under the lights', next: true },
  { r: 21, gp: 'Qatar', city: 'Lusail', date: '29 Nov', hl: '' },
  { r: 22, gp: 'Abu Dhabi', city: 'Yas Marina', date: '6 Dec', hl: 'Season finale' },
];

export const drivers = [
  {
    id: 'bearman',
    first: 'Oliver',
    last: 'Bearman',
    num: '87',
    role: 'Race driver',
    flag: 'gb',
    country: 'Great Britain',
    born: '8 May 2005 · Chelmsford, England',
    theme: 'ink',
    line: 'Fifth in Shanghai. Leading scorer. Still hungry.',
    stats: [
      ['2026 points', '23'],
      ['Championship', 'P13'],
      ['Best 2026 finish', 'P5 · China'],
      ['Career best', 'P4 · Mexico 2025'],
    ],
    bio: [
      'A Ferrari Driver Academy graduate who scored points on his Formula 1 debut as a last-minute stand-in at Jeddah in 2024 — aged 18.',
      'Ollie joined Haas full-time in 2025, matched the team’s best ever result with fourth in Mexico City, and has carried the scoring in 2026: 23 of the team’s 31 points are his.',
    ],
    timeline: [
      ['2023', 'FIA Formula 2 race winner with Prema'],
      ['2024', 'F1 debut for Ferrari in Jeddah, P7. Two substitute starts for Haas'],
      ['2025', 'Full-time Haas race driver. P4 in Mexico City'],
      ['2026', 'P5 in China. Team’s leading scorer'],
    ],
  },
  {
    id: 'camara',
    first: 'Rafael',
    last: 'Câmara',
    num: '',
    mono: 'RC',
    role: 'Race driver 2027 · debuted São Paulo 2026',
    flag: 'br',
    country: 'Brazil',
    born: '5 May 2005 · Recife, Brazil',
    theme: 'red',
    line: 'The future arrived early.',
    stats: [
      ['F1 debut', 'São Paulo 2026'],
      ['2027 status', 'Confirmed'],
      ['Title', 'FIA F3 2025'],
      ['Academy', 'Ferrari'],
    ],
    bio: [
      'The 2025 FIA Formula 3 champion and Ferrari Driver Academy member is confirmed as a Haas race driver for 2027.',
      'He arrived early: Rafa made his Grand Prix debut at Interlagos in Round 19, in front of his home crowd.',
    ],
    timeline: [
      ['2025', 'FIA Formula 3 champion'],
      ['2026', 'FIA Formula 2 season. Confirmed for a 2027 Haas race seat'],
      ['Nov 2026', 'Formula 1 debut at the São Paulo Grand Prix'],
    ],
  },
  {
    id: 'hirakawa',
    first: 'Ryo',
    last: 'Hirakawa',
    num: '',
    mono: 'RH',
    role: 'Reserve driver',
    flag: 'jp',
    country: 'Japan',
    born: '7 March 1994 · Kure, Japan',
    theme: 'bone',
    line: 'One start. One point.',
    stats: [
      ['GP starts', '1'],
      ['Points', '1'],
      ['Mexico City 2026', 'P10'],
      ['Le Mans', 'Winner 2022'],
    ],
    bio: [
      'A two-time World Endurance champion and Le Mans 24 Hours winner with Toyota Gazoo Racing, and the human link in the TGR partnership.',
      'Called up for Mexico City in Round 18, Ryo finished tenth and scored on his Grand Prix debut.',
    ],
    timeline: [
      ['2022', 'Le Mans 24 Hours winner and WEC champion'],
      ['2023', 'Second WEC drivers’ title'],
      ['2025', 'Joins Haas as reserve driver'],
      ['2026', 'Grand Prix debut in Mexico City — P10'],
    ],
  },
  {
    id: 'doohan',
    first: 'Jack',
    last: 'Doohan',
    num: '',
    mono: 'JD',
    role: 'Reserve driver',
    flag: 'au',
    country: 'Australia',
    born: '20 January 2003 · Gold Coast, Australia',
    theme: 'ink',
    line: 'Ready when the call comes.',
    stats: [
      ['Role', 'Reserve'],
      ['Joined', '2026'],
      ['F1 debut', 'Abu Dhabi 2024'],
      ['Sim programme', 'Banbury'],
    ],
    bio: [
      'The Australian joined for 2026 as reserve driver after racing in Formula 1 with Alpine, and supports the race team from the simulator and the garage.',
    ],
    timeline: [
      ['2023', 'Third in FIA Formula 2'],
      ['2024', 'Formula 1 debut in Abu Dhabi'],
      ['2026', 'Joins Haas as reserve driver'],
    ],
  },
];

export const car = {
  name: 'VF-26',
  intro:
    'The first Haas built for Formula 1’s biggest rule change in a generation: smaller, lighter, with wings that move and a power unit that makes half its power from electricity.',
  headline: [
    ['768', 'kg', 'Minimum weight — 30 kg lighter than 2025'],
    ['350', 'kW', 'Electric power from the MGU-K, nearly three times last year'],
    ['100', '%', 'Advanced sustainable fuel'],
    ['3400', 'mm', 'Maximum wheelbase — 200 mm shorter'],
  ],
  hotspots: [
    { id: 'fw', x: 89, y: 50, title: 'Active front wing', text: 'Flaps open on the straights to cut drag and close for the corners. No more DRS — every car has it, every lap.' },
    { id: 'pu', x: 37, y: 50, title: 'Ferrari 067/6 power unit', text: '1.6-litre turbo V6 hybrid. The MGU-H is gone; the electric motor now delivers up to 350 kW.' },
    { id: 'ck', x: 55, y: 50, title: 'Survival cell', text: 'Tougher 2026 crash tests, a stronger roll hoop and a two-stage nose structure.' },
    { id: 'rw', x: 8, y: 50, title: 'Active rear wing', text: 'Three elements that flatten in “straight mode” alongside the front wing.' },
    { id: 'ty', x: 21, y: 22, title: 'Narrower Pirelli tyres', text: '18-inch wheels stay, but fronts are 25 mm narrower and rears 30 mm narrower.' },
    { id: 'fl', x: 46, y: 76, title: 'Flatter floor', text: 'Long ground-effect tunnels are out. A flatter floor and a bigger diffuser make the car less sensitive to ride height.' },
  ],
  specs: [
    ['Chassis', 'Carbon-fibre composite monocoque, designed in Banbury and Maranello'],
    ['Power unit', 'Ferrari 067/6 — 1.6 L V6 turbo hybrid'],
    ['Energy recovery', 'MGU-K, up to 350 kW'],
    ['Transmission', 'Ferrari 8-speed, rear-mounted'],
    ['Aerodynamics', 'Active front and rear wings (corner / straight mode)'],
    ['Minimum weight', '768 kg including driver'],
    ['Dimensions', '1900 mm wide · wheelbase up to 3400 mm'],
    ['Tyres', 'Pirelli P Zero, 18-inch'],
    ['Fuel', '100% advanced sustainable fuel'],
    ['Launched', '19 January 2026'],
  ],
};

export const news = [
  { tag: 'Race preview', date: '13 Nov 2026', title: 'Round 20: back on home soil, under the lights in Las Vegas', read: '4 min', big: true },
  { tag: 'Drivers', date: '8 Nov 2026', title: 'Câmara makes his Formula 1 debut at Interlagos', read: '3 min' },
  { tag: 'Team', date: '2 Nov 2026', title: 'Hirakawa scores on Grand Prix debut in Mexico City', read: '3 min' },
  { tag: 'Announcement', date: 'Oct 2026', title: 'Rafael Câmara confirmed as Haas race driver for 2027', read: '2 min' },
  { tag: 'Partners', date: 'Jul 2026', title: 'CommScope and Exein join the team at Spa', read: '2 min' },
];

export const timeline = [
  ['2014', 'The entry', 'Gene Haas, founder of Haas Automation, is granted a Formula 1 entry — the first American-led team in three decades.'],
  ['2016', 'Points on debut', 'Romain Grosjean finishes sixth in Melbourne, the team’s very first Grand Prix.'],
  ['2018', 'Fifth in the world', 'The best season to date: fifth in the Constructors’ Championship and a fourth place in Austria.'],
  ['2022', 'Pole position', 'Kevin Magnussen puts a Haas on pole in the rain at Interlagos.'],
  ['2024', 'A new era', 'Ayao Komatsu becomes Team Principal. A technical partnership with Toyota Gazoo Racing begins.'],
  ['2025', 'Fourth again', 'Oliver Bearman equals the team’s best result with P4 in Mexico City.'],
  ['2026', 'TGR Haas F1 Team', 'Toyota Gazoo Racing becomes title partner as the VF-26 takes on all-new regulations.'],
];

export const leadership = [
  ['Gene Haas', 'Founder & Chairman'],
  ['Ayao Komatsu', 'Team Principal'],
  ['Andrea De Zordo', 'Technical Director'],
];

export const bases = [
  { city: 'Kannapolis', region: 'North Carolina, USA', role: 'Headquarters', note: 'Next door to Haas Automation’s racing roots.' },
  { city: 'Banbury', region: 'Oxfordshire, UK', role: 'Race operations', note: 'Where the race team lives between flyaways.' },
  { city: 'Maranello', region: 'Emilia-Romagna, Italy', role: 'Design office', note: 'Design and aero, a short walk from our power unit.' },
];

export const partners = [
  { tier: 'Title partner', items: [['Toyota Gazoo Racing', 'Title Partner']] },
  {
    tier: 'Founding & technical',
    items: [
      ['Haas Automation', 'Founding Partner'],
      ['Ferrari', 'Power Unit Supplier'],
      ['Pirelli', 'Tyre Supplier'],
    ],
  },
  {
    tier: 'Official partners',
    items: [
      ['Castore', 'Official Kit & Retail Partner'],
      ['D.Energy', 'Official Sustainability Partner'],
      ['Singha', 'Official Beer Partner'],
      ['Zoomex', 'Official Crypto Exchange Partner'],
      ['Ruckus Networks', 'Official Partner'],
      ['CommScope', 'Official Partner'],
      ['Exein', 'Official Partner'],
      ['Fix Network', 'Official Partner'],
    ],
  },
];

export const careers = [
  ['Aerodynamics', 'Maranello'],
  ['Vehicle Performance', 'Banbury'],
  ['Composites & Manufacturing', 'Banbury'],
  ['Race Team', 'Travelling'],
  ['Partnerships & Marketing', 'Kannapolis'],
  ['Early Careers & Placements', 'All sites'],
];
