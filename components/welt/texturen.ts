import * as THREE from "three";

/**
 * Prozedurale Material-Kacheln für die Bastelwelt.
 *
 * Für jedes Material wird zuerst ein HÖHENFELD berechnet: für jeden Pixel eine Zahl von 0 (tief) bis 1 (hoch).
 * Daraus entstehen zwei Texturen:
 * - Farbe: hell auf den Erhebungen, dunkel in den Ritzen (wie Licht, das nicht in Spalten kommt).
 * - Normal-Map: die Neigung der Oberfläche pro Pixel. Damit berechnet die Grafikkarte, wie das Licht
 *   über jede einzelne Masche, Faser oder Rille streicht, obwohl die Fläche eigentlich flach ist.
 *
 * Alle Kacheln sind nahtlos (die Ränder «wickeln» sich um) und werden oft wiederholt, darum bleiben sie scharf.
 */

export type Kachel = { farbe: THREE.Texture; normale: THREE.Texture };

type Zufall = () => number;

/** Zufall mit festem Startwert: gleiche Zahl, gleiche Folge (die Welt sieht bei jedem Laden gleich aus) */
export function zufall(start: number): Zufall {
  let s = start % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function datenTextur(daten: Uint8Array, breite: number, hoehe: number, farbig: boolean) {
  const t = new THREE.DataTexture(daten, breite, hoehe, THREE.RGBAFormat);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  t.colorSpace = farbig ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

/**
 * Höhenfeld → Normal-Map mit dem Sobel-Operator: Er misst, wie stark die Höhe nach rechts und nach oben ansteigt.
 * Aus diesen beiden Steigungen wird ein Richtungsvektor (die «Normale»), gespeichert als Farbe.
 */
function normalMap(hoehe: Float32Array, b: number, h: number, staerke: number) {
  const daten = new Uint8Array(b * h * 4);
  const at = (x: number, y: number) => hoehe[((y + h) % h) * b + ((x + b) % b)];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < b; x++) {
      const dx =
        at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
      const dy =
        at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
      let nx = -dx * staerke;
      let ny = -dy * staerke;
      let nz = 1;
      const l = Math.hypot(nx, ny, nz);
      nx /= l;
      ny /= l;
      nz /= l;
      const i = (y * b + x) * 4;
      daten[i] = (nx * 0.5 + 0.5) * 255;
      daten[i + 1] = (ny * 0.5 + 0.5) * 255;
      daten[i + 2] = (nz * 0.5 + 0.5) * 255;
      daten[i + 3] = 255;
    }
  }
  return datenTextur(daten, b, h, false);
}

/** Graustufen-Farbtextur aus einer Helligkeit pro Pixel (0..1) */
function grauTextur(hell: Float32Array, b: number, h: number) {
  const daten = new Uint8Array(b * h * 4);
  for (let i = 0; i < b * h; i++) {
    const v = Math.max(0, Math.min(255, hell[i] * 255));
    daten[i * 4] = v;
    daten[i * 4 + 1] = v;
    daten[i * 4 + 2] = v;
    daten[i * 4 + 3] = 255;
  }
  return datenTextur(daten, b, h, true);
}

/** Wert-Rauschen: weiche Zufallsflecken, nahtlos, für Unregelmässigkeiten im Material */
function rauschen(b: number, h: number, zellen: number, z: Zufall) {
  const gitter = Array.from({ length: zellen * zellen }, () => z());
  const g = (x: number, y: number) => gitter[((y + zellen) % zellen) * zellen + ((x + zellen) % zellen)];
  const out = new Float32Array(b * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < b; x++) {
      const fx = (x / b) * zellen;
      const fy = (y / h) * zellen;
      const ix = Math.floor(fx);
      const iy = Math.floor(fy);
      const tx = fx - ix;
      const ty = fy - iy;
      const sx = tx * tx * (3 - 2 * tx);
      const sy = ty * ty * (3 - 2 * ty);
      const a = g(ix, iy) + (g(ix + 1, iy) - g(ix, iy)) * sx;
      const c = g(ix, iy + 1) + (g(ix + 1, iy + 1) - g(ix, iy + 1)) * sx;
      out[y * b + x] = a + (c - a) * sy;
    }
  }
  return out;
}

/** Abstand eines Punkts zu einer Strecke, plus Position entlang der Strecke (0..1) */
function streckenAbstand(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const vx = bx - ax;
  const vy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
  return { d: Math.hypot(px - (ax + vx * t), py - (ay + vy * t)), t };
}

/**
 * Strick (glatt rechts): Jede Masche ist ein «V» aus zwei Schlaufen.
 * Jede Schlaufe ist ein runder Garnwulst (Höhe wie ein Halbzylinder) mit schräg gedrehten Einzelfäden.
 * Zwischen den Schlaufen liegen dunkle Ritzen.
 */
export function strickKachel(): Kachel {
  const b = 512;
  const spalten = 8;
  const zeilen = 9;
  const zb = b / spalten;
  const zh = b / zeilen;
  const z = zufall(5);
  const tonung = Array.from({ length: spalten * zeilen }, () => 0.94 + z() * 0.08);
  const fussel = rauschen(b, b, 64, z);
  const hoehe = new Float32Array(b * b);
  const hell = new Float32Array(b * b);
  const radius = 0.21;

  for (let y = 0; y < b; y++) {
    for (let x = 0; x < b; x++) {
      const cx = Math.floor(x / zb);
      const cy = Math.floor(y / zh);
      let beste = 0;
      let besteTon = 1;
      // Die Schlaufen ragen in die Nachbarzeile, darum auch die Zelle darunter prüfen
      for (const oy of [0, -1]) {
        const zelleY = cy + oy;
        const u = x / zb - cx;
        const v = y / zh - zelleY;
        for (const seite of [-1, 1]) {
          const ax = 0.5;
          const ay = 0.08;
          const bx = 0.5 + seite * 0.36;
          const by = 1.2;
          // Zellen sind höher als breit: x stauchen, damit die Schlaufen rund bleiben
          const { d, t } = streckenAbstand(u, v * (zh / zb), ax, ay * (zh / zb), bx, by * (zh / zb));
          if (d < radius) {
            const wulst = Math.sqrt(1 - (d / radius) ** 2);
            // Gedrehte Einzelfäden: schräge Rillen entlang der Schlaufe
            const drall = 0.82 + 0.18 * Math.cos((t * 7 + (d / radius) * seite * 1.6) * Math.PI * 2);
            const wert = wulst * drall * (oy === 0 ? 1 : 0.97);
            if (wert > beste) {
              beste = wert;
              besteTon = tonung[((zelleY + zeilen) % zeilen) * spalten + (cx % spalten)];
            }
          }
        }
      }
      const i = y * b + x;
      const flaum = (fussel[i] - 0.5) * 0.08;
      hoehe[i] = beste + flaum;
      // Ritzen dunkel (Umgebungsverdeckung), Erhebungen hell
      hell[i] = (0.38 + 0.62 * Math.pow(Math.max(0, beste), 0.55)) * besteTon + flaum;
    }
  }
  return { farbe: grauTextur(hell, b, b), normale: normalMap(hoehe, b, b, 3.2) };
}

/** Zeichnet Fasern auf ein Canvas und liest die Helligkeit als Höhenfeld aus */
function faserFeld(b: number, anzahl: number, z: Zufall, laenge: [number, number], unschaerfe: number) {
  const canvas = document.createElement("canvas");
  canvas.width = b;
  canvas.height = b;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas wird nicht unterstützt");
  ctx.fillStyle = "rgb(128,128,128)";
  ctx.fillRect(0, 0, b, b);
  ctx.lineCap = "round";
  const fasern = Array.from({ length: anzahl }, () => ({
    x: z() * b,
    y: z() * b,
    w: z() * Math.PI * 2,
    krumm: (z() - 0.5) * 1.2,
    l: laenge[0] + z() * (laenge[1] - laenge[0]),
    hell: 90 + z() * 165,
    dicke: 0.6 + z() * 1.1,
  }));
  for (const dx of [-b, 0, b]) {
    for (const dy of [-b, 0, b]) {
      for (const f of fasern) {
        const x0 = f.x + dx;
        const y0 = f.y + dy;
        const x1 = x0 + Math.cos(f.w) * f.l;
        const y1 = y0 + Math.sin(f.w) * f.l;
        const mx = (x0 + x1) / 2 + Math.cos(f.w + Math.PI / 2) * f.l * f.krumm * 0.3;
        const my = (y0 + y1) / 2 + Math.sin(f.w + Math.PI / 2) * f.l * f.krumm * 0.3;
        ctx.strokeStyle = `rgba(${f.hell},${f.hell},${f.hell},0.55)`;
        ctx.lineWidth = f.dicke;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(mx, my, x1, y1);
        ctx.stroke();
      }
    }
  }
  if (unschaerfe > 0) {
    ctx.filter = `blur(${unschaerfe}px)`;
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = "none";
  }
  const pixel = ctx.getImageData(0, 0, b, b).data;
  const feld = new Float32Array(b * b);
  for (let i = 0; i < b * b; i++) feld[i] = pixel[i * 4] / 255;
  return feld;
}

/**
 * Filz: tausende feine, leicht gebogene Fasern kreuz und quer, dazu weiche, grössere Unregelmässigkeiten
 * (Filz ist nie ganz gleichmässig dick).
 */
export function filzKachel(): Kachel {
  const b = 512;
  const z = zufall(3);
  const fasern = faserFeld(b, 9000, z, [6, 22], 0.6);
  const wolken = rauschen(b, b, 6, z);
  const fein = rauschen(b, b, 48, z);
  const hoehe = new Float32Array(b * b);
  const hell = new Float32Array(b * b);
  for (let i = 0; i < b * b; i++) {
    hoehe[i] = fasern[i] * 0.7 + wolken[i] * 0.5 + fein[i] * 0.15;
    hell[i] = 0.8 + (fasern[i] - 0.5) * 0.28 + (wolken[i] - 0.5) * 0.12;
  }
  return { farbe: grauTextur(hell, b, b), normale: normalMap(hoehe, b, b, 2.2) };
}

/**
 * Garn: drei Einzelfäden, schraubenförmig umeinander gedreht.
 * u läuft entlang des Fadens, v rund um den Faden.
 */
export function garnKachel(): Kachel {
  const b = 256;
  const z = zufall(7);
  const fussel = faserFeld(b, 1400, z, [4, 12], 0.5);
  const hoehe = new Float32Array(b * b);
  const hell = new Float32Array(b * b);
  for (let y = 0; y < b; y++) {
    for (let x = 0; x < b; x++) {
      const u = x / b;
      const v = y / b;
      const strang = Math.pow(Math.abs(Math.sin(Math.PI * (v * 3 + u * 2))), 0.55);
      const i = y * b + x;
      const flaum = (fussel[i] - 0.5) * 0.35;
      hoehe[i] = strang + flaum;
      hell[i] = 0.55 + strang * 0.45 + flaum * 0.3;
    }
  }
  return { farbe: grauTextur(hell, b, b), normale: normalMap(hoehe, b, b, 2.6) };
}

/**
 * Tweed mit Fischgrat-Muster: schräge Köperrippen, die von Streifen zu Streifen die Richtung wechseln
 * und sich an der Grenze zu einem «V» treffen. Dazu Noppen (eingewebte hellere und dunklere Fasern)
 * und flauschige Fasern obendrauf.
 */
export function tweedKachel(): Kachel {
  const b = 512;
  const z = zufall(17);
  const fasern = faserFeld(b, 5000, z, [4, 14], 0.5);
  const flecken = rauschen(b, b, 24, z);
  const streifen = 4;
  // Rippen pro Kachel: Vielfaches der Streifen, damit die Rippen im 45°-Winkel laufen und an jeder Grenze zusammenpassen
  const rippen = 16;
  const schraege = rippen / streifen;
  const noppen = new Map<number, number>();
  for (let n = 0; n < 700; n++) {
    const cx = Math.floor(z() * b);
    const cy = Math.floor(z() * b);
    const ton = z() < 0.5 ? 0.45 : 1.3;
    const r = 1 + Math.floor(z() * 2);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -2 * r; dx <= 2 * r; dx++) {
        if ((dx / (2 * r)) ** 2 + (dy / r) ** 2 > 1) continue;
        noppen.set(((cy + dy + b) % b) * b + ((cx + dx + b) % b), ton);
      }
    }
  }
  const hoehe = new Float32Array(b * b);
  const hell = new Float32Array(b * b);
  for (let y = 0; y < b; y++) {
    for (let x = 0; x < b; x++) {
      const u = (x / b) * streifen;
      const s = Math.floor(u);
      const lokal = u - s;
      const richtung = s % 2 === 0 ? 1 : -1;
      const rippe = Math.pow(Math.abs(Math.sin(Math.PI * ((y / b) * rippen + richtung * lokal * schraege))), 0.6);
      // Zwischen den Streifen liegt eine feine Fuge
      const fuge = Math.min(1, Math.min(lokal, 1 - lokal) * 28);
      const i = y * b + x;
      const flaum = (fasern[i] - 0.5) * 0.4;
      hoehe[i] = rippe * 0.7 * (0.7 + 0.3 * fuge) + flaum * 0.5 + flecken[i] * 0.15;
      hell[i] = (0.68 + rippe * 0.26 * fuge + flaum * 0.35 + (flecken[i] - 0.5) * 0.12) * (noppen.get(i) ?? 1);
    }
  }
  return { farbe: grauTextur(hell, b, b), normale: normalMap(hoehe, b, b, 2.4) };
}

/** Rauschen für Flaum-Hüllen: jeder Pixel ist eine Faserspitze mit zufälliger Länge (Helligkeit = Länge) */
export function flaumTextur() {
  const b = 128;
  const z = zufall(23);
  const daten = new Uint8Array(b * b * 4);
  for (let i = 0; i < b * b; i++) {
    const v = Math.pow(z(), 0.8) * 255;
    daten[i * 4] = v;
    daten[i * 4 + 1] = v;
    daten[i * 4 + 2] = v;
    daten[i * 4 + 3] = 255;
  }
  const t = datenTextur(daten, b, b, false);
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}

/**
 * Packpapier-Oberfläche der Wellpappe: Papierfasern, dunkle Holzpartikel, ganz schwach die Wellen darunter.
 */
export function pappeKachel(): Kachel {
  const b = 512;
  const z = zufall(9);
  const fasern = faserFeld(b, 6000, z, [3, 10], 0.4);
  const flecken = rauschen(b, b, 10, z);
  const hoehe = new Float32Array(b * b);
  const hell = new Float32Array(b * b);
  const partikel = new Set<number>();
  for (let n = 0; n < 900; n++) partikel.add(Math.floor(z() * b * b));
  for (let y = 0; y < b; y++) {
    for (let x = 0; x < b; x++) {
      const i = y * b + x;
      // Unter dem Deckpapier liegen die Wellen: als ganz flache Rillen sichtbar
      const wellen = Math.cos((x / b) * Math.PI * 2 * 16) * 0.5 + 0.5;
      hoehe[i] = fasern[i] * 0.35 + wellen * 0.18 + flecken[i] * 0.2;
      hell[i] = 0.88 + (fasern[i] - 0.5) * 0.16 + (flecken[i] - 0.5) * 0.1 - (partikel.has(i) ? 0.25 : 0);
    }
  }
  return { farbe: grauTextur(hell, b, b), normale: normalMap(hoehe, b, b, 1.6) };
}

/**
 * Schnittkante der Wellpappe: oben und unten je eine Papierlage, dazwischen die Welle,
 * und dunkle Hohlräume, wo kein Papier ist. u: entlang der Kante (eine Welle pro Kachel), v: quer durch die Dicke.
 */
export function pappeKanteKachel(): Kachel {
  const b = 256;
  const h = 128;
  const z = zufall(13);
  const fasern = rauschen(b, h, 32, z);
  const hoehe = new Float32Array(b * h);
  const hell = new Float32Array(b * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < b; x++) {
      const u = x / b;
      const v = y / h;
      const i = y * b + x;
      const deckpapier = v < 0.13 || v > 0.87;
      const welleY = 0.5 + Math.sin(u * Math.PI * 2) * 0.3;
      const aufWelle = Math.abs(v - welleY) < 0.07;
      const rauh = (fasern[i] - 0.5) * 0.1;
      if (deckpapier) {
        hoehe[i] = 1;
        hell[i] = 0.92 + rauh;
      } else if (aufWelle) {
        const wulst = 1 - Math.abs(v - welleY) / 0.07;
        hoehe[i] = 0.55 + wulst * 0.35;
        hell[i] = 0.72 + wulst * 0.15 + rauh;
      } else {
        // Hohlraum: tief und dunkel, zur Mitte hin am dunkelsten
        hoehe[i] = 0.05;
        hell[i] = 0.22 + rauh;
      }
    }
  }
  return { farbe: grauTextur(hell, b, h), normale: normalMap(hoehe, b, h, 2.2) };
}
