/**
 * Das Gelände des Strick-Bergs: EINE durchgehende Oberfläche, beschrieben durch eine einzige Formel.
 *
 * hoehe(x, z) sagt für jeden Punkt der Karte, wie hoch der Boden dort ist. Daraus entstehen:
 * - das Netz des Bergs (ein einziges Stück Strick, keine Ebenen, keine Kulissen),
 * - der Wanderweg, der im Zickzack vom Gipfel bis an den See führt,
 * - die Plätze für Häuser, Bäume und Seilbahn (alles steht direkt auf dem Hang).
 *
 * Der Berg ist für den Blick von vorne gebaut: Die Kamera schaut immer frontal nach Norden auf die Südwand
 * des Hausbergs und fährt beim Scrollen an ihr hinunter. Darum ist die Wand steil und hat drei Absätze,
 * auf denen etwas steht: die Gipfelschulter (Name), die Alp (Chalets) und das Dorf am See.
 *
 * Koordinaten: x nach Osten, z nach Süden (zur Kamera hin), y nach oben. Der Hausberg steht bei (0, 0).
 * Reine Mathematik ohne three.js, damit sich die Formel auch ausserhalb des Browsers prüfen lässt.
 */

/** Weiche Stufe von 0 bis 1 zwischen a und b */
export function stufe(x: number, a: number, b: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Höhe des Talbodens */
const TAL = 2.5;

/** Wasserspiegel und Lage des Sees am Fuss des Bergs */
export const WASSER_Y = 1.6;
export const SEE = { x: -4, z: 142, rx: 34, rz: 13 };

/** Ausdehnung der Welt. Südlich des Sees ist Schluss: Dorthin schaut die Kamera nie. */
export const WELT = { x0: -170, x1: 170, z0: -205, z1: 185 };

/* ------------------------------------------------------------------ Die Südwand des Hausbergs im Schnitt */

/**
 * Schnitt durch den Hausberg von Norden nach Süden, als Stützpunkte [z, Höhe]:
 * Gipfelkuppe, Schulter mit dem Namen, Felswand, Alp, Waldhang, Dorf, Ufer.
 */
const PROFIL: [number, number][] = [
  [-95, TAL],
  [-55, 30],
  [-30, 58],
  [-9, 86.5],
  [3, 87.5],
  [10, 84.8],
  [28, 83.4],
  [47, 54],
  [51, 52.2],
  [65, 49.6],
  [96, 10.4],
  [100, 8.6],
  [119, 3.6],
  [124, 2.6],
  [130, TAL],
  [200, TAL],
];

/** Steigung an jedem Stützpunkt, so gewählt, dass die Kurve nirgends überschwingt (Absätze bleiben Absätze) */
const PROFIL_STEIGUNG = (() => {
  const n = PROFIL.length;
  const sekante: number[] = [];
  for (let i = 0; i < n - 1; i++) sekante.push((PROFIL[i + 1][1] - PROFIL[i][1]) / (PROFIL[i + 1][0] - PROFIL[i][0]));
  const m = [sekante[0]];
  for (let i = 1; i < n - 1; i++) {
    const [a, b] = [sekante[i - 1], sekante[i]];
    m.push(a * b <= 0 ? 0 : (2 * a * b) / (a + b));
  }
  m.push(sekante[n - 2]);
  return m;
})();

/** Höhe der Südwand in der Mitte des Bergs (x = 0) */
function profil(z: number) {
  const n = PROFIL.length;
  if (z <= PROFIL[0][0]) return PROFIL[0][1];
  if (z >= PROFIL[n - 1][0]) return PROFIL[n - 1][1];
  let i = 0;
  while (z > PROFIL[i + 1][0]) i++;
  const [z0, y0] = PROFIL[i];
  const [z1, y1] = PROFIL[i + 1];
  const l = z1 - z0;
  const t = (z - z0) / l;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * l * PROFIL_STEIGUNG[i] + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * l * PROFIL_STEIGUNG[i + 1]
  );
}

/**
 * Der Hausberg über dem Talboden: der Schnitt, zur Seite hin weich abfallend.
 * In der Mitte bleibt ein Streifen ganz auf der Höhe des Schnitts (oben schmal, unten breit), damit die Absätze eben sind.
 */
function hausberg(x: number, z: number) {
  const mitte = 9 + 13 * stufe(z, 0, 60);
  const flanke = 26 + 22 * stufe(z, 0, 70);
  const d = Math.max(0, Math.abs(x) - mitte) / flanke;
  const seite = Math.exp(-d * d);
  let h = (profil(z) - TAL) * seite;
  // Gipfelkuppe hinter dem Namen
  h += 7 * Math.exp(-Math.pow(Math.hypot(x, z + 2) / 8, 1.5));
  // Rippen in der Felswand: Rinnen, die den Hang hinunterlaufen
  const wand = stufe(z, 29, 33) * (1 - stufe(z, 43, 47)) * seite;
  h += (3 * Math.sin(x * 0.36 + Math.sin(z * 0.21) * 1.2) + 1.2 * Math.sin(x * 0.83 + z * 0.31 + 2)) * wand;
  h += 0.9 * Math.sin(profil(z) * 0.6) * wand;
  return h;
}

/* ------------------------------------------------------------------ Die Berge rundherum */

/**
 * Ein Berg: ein breiter, weicher Körper (Glockenform, nach Norden und Süden verschieden lang)
 * und obendrauf ein spitzer Kern für den Gipfel. «grate» gibt dem Kern Kanten, die vom Gipfel
 * sternförmig nach unten laufen (wie die Grate eines echten Horns), «spitz» macht ihn schlanker (kleiner = spitzer).
 */
type Spitze = { x: number; z: number; koerper: number; rx: number; rzN: number; rzS: number; kern: number; kernR: number; grate?: number; dreh?: number; spitz?: number };

const SPITZEN: Spitze[] = [
  // Erste Reihe: Nachbargipfel links und rechts hinter dem Hausberg
  { x: -58, z: -30, koerper: 58, rx: 30, rzN: 30, rzS: 38, kern: 42, kernR: 13, grate: 4, dreh: 0.6, spitz: 1.3 },
  { x: 62, z: -22, koerper: 60, rx: 32, rzN: 30, rzS: 40, kern: 42, kernR: 13, grate: 5, dreh: 1.4, spitz: 1.35 },
  // Zweite Reihe: links ein schlankes Horn, rechts ein breites Massiv mit zwei Gipfeln
  { x: -30, z: -82, koerper: 62, rx: 34, rzN: 34, rzS: 34, kern: 48, kernR: 15, grate: 4, dreh: 0.2, spitz: 1.12 },
  { x: 36, z: -90, koerper: 68, rx: 40, rzN: 34, rzS: 34, kern: 34, kernR: 16, grate: 5, dreh: 0.9, spitz: 1.4 },
  { x: 64, z: -68, koerper: 44, rx: 26, rzN: 28, rzS: 28, kern: 30, kernR: 12, grate: 3, dreh: 2.1, spitz: 1.25 },
  // Dritte Reihe: eine ferne Kette im Dunst
  { x: -108, z: -148, koerper: 74, rx: 40, rzN: 36, rzS: 36, kern: 42, kernR: 15, grate: 4, dreh: 1.1, spitz: 1.3 },
  { x: -44, z: -170, koerper: 78, rx: 38, rzN: 34, rzS: 34, kern: 46, kernR: 15, grate: 5, dreh: 0.4, spitz: 1.2 },
  { x: 16, z: -176, koerper: 76, rx: 40, rzN: 34, rzS: 34, kern: 42, kernR: 16, grate: 4, dreh: 2.4, spitz: 1.35 },
  { x: 80, z: -160, koerper: 80, rx: 40, rzN: 36, rzS: 36, kern: 46, kernR: 15, grate: 5, dreh: 1.8, spitz: 1.25 },
  { x: 136, z: -128, koerper: 70, rx: 36, rzN: 36, rzS: 36, kern: 38, kernR: 14, grate: 4, dreh: 0.7, spitz: 1.35 },
  { x: -142, z: -112, koerper: 68, rx: 36, rzN: 36, rzS: 36, kern: 38, kernR: 14, grate: 3, dreh: 1.5, spitz: 1.35 },
  // Talflanken im Westen und Osten
  { x: -120, z: 60, koerper: 62, rx: 36, rzN: 50, rzS: 50, kern: 22, kernR: 12, grate: 4, dreh: 0.3 },
  { x: -128, z: 140, koerper: 52, rx: 34, rzN: 44, rzS: 44, kern: 16, kernR: 10 },
  { x: 122, z: 70, koerper: 64, rx: 36, rzN: 50, rzS: 50, kern: 24, kernR: 12, grate: 4, dreh: 1.9 },
  { x: 126, z: 150, koerper: 54, rx: 34, rzN: 44, rzS: 44, kern: 18, kernR: 10 },
];

/** Rohes Gelände: Talboden, Hausberg, Nachbarberge, sanfte Buckel, Seebecken und ein hoher Rand um die Welt */
function roh(x: number, z: number) {
  let h = TAL + hausberg(x, z);
  for (const s of SPITZEN) {
    const dx = x - s.x;
    const dz = z - s.z;
    const rz = dz < 0 ? s.rzN : s.rzS;
    h += s.koerper * Math.exp(-((dx / s.rx) ** 2 + (dz / rz) ** 2));
    if (s.kern) {
      // Grate: Der Kern ist je nach Himmelsrichtung breiter oder schmaler, das gibt Kanten und Rinnen
      const kante = s.grate ? 1 + 0.42 * (Math.abs(Math.sin((Math.atan2(dz, dx) * s.grate) / 2 + (s.dreh ?? 0))) - 0.55) : 1;
      h += s.kern * Math.exp(-Math.pow(Math.hypot(dx, dz) / (s.kernR * kante), s.spitz ?? 1.5));
    }
  }
  // Rand der Welt: im Norden und an den Seiten Berge, damit man nie über eine Kante hinaussieht
  h += 50 * Math.max(stufe(Math.abs(x), 138, 168), stufe(-z, 176, 203));
  // Sanfte Buckel: oben am Berg kräftiger, im Tal fast flach
  const kraft = 0.3 + Math.min(1, h / 22) * 0.7;
  h += kraft * (Math.sin(x * 0.13 + 1) * Math.cos(z * 0.11 - 0.5) + 0.45 * Math.sin(x * 0.31 + z * 0.27 + 2));
  // Seebecken
  h -= 7 * Math.exp(-(((x - SEE.x) / SEE.rx) ** 2 + ((z - SEE.z) / SEE.rz) ** 2));
  return h;
}

/* ------------------------------------------------------------------ Der Wanderweg auf der Karte */

/** Wegpunkte (x, z): im Zickzack die Felswand hinunter, über die Alp, durch den Wald und das Dorf ans Seeufer */
const WEGPUNKTE: [number, number][] = [
  [8.5, 25],
  [3, 29],
  [-10, 32.5],
  [-12.5, 35],
  [6, 38.5],
  [8.5, 41],
  [-8, 44.5],
  [-9.5, 47.5],
  [-3, 52],
  [4.5, 57],
  [-2, 62],
  [-12, 66.5],
  [-15, 69.5],
  [5, 74],
  [7.5, 77],
  [-10, 82],
  [-13, 85],
  [-2, 89.5],
  [-4.5, 93],
  [-6.5, 98.5],
  [-5, 104],
  [-1, 110],
  [0, 116],
  [-3, 121.5],
];

/** Der Weg als dichte Punktkette (etwa alle 0.9 Einheiten ein Punkt), weich durch die Wegpunkte gelegt (Catmull-Rom) */
function kurveBauen(p: [number, number][], abstand = 0.9) {
  const roh2d: [number, number][] = [];
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(0, i - 1)];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[Math.min(p.length - 1, i + 2)];
    for (let k = 0; k < 24; k++) {
      const t = k / 24;
      const punkt = [0, 1].map(
        (a) =>
          0.5 *
          (2 * p1[a] + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t * t + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t * t * t),
      ) as [number, number];
      roh2d.push(punkt);
    }
  }
  roh2d.push(p[p.length - 1]);
  // Gleichmässig nach Weglänge verteilen
  const punkte: [number, number][] = [roh2d[0]];
  let rest = 0;
  for (let i = 1; i < roh2d.length; i++) {
    const [ax, az] = roh2d[i - 1];
    const [bx, bz] = roh2d[i];
    const l = Math.hypot(bx - ax, bz - az);
    let weit = abstand - rest;
    while (weit <= l) {
      punkte.push([ax + ((bx - ax) * weit) / l, az + ((bz - az) * weit) / l]);
      weit += abstand;
    }
    rest = (rest + l) % abstand;
  }
  return punkte;
}

/** Der Weg auf der Karte, dicht abgetastet */
export const WEG_KARTE = kurveBauen(WEGPUNKTE);

/** Abstand eines Punkts zum Weg (für Bäume und Häuser: Weg frei lassen) */
export function abstandZumWeg(x: number, z: number) {
  let min = Infinity;
  for (const [wx, wz] of WEG_KARTE) {
    const d = (x - wx) ** 2 + (z - wz) ** 2;
    if (d < min) min = d;
  }
  return Math.sqrt(min);
}

/* ------------------------------------------------------------------ Der Bach */

/**
 * Der Bach (x, z): Er entspringt im Schnee, fällt als Wasserfall die Felswand hinunter,
 * fliesst über die Alp, durch den Wald und am Dorf vorbei in den See.
 */
const BACHPUNKTE: [number, number][] = [
  [-17.5, 30],
  [-18.5, 34],
  [-18, 38],
  [-19, 42],
  [-18.5, 46],
  [-18, 49.5],
  [-17.5, 54],
  [-17, 58],
  [-18, 62],
  [-19, 65.5],
  [-19.5, 70],
  [-18.5, 75],
  [-20, 80],
  [-19, 85],
  [-20.5, 90],
  [-20.5, 95],
  [-23, 99.5],
  [-24.5, 103.5],
  [-22, 107],
  [-20, 110.5],
  [-18.5, 115],
  [-17, 120],
  [-16.5, 125.5],
];

/** Der Bach auf der Karte, dicht abgetastet (alle 0.6 Einheiten ein Punkt) */
export const BACH_KARTE = kurveBauen(BACHPUNKTE, 0.6);

/** Abstand eines Punkts zum Bach */
export function abstandZumBach(x: number, z: number) {
  if (x > -6 || x < -36 || z < 26) return Infinity;
  let min = Infinity;
  for (const [bx, bz] of BACH_KARTE) {
    const d = (x - bx) ** 2 + (z - bz) ** 2;
    if (d < min) min = d;
  }
  return Math.sqrt(min);
}

/* ------------------------------------------------------------------ Gassen und Pfade zu den Häusern */

/**
 * Kleine Wege (x, z) von jeder Haustür zum Wanderweg: im Dorf, zum Briefkasten und zum Steg, auf der Alp zu den Chalets.
 * Zwei davon führen über eine Brücke über den Bach.
 */
const GASSENPUNKTE: [number, number][][] = [
  // Dorf West: vom Weg an der Kirche vorbei zum Haus am Bach
  [
    [-3.2, 107.4],
    [-8.5, 107.9],
    [-12.5, 106.6],
    [-16.5, 106.9],
    [-19.5, 105.6],
  ],
  // über den Bach zum Haus ganz links
  [
    [-16.5, 106.9],
    [-21.8, 108.4],
    [-25.5, 111.6],
  ],
  // zwei Häuser in der Mitte links
  [
    [-14.5, 113],
    [-10.5, 113.9],
    [-6.5, 113.4],
    [-1, 113.2],
  ],
  // Haus am Ufer
  [
    [-10.5, 120],
    [-6.5, 120.6],
    [-3.2, 121.2],
  ],
  // Dorf Ost
  [
    [-0.6, 111],
    [3.5, 113.4],
    [7.5, 113.5],
    [11.5, 115.2],
    [14, 118.4],
  ],
  [
    [11.5, 115.2],
    [17.5, 113.4],
    [22.5, 112],
  ],
  [
    [17.5, 105],
    [15.5, 108.5],
    [12.8, 112.5],
    [11.5, 115.2],
  ],
  // zum Briefkasten und zum Steg
  [
    [-2.8, 121.2],
    [2.6, 122.8],
    [7.5, 123.9],
  ],
  // Alp: zu den drei Chalets, eines davon über den Bach
  [
    [-10.5, 58.8],
    [-6, 57.6],
    [-1.2, 54.6],
  ],
  [
    [10.5, 57.2],
    [7.2, 58],
    [4.6, 57.3],
  ],
  [
    [-24.5, 62.2],
    [-20.8, 63.2],
    [-15, 63.6],
    [-9, 64.9],
  ],
];

/** Die Gassen auf der Karte, dicht abgetastet (alle 0.55 Einheiten ein Punkt) */
export const GASSEN = GASSENPUNKTE.map((g) => kurveBauen(g, 0.55));

/** Abstand eines Punkts zur nächsten Gasse */
export function abstandZurGasse(x: number, z: number) {
  if (!((z > 96 && z < 127) || (z > 51 && z < 68))) return Infinity;
  let min = Infinity;
  for (const gasse of GASSEN) {
    for (const [gx, gz] of gasse) {
      const d = (x - gx) ** 2 + (z - gz) ** 2;
      if (d < min) min = d;
    }
  }
  return Math.sqrt(min);
}

/** Brücken über den Bach, dort wo eine Gasse ihn kreuzt: [x, z, Drehung um die Hochachse] */
export const BRUECKEN: [number, number, number][] = [
  [-21.4, 108.3, 0.28],
  [-18.4, 63.3, -0.07],
];

/**
 * Platz neben dem Weg auf der Karte: «anteil» ist die Stelle entlang des Wegs (0 = oben, 1 = am See),
 * «seite» ist +1 für rechts in Gehrichtung, -1 für links, «abstand» der Abstand zur Wegmitte.
 */
function nebenWeg(anteil: number, seite: 1 | -1, abstand: number) {
  const n = WEG_KARTE.length;
  const i = Math.min(n - 2, Math.max(1, Math.round(anteil * (n - 1))));
  const [ax, az] = WEG_KARTE[i - 1];
  const [bx, bz] = WEG_KARTE[i + 1];
  const l = Math.hypot(bx - ax, bz - az) || 1;
  const fx = (bx - ax) / l;
  const fz = (bz - az) / l;
  return { x: WEG_KARTE[i][0] - fz * seite * abstand, z: WEG_KARTE[i][1] + fx * seite * abstand };
}

/* ------------------------------------------------------------------ Plätze auf dem Berg */

/** [x, z] */
type Platz = [number, number];

/** Wo was steht. Jeder Bauplatz wird im Gelände eingeebnet, damit nichts schief am Hang klebt. */
export const ORTE = {
  /** Mitte des Namens LUKA auf der Schulter unter der Gipfelkuppe */
  name: [0, 20] as Platz,
  /** Gipfelkreuz auf der Kuppe dahinter */
  kreuz: [0, -2] as Platz,
  bergstation: [0, 34.5] as Platz,
  talstation: [0, 104.5] as Platz,
  /** Chalets auf der Alp */
  chalets: [
    [-10.5, 56.5],
    [10.5, 55],
    [-24.5, 60],
  ] as Platz[],
  /** Dorf am See: hinten eine Reihe am Fuss des Waldhangs, davor weitere Häuser bis ans Ufer */
  haeuser: [
    [-19.5, 103.5],
    [17.5, 103],
    [-14.5, 111],
    [-6.5, 111.5],
    [7.5, 111.5],
    [22.5, 110],
    [-25.5, 109.5],
    [-10.5, 118],
    [14, 116.5],
  ] as Platz[],
  kirche: [-12.5, 103.2] as Platz,
  /** Stützen der Seilbahn: an der Kante der Alp, im Waldhang und am Fuss des Hangs */
  stuetzen: [
    [0, 69],
    [0, 81],
    [0, 97],
  ] as Platz[],
};

/* ------------------------------------------------------------------ Die Formel für den Boden */

type Ebnung = { x: number; z: number; r: number; rz?: number; staerke: number; y: number };

/** Ebener Platz für den Namen auf der Schulter (breit, aber nicht tief) */
const FLAECHEN: Ebnung[] = [{ x: 0, z: 20, r: 15, rz: 8, staerke: 1 }].map((f) => ({ ...f, y: roh(f.x, f.z) }));

function ebnen(h: number, x: number, z: number, f: Ebnung) {
  const d = Math.hypot(x - f.x, ((z - f.z) * f.r) / (f.rz ?? f.r));
  if (d >= f.r) return h;
  return h + (f.y - h) * (1 - stufe(d, f.r * 0.5, f.r)) * f.staerke;
}

function mitFlaechen(x: number, z: number) {
  let h = roh(x, z);
  for (const f of FLAECHEN) h = ebnen(h, x, z, f);
  return h;
}

/** Kleine Bauplätze unter jedem Gebäude */
const BAUPLAETZE: Ebnung[] = [
  { p: ORTE.bergstation, r: 5 },
  { p: ORTE.talstation, r: 5 },
  { p: ORTE.kirche, r: 5.5 },
  ...ORTE.chalets.map((p) => ({ p, r: 3.8 })),
  ...ORTE.haeuser.map((p) => ({ p, r: 3.4 })),
].map(({ p, r }) => ({ x: p[0], z: p[1], r, staerke: 1, y: mitFlaechen(p[0], p[1]) }));

/** Höhe des Bodens an der Stelle (x, z): die eine Formel für den ganzen Berg */
export function hoehe(x: number, z: number) {
  let h = mitFlaechen(x, z);
  for (const b of BAUPLAETZE) h = ebnen(h, x, z, b);
  return h;
}

/** Abstand zum nächsten Gebäude (für Bäume: nicht ins Haus wachsen) */
export function abstandZuBauten(x: number, z: number) {
  let min = Infinity;
  for (const b of BAUPLAETZE) min = Math.min(min, Math.hypot(x - b.x, z - b.z) - b.r * 0.6);
  return min;
}

/** x der Seilbahn auf der Höhe z (gerade Linie von der Berg- zur Talstation) */
export function seilbahnX(z: number) {
  const [bx, bz] = ORTE.bergstation;
  const [tx, tz] = ORTE.talstation;
  return bx + ((z - bz) / (tz - bz)) * (tx - bx);
}

/* ------------------------------------------------------------------ Der Weg im Raum */

/** Der Weg im Raum: [x, y, z], y liegt genau auf dem Boden */
export const WEG: [number, number, number][] = WEG_KARTE.map(([x, z]) => [x, hoehe(x, z), z]);

/** Wie nebenWeg, aber mit der Höhe des Bodens: fertiger Platz für Blumen, Schilder und Pilze */
export function amWeg(anteil: number, seite: 1 | -1, abstand: number) {
  const p = nebenWeg(anteil, seite, abstand);
  return { ...p, y: hoehe(p.x, p.z) };
}
