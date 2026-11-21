"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { pappe } from "@/components/welt/materialien";
import { PappeTeil, type Lage } from "@/components/welt/teile";

/**
 * Häuser aus Wellpappe, gebaut wie ein echtes Bastelmodell:
 * - Jede Wand und jede Dachhälfte ist eine eigene, ausgeschnittene Pappe (PappeTeil).
 *   An allen Schnittkanten sieht man die Wellen der Pappe.
 * - Fenster und Türen sind wirklich ausgeschnitten. Dahinter leuchtet es warm, wie in einem Papierhaus mit Licht.
 * - Das Dach sind zwei Pappen, die über die Wände hinausragen, am First mit einem Papierstreifen verklebt.
 */

/** Dicke der Wellpappe */
const D = 0.24;

export const KRAFT = "#C9A06C";
export const KRAFT_DUNKEL = "#A87A4C";
export const KARTON_WEISS = "#EDE2CF";

type Loch = { x: number; y: number; b: number; h: number };

function lochPfad({ x, y, b, h }: Loch) {
  const p = new THREE.Path();
  p.moveTo(x - b / 2, y);
  p.lineTo(x + b / 2, y);
  p.lineTo(x + b / 2, y + h);
  p.lineTo(x - b / 2, y + h);
  p.closePath();
  return p;
}

/** Rechteck, in x mittig, y von 0 bis h (oder in beiden Richtungen mittig) */
function rechteck(b: number, h: number, mittig = false, loecher: Loch[] = []) {
  const f = new THREE.Shape();
  const y0 = mittig ? -h / 2 : 0;
  f.moveTo(-b / 2, y0);
  f.lineTo(b / 2, y0);
  f.lineTo(b / 2, y0 + h);
  f.lineTo(-b / 2, y0 + h);
  f.closePath();
  loecher.forEach((l) => f.holes.push(lochPfad(l)));
  return f;
}

/** Giebelwand: Rechteck mit Dreieck obendrauf */
function giebel(b: number, h: number, g: number, loecher: Loch[] = []) {
  const f = new THREE.Shape();
  f.moveTo(-b / 2, 0);
  f.lineTo(b / 2, 0);
  f.lineTo(b / 2, h);
  f.lineTo(0, h + g);
  f.lineTo(-b / 2, h);
  f.closePath();
  loecher.forEach((l) => f.holes.push(lochPfad(l)));
  return f;
}

let licht: THREE.MeshStandardMaterial | null = null;
/** Warmes Licht im Inneren: Man sieht es durch die ausgeschnittenen Fenster */
function innenlicht() {
  licht ??= new THREE.MeshStandardMaterial({ color: "#5a3d22", emissive: "#F5B85C", emissiveIntensity: 1.7, roughness: 1 });
  return licht;
}

let wuerfel: THREE.BoxGeometry | null = null;
function box() {
  wuerfel ??= new THREE.BoxGeometry(1, 1, 1);
  return wuerfel;
}

/** Fensterkreuz aus zwei schmalen Papierstreifen */
function Kreuz({ loch, z }: { loch: Loch; z: number }) {
  const mitteY = loch.y + loch.h / 2;
  return (
    <>
      <mesh geometry={box()} material={pappe(KARTON_WEISS)} position={[loch.x, mitteY, z]} scale={[0.05, loch.h, 0.04]} />
      <mesh geometry={box()} material={pappe(KARTON_WEISS)} position={[loch.x, mitteY, z]} scale={[loch.b, 0.05, 0.04]} />
    </>
  );
}

type HausProps = Lage & {
  breite?: number;
  hoehe?: number;
  tiefe?: number;
  wand?: string;
  dach?: string;
  /** Chalet: flaches, weit überstehendes Dach und ein Balkon */
  chalet?: boolean;
  /** Grosse Öffnung vorne statt Tür und Fenstern (Seilbahn-Station) */
  tor?: boolean;
  kamin?: boolean;
};

/** Haus aus Wellpappe. Der Ursprung liegt unten in der Mitte, die Giebelseite mit der Tür schaut nach +z. */
export function PappHaus({
  breite = 2.2,
  hoehe = 1.6,
  tiefe = 2,
  wand = KRAFT,
  dach = "#A9573A",
  chalet = false,
  tor = false,
  kamin = true,
  ...lage
}: HausProps) {
  const g = breite * (chalet ? 0.32 : 0.5);
  const neigung = Math.atan2(g, breite / 2);
  const dachBreite = Math.hypot(breite / 2, g) + (chalet ? 0.6 : 0.32);
  const dachLaenge = tiefe + (chalet ? 1 : 0.56);

  const teile = useMemo(() => {
    const loecher: Loch[] = [];
    const kreuze: Loch[] = [];
    if (tor) {
      loecher.push({ x: 0, y: 0.12, b: breite * 0.58, h: hoehe * 0.8 });
    } else if (chalet) {
      const n = breite > 2.3 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const fensterLoch = { x: (i - (n - 1) / 2) * (breite / (n + 0.4)), y: hoehe * 0.5, b: 0.42, h: 0.44 };
        loecher.push(fensterLoch);
        kreuze.push(fensterLoch);
      }
      loecher.push({ x: 0, y: hoehe + g * 0.22, b: 0.36, h: 0.34 });
    } else {
      // Tür unten, darüber Fenster in Reihen
      loecher.push({ x: breite > 2 ? -breite * 0.22 : 0, y: 0.1, b: 0.5, h: 0.92 });
      const reihen = Math.max(1, Math.floor((hoehe - 0.2) / 1.1));
      for (let r = 0; r < reihen; r++) {
        const y = reihen === 1 ? hoehe * 0.5 : 1.25 + r * 1.05;
        const plaetze = breite > 2 ? (r === 0 && reihen === 1 ? [breite * 0.22] : [-breite * 0.22, breite * 0.22]) : r === 0 && reihen === 1 ? [] : [0];
        for (const x of plaetze) {
          if (y + 0.5 > hoehe + 0.05) continue;
          const fensterLoch = { x, y, b: 0.44, h: 0.5 };
          loecher.push(fensterLoch);
          kreuze.push(fensterLoch);
        }
      }
      const rund = { x: 0, y: hoehe + g * 0.2, b: 0.34, h: 0.34 };
      loecher.push(rund);
      kreuze.push(rund);
    }
    return {
      vorne: giebel(breite, hoehe, g, loecher),
      hinten: giebel(breite, hoehe, g),
      seite: rechteck(tiefe - D * 2, hoehe),
      dach: rechteck(dachBreite, dachLaenge, true),
      balkon: rechteck(breite + 0.5, 0.42),
      boden: rechteck(breite + 0.5, 0.55, true),
      kreuze,
    };
  }, [breite, hoehe, tiefe, g, dachBreite, dachLaenge, chalet, tor]);

  return (
    <group {...lage}>
      {/* Inneres: leuchtet warm durch die Fenster */}
      <mesh geometry={box()} material={innenlicht()} position={[0, hoehe / 2 + 0.03, 0]} scale={[breite - D * 2, hoehe, tiefe - D * 2]} />

      <PappeTeil form={teile.vorne} farbe={wand} dicke={D} position={[0, 0, tiefe / 2 - D / 2]} />
      <PappeTeil form={teile.hinten} farbe={wand} dicke={D} position={[0, 0, -tiefe / 2 + D / 2]} />
      {[-1, 1].map((s) => (
        <PappeTeil key={s} form={teile.seite} farbe={wand} dicke={D} position={[s * (breite / 2 - D / 2), 0, 0]} rotation={[0, Math.PI / 2, 0]} />
      ))}
      {teile.kreuze.map((k, i) => (
        <Kreuz key={i} loch={k} z={tiefe / 2 - D / 2} />
      ))}

      {/* Dach: zwei Pappen, am First aneinandergelegt und mit einem Papierstreifen verklebt */}
      {[-1, 1].map((s) => (
        <group key={s} position={[0, hoehe + g, 0]} rotation={[0, 0, -s * neigung]}>
          <PappeTeil form={teile.dach} farbe={dach} dicke={D} position={[s * (dachBreite / 2 - 0.06), D / 2 - 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} />
        </group>
      ))}
      <mesh geometry={box()} material={pappe("#EADCC2")} position={[0, hoehe + g + D * 0.9, 0]} scale={[0.42, 0.06, dachLaenge * 0.98]} />

      {kamin && !tor && (
        <mesh geometry={box()} material={pappe(KRAFT_DUNKEL)} position={[breite * 0.22, hoehe + g * 0.72, -tiefe * 0.18]} scale={[0.34, 0.8, 0.34]} castShadow />
      )}

      {chalet && (
        <>
          <PappeTeil form={teile.boden} farbe={KRAFT_DUNKEL} dicke={D * 0.7} position={[0, hoehe * 0.3, tiefe / 2 + 0.27]} rotation={[-Math.PI / 2, 0, 0]} />
          <PappeTeil form={teile.balkon} farbe={KRAFT_DUNKEL} dicke={D * 0.7} position={[0, hoehe * 0.3, tiefe / 2 + 0.5]} />
        </>
      )}
    </group>
  );
}

/** Turm aus vier Pappwänden mit Schallöffnungen oben und einem spitzen Dach */
function Turm({ breite, hoehe, wand, dach, ...lage }: Lage & { breite: number; hoehe: number; wand: string; dach: string }) {
  const teile = useMemo(() => {
    const offen: Loch[] = [{ x: 0, y: hoehe - 1.25, b: breite * 0.36, h: 0.8 }];
    return {
      vorne: rechteck(breite, hoehe, false, offen),
      seite: rechteck(breite - D * 2, hoehe, false, offen),
      haube: new THREE.ConeGeometry(breite * 0.82, breite * 1.25, 4, 1),
    };
  }, [breite, hoehe]);
  useEffect(() => () => teile.haube.dispose(), [teile]);
  return (
    <group {...lage}>
      <mesh geometry={box()} material={innenlicht()} position={[0, hoehe / 2, 0]} scale={[breite - D * 2, hoehe - 0.05, breite - D * 2]} />
      {[-1, 1].map((s) => (
        <PappeTeil key={`v${s}`} form={teile.vorne} farbe={wand} dicke={D} position={[0, 0, s * (breite / 2 - D / 2)]} />
      ))}
      {[-1, 1].map((s) => (
        <PappeTeil key={`s${s}`} form={teile.seite} farbe={wand} dicke={D} position={[s * (breite / 2 - D / 2), 0, 0]} rotation={[0, Math.PI / 2, 0]} />
      ))}
      <mesh geometry={teile.haube} material={pappe(dach)} position={[0, hoehe + breite * 0.62, 0]} rotation={[0, Math.PI / 4, 0]} castShadow />
    </group>
  );
}

/** Kirche mit zwei Türmen an der Front (ein Gruss ans Grossmünster) */
export function PappKirche({ ...lage }: Lage) {
  return (
    <group {...lage}>
      <PappHaus breite={3} hoehe={2.3} tiefe={4.2} wand={KARTON_WEISS} dach="#6C7F8F" kamin={false} position={[0, 0, -0.6]} />
      <Turm breite={1.25} hoehe={4.8} wand={KARTON_WEISS} dach="#5F7868" position={[-1.05, 0, 2]} />
      <Turm breite={1.25} hoehe={4.8} wand={KARTON_WEISS} dach="#5F7868" position={[1.05, 0, 2]} />
    </group>
  );
}

/** Station der Seilbahn: Papphaus mit grossem Tor, darüber das rote Seilrad */
export function PappStation({ ...lage }: Lage) {
  return (
    <group {...lage}>
      <PappHaus breite={3.4} hoehe={2.2} tiefe={3} wand={KRAFT} dach="#6C7F8F" tor />
      <mesh material={pappe("#C8452E")} position={[0, 3.55, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.85, 0.13, 10, 36]} />
      </mesh>
      <mesh geometry={box()} material={pappe(KRAFT_DUNKEL)} position={[0, 3.1, 0]} scale={[0.22, 1.1, 0.22]} castShadow />
    </group>
  );
}
