"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BUCHSTABEN, BUCHSTABEN_BREITE } from "@/components/welt/formen";
import { Busch, Farn, HaekelBlume, Kordel, Pilz, StrickBaum, StrickBuchstabe, Watte, type Punkt } from "@/components/welt/handarbeit";
import { holz, strick } from "@/components/welt/materialien";
import { Garnknaeuel, Stein, type Lage } from "@/components/welt/teile";
import { zufall } from "@/components/welt/texturen";
import { weltStore } from "@/components/welt/zustand";
import { projekte } from "@/data/projects";
import { FilzSchild, Gipfelkreuz, See, StrickSonne, Stuetze, Tannen, ZEIT, uhrStellen, type Baumplatz } from "./bauteile";
import { BACH_KARTE, BRUECKEN, GASSEN, ORTE, SEE, WASSER_Y, WEG, WELT, abstandZuBauten, abstandZumBach, abstandZumWeg, abstandZurGasse, amWeg, hoehe, seilbahnX, stufe } from "./gelaende";
import { Bach, Fahne, Gischt, Heuballen, Rauch, Schneeflocken, Steg, Wimpelkette } from "./leben";
import { GARN, KACHEL, KARTE, MASCHEN_COS, MASCHEN_SIN, MASCHE_B, MASCHE_H, imFeld, maschenKarte } from "./maschen";
import { Baumstumpf, Blumenwiese, Bruecke, Gras, Holzstapel, Schilf, Seerosen, Steine } from "./natur";
import { KARTON_WEISS, KRAFT, KRAFT_DUNKEL, PappHaus, PappKirche, PappStation } from "./pappe";
import { Briefkasten, GONDEL_SEITE, Projektbahn, UeberMichSchild } from "./projektbahn";
import { Kuh, SitzVogel, Voegel } from "./tiere";

/**
 * Der Strick-Berg: EINE Welt aus einem Stück. Das ganze Gelände ist ein einziges gestricktes Netz
 * (siehe gelaende.ts), vom Gipfel über Fels, Alp und Wald bis an den See. Die Berge rundherum gehören zum selben Netz.
 *
 * Die Kamera schaut immer frontal auf den Berg und dreht sich nie. Scrollen heisst: Sie fährt an der Südwand hinunter,
 * vom Gipfel mit dem Namen über die Alp und den Wald bis ins Dorf am See.
 */

/* ------------------------------------------------------------------ Das Gelände als ein gestricktes Netz */

/** Dieselben Garnfarben wie in der Maschen-Karte, hier für die weichen Farben der fernen Berge */
const FARBE = {
  schnee: new THREE.Color(GARN.schnee),
  fels: new THREE.Color(GARN.fels[0]),
  felsDunkel: new THREE.Color(GARN.fels[2]),
  alp: new THREE.Color(GARN.alp[0]),
  alpHell: new THREE.Color(GARN.alp[2]),
  wald: new THREE.Color(GARN.wald[0]),
  tal: new THREE.Color(GARN.tal[0]),
  talHell: new THREE.Color(GARN.tal[2]),
  ufer: new THREE.Color(GARN.ufer[0]),
  seegrund: new THREE.Color(GARN.seegrund),
};

/**
 * Farbe des Strickbodens an einer Stelle: oben Schnee, darunter Fels, Alpwiese, Waldboden, Talwiese, am See Sand.
 * Die Grenzen sind unregelmässig (zwei Wellenmuster), steile Stellen oberhalb der Alp werden zu Fels.
 */
function bodenFarbe(x: number, y: number, z: number, steilheit: number, ziel: THREE.Color) {
  const w1 = Math.sin(x * 0.21 + 1.3) * Math.cos(z * 0.17 - 0.4) * 0.6 + Math.sin(x * 0.53 + z * 0.41 + 2) * 0.4;
  const w2 = Math.sin(x * 0.37 - 2.1) * Math.cos(z * 0.29 + 0.8);
  const fleck = 0.5 + 0.5 * Math.sin(x * 0.9 + z * 1.3) * Math.cos(x * 0.7 - z * 1.1);

  // Von unten nach oben mischen
  ziel.copy(FARBE.tal).lerp(FARBE.talHell, fleck * 0.6);
  ziel.lerp(FARBE.wald, stufe(y, 9.5 + w2, 12.5 + w2));
  ziel.lerp(FARBE.alp.clone().lerp(FARBE.alpHell, fleck * 0.7), stufe(y, 46.5 + w1 * 1.2, 49 + w1 * 1.2));
  // Fels in waagrechten Schichten: helle und dunkle Bänder wechseln sich mit der Höhe ab
  const schicht = 0.5 + 0.5 * Math.sin(y * 1.15 + w1 * 2.2);
  const fels = FARBE.fels.clone().lerp(FARBE.felsDunkel, schicht * 0.75 + fleck * 0.25);
  ziel.lerp(fels, stufe(y, 54 + w2 * 1.5, 57 + w2 * 1.5));
  // Steile Hänge (ab etwa 50 Grad) oberhalb der Alp sind Fels
  const felswand = stufe(steilheit + w2 * 0.05 + (fleck - 0.5) * 0.08, 0.36, 0.46);
  ziel.lerp(fels, felswand * stufe(y, 48, 54));
  // Auf den flacheren Bändern in der Felswand bleibt Schnee liegen
  ziel.lerp(FARBE.schnee, (1 - stufe(steilheit, 0.2, 0.36)) * stufe(y, 58 + w2 * 2, 63 + w2 * 2) * 0.9);
  // Schnee liegt oben überall, nur an den Felswänden bleibt er in Schlieren hängen
  // Die Berge im Hintergrund (nördlich des Hausbergs) sind tiefer verschneit, ganz oben liegt auch an steilen Stellen Schnee
  const hinten = stufe(-z, 6, 22);
  const grenze = 75 - hinten * 13;
  ziel.lerp(FARBE.schnee, stufe(y, grenze + w1 * 3, grenze + 5.5 + w1 * 3) * (1 - felswand * (0.85 - hinten * 0.3 - stufe(y, 98, 112) * 0.35)));
  // Ufer und Seegrund
  ziel.lerp(FARBE.ufer, 1 - stufe(y, WASSER_Y + 0.25, WASSER_Y + 1));
  ziel.lerp(FARBE.seegrund, 1 - stufe(y, WASSER_Y - 1.2, WASSER_Y - 0.1));
}

function gelaendeGeometrie(schritt: number) {
  const nx = Math.round((WELT.x1 - WELT.x0) / schritt);
  const nz = Math.round((WELT.z1 - WELT.z0) / schritt);
  const anzahl = (nx + 1) * (nz + 1);
  const pos = new Float32Array(anzahl * 3);
  const uv = new Float32Array(anzahl * 2);
  // «nah» ist 1 auf der Südseite des Hausbergs: Dort gilt die Maschen-Karte, dahinter die weiche Farbe pro Ecke
  const nah = new Float32Array(anzahl);
  let i = 0;
  for (let iz = 0; iz <= nz; iz++) {
    const z = WELT.z0 + (iz / nz) * (WELT.z1 - WELT.z0);
    for (let ix = 0; ix <= nx; ix++) {
      const x = WELT.x0 + (ix / nx) * (WELT.x1 - WELT.x0);
      const y = hoehe(x, z);
      pos.set([x, y, z], i * 3);
      // Die Maschen liegen auf einer schrägen Ebene, siehe maschen.ts
      uv.set([x, y * MASCHEN_SIN - z * MASCHEN_COS], i * 2);
      nah[i] = stufe(z, -10, -5) * (1 - stufe(Math.abs(x), 98, 107));
      i++;
    }
  }
  const index = new Uint32Array(nx * nz * 6);
  let k = 0;
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const a = iz * (nx + 1) + ix;
      const b = a + 1;
      const c = a + nx + 1;
      const d = c + 1;
      index.set([a, c, b, b, c, d], k);
      k += 6;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setAttribute("nah", new THREE.BufferAttribute(nah, 1));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  g.computeVertexNormals();

  // Farbe pro Ecke, abhängig von Höhe und Steilheit
  const normalen = g.attributes.normal;
  const farben = new Float32Array(anzahl * 3);
  const farbe = new THREE.Color();
  for (let n = 0; n < anzahl; n++) {
    bodenFarbe(pos[n * 3], pos[n * 3 + 1], pos[n * 3 + 2], 1 - normalen.getY(n), farbe);
    farben.set([farbe.r, farbe.g, farbe.b], n * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(farben, 3));
  return g;
}

function Gelaende({ sparsam }: { sparsam: boolean }) {
  const geometrie = useMemo(() => gelaendeGeometrie(sparsam ? 2.4 : 1.5), [sparsam]);
  useEffect(() => () => geometrie.dispose(), [geometrie]);
  // Die Farbkarte: eine Zelle pro Masche, ohne Glättung, damit jede Masche genau eine Garnfarbe hat
  const karte = useMemo(() => {
    const t = new THREE.DataTexture(maschenKarte(), KARTE.spalten, KARTE.reihen, THREE.RGBAFormat);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    return t;
  }, []);
  useEffect(() => () => karte.dispose(), [karte]);
  // Grobstrick in Weiss. Die Farbe kommt in der Nähe aus der Maschen-Karte, in der Ferne pro Ecke aus bodenFarbe.
  const material = useMemo(() => {
    const m = strick("#ffffff", KACHEL, 2.3).clone();
    m.vertexColors = true;
    // Wenig Stoffglanz: Zu viel legt sich wie ein weisser Schleier über die Farben
    m.sheen = 0.2;
    m.sheenColor = new THREE.Color("#ffe6c4");
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uKarte = { value: karte };
      shader.uniforms.uMasche = { value: new THREE.Vector2(MASCHE_B, MASCHE_H) };
      shader.uniforms.uKarteStart = { value: new THREE.Vector2(KARTE.spalte0, KARTE.reihe0) };
      shader.uniforms.uKarteGroesse = { value: new THREE.Vector2(KARTE.spalten, KARTE.reihen) };
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float nah;\nvarying float vNah;\nvarying vec2 vWeltUv;")
        .replace("#include <uv_vertex>", "#include <uv_vertex>\nvNah = nah;\nvWeltUv = uv;");
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform sampler2D uKarte;\nuniform vec2 uMasche;\nuniform vec2 uKarteStart;\nuniform vec2 uKarteGroesse;\nvarying float vNah;\nvarying vec2 vWeltUv;",
        )
        .replace(
          "#include <color_fragment>",
          [
            "vec3 bodenfarbe = vColor.rgb;",
            "{",
            // In welcher Masche liegt dieser Bildpunkt? Die Schlaufen ragen an den Rändern in die nächste Reihe hinein.
            "  vec2 m = vWeltUv / uMasche;",
            "  float arm = clamp((abs(fract(m.x) - 0.5) - 0.2) / 0.2, 0.0, 1.0) * 0.22;",
            "  vec2 zelle = vec2(floor(m.x), floor(m.y - arm));",
            "  vec2 k = (zelle - uKarteStart + 0.5) / uKarteGroesse;",
            // Sind die Maschen im Bild winzig (weit weg), gilt die weiche Farbe: Sonst flimmert es.
            "  float klein = max(fwidth(m.x), fwidth(m.y));",
            "  float an = vNah * (1.0 - smoothstep(0.45, 0.9, klein)) * step(0.0, k.x) * step(k.x, 1.0) * step(0.0, k.y) * step(k.y, 1.0);",
            "  bodenfarbe = mix(bodenfarbe, texture2D(uKarte, k).rgb, an);",
            "}",
            "diffuseColor.rgb *= bodenfarbe;",
          ].join("\n"),
        );
    };
    m.customProgramCacheKey = () => "berg-maschen";
    return m;
  }, [karte]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh geometry={geometrie} material={material} castShadow receiveShadow />;
}

/* ------------------------------------------------------------------ Die Kamera */

const NAME_Y = hoehe(ORTE.name[0], ORTE.name[1]);

/**
 * Blickrichtung der Kamera: genau nach Norden auf den Berg, leicht nach unten geneigt.
 * Sie ändert sich nie, die Kamera dreht und kippt nicht.
 */
const NICK = -0.15;
const BLICK = new THREE.Vector3(0, Math.sin(NICK), -Math.cos(NICK));
/** So weit steht die Kamera im Startbild vor dem Namen */
const ABSTAND = 24;

/** Startbild: frontal vor dem Namen auf der Gipfelschulter, dahinter die Bergspitzen */
const START_POS = new THREE.Vector3(0, NAME_Y + 2.9 + ABSTAND * Math.tan(-NICK), ORTE.name[1] + ABSTAND);
/** Schlussbild: knapp über dem See, Blick auf das Dorf am Ufer */
const ENDE_POS = new THREE.Vector3(0, WASSER_Y + 6.4, SEE.z + 1);

/** Wohin die Kamera gerade schaut: Licht und Schärfe richten sich danach (wird in jedem Bild neu gesetzt) */
export const BLICKPUNKT = new THREE.Vector3(0, NAME_Y + 2.4, ORTE.name[1]);
export const KAMERA_START: Punkt = [START_POS.x, START_POS.y, START_POS.z];

/**
 * Stimmung: Oben am Gipfel ist klarer Mittag (tiefblauer Himmel, weisses Sonnenlicht, bläuliche Schatten),
 * unten im Tal goldener Abend (warmer Dunst, oranges Licht, tief stehende Sonne mit langen Schatten).
 * Die Werte werden mit der Höhe der Kamera gemischt.
 */
const STIMMUNG = {
  oben: {
    horizont: new THREE.Color("#BFE2F8"),
    zenit: new THREE.Color("#2478D6"),
    sonne: new THREE.Color("#FFF3E0"),
    schatten: new THREE.Color("#9EC6FF"),
    boden: new THREE.Color("#7C6C58"),
    sonnenstand: new THREE.Vector3(-34, 34, 22),
    staerke: 3.1,
  },
  unten: {
    horizont: new THREE.Color("#FFD9A6"),
    zenit: new THREE.Color("#6FA6DC"),
    sonne: new THREE.Color("#FFC27E"),
    schatten: new THREE.Color("#B3A6E8"),
    boden: new THREE.Color("#8F6C44"),
    sonnenstand: new THREE.Vector3(-42, 21, 20),
    staerke: 3.5,
  },
};

/** Ort der Sonne am Himmel: im Sattel zwischen zwei fernen Gipfeln (auch die Sonnenstrahlen in BergSzene gehen von hier aus) */
export const SONNE_ORT: Punkt = [-78, 124, -176];

/** Aktuelle Farben des Himmels (die Himmelskugel in BergSzene liest sie in jedem Bild) */
export const HIMMEL = { horizont: STIMMUNG.oben.horizont.clone(), zenit: STIMMUNG.oben.zenit.clone() };

const h = { pos: new THREE.Vector3(), sonne: new THREE.Vector3() };

/** Wie weit der Blick reicht, bis er auf den Berg trifft (dort liegt die Schärfe) */
function blickweite(pos: THREE.Vector3) {
  for (let d = 8; d < 150; d += 1.5) {
    if (pos.y + BLICK.y * d <= hoehe(pos.x, pos.z + BLICK.z * d) + 2) return d;
  }
  return 60;
}

/**
 * Die Kamerafahrt. Scroll-Fortschritt 0 bis 1 ist eine gerade Linie vom Gipfel hinunter an den See:
 * Die Kamera sinkt und weicht dabei so weit zurück, wie der Berg nach unten breiter wird.
 * Die Blickrichtung bleibt immer gleich. Die Maus schiebt die Kamera nur ein wenig zur Seite.
 * Auf dem Handy (Hochformat) steht sie weiter hinten und hat einen weiteren Blickwinkel.
 */
export function Kamerafahrt({
  ruhig,
  licht,
  umgebung,
  nebel,
  himmel,
}: {
  ruhig: React.RefObject<boolean>;
  licht: React.RefObject<THREE.DirectionalLight | null>;
  umgebung: React.RefObject<THREE.HemisphereLight | null>;
  nebel: React.RefObject<THREE.Fog | null>;
  himmel: React.RefObject<THREE.Color | null>;
}) {
  const zustand = useRef({ p: 0, mx: 0, my: 0, schaerfe: ABSTAND, erstes: true });
  useFrame((state, delta) => {
    const s = zustand.current;
    const dt = Math.min(delta, 0.05);
    const still = ruhig.current;
    const direkt = s.erstes || still;

    const strecke = document.documentElement.scrollHeight - window.innerHeight;
    const pZiel = Math.min(1, Math.max(0, window.scrollY / Math.max(1, strecke)));
    s.p = direkt ? pZiel : s.p + (pZiel - s.p) * Math.min(1, dt * 3);

    // Die Fahrt: eine gerade Linie von oben nach unten
    const kamera = state.camera as THREE.PerspectiveCamera;
    h.pos.lerpVectors(START_POS, ENDE_POS, s.p);
    // Hochformat (Handy): weiter zurück, damit der Name ganz ins Bild passt
    // Unterwegs (zwischen Startbild und Schlussbild) braucht es den grossen Abstand nicht mehr:
    // Die Kamera rückt näher heran, damit die Gondeln in der Bildmitte gross genug zum Lesen sind
    const unterwegs = stufe(s.p, 0.03, 0.14) * (1 - stufe(s.p, 0.9, 0.99));
    const zurueck = Math.max(0, 1 - kamera.aspect) * 26 * (1 - 0.62 * unterwegs);
    h.pos.addScaledVector(BLICK, -zurueck);

    // Maus: Die Kamera weicht ein wenig zur Seite und nach oben aus, sie dreht sich nicht
    const maus = weltStore.maus;
    const an = maus.aktiv && !still;
    s.mx += ((an ? maus.x : 0) - s.mx) * Math.min(1, dt * 2);
    s.my += ((an ? maus.y : 0) - s.my) * Math.min(1, dt * 2);
    h.pos.x += s.mx * 1.5;
    h.pos.y += s.my * 0.7;

    kamera.position.copy(h.pos);
    kamera.rotation.set(NICK, 0, 0);

    // Hochformat: weiterer Blickwinkel
    const fov = 46 + Math.max(0, 1 - kamera.aspect) * 30;
    if (Math.abs(kamera.fov - fov) > 0.01) {
      kamera.fov = fov;
      kamera.updateProjectionMatrix();
    }

    // Schärfe: dort, wo der Blick auf den Berg trifft (weich nachgezogen)
    const weite = blickweite(h.pos);
    s.schaerfe = direkt ? weite : s.schaerfe + (weite - s.schaerfe) * Math.min(1, dt * 2.5);
    s.erstes = false;
    BLICKPUNKT.copy(h.pos).addScaledVector(BLICK, s.schaerfe);

    // Stimmung nach Höhe mischen: oben Mittag, unten goldener Abend
    const hoch = stufe(h.pos.y, 12, 74);
    const { oben, unten } = STIMMUNG;
    HIMMEL.horizont.lerpColors(unten.horizont, oben.horizont, hoch);
    HIMMEL.zenit.lerpColors(unten.zenit, oben.zenit, hoch);
    nebel.current?.color.copy(HIMMEL.horizont);
    himmel.current?.copy(HIMMEL.horizont);
    const u = umgebung.current;
    if (u) {
      u.color.lerpColors(unten.schatten, oben.schatten, hoch);
      u.groundColor.lerpColors(unten.boden, oben.boden, hoch);
    }

    // Sonne folgt dem Blickpunkt, damit die Schatten überall scharf bleiben.
    // Sie steht links und streift die Wand von der Seite: So werfen Rippen, Maschen und Bäume lange Schatten.
    const l = licht.current;
    if (l) {
      h.sonne.lerpVectors(unten.sonnenstand, oben.sonnenstand, hoch);
      l.position.copy(BLICKPUNKT).add(h.sonne);
      l.target.position.copy(BLICKPUNKT);
      l.target.updateMatrixWorld();
      // Die Stärke steckt in der Farbe: Die Lampe selbst hat immer die Stärke von oben
      l.color.lerpColors(unten.sonne, oben.sonne, hoch).multiplyScalar((unten.staerke + (oben.staerke - unten.staerke) * hoch) / oben.staerke);
    }
  });
  return null;
}

/** Stellt die Uhr der Welt: Wind, Wasser und alles, was sich bewegt, läuft danach */
function Uhr({ ruhig }: { ruhig: React.RefObject<boolean> }) {
  useFrame((state) => uhrStellen(ruhig.current ? 0 : state.clock.elapsedTime));
  return null;
}

/* ------------------------------------------------------------------ LUKA im Schnee */

function NameImSchnee({ ...lage }: Lage) {
  const buchstaben = useMemo(
    () => [
      { form: BUCHSTABEN.L(), breite: BUCHSTABEN_BREITE.L, farbe: "#E3829B" },
      { form: BUCHSTABEN.U(), breite: BUCHSTABEN_BREITE.U, farbe: "#EE8B3D" },
      { form: BUCHSTABEN.K(), breite: BUCHSTABEN_BREITE.K, farbe: "#F2C64F" },
      { form: BUCHSTABEN.A(), breite: BUCHSTABEN_BREITE.A, farbe: "#79A8DA" },
    ],
    [],
  );
  const abstand = 0.65;
  // Linke Kante jedes Buchstabens, so dass das Wort mittig steht
  const linkeKanten = useMemo(() => {
    const gesamt = buchstaben.reduce((s, b) => s + b.breite, 0) + abstand * (buchstaben.length - 1);
    return buchstaben.map((_, i) => -gesamt / 2 + buchstaben.slice(0, i).reduce((s, b) => s + b.breite + abstand, 0));
  }, [buchstaben]);
  const koerper = useRef<(THREE.Group | null)[]>([]);
  const feder = useRef(buchstaben.map(() => ({ y: 0, vy: 0, klick: -1 })));

  // Klick irgendwo: Die Buchstaben hüpfen nacheinander kurz hoch
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.04);
    buchstaben.forEach((_, i) => {
      const g = koerper.current[i];
      const f = feder.current[i];
      if (!g) return;
      if (weltStore.klick.zeit !== f.klick) {
        f.klick = weltStore.klick.zeit;
        if (performance.now() - weltStore.klick.zeit < 200) f.vy += 5 + i * 0.6;
      }
      f.vy += (-f.y * 40 - f.vy * 4) * dt;
      f.y += f.vy * dt;
      g.position.y = Math.max(0, f.y);
    });
  });

  return (
    <group {...lage}>
      {buchstaben.map((b, i) => (
        <group
          key={i}
          ref={(g) => {
            koerper.current[i] = g;
          }}
        >
          <StrickBuchstabe form={b.form} farbe={b.farbe} position={[linkeKanten[i], 0, 0]} rotation={[0, (i - 1.5) * 0.06, 0]} />
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ Bäume: zufällig, aber jedes Mal gleich verteilt */

/** Streut Bäume in ein Rechteck auf der Karte. «passt» entscheidet anhand von Ort und Höhe, ob dort einer stehen darf. */
function streuen(
  anzahl: number,
  saat: number,
  flaeche: { x: [number, number]; z: [number, number] },
  groesse: [number, number],
  passt: (x: number, z: number, y: number) => boolean,
) {
  const z = zufall(saat);
  const plaetze: Baumplatz[] = [];
  let versuche = 0;
  while (plaetze.length < anzahl && versuche < anzahl * 30) {
    versuche++;
    const px = flaeche.x[0] + z() * (flaeche.x[1] - flaeche.x[0]);
    const pz = flaeche.z[0] + z() * (flaeche.z[1] - flaeche.z[0]);
    const py = hoehe(px, pz);
    if (!passt(px, pz, py)) continue;
    // Am Steilhang steht der Stamm tiefer im Boden, damit die Talseite des Baums nicht in der Luft hängt
    const gefaelle = Math.abs(hoehe(px, pz + 0.6) - hoehe(px, pz - 0.6)) / 1.2;
    plaetze.push([px, py - 0.15 - Math.min(0.9, gefaelle * 0.45), pz, groesse[0] + z() * (groesse[1] - groesse[0])]);
  }
  return plaetze;
}

const frei = (x: number, z: number, wegAbstand: number) => abstandZumWeg(x, z) > wegAbstand && abstandZuBauten(x, z) > 2.2 && abstandZumBach(x, z) > 1.9;

/** Sät kleine Pflanzen (Gras, Blumen, Schilf): wie streuen, aber ohne sie am Hang zu versenken */
function saeen(
  anzahl: number,
  saat: number,
  flaeche: { x: [number, number]; z: [number, number] },
  groesse: [number, number],
  passt: (x: number, z: number, y: number) => boolean,
) {
  const z = zufall(saat);
  const plaetze: Baumplatz[] = [];
  let versuche = 0;
  while (plaetze.length < anzahl && versuche < anzahl * 12) {
    versuche++;
    const px = flaeche.x[0] + z() * (flaeche.x[1] - flaeche.x[0]);
    const pz = flaeche.z[0] + z() * (flaeche.z[1] - flaeche.z[0]);
    const py = hoehe(px, pz);
    if (!passt(px, pz, py)) continue;
    plaetze.push([px, py - 0.04, pz, groesse[0] + z() * (groesse[1] - groesse[0])]);
  }
  return plaetze;
}

/** Wiese: nicht auf Wegen, Gassen, Höfen und nicht im Bach */
const wiese = (x: number, z: number) => abstandZumWeg(x, z) > 1.25 && abstandZuBauten(x, z) > 0.9 && abstandZumBach(x, z) > 1.3 && abstandZurGasse(x, z) > 0.95;

/** Grasbüschel: dicht auf der Alp und im Dorf, lockerer am Waldboden */
const GRAS_ALP = saeen(3000, 31, { x: [-40, 36], z: [49.5, 67] }, [0.7, 1.25], (x, z, y) => y > 48.6 && y < 55 && wiese(x, z));
const GRAS_DORF = saeen(3200, 32, { x: [-42, 42], z: [98, 124.5] }, [0.7, 1.25], (x, z, y) => y > WASSER_Y + 0.9 && y < 9.6 && wiese(x, z) && !imFeld(x, z));
const GRAS_WALD = saeen(1500, 33, { x: [-36, 36], z: [66, 99] }, [0.7, 1.15], (x, z, y) => y > 10 && y < 48.5 && abstandZumWeg(x, z) > 1.25 && abstandZumBach(x, z) > 1.3);
const GRUEN_ALP = ["#6FBE44", "#8ACB4C", "#A6D656", "#5FB03E"];
const GRUEN_DORF = ["#62B642", "#7FC648", "#9AD152", "#6DBB42"];
const GRUEN_WALD = ["#3B8A3E", "#33793A", "#489644"];

/** Blumen mit Blütenblättern auf der Alp, im Dorf und vereinzelt am Waldboden (die Grösse ist die Höhe der Blume) */
const BLUMEN_ALP = saeen(320, 16, { x: [-38, 34], z: [50, 66.5] }, [0.55, 1], (x, z, y) => y > 48.8 && y < 54.5 && wiese(x, z));
const BLUMEN_DORF = saeen(260, 17, { x: [-34, 34], z: [99, 123.5] }, [0.55, 0.95], (x, z, y) => y > WASSER_Y + 1.1 && y < 9.2 && wiese(x, z) && !imFeld(x, z));
const BLUMEN_WALD = saeen(60, 18, { x: [-26, 26], z: [68, 96] }, [0.5, 0.8], (x, z, y) => y > 12 && y < 46 && abstandZumWeg(x, z) > 1.4 && abstandZumWeg(x, z) < 5);

/** Trittsteine auf den Gassen: etwa jeder zweite Punkt, leicht versetzt, nicht auf den Brücken */
const TRITTSTEINE: Baumplatz[] = GASSEN.flatMap((gasse, g) =>
  gasse
    .filter((_, i) => i % 2 === 1)
    .filter(([x, z]) => BRUECKEN.every(([bx, bz]) => Math.hypot(x - bx, z - bz) > 2.1))
    .map(([x, z], i): Baumplatz => {
      const seite = ((i + g) % 2 ? 1 : -1) * 0.14;
      return [x + seite, hoehe(x + seite, z) + 0.04, z + seite * 0.5, 0.3 + ((i * 7 + g * 3) % 5) * 0.022];
    }),
);

/** Kiesel links und rechts am Bach, grössere Brocken am Wasserfall */
const BACHSTEINE: Baumplatz[] = BACH_KARTE.flatMap(([x, z], i): Baumplatz[] => {
  if (i % 3 !== 0 || i === 0 || i >= BACH_KARTE.length - 6) return [];
  if (BRUECKEN.some(([bx, bz]) => Math.hypot(x - bx, z - bz) < 2.2)) return [];
  const [ax, az] = BACH_KARTE[i - 1];
  const [bx, bz] = BACH_KARTE[Math.min(BACH_KARTE.length - 1, i + 1)];
  const l = Math.hypot(bx - ax, bz - az) || 1;
  const seite = (i / 3) % 2 ? 1 : -1;
  const weit = 1.12 + ((i * 5) % 4) * 0.08;
  const [px, pz] = [x - ((bz - az) / l) * seite * weit, z + ((bx - ax) / l) * seite * weit];
  return [[px, hoehe(px, pz) + 0.08, pz, (z < 50 ? 0.48 : 0.3) + ((i * 11) % 6) * 0.03]];
});

/** Schilf am Nordufer des Sees: im flachen Wasser und am Rand, aber nicht am Steg, am Wegende und an der Bachmündung */
const SCHILF = saeen(
  150,
  41,
  { x: [-50, 44], z: [119, 131] },
  [1.1, 1.9],
  (x, z, y) => y > WASSER_Y - 0.4 && y < WASSER_Y + 0.28 && !(Math.abs(x - 7.5) < 3.2) && Math.abs(x) > 5.5 && abstandZumBach(x, z) > 1.8,
);
/** Seerosen im flachen Wasser links und rechts vom Wegende */
const SEEROSEN = saeen(18, 42, { x: [-34, 34], z: [126, 133] }, [0.75, 1.25], (x, z, y) => y < WASSER_Y - 0.45 && y > WASSER_Y - 2.4 && Math.abs(x) > 9).map(
  ([x, , z, g]): Baumplatz => [x, WASSER_Y, z, g],
);

/** Oberkante jedes Kamins (Chalets und Dorfhäuser): Dort steigt der Rauch auf */
const KAMINE: Punkt[] = [
  ...ORTE.chalets.map(([x, z], i): Punkt => {
    const breite = 2.7 - i * 0.2;
    return [x + breite * 0.22, hoehe(x, z) + 1.6 + breite * 0.32 * 0.72 + 0.5, z - 2.3 * 0.18];
  }),
  ...ORTE.haeuser.map(([x, z], i): Punkt => {
    const breite = 2 + (i % 3) * 0.25;
    return [x + breite * 0.22, hoehe(x, z) + (i % 2 === 0 ? 1.7 : 2.6) + breite * 0.5 * 0.72 + 0.5, z - 2 * 0.18];
  }),
];
const beiDerSeilbahn = (x: number, z: number) => Math.abs(x - seilbahnX(z)) < GONDEL_SEITE + 2.8 && z > 30 && z < 108;

/** Der Wald am Steilhang zwischen Alp und Dorf: dicht, mit Schneisen für den Zickzackweg und die Seilbahn */
const WALD = streuen(680, 11, { x: [-60, 60], z: [63, 101] }, [0.9, 1.65], (x, z, y) => y > 9.5 && y < 48.5 && frei(x, z, 2.3) && !beiDerSeilbahn(x, z));
/** Felsbrocken aus Filz in der Felswand und an ihrem Fuss */
const BROCKEN = streuen(30, 15, { x: [-38, 38], z: [30, 51] }, [0.5, 1.5], (x, z, y) => y > 51 && y < 81 && frei(x, z, 2) && !beiDerSeilbahn(x, z));
/** Einzelne Tannen am Rand der Alp und am Fuss der Felswand */
const ALP_RAND = streuen(
  26,
  12,
  { x: [-44, 44], z: [47, 66] },
  [0.85, 1.25],
  (x, z, y) => y > 48.5 && y < 58 && (Math.abs(x) > 17 || z < 50.5) && frei(x, z, 4.5) && !beiDerSeilbahn(x, z),
);
/** Bäume links und rechts vom Dorf und am Seeufer */
const TAL = streuen(44, 13, { x: [-78, 78], z: [99, 152] }, [0.9, 1.4], (x, z, y) => y > WASSER_Y + 0.9 && y < 9.5 && Math.abs(x) > 29 && frei(x, z, 4) && !imFeld(x, z));
/** Wälder an den Bergen rundherum: geben der Welt Tiefe */
const FERNE = streuen(300, 14, { x: [-160, 160], z: [-60, 150] }, [1.1, 1.9], (x, z, y) => y > 12 && y < 52 && (Math.abs(x) > 68 || z < 6));

/* ------------------------------------------------------------------ Wolken */

type Kugel = [number, number, number, number];
const WOLKE_A: Kugel[] = [
  [-1.1, 0, 0, 0.75],
  [-0.2, 0.28, 0.1, 1],
  [0.8, 0.05, 0, 0.82],
  [1.55, -0.1, 0, 0.55],
  [0.2, -0.2, 0.5, 0.6],
];
const WOLKE_B: Kugel[] = [
  [-0.6, 0, 0, 0.55],
  [0.1, 0.22, 0.05, 0.72],
  [0.75, 0, 0, 0.5],
];
/**
 * x, y, z, Grösse, Form. Zuerst die Wolken zwischen den Gipfeln (Startbild), dann das Wolkenband an der Felswand,
 * dann zwei nahe Wolken, an denen die Kamera vorbeifährt, und zuletzt die über dem Wald.
 */
const WOLKEN: [number, number, number, number, Kugel[]][] = [
  [-40, 86, -12, 4.2, WOLKE_A],
  [38, 90, -30, 3.8, WOLKE_B],
  [-30, 70, 30, 3.2, WOLKE_A],
  [31, 67, 34, 3, WOLKE_B],
  [-17, 77, 49, 2, WOLKE_B],
  [19, 58, 71, 2.2, WOLKE_A],
  [-36, 38, 62, 3, WOLKE_A],
  [38, 34, 66, 2.8, WOLKE_B],
  // Wolkenmeer zwischen dem Hausberg und den Gipfeln dahinter
  [-64, 84, -44, 5, WOLKE_A],
  [70, 86, -40, 4.8, WOLKE_A],
  [-8, 90, -52, 4.4, WOLKE_B],
  [18, 88, -58, 4.6, WOLKE_A],
  [-96, 96, -92, 5.4, WOLKE_A],
  [104, 98, -96, 5.2, WOLKE_B],
  [-12, 104, -124, 5, WOLKE_A],
  [-54, 60, 40, 3.6, WOLKE_A],
  [52, 62, 36, 3.4, WOLKE_A],
];

/** Die Wolken ziehen langsam hin und her und heben und senken sich leicht */
function Wolken({ liste }: { liste: typeof WOLKEN }) {
  const gruppen = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    gruppen.current.forEach((g, i) => {
      if (g) g.position.set(Math.sin(ZEIT.value * 0.06 + i * 1.7) * 3.2, Math.sin(ZEIT.value * 0.21 + i) * 0.35, 0);
    });
  });
  return (
    <>
      {liste.map(([x, y, z, s, kugeln], i) => (
        <group
          key={i}
          ref={(g) => {
            gruppen.current[i] = g;
          }}
        >
          <Watte kugeln={kugeln} schatten={false} position={[x, Math.max(y, hoehe(x, z) + s * 1.6), z]} scale={s} />
        </group>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ Kleinigkeiten am Weg */

/** Zaun aus Holzpfosten und Kordel, folgt dem Boden */
function Zaun({ von, bis }: { von: [number, number]; bis: [number, number] }) {
  const punkte = useMemo(() => {
    const n = Math.max(2, Math.round(Math.hypot(bis[0] - von[0], bis[1] - von[1]) / 1.7) + 1);
    return Array.from({ length: n }, (_, i) => {
      const x = von[0] + ((bis[0] - von[0]) * i) / (n - 1);
      const z = von[1] + ((bis[1] - von[1]) * i) / (n - 1);
      return [x, hoehe(x, z), z] as Punkt;
    });
  }, [von, bis]);
  const oben = useMemo(() => punkte.map(([x, y, z]) => [x, y + 0.85, z] as Punkt), [punkte]);
  const unten = useMemo(() => punkte.map(([x, y, z]) => [x, y + 0.45, z] as Punkt), [punkte]);
  return (
    <group>
      {punkte.map(([x, y, z], i) => (
        <mesh key={i} material={holz("#8A5A34")} position={[x, y + 0.45, z]} castShadow>
          <boxGeometry args={[0.16, 1.1, 0.16]} />
        </mesh>
      ))}
      <Kordel punkte={oben} dicke={0.07} />
      <Kordel punkte={unten} dicke={0.07} />
    </group>
  );
}

const ZAUN_VON: [number, number] = [6, 63.6];
const ZAUN_BIS: [number, number] = [23, 61.2];
const SCHILD_ROLLE = ["Webentwickler in Zürich"];
const SCHILD_STACK = ["React · Next.js · TypeScript"];
const SCHILD_TAL = ["↓ Ab ins Tal"];
const SCHILD_GONDELN = ["↓ Projekte: Gondel anklicken"];
const SCHILD_GONDELN_HANDY = ["↓ Projekte:", "Gondel antippen"];

/** Wo der Schwarm am Gipfel kreist: rechts über dem Schild, im Hochformat näher an der Mitte, damit man ihn sieht */
const VOEGEL_GIPFEL: [number, number] = [17, 22];
const VOEGEL_GIPFEL_HANDY: [number, number] = [6, 12];

/** Höhe der Seilbahn-Stützen: so hoch, dass die grossen Gondeln überall frei über dem Boden hängen */
const STUETZE_HOCH = 8;

/** Der Weg: eine dicke gedrehte Kordel, die im Zickzack vom Wollknäuel am Gipfel bis an den See führt */
const KORDEL_WEG: Punkt[] = WEG.filter((_, i) => i % 2 === 0 || i === WEG.length - 1).map(([x, y, z]) => [x, y + 0.24, z]);

/* ------------------------------------------------------------------ Die ganze Welt */

export function Berg({ ruhig, sparsam, hochformat }: { ruhig: React.RefObject<boolean>; sparsam: boolean; hochformat: boolean }) {
  const boden = (x: number, z: number, hoch = 0): Punkt => [x, hoehe(x, z) + hoch, z];

  // Seilbahn: von der Bergstation unter dem Gipfel über drei Stützen gerade durch die Bildmitte zur Talstation
  const seil: Punkt[] = useMemo(
    () => [boden(ORTE.bergstation[0], ORTE.bergstation[1], 3.4), ...ORTE.stuetzen.map(([x, z]) => boden(x, z, STUETZE_HOCH)), boden(ORTE.talstation[0], ORTE.talstation[1], 3.4)],
    [],
  );
  const seilGier = Math.atan2(ORTE.talstation[0] - ORTE.bergstation[0], ORTE.talstation[1] - ORTE.bergstation[1]);

  const wolken = sparsam ? WOLKEN.slice(0, 8) : WOLKEN;

  return (
    <group>
      <Uhr ruhig={ruhig} />
      <Gelaende sparsam={sparsam} />
      <See rx={SEE.rx * 1.65} rz={SEE.rz * 1.65} position={[SEE.x, WASSER_Y, SEE.z]} />
      <StrickSonne radius={9} position={SONNE_ORT} />

      {/* Gipfel: Kreuz auf der Kuppe, LUKA auf der Schulter davor, Schilder. Die Bergstation steht auf einem Absatz gleich darunter. */}
      <Gipfelkreuz position={boden(ORTE.kreuz[0], ORTE.kreuz[1], -0.4)} />
      <NameImSchnee position={[ORTE.name[0], NAME_Y - 0.1, ORTE.name[1]]} scale={1.5} />
      {hochformat ? (
        <>
          {/* Hochformat: Die Schilder stehen untereinander vor dem Namen, weil daneben kein Platz ist */}
          <FilzSchild zeilen={SCHILD_ROLLE} breite={9} hoehe={1.7} pfosten={0.3} position={boden(0, 27)} />
          <FilzSchild zeilen={SCHILD_STACK} breite={9} hoehe={1.7} pfosten={0.3} position={boden(0, 29.6)} />
          <FilzSchild zeilen={SCHILD_GONDELN_HANDY} breite={4.3} hoehe={1.7} farbe="#F2C64F" pfosten={0.3} position={boden(-4.4, 32.4)} />
        </>
      ) : (
        <>
          <FilzSchild zeilen={SCHILD_ROLLE} breite={6.6} hoehe={1.25} pfosten={2.4} position={boden(-13.2, 17)} rotation={[0, 0.3, 0]} />
          <FilzSchild zeilen={SCHILD_STACK} breite={6.6} hoehe={1.25} pfosten={2.4} position={boden(13.2, 17)} rotation={[0, -0.3, 0]} />
          <FilzSchild zeilen={SCHILD_TAL} breite={2.8} hoehe={0.85} farbe="#F2C64F" pfosten={1.5} position={boden(-7.5, 27)} rotation={[0, 0.15, 0]} />
          <FilzSchild zeilen={SCHILD_GONDELN} breite={5.2} hoehe={0.9} farbe="#F2C64F" pfosten={1.5} position={boden(9.2, 28.2)} rotation={[0, -0.2, 0]} />
        </>
      )}
      <PappStation position={boden(ORTE.bergstation[0], ORTE.bergstation[1])} rotation={[0, seilGier, 0]} />

      {/* Der Weg aus Kordel: beginnt an einem Wollknäuel neben dem Namen und endet am Seeufer beim Briefkasten */}
      <Garnknaeuel radius={0.9} farbe="#F1E8D4" start={3} position={boden(WEG[0][0], WEG[0][2], 0.7)} />
      <Kordel punkte={KORDEL_WEG} dicke={0.3} />
      {/* Kontakt: der gelbe Briefkasten am Ende des Wegs */}
      <Briefkasten position={boden(3.4, 121.4)} rotation={[0, -0.12, 0]} />
      {/* Über mich: Schild auf der Alp */}
      <UeberMichSchild position={boden(-9, 61.6)} rotation={[0, 0.1, 0]} />

      {/* Wolken, sie ziehen langsam hin und her */}
      <Wolken liste={wolken} />

      {/* Leben am Gipfel: Fahne, Schneeflocken, Vögel */}
      <Fahne position={boden(4.6, 1.2, -0.3)} rotation={[0, -0.25, 0]} />
      <Schneeflocken anzahl={sparsam ? 130 : 280} unten={NAME_Y - 14} />
      {/* Kleine Schwärme neben der Seilbahn (nie über dem Seil): am Gipfel, über der Alp, über dem Wald und über dem Dorf */}
      <Voegel mitte={hochformat ? VOEGEL_GIPFEL_HANDY : VOEGEL_GIPFEL} anzahl={sparsam ? 3 : 4} start={1} />
      <Voegel mitte={[-14, 58]} anzahl={sparsam ? 2 : 4} start={2} />
      <Voegel mitte={[14, 82]} anzahl={sparsam ? 2 : 3} start={4} />
      <Voegel mitte={[14, 109]} anzahl={sparsam ? 2 : 4} start={3} />
      {/* Vögel, die sitzen: auf dem Gipfelkreuz, auf zwei Zaunpfosten der Alp und auf dem Kontakt-Schild */}
      <SitzVogel art={4} position={boden(ORTE.kreuz[0] + 0.75, ORTE.kreuz[1], 2.27)} rotation={[0, -0.6, 0]} />
      <SitzVogel art={0} phase={1.7} position={boden(9.4, 63.12, 1)} rotation={[0, -1.2, 0]} />
      <SitzVogel art={1} phase={3.1} position={boden(16.2, 62.16, 1)} rotation={[0, -1.9, 0]} />
      <SitzVogel art={2} phase={0.6} position={boden(2.6, 121.4, 3.76)} rotation={[0, -1.3, 0]} />

      {/* Der Bach: Wasserfall in der Felswand, Tümpel auf der Alp, dann durch Wald und Dorf in den See */}
      <Bach />
      <Gischt position={boden(-18, 51, 0.05)} />

      {/* Rauch aus allen Kaminen */}
      <Rauch kamine={KAMINE} />

      {/* Felsbrocken in der Wand unter dem Gipfel */}
      {BROCKEN.map(([x, y, z, g], i) => (
        <Stein key={i} groesse={g} farbe={i % 3 === 0 ? "#6E675D" : "#8C8579"} position={[x, y + g * 0.3, z]} rotation={[0, i * 1.7, 0]} />
      ))}

      {/* Alp: Chalets, Zaun, Blumen und Büsche am Weg. Alle Häuser schauen zur Kamera. */}
      {ORTE.chalets.map(([x, z], i) => (
        <PappHaus
          key={i}
          chalet
          breite={2.7 - i * 0.2}
          hoehe={1.6}
          tiefe={2.3}
          wand={KRAFT_DUNKEL}
          dach="#7A4A2E"
          position={boden(x, z)}
          rotation={[0, -x * 0.012 + (i - 1) * 0.1, 0]}
        />
      ))}
      <Zaun von={ZAUN_VON} bis={ZAUN_BIS} />
      {(
        [
          [0.335, 1, 1.8, "#E46A93"],
          [0.355, -1, 2.2, "#F2CF4A"],
          [0.375, 1, 3, "#9C6FD6"],
          [0.395, -1, 1.9, "#5B9BE0"],
          [0.415, 1, 2.4, "#F08C3A"],
          [0.43, -1, 2.8, "#E46A93"],
          [0.445, 1, 2, "#F2CF4A"],
        ] as const
      ).map(([anteil, seite, abstand, farbe], i) => {
        const p = amWeg(anteil, seite, abstand);
        return <HaekelBlume key={i} farbe={farbe} hoehe={0.9 + (i % 3) * 0.15} groesse={0.9} position={[p.x, p.y, p.z]} />;
      })}
      {(
        [
          [0.345, -1, 4.5, "#9DB83A", 1.1],
          [0.4, 1, 4, "#5E9A3C", 1],
          [0.44, -1, 4, "#4F8F33", 1.2],
        ] as const
      ).map(([anteil, seite, abstand, farbe, g], i) => {
        const p = amWeg(anteil, seite, abstand);
        return <Busch key={i} farbe={farbe} groesse={g} start={i + 3} position={[p.x, p.y, p.z]} />;
      })}

      {/* Wald: Tannen am Steilhang, Pilze am Wegrand */}
      <Tannen baeume={sparsam ? WALD.slice(0, 340) : WALD} saat={3} />
      <Tannen baeume={ALP_RAND} saat={2} />
      <Gras plaetze={sparsam ? GRAS_WALD.slice(0, 500) : GRAS_WALD} farben={GRUEN_WALD} saat={3} />
      <Blumenwiese plaetze={BLUMEN_WALD} saat={3} />
      {(
        [
          [0.5, -1, 2.4, 1.5],
          [0.56, 1, 2.2, 1.3],
          [0.62, -1, 2.6, 1.6],
          [0.66, 1, 2.3, 1.4],
          [0.72, -1, 2.2, 1.5],
          [0.78, 1, 2.5, 1.3],
          [0.83, -1, 2.3, 1.6],
        ] as const
      ).map(([anteil, seite, abstand, laenge], i) => {
        const p = amWeg(anteil, seite, abstand);
        return <Farn key={i} farbe={i % 2 ? "#3F8A36" : "#4F9A3C"} laenge={laenge} start={i + 1} position={[p.x, p.y, p.z]} />;
      })}
      <Baumstumpf position={boden(-6, 76.6)} />
      <Baumstumpf groesse={0.85} position={boden(12.5, 86)} />
      <Baumstumpf groesse={1.1} position={boden(-25, 90)} />
      {(
        [
          [0.52, 1, 1.7, 0.9],
          [0.6, -1, 2, 0.7],
          [0.68, 1, 1.9, 0.8],
          [0.76, -1, 1.6, 0.6],
        ] as const
      ).map(([anteil, seite, abstand, g], i) => {
        const p = amWeg(anteil, seite, abstand);
        return <Pilz key={i} groesse={g} position={[p.x, p.y, p.z]} />;
      })}

      {/* Dorf am See: Häuser und Kirche aus Wellpappe */}
      {ORTE.haeuser.map(([x, z], i) => (
        <PappHaus
          key={i}
          breite={2 + (i % 3) * 0.25}
          hoehe={i % 2 === 0 ? 1.7 : 2.6}
          tiefe={2}
          wand={[KRAFT, KARTON_WEISS, KRAFT_DUNKEL][i % 3]}
          dach={["#A9573A", "#6C7F8F", "#8E4A32"][i % 3]}
          position={boden(x, z)}
          rotation={[0, -x * 0.01 + (((i * 37) % 7) - 3) * 0.05, 0]}
        />
      ))}
      <PappKirche position={boden(ORTE.kirche[0], ORTE.kirche[1])} rotation={[0, 0.1, 0]} />
      <Tannen baeume={TAL} saat={5} />
      <StrickBaum hoehe={2} krone="#6FA83E" groesse={1} position={boden(-27.5, 116.5)} />
      <StrickBaum hoehe={2.2} krone="#5E9A3C" groesse={1.1} position={boden(20, 114)} />
      <StrickBaum hoehe={2.1} krone="#E8A23A" groesse={1.05} position={boden(27, 104)} />
      <StrickBaum hoehe={1.9} krone="#D9652B" groesse={0.95} position={boden(10.5, 121)} />
      <StrickBaum hoehe={2} krone="#F2C64F" groesse={1} position={boden(-31, 103)} />
      <Blumenwiese plaetze={BLUMEN_DORF} saat={2} />
      <Gras plaetze={sparsam ? GRAS_DORF.slice(0, 1100) : GRAS_DORF} farben={GRUEN_DORF} saat={2} />
      {/* Gassen mit Trittsteinen, Brücken über den Bach, Schilf und Seerosen am Ufer */}
      <Steine plaetze={TRITTSTEINE} saat={1} flach={0.3} />
      <Steine plaetze={BACHSTEINE} saat={2} />
      {BRUECKEN.map(([x, z, drehung], i) => (
        <Bruecke key={i} position={boden(x, z, 0.1)} rotation={[0, drehung, 0]} />
      ))}
      <Schilf plaetze={sparsam ? SCHILF.slice(0, 70) : SCHILF} saat={1} />
      <Seerosen plaetze={SEEROSEN} />
      <Busch farbe="#4F8F33" groesse={1.1} start={11} position={boden(-17.2, 115.6)} />
      <Busch farbe="#5E9A3C" groesse={1} start={12} position={boden(11.5, 106.4)} />
      <Busch farbe="#6FA83E" groesse={1.2} start={13} position={boden(25, 114.5)} />
      <Busch farbe="#4F8F33" groesse={1.1} start={14} position={boden(-29, 105.5)} />
      <Busch farbe="#5E9A3C" groesse={0.9} start={15} position={boden(3.6, 118.6)} />
      <Wimpelkette von={boden(-10.2, 114.4)} bis={boden(-3.4, 113.2)} />
      <Steg position={[7.5, WASSER_Y, 124]} />
      <Heuballen position={boden(-40, 104)} rotation={[0, 0.5, 0]} />
      <Heuballen position={boden(-46, 107.5)} rotation={[0, 1.2, 0]} />
      <Heuballen position={boden(41, 116)} rotation={[0, -0.4, 0]} />

      {/* Alp: Kühe, Blumen, Heuballen */}
      <Blumenwiese plaetze={BLUMEN_ALP} saat={1} />
      <Gras plaetze={sparsam ? GRAS_ALP.slice(0, 1000) : GRAS_ALP} farben={GRUEN_ALP} saat={1} />
      <Kuh position={boden(15.5, 59.5)} rotation={[0, 0.5, 0]} scale={1.2} phase={0} />
      <Kuh position={boden(19.8, 56.4)} rotation={[0, -2.5, 0]} scale={1.1} flecken="#3A2E2A" phase={2} />
      <Kuh position={boden(-5.5, 59.2)} rotation={[0, 0.9, 0]} scale={1.15} phase={4} />
      {!sparsam && <Kuh position={boden(-14.4, 60.6)} rotation={[0, Math.PI, 0]} scale={1.1} flecken="#3A2E2A" phase={1} />}
      <Holzstapel position={boden(-13.6, 57.4)} rotation={[0, 0.25, 0]} />
      <Holzstapel position={boden(13.6, 55.6)} rotation={[0, -0.2, 0]} />
      <Busch farbe="#5E9A3C" groesse={1} start={21} position={boden(26, 62)} />
      <Busch farbe="#4F8F33" groesse={1.1} start={22} position={boden(-30.5, 56)} />
      <Busch farbe="#6FA83E" groesse={0.9} start={23} position={boden(2.2, 50.4)} />
      <Heuballen position={boden(22.5, 59.3)} rotation={[0, 0.3, 0]} />
      <Heuballen position={boden(24, 58)} rotation={[0, 1.1, 0]} />
      <StrickBaum hoehe={2.2} krone="#6FA83E" groesse={1.1} position={boden(28, 54.5)} />

      {/* Wälder an den Bergen rundherum */}
      {!sparsam && <Tannen baeume={FERNE} saat={7} />}

      {/* Seilbahn vom Gipfel ins Tal */}
      {ORTE.stuetzen.map(([x, z], i) => (
        <Stuetze key={i} hoehe={STUETZE_HOCH} breite={1.6} position={boden(x, z)} rotation={[0, seilGier + Math.PI / 2, 0]} />
      ))}
      <PappStation position={boden(ORTE.talstation[0], ORTE.talstation[1])} rotation={[0, seilGier + Math.PI, 0]} />
      <Projektbahn punkte={seil} projekte={projekte} />
    </group>
  );
}
