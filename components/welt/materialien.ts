import * as THREE from "three";
import { filzKachel, flaumTextur, garnKachel, pappeKachel, pappeKanteKachel, strickKachel, tweedKachel, type Kachel } from "./texturen";

/**
 * Materialien der Bastelwelt, physikalisch basiert (MeshPhysicalMaterial).
 *
 * - Stoffe (Filz, Strick, Garn) haben «Sheen»: einen weichen Glanz am Rand, wie bei Samt oder Wolle.
 *   Das ist der Unterschied zwischen «Plastik in Wollfarbe» und echtem Stoff.
 * - Normal-Maps geben jeder Faser, Masche und Rille ein Relief, das auf das Licht reagiert.
 * - Jedes Material wird nur einmal gebaut und wiederverwendet (Cache).
 *
 * Die Bauteile haben UV-Koordinaten in Welt-Einheiten: «kachel = 1.6» heisst, eine Kachel deckt
 * 1.6 Welt-Einheiten ab, egal wie gross das Teil ist.
 */

let kacheln: { filz: Kachel; strick: Kachel; garn: Kachel; pappe: Kachel; kante: Kachel; tweed: Kachel } | null = null;

function k() {
  kacheln ??= {
    filz: filzKachel(),
    strick: strickKachel(),
    garn: garnKachel(),
    pappe: pappeKachel(),
    kante: pappeKanteKachel(),
    tweed: tweedKachel(),
  };
  return kacheln;
}

const cache = new Map<string, THREE.Material>();

function gemerkt<T extends THREE.Material>(schluessel: string, bauen: () => T): T {
  let material = cache.get(schluessel) as T | undefined;
  if (!material) {
    material = bauen();
    cache.set(schluessel, material);
  }
  return material;
}

/** Kopie einer Kachel mit eigener Wiederholung (das Bild selbst wird geteilt, nur die Einstellung ist neu) */
function wiederholt(kachel: Kachel, x: number, y: number, versatzY = 0) {
  const kopie = (t: THREE.Texture) => {
    const c = t.clone();
    c.repeat.set(x, y);
    c.offset.set(0, versatzY);
    c.needsUpdate = true;
    return c;
  };
  return { map: kopie(kachel.farbe), normalMap: kopie(kachel.normale) };
}

/** Farbe aufhellen (faktor > 1) oder abdunkeln (faktor < 1) */
export function toenen(hex: string, faktor: number) {
  const c = new THREE.Color(hex);
  if (faktor < 1) c.multiplyScalar(faktor);
  else c.lerp(new THREE.Color("#ffffff"), faktor - 1);
  return `#${c.getHexString()}`;
}

function stoff(farbe: string, maps: { map: THREE.Texture; normalMap: THREE.Texture }, relief: number, extra: THREE.MeshPhysicalMaterialParameters = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: farbe,
    ...maps,
    normalScale: new THREE.Vector2(relief, relief),
    roughness: 1,
    // Stoffglanz dezent und im eigenen Farbton: sonst legt er sich wie ein milchiger Schleier über die Farbe
    sheen: 0.45,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color(toenen(farbe, 1.12)),
    envMapIntensity: 0.55,
    ...extra,
  });
}

/** Filz: feine Fasern, ganz matt, weicher Stoffglanz */
export function filz(farbe: string, kachel = 1.3) {
  return gemerkt(`filz${farbe}${kachel}`, () => stoff(farbe, wiederholt(k().filz, 1 / kachel, 1 / kachel), 0.9));
}

/** Filz für Kugeln: Kugeln haben UVs von 0 bis 1, darum eine feste Wiederholung */
export function filzKugel(farbe: string, wiederholung = 5) {
  return gemerkt(`filzKugel${farbe}${wiederholung}`, () => stoff(farbe, wiederholt(k().filz, wiederholung, wiederholung / 2), 0.9));
}

/** Strick: gedrehte Maschen mit Ritzen. «relief» bestimmt, wie tief die Maschen wirken. */
export function strick(farbe: string, kachel = 3.2, relief = 1.3) {
  return gemerkt(`strick${farbe}${kachel}${relief}`, () => stoff(farbe, wiederholt(k().strick, 1 / kachel, 1 / kachel), relief));
}

/**
 * Strick für die grossen Rückwände: leuchtet ein wenig von selbst,
 * damit die Hintergrundfarben kräftig bleiben. Schatten darauf sind trotzdem gut sichtbar.
 */
export function strickWand(farbe: string, kachel = 4.2) {
  return gemerkt(`strickWand${farbe}${kachel}`, () => {
    const maps = wiederholt(k().strick, 1 / kachel, 1 / kachel);
    return stoff(farbe, maps, 1.3, { emissive: new THREE.Color(farbe), emissiveMap: maps.map, emissiveIntensity: 0.32 });
  });
}

/** Strick auf Kugeln: Kugeln haben UVs von 0 bis 1, darum eine feste Wiederholung (rundherum, von Pol zu Pol) */
export function strickKugel(farbe: string, rundherum = 6, hoch = 3) {
  return gemerkt(`strickKugel${farbe}${rundherum}${hoch}`, () => stoff(farbe, wiederholt(k().strick, rundherum, hoch), 1.3));
}

/** Tweed mit Fischgrat: gewebter Wollstoff mit Noppen, für die Hügel */
export function tweed(farbe: string, kachel = 2.2) {
  return gemerkt(`tweed${farbe}${kachel}`, () => stoff(farbe, wiederholt(k().tweed, 1 / kachel, 1 / kachel), 1.1));
}

/**
 * Flausch: einzelne Wollfäden, z. B. für Pompoms und Fransen.
 * Die Fäden bekommen pro Instanz eine leicht andere Helligkeit, darum bleibt die Grundfarbe hier unverändert.
 */
export function flausch(farbe: string) {
  return gemerkt(`flausch${farbe}`, () => stoff(farbe, wiederholt(k().filz, 0.6, 0.6), 0.6, { sheen: 0.35 }));
}

let flaum: THREE.Texture | null = null;

/**
 * Flaum-Hülle für Watte: Eine Kugel bekommt mehrere, leicht grössere Hüllen. Jede Hülle zeigt nur dort
 * Pixel, wo die Rausch-Textur über einer Schwelle liegt, nach aussen immer weniger.
 * Zusammen sehen die Punkte aus wie abstehende Fasern: der Rand wird weich und flauschig.
 */
export function flaumHuelle(farbe: string, schwelle: number) {
  flaum ??= flaumTextur();
  const textur = flaum;
  return gemerkt(`flaum${farbe}${schwelle}`, () => {
    const alpha = textur.clone();
    alpha.repeat.set(3, 1.5);
    alpha.needsUpdate = true;
    return new THREE.MeshPhysicalMaterial({
      color: farbe,
      alphaMap: alpha,
      alphaTest: schwelle,
      roughness: 1,
      sheen: 0.6,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color("#ffffff"),
      envMapIntensity: 0.6,
    });
  });
}

/** Holz, lackiert: Stricknadeln */
export function holz(farbe = "#C8925A") {
  return gemerkt(`holz${farbe}`, () => {
    const maps = wiederholt(k().pappe, 2, 0.3);
    return new THREE.MeshPhysicalMaterial({
      color: farbe,
      ...maps,
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughness: 0.5,
      clearcoat: 0.45,
      clearcoatRoughness: 0.3,
      envMapIntensity: 0.7,
    });
  });
}

/** Garn: drei verdrehte Einzelfäden. «laenge» und «dicke» bestimmen, wie oft sich das Muster wiederholt. */
export function garn(farbe: string, laenge: number, dicke: number) {
  const runden = Math.max(1, Math.round(laenge / (dicke * 4)));
  return gemerkt(`garn${farbe}${runden}`, () => stoff(farbe, wiederholt(k().garn, runden, 1), 1.1, { sheenRoughness: 0.45 }));
}

/** Nähfaden für Stiche */
export function faden(farbe = "#fff8ee") {
  return gemerkt(`faden${farbe}`, () =>
    new THREE.MeshPhysicalMaterial({ color: farbe, roughness: 0.9, sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color("#ffffff") }),
  );
}

/** Wellpappe, Vorderseite: Packpapier mit Fasern und Holzpartikeln */
export function pappe(farbe: string) {
  return gemerkt(`pappe${farbe}`, () => {
    const maps = wiederholt(k().pappe, 1 / 1.8, 1 / 1.8);
    return new THREE.MeshPhysicalMaterial({
      color: farbe,
      ...maps,
      normalScale: new THREE.Vector2(0.7, 0.7),
      roughness: 0.88,
      envMapIntensity: 0.45,
    });
  });
}

/**
 * Schnittkante der Wellpappe. Die Kachel zeigt genau eine Pappenschicht (Deckpapier, Welle, Deckpapier),
 * darum wird sie in der Höhe genau auf die Dicke des Teils gestreckt.
 */
export function pappeKante(dicke: number) {
  const proEinheit = 1 / dicke;
  return gemerkt(`pappeKante${dicke}`, () => {
    // ExtrudeGeometry legt v = 1 - z an. Der Versatz sorgt dafür, dass die Deckpapiere genau an den Rändern liegen.
    const maps = wiederholt(k().kante, 1 / 0.32, proEinheit, -(proEinheit - Math.floor(proEinheit)));
    return new THREE.MeshPhysicalMaterial({
      color: "#c49563",
      ...maps,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughness: 1,
      envMapIntensity: 0.35,
    });
  });
}

/** Knopf-Kunststoff: glatt, mit Klarlack */
export function kunststoff(farbe: string) {
  return gemerkt(`kunststoff${farbe}`, () =>
    new THREE.MeshPhysicalMaterial({ color: farbe, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.25, envMapIntensity: 0.9 }),
  );
}
