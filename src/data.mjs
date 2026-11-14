// All site content lives here.
// Results, calendar and standings were checked against Wikipedia's 2026 season
// tables on 14 Nov 2026 (updated through Round 20, São Paulo).

export const site = { name: 'TGR Haas F1 Team', asOf: 'After Round 20 · São Paulo' };

export const nav = [
  { href: 'index.html', label: 'Home' },
  { href: 'drivers.html', label: 'Drivers' },
  { href: 'car.html', label: 'VF-26' },
  { href: 'season.html', label: 'Season' },
  { href: 'team.html', label: 'Team' },
  { href: 'partners.html', label: 'Partners' },
];

// Photos are from Wikimedia Commons. `file` is the Commons file name, used for the credit link.
export const photos = {
  bear1: { alt: 'Oliver Bearman’s Haas VF-26 at speed at the Red Bull Ring', by: 'Lukas Raich', lic: 'CC BY-SA 4.0', file: 'FIA F1 Austria 2026 Nr. 87 Bearman (1).jpg', ratio: '2 / 1', where: 'Austrian GP 2026' },
  bear2: { alt: 'Oliver Bearman’s Haas VF-26 rounding a corner at the Red Bull Ring', by: 'Lukas Raich', lic: 'CC BY-SA 4.0', file: 'FIA F1 Austria 2026 Nr. 87 Bearman (2).jpg', ratio: '3 / 2', where: 'Austrian GP 2026' },
  bear3: { alt: 'Side view of Oliver Bearman’s Haas VF-26 on the kerb', by: 'Lukas Raich', lic: 'CC BY-SA 4.0', file: 'FIA F1 Austria 2026 Nr. 87 Bearman (3).jpg', ratio: '2 / 1', where: 'Austrian GP 2026' },
  bear4: { alt: 'Oliver Bearman’s Haas VF-26 seen head-on through a corner', by: 'Lukas Raich', lic: 'CC BY-SA 4.0', file: 'FIA F1 Austria 2026 Nr. 87 Bearman (4).jpg', ratio: '3 / 2', where: 'Austrian GP 2026' },
  hira1: { alt: 'Ryo Hirakawa driving the Haas VF-26 in practice at the Red Bull Ring', by: 'Lukas Raich', lic: 'CC BY-SA 4.0', file: 'FIA F1 Austria 2026 Nr. 50 Hirakawa (1).jpg', ratio: '2 / 1', where: 'Austrian GP 2026 · FP1' },
  hira2: { alt: 'Ryo Hirakawa’s Haas VF-26 turning in at the Red Bull Ring', by: 'Lukas Raich', lic: 'CC BY-SA 4.0', file: 'FIA F1 Austria 2026 Nr. 50 Hirakawa (2).jpg', ratio: '3 / 2', where: 'Austrian GP 2026 · FP1' },
  cam1: { alt: 'Rafael Câmara in his Invicta Formula 2 car at the Red Bull Ring', by: 'Lukas Raich', lic: 'CC BY-SA 4.0', file: 'FIA F2 Austria 2026 Nr. 1 Câmara (1).jpg', ratio: '16 / 9', where: 'FIA F2 · Austria 2026' },
  hiraP: { alt: 'Ryo Hirakawa in Toyota Gazoo Racing team kit', by: 'Morio', lic: 'CC BY-SA 4.0', file: 'Ryo Hirakawa 2024 WEC Fuji 1.jpg', where: 'WEC Fuji 2024' },
  camP: { alt: 'Rafael Câmara, pictured in 2022', by: 'KVYTICAL', lic: 'CC BY-SA 4.0', file: 'Rafael Câmara in 2022.jpg', where: '2022' },
  doohP: { alt: 'Jack Doohan, pictured in 2023', by: 'Byxelized', lic: 'CC0', file: 'Jack Doohan 2023.jpg', where: '2023' },
  doohA: { alt: 'Jack Doohan driving for Alpine at the 2025 Japanese Grand Prix', by: 'Liauzh', lic: 'CC BY-SA 4.0', file: '2025 Japan GP - Alpine - Jack Doohan - FP3.jpg', where: 'Japanese GP 2025 · FP3' },
  gene: { alt: 'Gene Haas at the 2017 United States Grand Prix', by: 'Steve from Austin, TX, USA', lic: 'CC BY-SA 2.0', file: 'Gene Haas 2017 United States GP.jpg', where: 'United States GP 2017' },
  cam2: { alt: 'Rafael Câmara’s Formula 2 car through a corner at the Red Bull Ring', by: 'Lukas Raich', lic: 'CC BY-SA 4.0', file: 'FIA F2 Austria 2026 Nr. 1 Câmara (2).jpg', ratio: '16 / 9', where: 'FIA F2 · Austria 2026' },
};

export const standings = {
  constructors: { pos: 7, pts: 31, behind: { team: 'Audi', pts: 28 } },
  scorers: [
    { name: 'Oliver Bearman', pts: 23, note: 'P13' },
    { name: 'Esteban Ocon', pts: 7, note: 'Rounds 1–18' },
    { name: 'Ryo Hirakawa', pts: 1, note: 'Round 19' },
    { name: 'Rafael Câmara', pts: 0, note: 'Round 20' },
  ],
};

// Las Vegas GP: Sat 21 Nov, 20:00 local (PST) = Sun 22 Nov 04:00 UTC.
export const nextRace = {
  round: 21,
  total: 23,
  name: 'Las Vegas Grand Prix',
  short: 'Las Vegas',
  circuit: 'Las Vegas Strip Circuit',
  startUTC: '2026-11-22T04:00:00Z',
  localLabel: 'Sat 21 Nov · 20:00 PST',
  facts: [['Length', '6.201 km'], ['Laps', '50'], ['Corners', '17'], ['Type', 'Street · night']],
};

// 2026 calendar as run. `a` is Bearman's result. `b` is the second car: [driver, result].
// Sprint results are in `sa` / `sb`. Results: number = classified position.
const O = 'Ocon', H = 'Hirakawa', C = 'Câmara';
export const calendar = [
  { r: 1, gp: 'Australia', venue: 'Albert Park, Melbourne', date: '8 Mar', a: 7, b: [O, 11] },
  { r: 2, gp: 'China', venue: 'Shanghai International Circuit', date: '15 Mar', a: 5, sa: 8, b: [O, 14], sprint: true },
  { r: 3, gp: 'Japan', venue: 'Suzuka Circuit', date: '29 Mar', a: 'Ret', b: [O, 10] },
  { r: 4, gp: 'Miami', venue: 'Miami International Autodrome', date: '3 May', a: 11, b: [O, 13] },
  { r: 5, gp: 'Canada', venue: 'Circuit Gilles Villeneuve, Montréal', date: '24 May', a: 10, b: [O, 14] },
  { r: 6, gp: 'Monaco', venue: 'Circuit de Monaco', date: '7 Jun', a: 'Ret', b: [O, 9] },
  { r: 7, gp: 'Barcelona-Catalunya', venue: 'Circuit de Barcelona-Catalunya', date: '14 Jun', a: 17, b: [O, 13] },
  { r: 8, gp: 'Austria', venue: 'Red Bull Ring, Spielberg', date: '28 Jun', a: 14, b: [O, 16] },
  { r: 9, gp: 'Great Britain', venue: 'Silverstone Circuit', date: '5 Jul', a: 12, b: [O, 13] },
  { r: 10, gp: 'Belgium', venue: 'Spa-Francorchamps', date: '19 Jul', a: 14, b: [O, 17] },
  { r: 11, gp: 'Hungary', venue: 'Hungaroring, Budapest', date: '26 Jul', a: 19, b: [O, 16] },
  { r: 12, gp: 'Netherlands', venue: 'Circuit Zandvoort', date: '23 Aug', a: 'Ret', b: [O, 'Ret'] },
  { r: 13, gp: 'Italy', venue: 'Monza Circuit', date: '6 Sep', a: 15, b: [O, 16] },
  { r: 14, gp: 'Spain', venue: 'Madring, Madrid', date: '13 Sep', a: 16, b: [O, 11] },
  { r: 15, gp: 'Azerbaijan', venue: 'Baku City Circuit', date: '26 Sep', a: 9, b: [O, 8] },
  { r: 16, gp: 'Bahrain (in Malaysia)', venue: 'Sepang International Circuit', date: '4 Oct', a: 14, b: [O, 15] },
  { r: 17, gp: 'Singapore', venue: 'Marina Bay Street Circuit', date: '11 Oct', a: 12, sa: 6, b: [O, 13], sprint: true },
  { r: 18, gp: 'United States', venue: 'Circuit of the Americas, Austin', date: '25 Oct', a: 'Ret', b: [O, 14] },
  { r: 19, gp: 'Mexico City', venue: 'Autódromo Hermanos Rodríguez', date: '1 Nov', a: 'Ret', b: [H, 10] },
  { r: 20, gp: 'São Paulo', venue: 'Interlagos Circuit', date: '8 Nov', a: 17, b: [C, 20] },
  { r: 21, gp: 'Las Vegas', venue: 'Las Vegas Strip Circuit', date: '21 Nov', next: true },
  { r: 22, gp: 'Qatar', venue: 'Lusail International Circuit', date: '29 Nov' },
  { r: 23, gp: 'Abu Dhabi', venue: 'Yas Marina Circuit', date: '6 Dec' },
];

const GP_PTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const SP_PTS = [8, 7, 6, 5, 4, 3, 2, 1];
export const pts = (pos, sprint) => (typeof pos === 'number' ? (sprint ? SP_PTS : GP_PTS)[pos - 1] || 0 : 0);

export const drivers = [
  {
    id: 'bearman', first: 'Oliver', last: 'Bearman', num: '87', role: 'Race driver', country: 'Great Britain', cc: 'GBR',
    born: '8 May 2005', place: 'Chelmsford, England', photo: 'bear1', photo2: 'bear4',
    line: 'Fifth in Shanghai. Twenty-three of the team’s thirty-one points.',
    stats: [['2026 points', '23'], ['Championship', 'P13'], ['Best finish', 'P5'], ['Points finishes', '4 + 2 sprints']],
    bio: [
      'A Ferrari Driver Academy graduate who scored points on his Formula 1 debut as a last-minute stand-in at Jeddah in 2024, aged 18.',
      'Ollie joined Haas full-time in 2025 and equalled the team’s best ever result with fourth in Mexico City. In 2026 he has carried the scoring: fifth in China, plus points in Australia, Canada, Azerbaijan and two sprints.',
    ],
    timeline: [['2023', 'FIA Formula 2 race winner with Prema'], ['2024', 'F1 debut for Ferrari in Jeddah, P7. Two substitute starts for Haas'], ['2025', 'Full-time Haas race driver. P4 in Mexico City'], ['2026', 'P5 in China. The team’s leading scorer']],
  },
  {
    id: 'camara', first: 'Rafael', last: 'Câmara', num: '51', role: 'Race driver 2027', country: 'Brazil', cc: 'BRA',
    born: '5 May 2005', place: 'Recife, Brazil', photo: 'cam1', photo2: 'camP', photoNote: 'Pictured in his 2026 Formula 2 car, and in 2022',
    line: 'Confirmed for 2027. Made his debut a season early, at home.',
    stats: [['F1 debut', 'São Paulo 2026'], ['Debut result', 'P20'], ['2027', 'Race seat'], ['Title', 'FIA F3 2025']],
    bio: [
      'The 2025 FIA Formula 3 champion and Ferrari Driver Academy member is confirmed as a Haas race driver for 2027.',
      'He arrived early: Rafa made his Grand Prix debut at Interlagos in Round 20, in front of his home crowd, and brought the car to the finish.',
    ],
    timeline: [['2025', 'FIA Formula 3 champion'], ['2026', 'FIA Formula 2 with Invicta. Confirmed for a 2027 Haas race seat'], ['Nov 2026', 'Formula 1 debut at the São Paulo Grand Prix']],
  },
  {
    id: 'hirakawa', first: 'Ryo', last: 'Hirakawa', num: '50', role: 'Reserve driver', country: 'Japan', cc: 'JPN',
    born: '7 March 1994', place: 'Kure, Japan', photo: 'hira1', photo2: 'hiraP',
    line: 'One Grand Prix start. One point.',
    stats: [['GP starts', '1'], ['Points', '1'], ['Mexico City 2026', 'P10'], ['Le Mans', 'Winner 2022']],
    bio: [
      'A two-time World Endurance champion and Le Mans 24 Hours winner with Toyota Gazoo Racing, and the human link in the TGR partnership.',
      'Called up for Mexico City in Round 19, Ryo finished tenth and scored on his Grand Prix debut.',
    ],
    timeline: [['2022', 'Le Mans 24 Hours winner and WEC champion'], ['2023', 'Second WEC drivers’ title'], ['2025', 'Joins Haas as reserve driver'], ['2026', 'Grand Prix debut in Mexico City, P10']],
  },
  {
    id: 'doohan', first: 'Jack', last: 'Doohan', num: '', role: 'Reserve driver', country: 'Australia', cc: 'AUS',
    born: '20 January 2003', place: 'Gold Coast, Australia', photo: 'doohA', photo2: 'doohP', photoNote: 'Pictured driving for Alpine in 2025, and in 2023', homeHide: true,
    line: 'Simulator and garage support for the race team.',
    stats: [['Role', 'Reserve'], ['Joined', '2026'], ['F1 debut', 'Abu Dhabi 2024'], ['F2', '3rd · 2023']],
    bio: ['The Australian joined for 2026 as reserve driver after racing in Formula 1 with Alpine, and supports the race team from the simulator and the garage.'],
    timeline: [['2023', 'Third in FIA Formula 2'], ['2024', 'Formula 1 debut in Abu Dhabi'], ['2026', 'Joins Haas as reserve driver']],
  },
];

export const car = {
  intro: 'The first Haas built for Formula 1’s biggest rule change in a generation. Smaller and lighter, with wings that move and a power unit that makes close to half its power from electricity.',
  hotspots: [
    { id: 'fw', title: 'Active front wing', stat: ['2', 'movable flaps per side'], text: 'The flaps flatten on the straights to shed drag and snap back for the corners. Switch to Straight mode and watch them move.' },
    { id: 'ck', title: 'Survival cell', stat: ['768', 'kg minimum, with driver'], text: 'Tougher 2026 crash tests, a stronger roll hoop and a two-stage nose structure, in a car 30 kg lighter than last year.' },
    { id: 'pu', title: 'Ferrari 067/6 power unit', stat: ['350', 'kW from the MGU-K'], text: 'A 1.6-litre turbo V6 hybrid. The MGU-H is gone, and the electric motor delivers nearly three times last year’s power. Turn on X-ray to see it.' },
    { id: 'ty', title: 'Narrower tyres', stat: ['−30', 'mm rear tyre width'], text: '18-inch wheels stay. Fronts are 25 mm narrower and rears 30 mm narrower, cutting drag and weight.' },
    { id: 'fl', title: 'Flatter floor', stat: ['−30', '% downforce vs 2025'], text: 'The long ground-effect tunnels are out. A flatter floor and a larger diffuser make the car less sensitive to ride height.' },
    { id: 'rw', title: 'Active rear wing', stat: ['3', 'elements, two of them movable'], text: 'Works in step with the front wing. DRS is gone: every car can open its wings on every designated straight.' },
  ],
  kpis: [['768', 'kg', 'Minimum weight'], ['350', 'kW', 'Electric power'], ['3400', 'mm', 'Max wheelbase'], ['100', '%', 'Sustainable fuel']],
  // [label, 2025 value, 2026 value, unit, note]
  compare: [
    ['Minimum weight', 800, 768, 'kg', '30 kg lighter'],
    ['Width', 2000, 1900, 'mm', '100 mm narrower'],
    ['Maximum wheelbase', 3600, 3400, 'mm', '200 mm shorter'],
    ['MGU-K power', 120, 350, 'kW', 'Almost 3× the electric power'],
    ['Combustion power', 550, 400, 'kW', 'Approximate. The V6 does less of the work'],
    ['Front tyre width', 305, 280, 'mm', '25 mm narrower'],
    ['Rear tyre width', 405, 375, 'mm', '30 mm narrower'],
  ],
  aero: { corner: { label: 'Corner mode', drag: 100, down: 100, text: 'Flaps closed. Maximum downforce for braking and turning.' }, straight: { label: 'Straight mode', drag: 45, down: 70, text: 'Flaps open. Drag falls sharply so the battery’s energy goes further.' } },
  inner: [['Combustion engine', '1.6 L V6 turbo', '#d4001f'], ['Turbocharger', 'Single, no MGU-H', '#ff5a36'], ['MGU-K', '350 kW motor-generator', '#35e08a'], ['Energy store', 'Battery under the fuel cell', '#29d3ff'], ['Fuel cell', '100% sustainable fuel', '#ffb020'], ['Gearbox', '8-speed, Ferrari', '#b9bcc4'], ['Radiators', 'Inside each sidepod', '#7aa2ff']],
  specs: [
    ['Chassis', 'Carbon-fibre composite monocoque'],
    ['Power unit', 'Ferrari 067/6, 1.6 L V6 turbo hybrid'],
    ['Energy recovery', 'MGU-K, up to 350 kW'],
    ['Transmission', 'Ferrari 8-speed, rear-mounted'],
    ['Aerodynamics', 'Active front and rear wings'],
    ['Minimum weight', '768 kg including driver'],
    ['Dimensions', '1900 mm wide, wheelbase up to 3400 mm'],
    ['Tyres', 'Pirelli, 18-inch'],
    ['Fuel', '100% advanced sustainable fuel'],
    ['Launched', '19 January 2026'],
  ],
};

export const news = [
  { tag: 'Race preview', date: '13 Nov', title: 'Round 21: back on home soil, under the lights in Las Vegas', photo: 'bear2' },
  { tag: 'Drivers', date: '8 Nov', title: 'Câmara reaches the flag on his Formula 1 debut at Interlagos' },
  { tag: 'Race report', date: '1 Nov', title: 'Hirakawa scores on his Grand Prix debut in Mexico City' },
  { tag: 'Announcement', date: 'Oct', title: 'Rafael Câmara confirmed as Haas race driver for 2027' },
  { tag: 'Partners', date: 'Jul', title: 'CommScope and Exein join the team at Spa' },
];

export const timeline = [
  ['2014', 'The entry', 'Gene Haas, founder of Haas Automation, is granted a Formula 1 entry.'],
  ['2016', 'Points on debut', 'Romain Grosjean finishes sixth in Melbourne in the team’s very first Grand Prix.'],
  ['2018', 'Fifth in the world', 'The best season to date: fifth in the Constructors’ Championship and a fourth place in Austria.'],
  ['2022', 'Pole position', 'Kevin Magnussen puts a Haas on pole in the rain at Interlagos.'],
  ['2024', 'A new era', 'Ayao Komatsu becomes Team Principal. A technical partnership with Toyota Gazoo Racing begins.'],
  ['2025', 'Fourth again', 'Oliver Bearman equals the team’s best result with P4 in Mexico City.'],
  ['2026', 'TGR Haas F1 Team', 'Toyota Gazoo Racing becomes title partner as the VF-26 takes on all-new regulations.'],
];

export const leadership = [['Gene Haas', 'Founder & Chairman'], ['Ayao Komatsu', 'Team Principal'], ['Andrea De Zordo', 'Technical Director']];

export const bases = [
  { city: 'Kannapolis', region: 'North Carolina, USA', role: 'Headquarters' },
  { city: 'Banbury', region: 'Oxfordshire, UK', role: 'Race operations' },
  { city: 'Maranello', region: 'Emilia-Romagna, Italy', role: 'Design office' },
];

export const partners = [
  { tier: 'Title partner', items: [['Toyota Gazoo Racing', 'Title Partner']] },
  { tier: 'Founding & technical', items: [['Haas Automation', 'Founding Partner'], ['Ferrari', 'Power Unit Supplier'], ['Pirelli', 'Tyre Supplier']] },
  { tier: 'Official partners', items: [['Castore', 'Kit & Retail'], ['D.Energy', 'Sustainability'], ['Singha', 'Beer'], ['Zoomex', 'Crypto Exchange'], ['Ruckus Networks', 'Official Partner'], ['CommScope', 'Official Partner'], ['Exein', 'Official Partner'], ['Fix Network', 'Official Partner']] },
];

export const careers = [['Aerodynamics', 'Maranello'], ['Vehicle Performance', 'Banbury'], ['Composites & Manufacturing', 'Banbury'], ['Race Team', 'Travelling'], ['Partnerships & Marketing', 'Kannapolis'], ['Early Careers', 'All sites']];
