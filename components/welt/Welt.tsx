"use client";

import { useFrame } from "@react-three/fiber";
import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { beat } from "@/components/sound/beat";
import {
  BUCHSTABEN,
  BUCHSTABEN_BREITE,
  dreieckForm,
  ellipsenForm,
  flammenForm,
  schwanzForm,
  sternForm,
  stichPunkte,
  wellenForm,
  zahnradForm,
} from "./formen";
import {
  Busch,
  Farn,
  Fransen,
  HaekelBlume,
  KnaeuelMitFaden,
  Kordel,
  KordelRing,
  KordelWeg,
  LiegenderKnopf,
  Pilz,
  Pompom,
  PompomBaum,
  StoffHuegel,
  StrickBaum,
  StrickBuchstabe,
  Watte,
  type Punkt,
} from "./handarbeit";
import { BODEN_Y, ZONE, bodenWelle } from "./masse";
import { filz, filzKugel, garn, pappe, strick, strickWand, toenen, tweed } from "./materialien";
import { FilzKugel, FilzTeil, Garnfaden, Garnknaeuel, Knopf3D, Koralle, Naht, PappeTeil, Stein } from "./teile";
import { weltStore } from "./zustand";

/*
 * Die Bastelwelt als Diorama: echte 3D-Körper auf dicken, gestrickten Böden, die Kamera schaut leicht von oben hinein.
 * Beim Scrollen sinkt man durch die Böden nach unten, wie durch die Schichten eines Kuchens:
 *
 *   Zone 0  Wiese    (Hero)        LUKA als Strickkissen an Wollfäden, Filzsonne, Watte-Wolken, Patchwork-Hügel,
 *                                  Häkelbüsche, Pompom- und Strickbäume, Kordel-Wege, Pilze, Wollknäuel, Knöpfe,
 *                                  Häkelblumen, unscharfe Fransen und Pompoms ganz vorne
 *   Zone 1  Erde     (Über mich)   Woll-Wurzeln, halb vergrabene Knöpfe, Filzwurm, Steine
 *   Zone 2  Wasser   (Projekte)    Fische, die im Kreis schwimmen, Algen, Korallen, Blasen
 *   Zone 3  Lava     (Skills)      Pappe-Zahnräder, Filzflammen
 *   Zone 4  Weltall  (Spielplatz)  Garn-Planeten, sich drehende Filzsterne
 *   Zone 5  Mond     (Kontakt)     Mondboden, grosser Filzmond, Sterne
 */

export const FOV = 38;
const ABSTAND = 19.5; // Abstand der Kamera zum Blickpunkt
const ZIEL_Y = -0.6; // Blickpunkt etwas unter der Mitte: Die Kamera schaut leicht von oben
const NEIGUNG = 0.13; // Grundneigung der Kamera nach unten (Radiant)
const TAN = Math.tan(((FOV / 2) * Math.PI) / 180);
const BODEN_MITTE_Z = -3.5; // Mitte der Bodenplatte in der Tiefe (sie reicht von -14.5 bis 7.5)
const ABSCHNITTE = ["start", "ueber-mich", "projekte", "skills", "spielplatz", "kontakt"];
const WELT_FARBEN = ["#A7CDE8", "#8a5a34", "#2f86c2", "#d4553a", "#2a2766", "#2a2766"];

export const KAMERA_START: [number, number, number] = [0, ZIEL_Y + Math.sin(NEIGUNG) * ABSTAND, Math.cos(NEIGUNG) * ABSTAND];

type Kontext = { ruhig: React.RefObject<boolean>; saeule: React.RefObject<THREE.Group | null> };
const WeltKontext = createContext<Kontext | null>(null);

function useWelt() {
  const k = useContext(WeltKontext);
  if (!k) throw new Error("Nur innerhalb der Welt verwenden");
  return k;
}

/** Sichtbare halbe Breite in einer bestimmten Tiefe (für die Grundstellung der Kamera) */
function halbeBreite(z: number, seitenverhaeltnis: number) {
  return (KAMERA_START[2] - z) * TAN * seitenverhaeltnis;
}

type PlatzProps = {
  /** Anteil der halben Bildschirmbreite: -1 ganz links, 1 ganz rechts */
  x: number;
  y: number;
  z: number;
  children: React.ReactNode;
  minSkala?: number;
  schweben?: [number, number];
  drehen?: number;
  drehenY?: number;
  wippen?: number;
  rotY?: number;
  phase?: number;
  /** y ist dann die Höhe über dem buckligen Boden statt eine absolute Höhe */
  aufBoden?: boolean;
};

/**
 * Setzt ein Teil an seinen Platz: x relativ zur Bildschirmbreite (damit es auch auf dem Handy passt),
 * y und z in Welt-Einheiten. Optional schwebt, dreht oder wippt es.
 */
function Platz({ x, y, z, children, minSkala = 0.6, schweben, drehen, drehenY, wippen, rotY = 0, phase = 0, aufBoden = false }: PlatzProps) {
  const ref = useRef<THREE.Group>(null);
  const { ruhig } = useWelt();
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const seitenverhaeltnis = state.size.width / state.size.height;
    const t = ruhig.current ? 0 : state.clock.elapsedTime;
    const skala = Math.min(1, Math.max(minSkala, seitenverhaeltnis / 1.6));
    const wx = x * halbeBreite(z, seitenverhaeltnis);
    g.position.set(
      wx + (schweben ? Math.sin(t * 0.4 + phase) * schweben[0] : 0),
      (aufBoden ? BODEN_Y + bodenWelle(wx, z) : 0) + y + (schweben ? Math.sin(t * 0.7 + phase * 2) * schweben[1] : 0),
      z,
    );
    g.scale.setScalar(skala);
    if (drehen) g.rotation.z = t * drehen + phase;
    if (wippen) g.rotation.z = Math.sin(t * 1.1 + phase) * wippen;
    g.rotation.y = rotY + (drehenY ? t * drehenY + phase : 0);
  });
  return <group ref={ref}>{children}</group>;
}

/** Setzt UV-Koordinaten in Welt-Einheiten, damit Strick, Filz und Pappe überall gleich gross wirken */
function weltUVs(g: THREE.BufferGeometry) {
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    if (ny > 0.5) uv.setXY(i, pos.getX(i), pos.getZ(i));
    else if (nx > 0.5) uv.setXY(i, pos.getZ(i), pos.getY(i));
    else uv.setXY(i, pos.getX(i), pos.getY(i));
  }
  return g;
}

/**
 * Gestrickte Rückwand einer Welt.
 * Über der obersten Welt ist nichts mehr: Ihre Wand ragt darum weit nach oben, damit man auch auf
 * breiten Bildschirmen und beim Kippen der Kamera nie über den Rand schaut.
 */
function Rueckwand({ farbe, index }: { farbe: string; index: number }) {
  const zusatz = index === 0 ? 24 : 0;
  const geometrie = useMemo(() => weltUVs(new THREE.PlaneGeometry(150, ZONE + 0.6 + zusatz)), [zusatz]);
  useEffect(() => () => geometrie.dispose(), [geometrie]);
  // Benachbarte Wände liegen minimal versetzt, damit sie sich am Rand nicht flackernd überdecken
  return (
    <mesh geometry={geometrie} material={strickWand(farbe, 6)} position={[0, zusatz / 2, -14 - (index % 2) * 0.05]} receiveShadow />
  );
}

type BodenArt = "wiese" | "erde" | "sand" | "lava" | "mond";

/**
 * Boden: eine dicke Platte, darauf eine gestrickte Decke mit sanften Buckeln. Die Kamera schaut von oben darauf.
 * Beim Scrollen fährt man an der Vorderkante vorbei nach unten wie an einer Kuchenschicht.
 */
function Boden({ art }: { art: BodenArt }) {
  const platte = useMemo(() => weltUVs(new THREE.BoxGeometry(150, 1.6, 22)), []);
  const decke = useMemo(() => {
    const g = new THREE.PlaneGeometry(110, 22, 220, 44);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i) + BODEN_MITTE_Z;
      pos.setY(i, bodenWelle(x, z));
      uv.setXY(i, x, -z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(
    () => () => {
      platte.dispose();
      decke.dispose();
    },
    [platte, decke],
  );
  const { oben, platteMaterial } = useMemo(() => {
    const oben = {
      wiese: strick("#5E9A3C", 2.2, 2.4),
      erde: tweed("#7a4a2a", 2),
      sand: strick("#E8D3A3", 2.4),
      lava: strick("#6a2a1c", 2.4),
      mond: filz("#cfc7b6", 2),
    }[art];
    const kante = {
      wiese: pappe("#9b6b3d"),
      erde: pappe("#7a5230"),
      sand: pappe("#c9a76b"),
      lava: pappe("#7a2f22"),
      mond: pappe("#9e968a"),
    }[art];
    // Reihenfolge bei BoxGeometry: +x, -x, +y (oben), -y (unten), +z (vorne), -z (hinten)
    return { oben, platteMaterial: [kante, kante, oben, filz("#3a2a1e"), kante, kante] };
  }, [art]);
  return (
    <group>
      <mesh geometry={platte} material={platteMaterial} position={[0, BODEN_Y - 0.8, BODEN_MITTE_Z]} receiveShadow castShadow />
      <mesh geometry={decke} material={oben} position={[0, BODEN_Y, BODEN_MITTE_Z]} receiveShadow />
    </group>
  );
}

/** Eine Welt der Säule. Weit entfernte Welten werden gar nicht erst gezeichnet. */
function Zone({ index, boden, children }: { index: number; boden?: BodenArt; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const { saeule } = useWelt();
  useFrame(() => {
    if (!ref.current || !saeule.current) return;
    ref.current.visible = Math.abs(-index * ZONE + saeule.current.position.y) < ZONE * 1.4;
  });
  return (
    <group ref={ref} position={[0, -index * ZONE, 0]}>
      <Rueckwand farbe={WELT_FARBEN[index]} index={index} />
      {boden && <Boden art={boden} />}
      {children}
    </group>
  );
}

const GARN = { pink: "#EE4F86", orange: "#F48A35", gelb: "#FFC93C", gruen: "#5BB54A", blau: "#3A86D8", lila: "#8C5BE0" };

/**
 * LUKA als Mobile: Jeder Strickbuchstabe hängt an einem Wollfaden und pendelt.
 * Physik pro Buchstabe: Winkel und Drehung sind Federn mit Dämpfung.
 * Die Maus schubst (dafür wird jeder Buchstabe auf den Bildschirm projiziert und mit der Maus verglichen),
 * ein Klick lässt alle schwingen, im Sound-Modus schwingen sie im Takt.
 */
function StrickMobile() {
  const { ruhig } = useWelt();
  const buchstaben = useMemo(
    () => [
      { form: BUCHSTABEN.L(), breite: BUCHSTABEN_BREITE.L, farbe: "#E3829B" },
      { form: BUCHSTABEN.U(), breite: BUCHSTABEN_BREITE.U, farbe: "#EE8B3D" },
      { form: BUCHSTABEN.K(), breite: BUCHSTABEN_BREITE.K, farbe: "#F2C64F" },
      { form: BUCHSTABEN.A(), breite: BUCHSTABEN_BREITE.A, farbe: "#79A8DA" },
    ],
    [],
  );
  const abstand = 0.75;
  const gesamt = buchstaben.reduce((s, b) => s + b.breite, 0) + abstand * (buchstaben.length - 1);
  const mitten = buchstaben.map((b, i) => {
    const links = buchstaben.slice(0, i).reduce((s, x) => s + x.breite + abstand, 0);
    return links + b.breite / 2 - gesamt / 2;
  });

  const aufhaengung = useRef<(THREE.Group | null)[]>([]);
  const faeden = useRef<(THREE.Mesh | null)[]>([]);
  const koerper = useRef<(THREE.Group | null)[]>([]);
  const feder = useRef(buchstaben.map((_, i) => ({ w: 0, vw: 0, d: (i % 2 ? 1 : -1) * 0.18, vd: 0 })));
  const merker = useRef({ klick: 0, beat: 0 });
  const hilfe = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.04);
    const still = ruhig.current;
    const seitenverhaeltnis = state.size.width / state.size.height;
    const schmal = seitenverhaeltnis < 1;
    const z = 1;
    const skala = Math.min(0.68, (halbeBreite(z, seitenverhaeltnis) * 2 * 0.56) / gesamt);
    const ankerY = 10;
    const mitteY = schmal ? 3 : 1.5;
    const fadenLaenge = ankerY - (mitteY + 1.5 * skala);

    const klick = weltStore.klick.zeit;
    const neuerKlick = klick !== merker.current.klick;
    merker.current.klick = klick;
    const puls = still ? 0 : beat.puls();
    const neuerBeat = puls > 0.92 && merker.current.beat <= 0.92;
    merker.current.beat = puls;
    const maus = weltStore.maus;

    buchstaben.forEach((_, i) => {
      const anker = aufhaengung.current[i];
      const faden = faeden.current[i];
      const k = koerper.current[i];
      if (!anker || !faden || !k) return;
      const f = feder.current[i];

      anker.position.set(mitten[i] * skala, ankerY, z);
      faden.scale.set(1, fadenLaenge, 1);
      faden.position.set(0, -fadenLaenge / 2, 0);
      k.position.set(0, -fadenLaenge - 1.5 * skala, 0);
      k.scale.setScalar(skala);

      if (!still) {
        if (neuerKlick) f.vw += (i % 2 ? 1 : -1) * (0.6 + i * 0.1);
        if (neuerBeat) f.vw += (i % 2 ? 1 : -1) * 0.25;
        // Buchstaben auf den Bildschirm projizieren und mit der Maus vergleichen
        k.getWorldPosition(hilfe).project(state.camera);
        const nah = Math.max(0, 1 - Math.hypot(hilfe.x - maus.x, hilfe.y - maus.y) / 0.22);
        if (maus.aktiv && nah > 0) {
          f.vw += Math.sign(hilfe.x - maus.x || 1) * nah * 2.4 * dt * 10;
          f.vd += Math.sign(hilfe.x - maus.x || 1) * nah * 3 * dt * 10;
        }
      }
      // Pendel und Drehung: Federn mit Dämpfung, ruhen bei leichter Schrägstellung
      f.vw += (-f.w * 9 - f.vw * 1.6) * dt;
      f.w += f.vw * dt;
      const ruhe = (i % 2 ? 1 : -1) * 0.18;
      f.vd += (-(f.d - ruhe) * 6 - f.vd * 1.4) * dt;
      f.d += f.vd * dt;
      anker.rotation.set(0, 0, f.w * 0.5);
      k.rotation.set(0, f.d, 0);
    });
  });

  const fadenMaterial = useMemo(() => garn("#FBF5EA", 6, 0.07), []);

  return (
    <group>
      {buchstaben.map((b, i) => (
        <group
          key={i}
          ref={(g) => {
            aufhaengung.current[i] = g;
          }}
        >
          <mesh
            ref={(m) => {
              faeden.current[i] = m;
            }}
            material={fadenMaterial}
            castShadow
          >
            <cylinderGeometry args={[0.07, 0.07, 1, 10]} />
          </mesh>
          <group
            ref={(g) => {
              koerper.current[i] = g;
            }}
          >
            <StrickBuchstabe form={b.form} farbe={b.farbe} position={[-b.breite / 2, -1.5, 0]} />
          </group>
        </group>
      ))}
    </group>
  );
}

/** Sonne: flache Filzscheibe mit gesticktem Ring, dahinter Filzstrahlen, die sich langsam drehen */
function Sonne() {
  const formen = useMemo(
    () => ({
      scheibe: ellipsenForm(1.55, 1.55),
      strahl: dreieckForm(0.62, 1),
      ring: stichPunkte(ellipsenForm(1.05, 1.05), 0, 0.19),
    }),
    [],
  );
  return (
    <group>
      <Platz x={0} y={0} z={0} wippen={0.04} minSkala={1}>
        <FilzTeil form={formen.scheibe} farbe="#F4C843" dicke={0.24} polster={0.22} nahtEinzug={0.2} nahtFarbe="#E07A2A" />
        <Naht stiche={formen.ring} z={0.12 + 0.22 + 0.004} farbe="#E07A2A" laenge={1.3} />
      </Platz>
      <Platz x={0} y={0} z={-0.32} drehen={0.08} minSkala={1}>
        {Array.from({ length: 12 }, (_, i) => {
          const w = (i / 12) * Math.PI * 2;
          return (
            <FilzTeil
              key={i}
              form={formen.strahl}
              farbe="#EE8A2E"
              polster={0.1}
              dicke={0.2}
              nahtEinzug={0.1}
              position={[Math.cos(w) * 1.75, Math.sin(w) * 1.75, 0]}
              rotation={[0, 0, w - Math.PI / 2]}
            />
          );
        })}
      </Platz>
    </group>
  );
}

/** Türkiser Filzflicken auf dem rechten Tweed-Hügel */
const TEAL_FLICKEN = ellipsenForm(2, 0.7);

/* Hügel-Kanten: Funktionen für die Oberkante (x relativ zur Mitte des Hügels) */
const HUEGEL_HINTEN = (x: number) => BODEN_Y + 3 + Math.sin(x * 0.16 + 0.6) * 0.9 + Math.sin(x * 0.5) * 0.25;
const TWEED_LINKS = (x: number) => BODEN_Y - 0.3 + 3.7 * Math.pow(Math.max(0, Math.cos((Math.PI * x) / 15)), 0.75);
const TWEED_RECHTS = (x: number) => BODEN_Y - 0.3 + 3.9 * Math.pow(Math.max(0, Math.cos((Math.PI * x) / 16)), 0.7);
const FILZ_STREIFEN = (x: number) => BODEN_Y + 1.35 + Math.sin(x * 0.3) * 0.25 + Math.sin(x * 0.9 + 1) * 0.1;

const WEG: [number, number][] = [
  [1.2, 6.8],
  [2.6, 4.6],
  [2, 2.6],
  [0.2, 1.4],
  [-2.2, 0.2],
  [-3.8, -1.8],
  [-2.6, -3.6],
  [0.4, -4.6],
  [2.4, -6.2],
];
const WEG_GELB: [number, number][] = [
  [3.6, -3.2],
  [5.4, -2.4],
  [7.2, -3.6],
  [9, -2.8],
];
const WEG_GRUEN: [number, number][] = [
  [-9, -1],
  [-7, 0.4],
  [-5, -0.6],
  [-3.6, 0.2],
];
const ZICKZACK: Punkt[] = Array.from({ length: 9 }, (_, i) => [-1.6 + i * 0.4, i % 2 ? 0.28 : -0.28, 0]);

const WOLKE_GROSS: [number, number, number, number][] = [
  [-1.1, 0, 0, 0.75],
  [-0.2, 0.28, 0.1, 1],
  [0.8, 0.05, 0, 0.82],
  [1.55, -0.1, 0, 0.55],
  [0.2, -0.2, 0.5, 0.6],
];
const WOLKE_KLEIN: [number, number, number, number][] = [
  [-0.6, 0, 0, 0.55],
  [0.1, 0.22, 0.05, 0.72],
  [0.75, 0, 0, 0.5],
];

const GRUENS = ["#5E9A3C", "#9DB83A", "#3F7A2E", "#E0A83A", "#7BAA3A", "#C9C24A"];
const FRANSEN_VORNE: [number, number] = [5.2, 7.2];
const FRANSEN_LANG: [number, number] = [0.9, 1.9];

/** Grosse Pompoms ganz vorne in den Ecken: Sie sind so nah, dass sie stark verschwimmen */
const VORNE_POMPOMS: [number, number, number, string][] = [
  [-3.2, 6.2, 0.7, "#F2CF4A"],
  [-2.2, 6.7, 0.55, "#FBF5EA"],
  [-4.5, 6, 0.62, "#7BAA3A"],
  [3.5, 6.4, 0.55, "#C8382E"],
  [4.7, 6, 0.65, "#F2CF4A"],
  [2.5, 6.8, 0.45, "#9DB83A"],
];

function Wiese() {
  return (
    <>
      <Platz x={0.8} y={4.4} z={-12}>
        <Sonne />
      </Platz>
      <Platz x={-0.7} y={4.3} z={-12} schweben={[0.4, 0.08]}>
        <Watte kugeln={WOLKE_GROSS} scale={1.6} />
      </Platz>
      <Platz x={0.08} y={5.7} z={-13} schweben={[0.3, 0.06]} phase={2}>
        <Watte kugeln={WOLKE_KLEIN} scale={1.5} />
      </Platz>
      <Platz x={0.44} y={5.9} z={-12.5} schweben={[0.3, 0.06]} phase={4}>
        <Watte kugeln={WOLKE_KLEIN} scale={1.7} />
      </Platz>

      {/* Patchwork-Hügel: hinten grüner Filz, davor zwei Tweed-Hügel mit aufgenähter Kordel, vorne ein Filzstreifen mit Muschelkante */}
      <StoffHuegel oben={HUEGEL_HINTEN} z={-13.4} farbe="#7DAE4A" stoff="filz" stich="kordel" garnFarbe="#D9D27A" />
      <StoffHuegel oben={TWEED_LINKS} von={-7.5} bis={7.5} x={-5.5} z={-12} farbe="#958774" stich="kordel" garnFarbe="#D9577F" />
      <StoffHuegel oben={TWEED_RECHTS} von={-8} bis={8} x={6.5} z={-11.6} farbe="#A8916F" stich="kordel" garnFarbe="#E8B43A" />
      <group position={[8, BODEN_Y + 2.35, -11]}>
        <FilzTeil form={TEAL_FLICKEN} farbe="#2E9A97" dicke={0.06} polster={0.08} naht={false} />
        <Kordel punkte={ZICKZACK} dicke={0.07} farben={["#EBC23E", "#C9A030"]} position={[0, 0, 0.16]} />
      </group>
      <StoffHuegel oben={FILZ_STREIFEN} z={-10.2} farbe="#CDB089" stoff="filz" stich="muschel" polster={0.3} dicke={0.4} />

      {/* Dichtes Band aus Häkelbüschen, Farnen und hohen Blumen vor den Hügeln */}
      {(
        [
          [-0.95, -8.6, "#9DB83A", 1.1],
          [-0.78, -7.6, "#4F8F33", 0.9],
          [-0.55, -8.9, "#C9A23A", 0.8],
          [-0.38, -8.2, "#3F7A2E", 1],
          [-0.18, -9, "#A8BF45", 0.85],
          [0, -8.4, "#5E9A3C", 0.9],
          [0.16, -8.8, "#D3A93C", 0.75],
          [0.3, -7.9, "#3F7A2E", 1],
          [0.46, -8.7, "#9DB83A", 1.05],
          [0.62, -8, "#4F8F33", 0.95],
          [0.78, -8.9, "#C9A23A", 0.9],
          [0.92, -7.8, "#5E9A3C", 1.1],
          [-0.65, -6.8, "#9DB83A", 0.7],
          [0.5, -6.6, "#A8BF45", 0.7],
        ] as const
      ).map(([x, z, farbe, g], i) => (
        <Platz key={i} x={x} y={-0.1} z={z} aufBoden rotY={i * 0.8}>
          <Busch farbe={farbe} groesse={g * 1.35} start={i + 1} />
        </Platz>
      ))}
      {(
        [
          [-0.85, -7.2, 1.7, "#4F8F33"],
          [-0.25, -7.4, 1.5, "#5E9A3C"],
          [0.25, -7, 1.6, "#3F7A2E"],
          [0.7, -7.4, 1.5, "#7BAA3A"],
          [0.05, -6.3, 1.3, "#4F8F33"],
          [-0.94, 3.6, 1.8, "#5E9A3C"],
        ] as const
      ).map(([x, z, l, farbe], i) => (
        <Platz key={i} x={x} y={0} z={z} aufBoden wippen={0.03} phase={i * 1.3}>
          <Farn laenge={l} farbe={farbe} start={i + 1} />
        </Platz>
      ))}
      {(
        [
          [-0.12, -7.8, "#9C6FD6", 1.6],
          [0.05, -8.2, "#F08C3A", 1.4],
          [0.2, -7.6, "#5B9BE0", 1.7],
        ] as const
      ).map(([x, z, farbe, h], i) => (
        <Platz key={i} x={x} y={0} z={z} aufBoden wippen={0.05} phase={i * 1.7}>
          <HaekelBlume farbe={farbe} hoehe={h} groesse={0.9} />
        </Platz>
      ))}

      {/* Bäume: ein grosser Pompom-Baum, sonst gestrickte Kugelbäume */}
      <Platz x={-0.6} y={0} z={-6} aufBoden wippen={0.012}>
        <PompomBaum hoehe={3} groesse={1.35} farben={GRUENS} start={1} />
      </Platz>
      {(
        [
          [-0.93, -9, 2.4, 1, "#6FA83E"],
          [-0.98, 2.5, 2.4, 1.25, "#5E9A3C"],
          [-0.3, -4.2, 1.6, 0.7, "#7BB043"],
          [0.8, -7.5, 2.5, 0.95, "#4F8F33"],
          [0.96, -1.5, 2.8, 1.15, "#5E9A3C"],
        ] as const
      ).map(([x, z, h, g, krone], i) => (
        <Platz key={i} x={x} y={0} z={z} aufBoden wippen={0.012} phase={i + 1}>
          <StrickBaum hoehe={h} groesse={g} krone={krone} />
        </Platz>
      ))}

      {/* Wege aus gedrehter Kordel */}
      <KordelWeg punkte={WEG} dicke={0.22} />
      <KordelWeg punkte={WEG_GELB} dicke={0.12} farben={["#E8B43A", "#C9922A"]} />
      <KordelWeg punkte={WEG_GRUEN} dicke={0.12} farben={["#7BAA3A", "#5E8A2E"]} />

      {/* Fliegenpilze */}
      {(
        [
          [-0.28, 1, 1],
          [0.12, -5.6, 0.6],
          [0.6, -1.4, 0.75],
          [0.66, -1, 0.45],
          [0.62, 5, 0.7],
        ] as const
      ).map(([x, z, g], i) => (
        <Platz key={i} x={x} y={-0.05} z={z} aufBoden rotY={i * 0.7}>
          <Pilz groesse={g} />
        </Platz>
      ))}

      {/* Wollknäuel mit losem Faden */}
      <Platz x={-0.22} y={-0.05} z={1.6} aufBoden rotY={-0.3}>
        <KnaeuelMitFaden radius={0.5} farbe="#E07898" start={7} />
      </Platz>
      <Platz x={-0.1} y={-0.05} z={2.1} aufBoden rotY={0.5}>
        <KnaeuelMitFaden radius={0.42} farbe="#9C7FC9" start={8} richtung={-1} />
      </Platz>
      <Platz x={0.36} y={-0.05} z={-2.8} aufBoden rotY={0.4}>
        <KnaeuelMitFaden radius={0.42} farbe="#D8C3A0" start={9} nadeln />
      </Platz>
      <Platz x={0.3} y={-0.05} z={-8.4} aufBoden>
        <KnaeuelMitFaden radius={0.42} farbe="#2E9A97" start={10} richtung={-1} />
      </Platz>

      {/* Knöpfe und Steine */}
      {(
        [
          [0.05, -1.8, 0.22, "#C8382E"],
          [0.1, -1.4, 0.24, "#2E9A97"],
          [0.16, -1.9, 0.2, "#E07A2E"],
          [-0.42, 3.2, 0.26, "#E8B43A"],
        ] as const
      ).map(([x, z, r, farbe], i) => (
        <Platz key={i} x={x} y={0} z={z} aufBoden>
          <LiegenderKnopf radius={r} farbe={farbe} drehung={i * 0.9} />
        </Platz>
      ))}
      <Platz x={0.2} y={0.18} z={-2.6} aufBoden>
        <Stein groesse={0.45} farbe="#A8A296" />
      </Platz>
      <Platz x={0.44} y={0.15} z={-3.4} aufBoden>
        <Stein groesse={0.38} farbe="#B4AEA2" />
      </Platz>

      {/* Häkelblumen vorne */}
      {(
        [
          [-0.72, 3.4, "#E46A93", "#F4CF4A", 1],
          [-0.5, 4.2, "#F2CF4A", "#E8962E", 1],
          [0.18, 4.6, "#5B9BE0", "#F4CF4A", 1.25],
          [0.58, 3.2, "#9C6FD6", "#F4CF4A", 1.1],
          [0.82, 1.2, "#F08C3A", "#F4CF4A", 1],
        ] as const
      ).map(([x, z, farbe, mitte, g], i) => (
        <Platz key={i} x={x} y={0} z={z} aufBoden wippen={0.05} phase={i * 1.4}>
          <HaekelBlume farbe={farbe} mitte={mitte} hoehe={0.9 + (i % 3) * 0.15} groesse={g} />
        </Platz>
      ))}

      {/* Vordergrund: dicke Fransen-Büschel in den Ecken, dazwischen kurzes Gras, grosse Pompoms */}
      <Fransen farben={["#7BAA3A", "#9DB83A", "#5E9A3C"]} anzahl={240} mitteX={-7} breite={5} tiefe={FRANSEN_VORNE} hoehe={FRANSEN_LANG} dicke={1.8} start={1} />
      <Fransen farben={["#7BAA3A", "#9DB83A", "#5E9A3C"]} anzahl={240} mitteX={7.4} breite={5} tiefe={FRANSEN_VORNE} hoehe={FRANSEN_LANG} dicke={1.8} start={2} />
      {VORNE_POMPOMS.map(([x, z, r, farbe], i) => (
        <Pompom key={i} radius={r} farbe={farbe} start={60 + i} position={[x, BODEN_Y + bodenWelle(x, z) + r * 0.6, z]} />
      ))}

      <StrickMobile />
    </>
  );
}

/** Filzwurm: eine Kette aus Filzkugeln, die sich über den Boden schlängelt */
function Wurm() {
  const { ruhig } = useWelt();
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((state) => {
    const t = ruhig.current ? 0 : state.clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      m.position.y = Math.max(0, Math.sin(t * 2.2 - i * 0.8)) * 0.35;
      m.position.z = Math.sin(t * 1.1 - i * 0.6) * 0.25;
    });
  });
  return (
    <group>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            refs.current[i] = m;
          }}
          position={[i * 0.62, 0, 0]}
          material={filzKugel(i % 2 ? "#F27BA5" : GARN.pink)}
          castShadow
          receiveShadow
        >
          <sphereGeometry args={[i === 5 ? 0.5 : 0.42, 32, 24]} />
        </mesh>
      ))}
    </group>
  );
}

const ERDE_HINTEN = (x: number) => BODEN_Y + 5 + Math.sin(x * 0.3) * 0.8 + Math.sin(x * 1.1) * 0.25;
const ERDE_VORNE = (x: number) => BODEN_Y + 2.4 + Math.sin(x * 0.4 + 2) * 0.6 + Math.sin(x * 1.4) * 0.2;

/** Wurzel, die von der Decke (dem Wiesenboden darüber) herunterhängt */
function wurzel(seed: number, laenge: number): Punkt[] {
  return Array.from({ length: 6 }, (_, i) => [Math.sin(i * 1.7 + seed) * 0.35, 8.5 - (i / 5) * laenge, Math.cos(i * 1.3 + seed) * 0.3]);
}

const WURZELN = [
  { x: -0.55, z: -6, d: 0.16, punkte: wurzel(0, 7) },
  { x: 0.3, z: -3, d: 0.12, punkte: wurzel(3, 5.5) },
  { x: 0.8, z: -8, d: 0.15, punkte: wurzel(6, 8.5) },
  { x: -0.85, z: -1.5, d: 0.11, punkte: wurzel(9, 4.5) },
  { x: 0.05, z: -9, d: 0.13, punkte: wurzel(12, 6) },
];

function Erde() {
  const vorne = useMemo(() => wellenForm(150, BODEN_Y, ERDE_VORNE), []);
  return (
    <>
      <StoffHuegel oben={ERDE_HINTEN} farbe="#a8794a" z={-12.5} garnFarbe="#F2DDB5" />
      <PappeTeil form={vorne} farbe="#8f6338" position={[0, 0, -10]} dicke={0.5} />
      {WURZELN.map(({ x, z, d, punkte }, i) => (
        <Platz key={i} x={x} y={0} z={z} wippen={0.02} phase={i}>
          <Kordel punkte={punkte} dicke={d} farben={i % 2 ? ["#DCC28F", "#B8925E"] : ["#E9D3A8", "#C9A06A"]} />
        </Platz>
      ))}
      <Platz x={0.55} y={0.35} z={-4} rotY={-0.3} aufBoden>
        <group rotation={[-1.05, 0, 0.3]}>
          <Knopf3D radius={1.2} farbe={GARN.gelb} />
        </group>
      </Platz>
      <Platz x={-0.68} y={0.25} z={-1} rotY={0.4} aufBoden>
        <group rotation={[-0.9, 0, -0.2]}>
          <Knopf3D radius={0.8} farbe={GARN.blau} />
        </group>
      </Platz>
      <Platz x={0.12} y={0.3} z={-8.5} aufBoden>
        <group rotation={[-1.2, 0, 0]}>
          <Knopf3D radius={0.9} farbe={GARN.pink} />
        </group>
      </Platz>
      <Platz x={-0.25} y={0.42} z={-3.5} rotY={0.25} aufBoden>
        <Wurm />
      </Platz>
      <Platz x={0.4} y={-0.05} z={1.5} aufBoden rotY={0.5}>
        <KnaeuelMitFaden radius={0.5} farbe={GARN.orange} start={21} />
      </Platz>
      {[
        [-0.5, 3.5, 0.28, GARN.gelb],
        [0.7, -1.5, 0.32, "#FFF8EE"],
        [0.05, 4.6, 0.25, GARN.lila],
      ].map(([x, z, r, farbe], i) => (
        <Platz key={i} x={x as number} y={0} z={z as number} aufBoden>
          <LiegenderKnopf radius={r as number} farbe={farbe as string} drehung={i * 1.3} />
        </Platz>
      ))}
      <Fransen farben={["#8a5a34", "#a8794a", "#6b4426"]} anzahl={340} hoehe={[0.5, 1.1]} start={2} />
      {[
        [0.85, 2, 0.6],
        [-0.4, -6, 0.45],
        [0.35, 3.5, 0.35],
      ].map(([x, z, g], i) => (
        <Platz key={i} x={x} y={g * 0.4} z={z} aufBoden>
          <Stein groesse={g} farbe="#8d857a" />
        </Platz>
      ))}
    </>
  );
}

/** Filzfisch, der im Kreis durch den Raum schwimmt und sich in Schwimmrichtung dreht */
function Fisch({ farbe, tempo = 0.35, weite = 2.4, tiefe = 2, phase = 0 }: { farbe: string; tempo?: number; weite?: number; tiefe?: number; phase?: number }) {
  const { ruhig } = useWelt();
  const ref = useRef<THREE.Group>(null);
  const formen = useMemo(
    () => ({ koerper: ellipsenForm(1.1, 0.68), schwanz: schwanzForm(0.95), flosse: dreieckForm(0.8, 0.5) }),
    [],
  );
  useFrame((state) => {
    if (!ref.current) return;
    const t = ruhig.current ? phase : state.clock.elapsedTime * tempo + phase;
    ref.current.position.set(Math.sin(t) * weite, Math.sin(t * 2.3) * 0.2, Math.cos(t) * tiefe);
    // Blickrichtung = Bewegungsrichtung: Der Kopf zeigt nach +x, also um die Y-Achse in die Richtung drehen
    const vx = Math.cos(t) * weite;
    const vz = -Math.sin(t) * tiefe;
    ref.current.rotation.y = -Math.atan2(vz, vx);
  });
  return (
    <group ref={ref}>
      <FilzTeil form={formen.schwanz} farbe={farbe} position={[-1.0, 0, 0]} dicke={0.2} polster={0.16} nahtEinzug={0.14} />
      <FilzTeil form={formen.flosse} farbe={farbe} position={[0, 0.5, 0]} naht={false} dicke={0.15} polster={0.1} />
      <FilzTeil form={formen.koerper} farbe={farbe} dicke={0.55} polster={0.32} />
      {[0.5, -0.5].map((seite) => (
        <group key={seite} position={[0.62, 0.15, seite * 0.62]} rotation={[0, seite > 0 ? 0 : Math.PI, 0]}>
          <Knopf3D radius={0.2} farbe="#FFF8EE" />
          <mesh position={[0.02, 0.01, 0.07]} material={filzKugel("#2e1f15")}>
            <sphereGeometry args={[0.075, 16, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Luftblase, die nach oben steigt und unten wieder anfängt */
function Blase({ x, z, groesse, tempo, start }: { x: number; z: number; groesse: number; tempo: number; start: number }) {
  const { ruhig } = useWelt();
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = ruhig.current ? 0 : state.clock.elapsedTime;
    const seitenverhaeltnis = state.size.width / state.size.height;
    ref.current.position.set(
      x * halbeBreite(z, seitenverhaeltnis) + Math.sin(t * 1.5 + start) * 0.15,
      BODEN_Y + ((start + t * tempo) % (ZONE - 2)),
      z,
    );
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[groesse, 24, 16]} />
      <meshStandardMaterial color="#ffffff" transparent opacity={0.45} roughness={0.12} />
    </mesh>
  );
}

function Wasser() {
  const alge = (seed: number, h: number): [number, number, number][] =>
    Array.from({ length: 7 }, (_, i) => [Math.sin(i * 0.9 + seed) * 0.28, (i / 6) * h, Math.cos(i * 0.7 + seed) * 0.15]);
  return (
    <>
      <Platz x={-0.2} y={2.5} z={-8}>
        <Fisch farbe={GARN.orange} tempo={0.25} weite={4} tiefe={3} />
      </Platz>
      <Platz x={0.25} y={0} z={-4}>
        <Fisch farbe={GARN.gelb} tempo={0.33} weite={3} tiefe={2.5} phase={2} />
      </Platz>
      <Platz x={-0.1} y={-2.2} z={-1}>
        <Fisch farbe={GARN.pink} tempo={0.28} weite={3.5} tiefe={2} phase={4} />
      </Platz>
      {[
        [-0.85, -9, 5.5],
        [-0.6, -5, 4],
        [0.7, -7, 5],
        [0.9, -2, 3.5],
        [-0.9, 1.5, 3],
        [0.85, 3.5, 2.6],
        [0.2, -11, 6],
      ].map(([x, z, h], i) => (
        <Platz key={i} x={x} y={0} z={z} wippen={0.07} phase={i} aufBoden>
          <Garnfaden punkte={alge(i, h)} dicke={0.12} farbe={[GARN.gruen, "#7cc25e", "#3f9a3a"][i % 3]} />
        </Platz>
      ))}
      {[
        [-0.35, -6, GARN.pink],
        [0.45, -3, GARN.orange],
        [-0.75, 3, GARN.lila],
      ].map(([x, z, farbe], i) => (
        <Platz key={i} x={x as number} y={0} z={z as number} aufBoden>
          <Koralle farbe={farbe as string} />
        </Platz>
      ))}
      {/* Seeanemonen aus Pompoms */}
      {[
        [-0.2, -1.5, 0.85, GARN.pink],
        [0.62, 1, 0.65, GARN.orange],
        [-0.82, -4, 0.75, GARN.lila],
        [0.3, 3.6, 0.55, GARN.gelb],
      ].map(([x, z, r, farbe], i) => (
        <Platz key={i} x={x as number} y={(r as number) * 0.55} z={z as number} aufBoden wippen={0.05} phase={i}>
          <Pompom radius={r as number} farbe={farbe as string} start={30 + i} />
        </Platz>
      ))}
      <Fransen farben={["#3f9a3a", "#5BB54A", "#2E8C7A"]} anzahl={400} hoehe={[0.9, 1.9]} start={3} />
      {[0.6, -0.2, 0.35].map((x, i) => (
        <Platz key={i} x={x} y={0.25} z={[-5, 2, -9][i]} aufBoden>
          <Stein groesse={0.4 + i * 0.12} farbe="#b8ad98" />
        </Platz>
      ))}
      {[-0.7, -0.35, 0.05, 0.4, 0.75, -0.1, 0.55, -0.55].map((x, i) => (
        <Blase key={i} x={x} z={-1 - (i % 4) * 2.4} groesse={0.15 + (i % 3) * 0.07} tempo={0.8 + (i % 3) * 0.3} start={i * 1.8} />
      ))}
    </>
  );
}

function Flamme({ groesse = 1 }: { groesse?: number }) {
  const formen = useMemo(
    () => [flammenForm(1.6 * groesse, 2.6 * groesse), flammenForm(1.1 * groesse, 1.9 * groesse), flammenForm(0.6 * groesse, 1.2 * groesse)],
    [groesse],
  );
  return (
    <group>
      <FilzTeil form={formen[0]} farbe="#E5483F" naht={false} dicke={0.3} polster={0.18} />
      <FilzTeil form={formen[1]} farbe={GARN.orange} naht={false} dicke={0.3} polster={0.16} position={[0, 0, 0.3]} />
      <FilzTeil form={formen[2]} farbe={GARN.gelb} naht={false} dicke={0.3} polster={0.14} position={[0, 0, 0.6]} />
    </group>
  );
}

function Lava() {
  const raeder = useMemo(
    () => [zahnradForm(2.2, 1.75, 12, 0.55), zahnradForm(1.5, 1.18, 9, 0.42), zahnradForm(1.05, 0.82, 8, 0.32)],
    [],
  );
  return (
    <>
      <Platz x={-0.55} y={2.5} z={-9} drehen={0.18} rotY={0.35}>
        <PappeTeil form={raeder[0]} farbe="#C99A66" dicke={0.7} />
      </Platz>
      <Platz x={0.5} y={0.8} z={-5.5} drehen={-0.26} rotY={-0.4} phase={0.3}>
        <PappeTeil form={raeder[1]} farbe="#B5844F" dicke={0.6} />
      </Platz>
      <Platz x={-0.15} y={-1.5} z={-2} drehen={0.4} rotY={0.5}>
        <PappeTeil form={raeder[2]} farbe="#D8AE7C" dicke={0.5} />
      </Platz>
      {[
        [-0.8, -8, 1.1],
        [0.65, -6, 0.95],
        [0.1, -3.5, 0.8],
        [-0.55, 0.5, 0.7],
        [0.85, 2.5, 0.75],
        [-0.92, 4, 0.6],
      ].map(([x, z, g], i) => (
        <Platz key={i} x={x} y={0} z={z} wippen={0.05} phase={i * 1.7} aufBoden>
          <Flamme groesse={g} />
        </Platz>
      ))}
      {/* Glut: kleine Pompoms in Feuerfarben */}
      {[
        [0.35, 1.5, 0.55, GARN.orange],
        [-0.7, -3, 0.65, "#E5483F"],
        [0.75, -1, 0.48, GARN.gelb],
      ].map(([x, z, r, farbe], i) => (
        <Platz key={i} x={x as number} y={(r as number) * 0.6} z={z as number} aufBoden>
          <Pompom radius={r as number} farbe={farbe as string} start={40 + i} />
        </Platz>
      ))}
      <Fransen farben={["#E5483F", GARN.orange, GARN.gelb]} anzahl={360} hoehe={[0.5, 1.2]} start={4} />
      {[
        [0.4, -10, 0.7],
        [-0.3, 3, 0.45],
      ].map(([x, z, g], i) => (
        <Platz key={i} x={x} y={g * 0.4} z={z} aufBoden>
          <Stein groesse={g} farbe="#4a2a22" />
        </Platz>
      ))}
    </>
  );
}

function Planet({ radius, farbe, ring, start }: { radius: number; farbe: string; ring: string; start: number }) {
  return (
    <group>
      <Platz x={0} y={0} z={0} drehenY={0.2} minSkala={1}>
        <Garnknaeuel radius={radius} farbe={farbe} start={start} />
      </Platz>
      <group rotation={[-0.37, 0.25, 0.35]}>
        <KordelRing radius={radius * 1.6} dicke={radius * 0.12} farben={[ring, toenen(ring, 0.8)]} />
      </group>
    </group>
  );
}

/** Gepolsterte Filzsterne, die sich langsam um die eigene Achse drehen */
function Sterne({ positionen }: { positionen: [number, number, number][] }) {
  const stern = useMemo(() => sternForm(0.75, 0.34), []);
  return (
    <>
      {positionen.map(([x, y, z], i) => (
        <Platz key={i} x={x} y={y} z={z} schweben={[0.1, 0.2]} drehenY={0.6 + (i % 3) * 0.2} phase={i * 1.3}>
          <FilzTeil form={stern} farbe={GARN.gelb} dicke={0.4} polster={0.22} nahtEinzug={0.14} scale={0.8 + (i % 3) * 0.25} />
        </Platz>
      ))}
    </>
  );
}

function Weltall() {
  return (
    <>
      <Platz x={0.55} y={2.6} z={-9} schweben={[0.15, 0.2]}>
        <Planet radius={1.8} farbe={GARN.pink} ring={GARN.gelb} start={5} />
      </Platz>
      <Platz x={-0.55} y={-1.8} z={-4} schweben={[0.12, 0.18]} phase={2}>
        <Planet radius={1.1} farbe={GARN.blau} ring={GARN.pink} start={8} />
      </Platz>
      <Platz x={0.2} y={-4} z={-11} schweben={[0.1, 0.15]} phase={4}>
        <Planet radius={0.8} farbe={GARN.lila} ring={GARN.orange} start={11} />
      </Platz>
      <Sterne
        positionen={[
          [-0.8, 5, -12],
          [-0.2, 5.6, -7],
          [0.15, -0.6, -10],
          [0.85, -4, -5],
          [-0.35, -5, -2],
          [0.05, 3.4, -3],
          [-0.9, 0.6, -8],
          [0.9, 1.5, 1],
          [-0.7, -3, 2.5],
        ]}
      />
    </>
  );
}

function Mond() {
  return (
    <>
      <Platz x={0.55} y={2.5} z={-9} drehenY={0.05}>
        <FilzKugel radius={3} farbe="#E9E2D2" />
        {[
          [-1, 0.9, 0.6],
          [0.9, -0.7, 0.8],
          [0.5, 1.4, 0.42],
          [-0.8, -1.3, 0.4],
        ].map(([x, y, r], i) => {
          const z = Math.sqrt(Math.max(0, 9 - x * x - y * y));
          const normale = new THREE.Vector3(x, y, z).normalize();
          const drehung = new THREE.Euler().setFromQuaternion(
            new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normale),
          );
          return (
            <mesh key={i} position={[x, y, z - 0.05]} rotation={drehung} scale={[1, 1, 0.3]} material={filzKugel("#C9C0AE", 2)} castShadow>
              <sphereGeometry args={[r, 24, 16]} />
            </mesh>
          );
        })}
      </Platz>
      {[
        [-0.6, -6, 0.9],
        [0.3, -2, 0.6],
        [-0.25, 2.5, 0.5],
      ].map(([x, z, r], i) => (
        <Platz key={i} x={x} y={0.05} z={z} aufBoden>
          <mesh scale={[1, 0.18, 1]} material={filzKugel("#b3ab9b", 2)} receiveShadow castShadow>
            <sphereGeometry args={[r, 24, 16]} />
          </mesh>
        </Platz>
      ))}
      <Sterne
        positionen={[
          [-0.75, 4.6, -11],
          [-0.2, 3.2, -6],
          [0.85, -1.5, -4],
          [-0.85, -0.5, -7],
        ]}
      />
    </>
  );
}

/**
 * Wie weit wir durch die Welten gereist sind, als Kommazahl: 2.5 heisst «zwischen Wasser und Lava».
 * Jeder Abschnitt der Seite gehört zu einer Welt. Solange man einen Abschnitt liest, bleibt man in seiner Welt
 * (mit leichtem Drift, damit die Parallax lebendig bleibt). Erst im letzten Drittel geht die Fahrt nach unten.
 */
function reiseAusScroll() {
  const bezug = window.scrollY + window.innerHeight * 0.3;
  const oben = ABSCHNITTE.map((id) => {
    const el = document.getElementById(id);
    return el ? el.getBoundingClientRect().top + window.scrollY : 0;
  });
  oben.push(document.documentElement.scrollHeight);
  for (let i = 0; i < ABSCHNITTE.length; i++) {
    if (bezug < oben[i + 1]) {
      const p = Math.min(1, Math.max(0, (bezug - oben[i]) / Math.max(1, oben[i + 1] - oben[i])));
      const fahrt = THREE.MathUtils.smoothstep(p, 0.62, 1);
      return i + p * 0.15 + fahrt * 0.85;
    }
  }
  return ABSCHNITTE.length - 0.01;
}

export function Welt({ ruhig }: { ruhig: React.RefObject<boolean> }) {
  const saeule = useRef<THREE.Group>(null);
  const nebel = useRef<THREE.Fog>(null);
  const hintergrund = useRef<THREE.Color>(null);
  const kontext = useMemo(() => ({ ruhig, saeule }), [ruhig]);
  const zustand = useRef({ reise: 0, gieren: 0, nicken: NEIGUNG });
  const farben = useMemo(() => WELT_FARBEN.map((f) => new THREE.Color(f)), []);

  useFrame((state, delta) => {
    if (!saeule.current) return;
    const s = zustand.current;
    const dt = Math.min(delta, 0.05);
    const still = ruhig.current;

    // Reise: die ganze Säule nach oben schieben, weich nachgezogen
    s.reise += (reiseAusScroll() - s.reise) * (still ? 1 : Math.min(1, dt * 5));
    saeule.current.position.y = s.reise * ZONE;

    // Kamera kreist um den Blickpunkt: Maus links/rechts dreht seitlich, hoch/runter neigt.
    // Zwischen zwei Welten schwenkt sie zusätzlich zur Seite, so sieht man beim Scrollen um die Dinge herum.
    const maus = weltStore.maus;
    const mausAn = maus.aktiv && !still;
    const zielGieren = (mausAn ? maus.x * 0.22 : 0) + (still ? 0 : Math.sin(s.reise * Math.PI) * 0.2);
    const zielNicken = NEIGUNG + (mausAn ? -maus.y * 0.08 : 0);
    s.gieren += (zielGieren - s.gieren) * Math.min(1, dt * 2.2);
    s.nicken += (zielNicken - s.nicken) * Math.min(1, dt * 2.2);
    state.camera.position.set(
      Math.sin(s.gieren) * Math.cos(s.nicken) * ABSTAND,
      ZIEL_Y + Math.sin(s.nicken) * ABSTAND,
      Math.cos(s.gieren) * Math.cos(s.nicken) * ABSTAND,
    );
    state.camera.lookAt(0, ZIEL_Y, 0);

    // Nebel in der Farbe der aktuellen Welt: Ferne Dinge verblassen, das verstärkt die Tiefe.
    // Der Hintergrund bekommt dieselbe Farbe: Falls irgendwo eine Lücke ist, sieht man Weltfarbe statt Schwarz.
    if (nebel.current) {
      const i = Math.min(Math.floor(s.reise), farben.length - 2);
      nebel.current.color.copy(farben[i]).lerp(farben[i + 1], Math.min(1, Math.max(0, s.reise - i)));
      hintergrund.current?.copy(nebel.current.color);
    }
  });

  return (
    <WeltKontext.Provider value={kontext}>
      <fog ref={nebel} attach="fog" args={[WELT_FARBEN[0], 24, 54]} />
      <color ref={hintergrund} attach="background" args={[WELT_FARBEN[0]]} />
      {/* Licht: weiches Himmelslicht plus eine Sonne oben links vorne, die Schatten wirft */}
      {/* Die Studio-Umgebung liefert schon weiches Licht, darum hier nur wenig Füllung */}
      <hemisphereLight args={["#f4f8ff", "#8a7a5c", 1.1]} />
      <directionalLight
        position={[-11, 20, 14]}
        intensity={2}
        color="#fff1dc"
        castShadow
        shadow-mapSize={[1536, 1536]}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-radius={5}
      />
      <group ref={saeule}>
        <Zone index={0} boden="wiese">
          <Wiese />
        </Zone>
        <Zone index={1} boden="erde">
          <Erde />
        </Zone>
        <Zone index={2} boden="sand">
          <Wasser />
        </Zone>
        <Zone index={3} boden="lava">
          <Lava />
        </Zone>
        <Zone index={4}>
          <Weltall />
        </Zone>
        <Zone index={5} boden="mond">
          <Mond />
        </Zone>
      </group>
    </WeltKontext.Provider>
  );
}
