/**
 * Die sechs Formen der Partikel-Reise.
 *
 * Jede Form ist eine Liste mit drei Zahlen pro Partikel.
 * - Statische Formen (Name, Porträt, @): die Zahlen sind direkt x, y, z.
 *   Dafür wird Text oder ein Bild auf ein unsichtbares Canvas gezeichnet und Pixel für Pixel abgetastet.
 * - Bewegte Formen (Welle, Atom, Galaxie): die Zahlen sind nur Parameter (z. B. Radius und Winkel).
 *   Die eigentliche Position rechnet der Shader in jedem Frame aus, darum können sie sich bewegen.
 */

export type FormDaten = {
  name: Float32Array;
  portrait: Float32Array;
  welle: Float32Array;
  atom: Float32Array;
  galaxie: Float32Array;
  at: Float32Array;
  /** vier Zufallszahlen pro Partikel: Farbe, Grösse, Verzögerung, Helligkeit */
  zufall: Float32Array;
};

type Zufall = () => number;

/** Kleiner Zufallsgenerator mit festem Startwert: die Wolke sieht bei jedem Besuch gleich aus. */
function zufallsgenerator(start: number): Zufall {
  let s = start;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type AbtastOptionen = {
  /** Zielbreite in Welt-Einheiten (oder Zielhöhe, falls angegeben) */
  breite?: number;
  hoehe?: number;
  /** Helligkeit statt Deckkraft abtasten (für Fotos) */
  helligkeit?: boolean;
  /** Wie stark helle Stellen nach vorne kommen (Relief) */
  tiefe?: number;
};

/** Tastet ein Canvas ab und verteilt n Punkte auf die «gefüllten» Pixel. */
function pixelPunkte(ctx: CanvasRenderingContext2D, w: number, h: number, n: number, z: Zufall, opt: AbtastOptionen) {
  const daten = ctx.getImageData(0, 0, w, h).data;
  const kx: number[] = [];
  const ky: number[] = [];
  const kw: number[] = [];
  let minX = w;
  let maxX = 0;
  let minY = h;
  let maxY = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const wert = opt.helligkeit
        ? ((0.299 * daten[i] + 0.587 * daten[i + 1] + 0.114 * daten[i + 2]) / 255) * (daten[i + 3] / 255)
        : daten[i + 3] / 255;
      if (wert > (opt.helligkeit ? 0.08 : 0.5)) {
        kx.push(x);
        ky.push(y);
        kw.push(wert);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const out = new Float32Array(n * 3);
  if (kx.length === 0) return out;

  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const skala = opt.breite ? opt.breite / bw : (opt.hoehe ?? 1) / bh;
  const mx = minX + bw / 2;
  const my = minY + bh / 2;

  let i = 0;
  let versuche = 0;
  while (i < n) {
    const k = Math.floor(z() * kx.length);
    versuche++;
    // Bei Fotos: helle Pixel bekommen öfter einen Punkt (Ablehnungsverfahren)
    if (opt.helligkeit && versuche < n * 40 && z() > Math.pow(kw[k], 1.3)) continue;
    out[i * 3] = (kx[k] + z() - mx) * skala;
    out[i * 3 + 1] = -(ky[k] + z() - my) * skala;
    out[i * 3 + 2] = opt.helligkeit ? (kw[k] - 0.5) * (opt.tiefe ?? 1) + (z() - 0.5) * 0.08 : (z() - 0.5) * 0.3;
    i++;
  }
  return out;
}

function neuesCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return canvas.getContext("2d", { willReadFrequently: true });
}

function textPunkte(text: string, schrift: string, breite: number, n: number, z: Zufall) {
  const groesse = 220;
  const font = `800 ${groesse}px ${schrift}`;
  const mess = neuesCanvas(1, 1);
  if (!mess) return new Float32Array(n * 3);
  mess.font = font;
  const w = Math.ceil(mess.measureText(text).width + groesse * 0.4);
  const h = Math.ceil(groesse * 1.5);
  const ctx = neuesCanvas(w, h);
  if (!ctx) return new Float32Array(n * 3);
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText(text, w / 2, h / 2);
  return pixelPunkte(ctx, w, h, n, z, { breite });
}

/** Platzhalter-Büste: Kopf, Haare, Hals und Schultern mit Licht von oben links. */
function zeichnePlatzhalter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  const licht = (hell: string, dunkel: string) => {
    const g = ctx.createRadialGradient(w * 0.36, h * 0.24, 4, w * 0.5, h * 0.5, h * 0.8);
    g.addColorStop(0, hell);
    g.addColorStop(0.5, "#8a8a8a");
    g.addColorStop(1, dunkel);
    return g;
  };

  // Schultern
  ctx.fillStyle = licht("#e0e0e0", "#202020");
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 1.0, w * 0.47, h * 0.27, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hals (im Schatten des Kinns)
  ctx.fillStyle = "#5a5a5a";
  ctx.fillRect(w * 0.41, h * 0.5, w * 0.18, h * 0.26);

  // Haare
  ctx.fillStyle = licht("#ffffff", "#303030");
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.31, w * 0.215, h * 0.175, 0, 0, Math.PI * 2);
  ctx.fill();

  // Gesicht
  ctx.fillStyle = licht("#f4f4f4", "#3a3a3a");
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.375, w * 0.19, h * 0.19, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ohren
  ctx.beginPath();
  ctx.ellipse(w * 0.31, h * 0.39, w * 0.035, h * 0.05, 0, 0, Math.PI * 2);
  ctx.ellipse(w * 0.69, h * 0.39, w * 0.035, h * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
}

function portraitPunkte(n: number, z: Zufall, bild: HTMLImageElement | null) {
  const w = 300;
  const h = 380;
  const ctx = neuesCanvas(w, h);
  if (!ctx) return new Float32Array(n * 3);

  if (bild) {
    // Foto füllend einpassen (wie object-fit: cover)
    const skala = Math.max(w / bild.width, h / bild.height);
    const bw = bild.width * skala;
    const bh = bild.height * skala;
    ctx.drawImage(bild, (w - bw) / 2, (h - bh) / 2, bw, bh);
    // Ränder weich ausblenden, damit der Hintergrund keine Punkte bekommt
    const maske = ctx.createRadialGradient(w / 2, h * 0.45, h * 0.2, w / 2, h * 0.45, h * 0.62);
    maske.addColorStop(0, "rgba(0,0,0,1)");
    maske.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = maske;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
  } else {
    zeichnePlatzhalter(ctx, w, h);
  }

  return pixelPunkte(ctx, w, h, n, z, { hoehe: 6.4, helligkeit: true, tiefe: 1.6 });
}

/** Welle: ein Raster aus (u, v) zwischen -1 und 1. Die Höhe rechnet der Shader. */
function welleParameter(n: number, z: Zufall) {
  const out = new Float32Array(n * 3);
  const spalten = Math.ceil(Math.sqrt(n * 3));
  const zeilen = Math.ceil(n / spalten);
  for (let i = 0; i < n; i++) {
    out[i * 3] = ((i % spalten) / (spalten - 1)) * 2 - 1 + (z() - 0.5) * 0.004;
    out[i * 3 + 1] = (Math.floor(i / spalten) / Math.max(1, zeilen - 1)) * 2 - 1;
    out[i * 3 + 2] = z();
  }
  return out;
}

/**
 * React-Atom: drei Ellipsen-Bahnen (0, 1, 2) und ein Kern (3).
 * Pro Partikel: Bahn, Startwinkel auf der Bahn, Dicke.
 * Ein Teil der Punkte drängt sich hinter einem «Elektron», das zieht beim Kreisen einen Schweif.
 */
function atomParameter(n: number, z: Zufall) {
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    if (z() < 0.12) {
      out[i * 3] = 3;
      out[i * 3 + 1] = z();
      out[i * 3 + 2] = z();
      continue;
    }
    const bahn = i % 3;
    const kopf = bahn * 2.1;
    out[i * 3] = bahn;
    out[i * 3 + 1] = z() < 0.4 ? kopf - Math.pow(z(), 2.2) * 2.2 : z() * Math.PI * 2;
    out[i * 3 + 2] = z() - 0.5;
  }
  return out;
}

/** Galaxie: drei Spiralarme plus heller Kern. Pro Partikel: Radius, Winkel, Höhe. */
function galaxieParameter(n: number, z: Zufall) {
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const kern = z() < 0.14;
    const r = kern ? Math.pow(z(), 2) * 0.9 : 0.4 + Math.pow(z(), 1.3) * 4.4;
    const streuung = (z() - 0.5) * (kern ? Math.PI * 2 : 0.6 * (1.2 - r / 5));
    out[i * 3] = r;
    out[i * 3 + 1] = (i % 3) * ((Math.PI * 2) / 3) + r * 0.85 + streuung;
    out[i * 3 + 2] = (z() - 0.5) * (kern ? 0.5 : 0.28) * (1.1 - r / 5);
  }
  return out;
}

export function erzeugeFormen(
  n: number,
  optionen: { schrift: string; name: string; portraitBild: HTMLImageElement | null },
): FormDaten {
  const z = zufallsgenerator(7);
  const zufall = new Float32Array(n * 4);
  for (let i = 0; i < zufall.length; i++) zufall[i] = z();

  return {
    name: textPunkte(optionen.name, optionen.schrift, 10, n, z),
    portrait: portraitPunkte(n, z, optionen.portraitBild),
    welle: welleParameter(n, z),
    atom: atomParameter(n, z),
    galaxie: galaxieParameter(n, z),
    at: textPunkte("@", optionen.schrift, 4.6, n, z),
    zufall,
  };
}
