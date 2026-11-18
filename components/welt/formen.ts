import * as THREE from "three";

/**
 * 2D-Umrisse (THREE.Shape) für die Bauteile. Aus einem Umriss macht ExtrudeGeometry einen 3D-Körper,
 * wie ein Ausstecher, der durch Filz oder Pappe gedrückt wird.
 * Alle Masse in Welt-Einheiten.
 */

/** Hügel oder Welle: gerader Boden, welliger Rand oben */
export function wellenForm(breite: number, unten: number, oben: (x: number) => number, schritte = 160) {
  const form = new THREE.Shape();
  form.moveTo(-breite / 2, unten);
  form.lineTo(breite / 2, unten);
  for (let i = 0; i <= schritte; i++) {
    const x = breite / 2 - (i / schritte) * breite;
    form.lineTo(x, oben(x));
  }
  form.closePath();
  return form;
}

/**
 * Wolke: flacher Boden, oben mehrere Buckel (Kreise), die sich überlappen.
 * Damit keine Linien im Inneren entstehen, wird für jeden Buckel nur der Bogen zwischen den
 * Schnittpunkten mit den Nachbarn gezeichnet.
 */
export function wolkenForm(buckel: { x: number; r: number }[]) {
  const sortiert = [...buckel].sort((a, b) => a.x - b.x);
  const schnittWinkel = (a: { x: number; r: number }, b: { x: number; r: number }) => {
    const d = b.x - a.x;
    const versatz = (d * d + a.r * a.r - b.r * b.r) / (2 * d);
    const hoehe = Math.sqrt(Math.max(0, a.r * a.r - versatz * versatz));
    return Math.atan2(hoehe, versatz);
  };
  const erster = sortiert[0];
  const letzter = sortiert[sortiert.length - 1];
  const form = new THREE.Shape();
  form.moveTo(erster.x - erster.r, 0);
  form.lineTo(letzter.x + letzter.r, 0);
  for (let i = sortiert.length - 1; i >= 0; i--) {
    const b = sortiert[i];
    const start = i === sortiert.length - 1 ? 0 : schnittWinkel(b, sortiert[i + 1]);
    const ende = i === 0 ? Math.PI : schnittWinkel(b, sortiert[i - 1]);
    form.absarc(b.x, 0, b.r, start, ende, false);
  }
  form.closePath();
  return form;
}

/** Stern mit runden Spitzen (die Rundung kommt später vom Polster) */
export function sternForm(aussen: number, innen: number, zacken = 5) {
  const form = new THREE.Shape();
  for (let i = 0; i < zacken * 2; i++) {
    const w = Math.PI / 2 + (i * Math.PI) / zacken;
    const r = i % 2 === 0 ? aussen : innen;
    const x = Math.cos(w) * r;
    const y = Math.sin(w) * r;
    if (i === 0) form.moveTo(x, y);
    else form.lineTo(x, y);
  }
  form.closePath();
  return form;
}

/** Zahnrad mit Loch in der Mitte */
export function zahnradForm(aussen: number, innen: number, zaehne: number, loch: number) {
  const form = new THREE.Shape();
  const schritte = zaehne * 4;
  for (let i = 0; i <= schritte; i++) {
    const w = (i / schritte) * Math.PI * 2;
    const r = i % 4 < 2 ? aussen : innen;
    if (i === 0) form.moveTo(Math.cos(w) * r, Math.sin(w) * r);
    else form.lineTo(Math.cos(w) * r, Math.sin(w) * r);
  }
  const lochPfad = new THREE.Path();
  lochPfad.absarc(0, 0, loch, 0, Math.PI * 2, true);
  form.holes.push(lochPfad);
  return form;
}

/** Flamme: zwei Kurven von der Spitze zum Boden */
export function flammenForm(breite: number, hoehe: number) {
  const form = new THREE.Shape();
  form.moveTo(0, hoehe);
  form.bezierCurveTo(breite * 0.55, hoehe * 0.55, breite * 0.5, 0, 0, 0);
  form.bezierCurveTo(-breite * 0.5, 0, -breite * 0.55, hoehe * 0.55, 0, hoehe);
  return form;
}

export function ellipsenForm(rx: number, ry: number) {
  const form = new THREE.Shape();
  form.absellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0);
  return form;
}

/** Fischschwanz */
export function schwanzForm(groesse: number) {
  const s = groesse;
  const form = new THREE.Shape();
  form.moveTo(0, 0);
  form.quadraticCurveTo(-s * 0.6, s * 0.7, -s * 0.95, s * 0.75);
  form.quadraticCurveTo(-s * 0.7, 0, -s * 0.95, -s * 0.75);
  form.quadraticCurveTo(-s * 0.6, -s * 0.7, 0, 0);
  return form;
}

/** Dreieck, z. B. Rückenflosse oder Sonnenstrahl */
export function dreieckForm(breite: number, hoehe: number) {
  const form = new THREE.Shape();
  form.moveTo(-breite / 2, 0);
  form.lineTo(breite / 2, 0);
  form.lineTo(0, hoehe);
  form.closePath();
  return form;
}

/** Blüte: runde Blütenblätter rundherum (Radius schwankt mit dem Winkel) */
export function blumenForm(blaetter: number, radius: number) {
  const form = new THREE.Shape();
  const schritte = blaetter * 24;
  for (let i = 0; i < schritte; i++) {
    const w = (i / schritte) * Math.PI * 2;
    const r = radius * (0.5 + 0.5 * Math.pow(Math.abs(Math.cos((w * blaetter) / 2)), 0.7));
    if (i === 0) form.moveTo(Math.cos(w) * r, Math.sin(w) * r);
    else form.lineTo(Math.cos(w) * r, Math.sin(w) * r);
  }
  form.closePath();
  return form;
}

/**
 * Die Buchstaben L, U, K, A, 3 Einheiten hoch. Die Striche sind bewusst schmal (0.56):
 * Das dicke Polster der Strickbuchstaben legt rundherum noch 0.34 drauf, erst dann sind sie richtig fett.
 * So bleiben die Lücken im U und im K offen.
 */
export const BUCHSTABEN_BREITE = { L: 1.9, U: 2.1, K: 2.3, A: 2.7 };

export const BUCHSTABEN = {
  L: () => {
    const f = new THREE.Shape();
    f.moveTo(0, 0);
    f.lineTo(1.9, 0);
    f.lineTo(1.9, 0.56);
    f.lineTo(0.56, 0.56);
    f.lineTo(0.56, 3);
    f.lineTo(0, 3);
    f.closePath();
    return f;
  },
  U: () => {
    const f = new THREE.Shape();
    f.moveTo(0, 3);
    f.lineTo(0, 1.05);
    f.absarc(1.05, 1.05, 1.05, Math.PI, Math.PI * 2, false);
    f.lineTo(2.1, 3);
    f.lineTo(1.54, 3);
    f.lineTo(1.54, 1.05);
    f.absarc(1.05, 1.05, 0.49, 0, Math.PI, true);
    f.lineTo(0.56, 3);
    f.closePath();
    return f;
  },
  K: () => {
    const f = new THREE.Shape();
    const punkte: [number, number][] = [
      [0, 0],
      [0.56, 0],
      [0.56, 1.05],
      [1.55, 0],
      [2.3, 0],
      [1.05, 1.5],
      [2.2, 3],
      [1.45, 3],
      [0.56, 1.9],
      [0.56, 3],
      [0, 3],
    ];
    punkte.forEach(([x, y], i) => (i === 0 ? f.moveTo(x, y) : f.lineTo(x, y)));
    f.closePath();
    return f;
  },
  A: () => {
    const f = new THREE.Shape();
    const punkte: [number, number][] = [
      [0, 0],
      [0.62, 0],
      [0.82, 0.62],
      [1.88, 0.62],
      [2.08, 0],
      [2.7, 0],
      [1.7, 3],
      [1, 3],
    ];
    punkte.forEach(([x, y], i) => (i === 0 ? f.moveTo(x, y) : f.lineTo(x, y)));
    f.closePath();
    const loch = new THREE.Path();
    loch.moveTo(1.06, 1.15);
    loch.lineTo(1.64, 1.15);
    loch.lineTo(1.35, 2.05);
    loch.closePath();
    f.holes.push(loch);
    return f;
  },
};

/**
 * Hügel-Umriss aus einer Funktion für die Oberkante, von x = «von» bis «bis».
 * Unten gerade (liegt unter dem Boden versteckt).
 */
export function obenForm(oben: (x: number) => number, von: number, bis: number, unten: number, schritte = 160) {
  const form = new THREE.Shape();
  form.moveTo(von, unten);
  form.lineTo(bis, unten);
  for (let i = 0; i <= schritte; i++) {
    const x = bis - (i / schritte) * (bis - von);
    form.lineTo(x, Math.max(unten + 0.05, oben(x)));
  }
  form.closePath();
  return form;
}

export type Stich = { x: number; y: number; winkel: number };

/**
 * Wo die Stiche einer Naht sitzen: entlang des Umrisses, ein Stück nach innen versetzt.
 * Pro Stich: Position und Richtung (damit der Stich entlang der Kante liegt).
 */
export function stichPunkte(form: THREE.Shape, einzug: number, abstand: number): Stich[] {
  const anzahl = Math.max(8, Math.floor(form.getLength() / abstand));
  const punkte = form.getSpacedPoints(anzahl);
  // Gegen den Uhrzeigersinn zeigt die linke Normale nach innen, im Uhrzeigersinn die rechte
  const innen = THREE.ShapeUtils.isClockWise(punkte) ? -1 : 1;
  const stiche: Stich[] = [];
  for (let i = 0; i < anzahl; i++) {
    const vor = punkte[(i - 1 + anzahl) % anzahl];
    const nach = punkte[(i + 1) % anzahl];
    const tx = nach.x - vor.x;
    const ty = nach.y - vor.y;
    const l = Math.hypot(tx, ty) || 1;
    stiche.push({
      x: punkte[i].x + (-ty / l) * innen * einzug,
      y: punkte[i].y + (tx / l) * innen * einzug,
      winkel: Math.atan2(ty, tx),
    });
  }
  return stiche;
}
