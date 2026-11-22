import { WASSER_Y, WEG, abstandZuBauten, abstandZumBach, abstandZurGasse, hoehe, stufe } from "./gelaende";

/**
 * Der Boden wird Masche für Masche eingefärbt, wie bei einem echten Strickmuster:
 * Jede Masche hat genau eine Garnfarbe. Übergänge (Wiese zu Wald, Fels zu Schnee) sind darum keine weichen
 * Verläufe, sondern gestrickte Muster aus einzelnen Maschen, wie bei einem Norwegerpullover.
 * Blumen in der Wiese sind einzelne bunte Maschen, der Fels hat Schichten, der Weg ist eingestrickt.
 *
 * Diese Datei rechnet nur die Farbkarte aus (eine kleine Tabelle: eine Zelle pro Masche).
 * Reine Mathematik ohne three.js.
 */

/** Grösse der Strick-Kachel in Welt-Einheiten: 6 Maschen breit, 8 Reihen hoch */
export const KACHEL = 5.4;
export const MASCHE_B = KACHEL / 6;
export const MASCHE_H = KACHEL / 8;

/**
 * Die Maschen liegen auf einer schrägen Ebene (40 Grad), nicht flach von oben:
 * So sind sie an der steilen Südwand, auf die die Kamera schaut, überall etwa gleich gross.
 */
export const MASCHEN_SIN = Math.sin((40 * Math.PI) / 180);
export const MASCHEN_COS = Math.cos((40 * Math.PI) / 180);

/** Ausschnitt der Karte in Maschen: die Südseite des Hausbergs bis über den See */
export const KARTE = { spalte0: -122, spalten: 244, reihe0: -198, reihen: 304 };
const Z_SUED = 174;
const Z_NORD = -12;

/** Garnfarben */
export const GARN = {
  schnee: "#FBFCFF",
  schneeBlau: "#D3E5F8",
  fels: ["#8C847C", "#736C66", "#5B5551", "#9C948A"],
  ocker: "#A39078",
  alp: ["#5FAF3C", "#77BE42", "#93CB48"],
  blumen: ["#F56FA1", "#FFD23F", "#FFFFFF", "#B58CF5", "#FF8A3D", "#5BB7F0"],
  wald: ["#27642F", "#2F7335", "#1F5630"],
  waldBraun: "#6A5133",
  tal: ["#4FA63A", "#6DBB3F", "#8CCB47"],
  ufer: ["#E6D29C", "#D9C285"],
  seegrund: "#2E86C1",
  weg: ["#BDA684", "#A68F6E"],
  wegSchnee: "#C6D5EA",
  gasse: ["#C9B592", "#B7A17B"],
  hof: "#CDB98C",
  feldGelb: ["#EBC548", "#D8A93A"],
  feldBraun: ["#7B5A3A", "#8E6A44"],
  feldGruen: ["#3F9A3A", "#7CC043"],
};

type Rgb = [number, number, number];
const rgb = (hex: string): Rgb => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const F = {
  schnee: rgb(GARN.schnee),
  schneeBlau: rgb(GARN.schneeBlau),
  fels: GARN.fels.map(rgb),
  ocker: rgb(GARN.ocker),
  alp: GARN.alp.map(rgb),
  blumen: GARN.blumen.map(rgb),
  wald: GARN.wald.map(rgb),
  waldBraun: rgb(GARN.waldBraun),
  tal: GARN.tal.map(rgb),
  ufer: GARN.ufer.map(rgb),
  seegrund: rgb(GARN.seegrund),
  weg: GARN.weg.map(rgb),
  wegSchnee: rgb(GARN.wegSchnee),
  gasse: GARN.gasse.map(rgb),
  hof: rgb(GARN.hof),
  feldGelb: GARN.feldGelb.map(rgb),
  feldBraun: GARN.feldBraun.map(rgb),
  feldGruen: GARN.feldGruen.map(rgb),
};

/** Felder neben dem Dorf: [x von, x bis, z von, z bis, Art] */
const FELDER: [number, number, number, number, "gelb" | "braun" | "gruen"][] = [
  [-56, -33, 100.5, 110, "gelb"],
  [-60, -36, 112, 119.5, "braun"],
  [31, 52, 101, 111, "gruen"],
  [34, 56, 113, 120, "gelb"],
];

/** Liegt die Stelle in einem Feld? (Bäume bleiben draussen) */
export function imFeld(x: number, z: number) {
  return FELDER.some(([x0, x1, z0, z1]) => x > x0 - 1.5 && x < x1 + 1.5 && z > z0 - 1.5 && z < z1 + 1.5);
}

/** Muster für gestrickte Übergänge: Die Schwelle wechselt von Masche zu Masche in einem festen Raster (4 x 4) */
const RASTER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const raster = (spalte: number, reihe: number) => (RASTER[(spalte & 3) + ((reihe & 3) << 2)] + 0.5) / 16;

/** Zufallszahl von 0 bis 1 für eine Masche, immer dieselbe */
function wuerfel(a: number, b: number) {
  let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Liegt die Stelle auf dem Weg? Gemessen im Raum, damit der Weg auch am Steilhang gleich breit bleibt. */
function amWegEntlang(x: number, y: number, z: number) {
  for (const [wx, wy, wz] of WEG) {
    if ((x - wx) ** 2 + (y - wy) ** 2 + (z - wz) ** 2 < 1.15) return true;
  }
  return false;
}

/** Garnfarbe einer Masche an der Stelle (x, y, z). «steil» ist 0 für flach und geht gegen 1 für senkrecht. */
function maschenFarbe(x: number, y: number, z: number, steil: number, spalte: number, reihe: number): Rgb {
  const w1 = Math.sin(x * 0.21 + 1.3) * Math.cos(z * 0.17 - 0.4) * 0.6 + Math.sin(x * 0.53 + z * 0.41 + 2) * 0.4;
  const w2 = Math.sin(x * 0.37 - 2.1) * Math.cos(z * 0.29 + 0.8);
  const fleck = 0.5 + 0.5 * Math.sin(x * 0.19 + z * 0.23) * Math.cos(x * 0.13 - z * 0.17);
  const r = raster(spalte, reihe);
  const z1 = wuerfel(spalte, reihe);
  const z2 = wuerfel(reihe + 911, spalte - 37);
  const stufig = (wert: number) => (wert + (z1 - 0.5) * 0.4 > 0.62 ? 2 : wert + (z1 - 0.5) * 0.4 > 0.36 ? 1 : 0);

  // See und Ufer
  if (y < WASSER_Y - 0.3) return F.seegrund;
  if (1 - stufe(y, WASSER_Y + 0.25, WASSER_Y + 1.1) > r) return F.ufer[z1 > 0.5 ? 1 : 0];

  // Der eingestrickte Weg
  if (Math.abs(x) < 22 && z > 22 && amWegEntlang(x, y, z)) return y > 76 ? F.wegSchnee : F.weg[z1 > 0.5 ? 1 : 0];

  // Gassen und Pfade zu den Häusern
  if (abstandZurGasse(x, z) < 0.62) return F.gasse[z1 > 0.5 ? 1 : 0];

  // Das Bachufer: Auf Wiese und Waldboden säumen helle Kieselmaschen das Wasser (in der Felswand fliesst es über blanken Fels)
  if (y < 53.5 && abstandZumBach(x, z) < 1.35) return F.ufer[z1 > 0.5 ? 1 : 0];

  // Schnee: oben überall, an den steilen Wänden nur in Schlieren, weiter unten auf den flachen Bändern im Fels
  const felswand = stufe(steil + w2 * 0.05, 0.36, 0.46);
  const schneeOben = stufe(y, 75 + w1 * 3, 80.5 + w1 * 3) * (1 - felswand * 0.85);
  const schneeBand = (1 - stufe(steil, 0.2, 0.36)) * stufe(y, 58 + w2 * 2, 63 + w2 * 2) * 0.9;
  if (Math.max(schneeOben, schneeBand) > r) return z2 > 0.94 ? F.schneeBlau : F.schnee;

  // Fels: oberhalb der Alp, in waagrechten Schichten
  const felsAn = Math.max(stufe(y, 54 + w2 * 1.5, 57 + w2 * 1.5), felswand * stufe(y, 48, 54));
  if (felsAn > r) {
    const schicht = Math.floor((y + w1 * 2.5) / 1.35);
    if (wuerfel(schicht, 5) > 0.86) return F.ocker;
    return F.fels[(((schicht * 3 + (z1 > 0.78 ? 1 : 0)) % 4) + 4) % 4];
  }

  // Alpwiese mit Blumen
  if (stufe(y, 46.5 + w1 * 1.2, 49 + w1 * 1.2) > r) {
    if (z2 > 0.962) return F.blumen[Math.floor(z1 * F.blumen.length)];
    return F.alp[stufig(fleck)];
  }

  // Waldboden
  if (stufe(y, 9.5 + w2, 12.5 + w2) > r) return z2 > 0.93 ? F.waldBraun : F.wald[Math.floor(z1 * 3)];

  // Tal: Höfe um die Häuser, Felder, Wiese mit einzelnen Blumen
  if (abstandZuBauten(x, z) < 0.7) return F.hof;
  for (const [x0, x1, z0, z1f, art] of FELDER) {
    if (x < x0 || x > x1 || z < z0 || z > z1f) continue;
    if (art === "gelb") return F.feldGelb[reihe & 1];
    if (art === "braun") return spalte % 3 === 0 ? F.feldGruen[0] : F.feldBraun[spalte & 1];
    return F.feldGruen[Math.floor(reihe / 2) & 1];
  }
  if (z2 > 0.975) return F.blumen[Math.floor(z1 * F.blumen.length)];
  return F.tal[stufig(fleck)];
}

/**
 * Rechnet die Farbkarte aus: RGBA-Werte, eine Zelle pro Masche (Spalte = Masche in der Reihe, Zeile = Strickreihe).
 * Für jede Spalte wandert die Rechnung den Hang von Süden nach Norden hinauf und füllt Reihe um Reihe.
 */
export function maschenKarte() {
  const { spalte0, spalten, reihe0, reihen } = KARTE;
  const daten = new Uint8Array(spalten * reihen * 4);
  const schritt = 0.2;
  for (let s = 0; s < spalten; s++) {
    const spalte = spalte0 + s;
    const x = (spalte + 0.5) * MASCHE_B;
    let gefuellt = -1;
    let yVor = hoehe(x, Z_SUED + schritt);
    let letzte: Rgb = F.tal[0];
    for (let z = Z_SUED; z >= Z_NORD; z -= schritt) {
      const y = hoehe(x, z);
      const reihe = Math.floor((y * MASCHEN_SIN - z * MASCHEN_COS) / MASCHE_H) - reihe0;
      if (reihe > gefuellt) {
        const laengs = (y - yVor) / schritt;
        const quer = (hoehe(x + 0.6, z) - hoehe(x - 0.6, z)) / 1.2;
        const steil = 1 - 1 / Math.sqrt(1 + laengs * laengs + quer * quer);
        for (let r = Math.max(0, gefuellt + 1); r <= Math.min(reihen - 1, reihe); r++) {
          letzte = maschenFarbe(x, y, z, steil, spalte, r + reihe0);
          daten.set([letzte[0], letzte[1], letzte[2], 255], (r * spalten + s) * 4);
        }
        gefuellt = reihe;
      }
      yVor = y;
    }
    // Reihen oberhalb des Grats: mit der letzten Farbe auffüllen (werden nie gezeigt, aber nie schwarz)
    for (let r = Math.max(0, gefuellt + 1); r < reihen; r++) daten.set([letzte[0], letzte[1], letzte[2], 255], (r * spalten + s) * 4);
  }
  return daten;
}
