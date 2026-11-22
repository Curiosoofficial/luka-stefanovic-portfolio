"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { blumenForm, obenForm, stichPunkte } from "./formen";
import { BODEN_Y, bodenWelle } from "./masse";
import { faden, filz, filzKugel, flaumHuelle, flausch, garn, holz, strick, strickKugel, toenen, tweed } from "./materialien";
import { FilzKugel, Garnfaden, Garnknaeuel, Knopf3D, Naht, polsterGeometrie, type Lage } from "./teile";
import { zufall } from "./texturen";

/**
 * Handarbeits-Teile nach der Strick-Vorlage: Kordeln, Pompoms, Strickbuchstaben, Patchwork-Hügel,
 * Strick- und Pompom-Bäume, Häkelbüsche, Watte-Wolken, Filzpilze, Farne, Häkelblumen und Fransen.
 *
 * Wo es viele gleiche Teile gibt (Fäden eines Pompoms, Gras, Stiche), wird ein einziger Körper
 * vielfach gezeichnet (InstancedMesh): ein Aufruf an die Grafikkarte statt hunderte.
 * Wo mehrere Körper immer zusammen auftreten (Krone, Busch, Wolke), werden sie zu einer Geometrie verschmolzen.
 */

export type Punkt = [number, number, number];
type Kugel = [number, number, number, number];

const OBEN = new THREE.Vector3(0, 1, 0);

/** Mehrere Kugeln (x, y, z, Radius) zu einer einzigen Geometrie verschmelzen */
function kugelHaufen(kugeln: Kugel[], basis: (r: number) => THREE.BufferGeometry, quetschen = 1) {
  const teile = kugeln.map(([x, y, z, r]) => basis(r).scale(1, quetschen, 1).translate(x, y, z));
  const g = mergeGeometries(teile);
  teile.forEach((t) => t.dispose());
  return g;
}

/* ------------------------------------------------------------------ Kordel */

/**
 * Kordel: zwei Garnstränge, schraubenförmig umeinander gedreht.
 * Entlang der Mittellinie läuft ein Koordinatensystem mit (Frenet-Rahmen),
 * darin kreisen die beiden Stränge um die Mitte, um eine halbe Drehung versetzt.
 */
function kordelGeometrien(kurve: THREE.Curve<THREE.Vector3>, dicke: number, geschlossen: boolean) {
  const laenge = kurve.getLength();
  const windungen = Math.max(1, Math.round(laenge / (dicke * 4.4)));
  const schritte = windungen * 14;
  const rahmen = kurve.computeFrenetFrames(schritte, geschlossen);
  const versatz = dicke * 0.42;
  const strangDicke = dicke * 0.6;
  return [0, Math.PI].map((start) => {
    const punkte: THREE.Vector3[] = [];
    for (let i = 0; i <= schritte; i++) {
      const u = i / schritte;
      const w = start + u * windungen * Math.PI * 2;
      punkte.push(
        kurve
          .getPointAt(u)
          .addScaledVector(rahmen.normals[i], Math.cos(w) * versatz)
          .addScaledVector(rahmen.binormals[i], Math.sin(w) * versatz),
      );
    }
    const strang = new THREE.CatmullRomCurve3(punkte);
    return {
      geometrie: new THREE.TubeGeometry(strang, schritte * 2, strangDicke, 8, false),
      laenge: strang.getLength(),
      dicke: strangDicke,
    };
  });
}

type KordelProps = Lage & { punkte: Punkt[]; dicke?: number; farben?: [string, string]; geschlossen?: boolean };

export function Kordel({ punkte, dicke = 0.12, farben = ["#F1E8D4", "#D9C7A2"], geschlossen = false, ...lage }: KordelProps) {
  const straenge = useMemo(() => {
    const kurve = new THREE.CatmullRomCurve3(
      punkte.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
      geschlossen,
      "centripetal",
    );
    return kordelGeometrien(kurve, dicke, geschlossen);
  }, [punkte, dicke, geschlossen]);
  useEffect(() => () => straenge.forEach((s) => s.geometrie.dispose()), [straenge]);

  return (
    <group {...lage}>
      {straenge.map((s, i) => (
        <mesh key={i} geometry={s.geometrie} material={garn(farben[i], s.laenge, s.dicke)} castShadow receiveShadow />
      ))}
    </group>
  );
}

/** Kordel als geschlossener Ring, z. B. um einen Planeten */
export function KordelRing({ radius, ...rest }: Omit<KordelProps, "punkte" | "geschlossen"> & { radius: number }) {
  const punkte = useMemo<Punkt[]>(
    () => Array.from({ length: 48 }, (_, i) => [Math.cos((i / 48) * Math.PI * 2) * radius, 0, Math.sin((i / 48) * Math.PI * 2) * radius]),
    [radius],
  );
  return <Kordel punkte={punkte} geschlossen {...rest} />;
}

/**
 * Legt einen Weg (Punkte in x und z) auf den buckligen Boden: Die Kurve wird fein abgetastet
 * und jeder Punkt bekommt die Höhe des Bodens an dieser Stelle.
 */
export function bodenPunkte(punkte: [number, number][], hoehe: number, abstand = 0.25): Punkt[] {
  const kurve = new THREE.CatmullRomCurve3(punkte.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const anzahl = Math.max(4, Math.round(kurve.getLength() / abstand));
  return kurve.getSpacedPoints(anzahl).map((p) => [p.x, BODEN_Y + bodenWelle(p.x, p.z) + hoehe, p.z]);
}

/** Dicke Kordel, die wie ein Weg über den Boden gelegt ist */
export function KordelWeg({ punkte, dicke = 0.2, farben }: { punkte: [number, number][]; dicke?: number; farben?: [string, string] }) {
  const gelegt = useMemo(() => bodenPunkte(punkte, dicke * 0.8), [punkte, dicke]);
  return <Kordel punkte={gelegt} dicke={dicke} farben={farben} />;
}

/* ------------------------------------------------------------------ Pompom */

let pompomFaden: THREE.CapsuleGeometry | null = null;

/** Ein abgeschnittenes Garnstück: der Grundkörper für alle Pompom-Fäden */
function pompomForm() {
  pompomFaden ??= new THREE.CapsuleGeometry(0.075, 0.85, 3, 7);
  return pompomFaden;
}

/**
 * Pompom: hunderte kurze Garnstücke, die von der Mitte nach aussen zeigen.
 * Man sieht vor allem die abgeschnittenen Enden, das gibt die typische flauschig-bucklige Oberfläche.
 * Kleine Pompoms brauchen weniger Fäden (die Anzahl wächst mit der Oberfläche).
 */
export function Pompom({ radius = 1, farbe, start = 1, ...lage }: Lage & { radius?: number; farbe: string; start?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const anzahl = Math.round(Math.min(540, Math.max(130, 540 * radius * radius)));

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const z = zufall(start * 131 + 7);
    const hilfe = new THREE.Object3D();
    const ton = new THREE.Color();
    const richtung = new THREE.Vector3();
    // Weniger Fäden brauchen etwas dickere Fäden, damit der Pompom nicht löchrig wirkt
    const dick = radius * Math.sqrt(540 / anzahl) * 0.92;
    for (let i = 0; i < anzahl; i++) {
      // Fibonacci-Kugel: Richtungen gleichmässig über die Kugel verteilt, dann leicht verwackelt
      const y = 1 - ((i + 0.5) / anzahl) * 2;
      const r = Math.sqrt(1 - y * y);
      const w = i * 2.399963;
      richtung
        .set(Math.cos(w) * r + (z() - 0.5) * 0.3, y + (z() - 0.5) * 0.3, Math.sin(w) * r + (z() - 0.5) * 0.3)
        .normalize();
      const laenge = 0.85 + z() * 0.3;
      hilfe.position.copy(richtung).multiplyScalar(radius * 0.45);
      hilfe.quaternion.setFromUnitVectors(OBEN, richtung);
      hilfe.scale.set(dick, radius * laenge, dick);
      hilfe.updateMatrix();
      mesh.setMatrixAt(i, hilfe.matrix);
      mesh.setColorAt(i, ton.setScalar(0.8 + z() * 0.28));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [radius, start, anzahl]);

  return (
    <group {...lage}>
      <instancedMesh key={anzahl} ref={ref} args={[pompomForm(), flausch(farbe), anzahl]} castShadow receiveShadow />
      <mesh material={flausch(toenen(farbe, 0.7))}>
        <sphereGeometry args={[radius * 0.8, 24, 16]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ Bäume */

/** Gestrickter Baumstamm, unten breiter, mit zwei Ästen, die in die Krone führen */
function Stamm({ hoehe, dicke = 0.26, farbe = "#8A5A36" }: { hoehe: number; dicke?: number; farbe?: string }) {
  const material = strickKugel(farbe, 1, Math.max(1, Math.round(hoehe * 7) / 10));
  return (
    <group>
      <mesh position={[0, hoehe / 2 - 0.1, 0]} material={material} castShadow receiveShadow>
        <cylinderGeometry args={[dicke * 0.72, dicke, hoehe + 0.2, 18]} />
      </mesh>
      {[-1, 1].map((seite) => (
        <mesh
          key={seite}
          position={[seite * dicke * 1.1, hoehe * 0.88, 0]}
          rotation={[0, 0, -seite * 0.75]}
          material={strickKugel(farbe, 1, 1)}
          castShadow
        >
          <cylinderGeometry args={[dicke * 0.36, dicke * 0.5, hoehe * 0.42, 12]} />
        </mesh>
      ))}
    </group>
  );
}

const POMPOM_KRONE: Kugel[] = [
  [0, 0.55, 0, 0.62],
  [-0.7, 0.25, 0.1, 0.56],
  [0.72, 0.3, 0.05, 0.56],
  [-0.35, -0.2, 0.45, 0.52],
  [0.4, -0.15, 0.45, 0.52],
  [0, 0.05, -0.45, 0.56],
  [-1, -0.25, -0.15, 0.46],
  [1, -0.2, -0.1, 0.48],
  [0.05, -0.38, 0.05, 0.5],
  [0.32, 0.78, 0.35, 0.44],
  [-0.45, 0.72, -0.2, 0.46],
];

type BaumProps = Lage & { hoehe?: number; groesse?: number; start?: number; stamm?: string };

/** Pompom-Baum: gestrickter Stamm, Krone aus vielen Pompoms in verschiedenen Grün- und Gelbtönen */
export function PompomBaum({ hoehe = 2.6, farben, groesse = 1, start = 1, stamm, ...lage }: BaumProps & { farben: string[] }) {
  return (
    <group {...lage}>
      <Stamm hoehe={hoehe} dicke={0.3 * groesse} farbe={stamm} />
      <group position={[0, hoehe + groesse * 0.45, 0]} scale={groesse}>
        {POMPOM_KRONE.map(([x, y, z, r], i) => (
          <Pompom key={i} radius={r} farbe={farben[i % farben.length]} start={start * 20 + i} position={[x, y, z]} />
        ))}
      </group>
    </group>
  );
}

const STRICK_KRONE: Kugel[] = [
  [0, 0.15, 0, 0.85],
  [-0.52, -0.15, 0.15, 0.62],
  [0.54, -0.1, 0.1, 0.64],
  [0.05, 0.52, 0.22, 0.56],
  [0, -0.25, 0.42, 0.56],
];

/** Strickbaum: gestrickter Stamm, Krone aus mehreren gestrickten Kugeln, die zu einer Knolle verschmelzen */
export function StrickBaum({ hoehe = 2.2, krone, groesse = 1, stamm, ...lage }: BaumProps & { krone: string }) {
  const geometrie = useMemo(() => kugelHaufen(STRICK_KRONE, (r) => new THREE.SphereGeometry(r, 48, 32)), []);
  useEffect(() => () => geometrie.dispose(), [geometrie]);
  return (
    <group {...lage}>
      <Stamm hoehe={hoehe} dicke={0.24 * groesse} farbe={stamm} />
      <mesh
        geometry={geometrie}
        position={[0, hoehe + groesse * 0.55, 0]}
        scale={groesse}
        material={strickKugel(krone, 5, 2.5)}
        castShadow
        receiveShadow
      />
    </group>
  );
}

/* ------------------------------------------------------------------ Häkelbusch */

let rueschenGeo: THREE.SphereGeometry | null = null;

/** Gehäkelte Rüschenkugel: eine Kugel, deren Oberfläche in vielen Wellen gekräuselt ist (wie Krauskohl) */
function rueschenForm() {
  if (!rueschenGeo) {
    const g = new THREE.SphereGeometry(1, 72, 48);
    const pos = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const theta = Math.atan2(v.z, v.x);
      const phi = Math.acos(THREE.MathUtils.clamp(v.y, -1, 1));
      const r =
        1 +
        Math.sin(phi) *
          (0.08 * Math.sin(16 * theta + 3 * Math.sin(6 * phi)) + 0.06 * Math.sin(13 * phi + 2 * Math.sin(5 * theta)));
      pos.setXYZ(i, v.x * r, v.y * r, v.z * r);
    }
    g.computeVertexNormals();
    rueschenGeo = g;
  }
  return rueschenGeo;
}

/** Häkelbusch: vier gekräuselte Kugeln, zu einem Körper verschmolzen */
export function Busch({ farbe, groesse = 1, start = 1, ...lage }: Lage & { farbe: string; groesse?: number; start?: number }) {
  const geometrie = useMemo(() => {
    const z = zufall(start * 37 + 5);
    const knollen: Kugel[] = Array.from({ length: 4 }, (_, i) => [
      (i - 1.5) * 0.42 + (z() - 0.5) * 0.2,
      0.3 + z() * 0.3,
      (z() - 0.5) * 0.5,
      0.42 + z() * 0.22,
    ]);
    return kugelHaufen(knollen, (r) => rueschenForm().clone().scale(r, r, r), 0.85);
  }, [start]);
  useEffect(() => () => geometrie.dispose(), [geometrie]);
  return (
    <group {...lage}>
      <mesh geometry={geometrie} scale={groesse} material={strickKugel(farbe, 6, 3)} castShadow receiveShadow />
    </group>
  );
}

/* ------------------------------------------------------------------ Watte-Wolke */

const FLAUM_STUFEN = [0.3, 0.44, 0.56, 0.67, 0.77, 0.86];

/**
 * Wolke aus Watte: mehrere Kugeln, darüber sechs Flaum-Hüllen (siehe flaumHuelle),
 * die den Rand weich und faserig machen.
 */
export function Watte({
  kugeln,
  farbe = "#FBF8F1",
  schatten = true,
  grob = false,
  ...lage
}: Lage & { kugeln: Kugel[]; farbe?: string; schatten?: boolean; grob?: boolean }) {
  const { basis, huellen } = useMemo(() => {
    // «grob»: für kleine Teile (Beine) reichen viel weniger Dreiecke
    const basis = kugelHaufen(kugeln, (r) => (grob ? new THREE.SphereGeometry(r, 18, 12) : new THREE.SphereGeometry(r, 40, 28)), 0.85);
    const pos = basis.attributes.position;
    const nor = basis.attributes.normal;
    const huellen = FLAUM_STUFEN.map((_, i) => {
      const g = basis.clone();
      const p = g.attributes.position;
      const abstand = 0.024 * (i + 1);
      for (let k = 0; k < p.count; k++) {
        p.setXYZ(k, pos.getX(k) + nor.getX(k) * abstand, pos.getY(k) + nor.getY(k) * abstand, pos.getZ(k) + nor.getZ(k) * abstand);
      }
      return g;
    });
    return { basis, huellen };
  }, [kugeln, grob]);
  useEffect(
    () => () => {
      basis.dispose();
      huellen.forEach((h) => h.dispose());
    },
    [basis, huellen],
  );
  return (
    <group {...lage}>
      <mesh geometry={basis} material={filzKugel(farbe, 4)} castShadow={schatten} receiveShadow />
      {huellen.map((h, i) => (
        <mesh key={i} geometry={h} material={flaumHuelle(farbe, FLAUM_STUFEN[i])} />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ Pilz */

const PILZ = { radius: 0.62, hoehe: 0.5, stiel: 0.72 };
const TUPFEN: [number, number, number][] = [
  [0.12, 0, 0.12],
  [0.62, 0.3, 0.1],
  [0.7, 1.6, 0.11],
  [0.55, 2.6, 0.09],
  [0.75, 3.7, 0.1],
  [0.6, 4.8, 0.12],
  [1.08, 0.9, 0.075],
  [1.02, 2.1, 0.07],
  [1.1, 4.2, 0.08],
  [1.05, 5.4, 0.07],
  [0.38, 3.3, 0.08],
];

/** Fliegenpilz aus Filz: gedrechselter Stiel, gewölbter Hut mit Rollrand, weisse Filztupfen */
export function Pilz({ groesse = 1, hut = "#C8382E", ...lage }: Lage & { groesse?: number; hut?: string }) {
  const tupfenRef = useRef<THREE.InstancedMesh>(null);
  const stiel = useMemo(() => {
    const profil = [
      [0, 0],
      [0.25, 0],
      [0.27, 0.05],
      [0.24, 0.2],
      [0.2, 0.45],
      [0.19, 0.62],
      [0.21, PILZ.stiel],
      [0, PILZ.stiel],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(profil, 32);
  }, []);
  useEffect(() => () => stiel.dispose(), [stiel]);

  useLayoutEffect(() => {
    const mesh = tupfenRef.current;
    if (!mesh) return;
    const { radius: R, hoehe: H, stiel: S } = PILZ;
    const hilfe = new THREE.Object3D();
    const normale = new THREE.Vector3();
    TUPFEN.forEach(([phi, theta, s], i) => {
      const sx = Math.sin(phi) * Math.cos(theta);
      const sy = Math.cos(phi);
      const sz = Math.sin(phi) * Math.sin(theta);
      // Normale auf einem Ellipsoid: Koordinaten durch die Halbachsen im Quadrat
      normale.set(sx / R, sy / H, sz / R).normalize();
      hilfe.position.set(sx * R, S - 0.04 + sy * H, sz * R).addScaledVector(normale, 0.012);
      hilfe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normale);
      hilfe.scale.set(s, s, s * 0.35);
      hilfe.updateMatrix();
      mesh.setMatrixAt(i, hilfe.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);

  const hutY = PILZ.stiel - 0.04;
  return (
    <group {...lage} scale={groesse}>
      <mesh geometry={stiel} material={filzKugel("#F1E4CB", 2)} castShadow receiveShadow />
      <mesh position={[0, hutY, 0]} scale={[PILZ.radius, PILZ.hoehe, PILZ.radius]} material={filzKugel(hut, 3)} castShadow receiveShadow>
        <sphereGeometry args={[1, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, hutY, 0]} rotation={[Math.PI / 2, 0, 0]} material={filz("#E6D3B0", 0.8)} receiveShadow>
        <circleGeometry args={[PILZ.radius, 40]} />
      </mesh>
      <mesh position={[0, hutY, 0]} rotation={[Math.PI / 2, 0, 0]} material={filzKugel(hut, 3)} castShadow receiveShadow>
        <torusGeometry args={[PILZ.radius * 0.97, 0.07, 10, 48]} />
      </mesh>
      <instancedMesh ref={tupfenRef} args={[undefined, filzKugel("#FBF6EC", 1), TUPFEN.length]} castShadow>
        <sphereGeometry args={[1, 16, 10]} />
      </instancedMesh>
    </group>
  );
}

/* ------------------------------------------------------------------ Fransen-Gras */

let fransenFaden: THREE.CylinderGeometry | null = null;

/** Ein Garnfaden, unten dicker, oben dünner, nach oben hin gebogen und leicht gewellt */
function fransenForm() {
  if (!fransenFaden) {
    const g = new THREE.CylinderGeometry(0.04, 0.07, 1, 7, 10, false);
    g.translate(0, 0.5, 0);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const t = pos.getY(i);
      pos.setX(i, pos.getX(i) + 0.22 * t * t);
      pos.setZ(i, pos.getZ(i) + 0.05 * Math.sin(t * 7));
    }
    g.computeVertexNormals();
    fransenFaden = g;
  }
  return fransenFaden;
}

type FransenProps = {
  farben: string[];
  anzahl?: number;
  /** Mitte und Breite des Streifens in x */
  mitteX?: number;
  breite?: number;
  tiefe?: [number, number];
  hoehe?: [number, number];
  /** Fadendicke als Faktor */
  dicke?: number;
  start?: number;
};

function FransenBuendel({ farbe, anzahl, mitteX, breite, tiefe, hoehe, dicke, start }: Required<Omit<FransenProps, "farben">> & { farbe: string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const z = zufall(start * 53 + 1);
    const hilfe = new THREE.Object3D();
    const ton = new THREE.Color();
    let bx = 0;
    let bz = 0;
    for (let i = 0; i < anzahl; i++) {
      // Je neun Fäden bilden ein dichtes Büschel
      if (i % 9 === 0) {
        bx = mitteX + (z() - 0.5) * breite;
        bz = tiefe[0] + z() * (tiefe[1] - tiefe[0]);
      }
      const streuung = 0.32 * dicke;
      const x = bx + (z() - 0.5) * streuung;
      const zz = bz + (z() - 0.5) * streuung;
      hilfe.position.set(x, BODEN_Y + bodenWelle(x, zz) - 0.05, zz);
      hilfe.rotation.set((z() - 0.5) * 0.7, z() * Math.PI * 2, (z() - 0.5) * 0.7);
      hilfe.scale.set(dicke, hoehe[0] + z() * (hoehe[1] - hoehe[0]), dicke);
      hilfe.updateMatrix();
      mesh.setMatrixAt(i, hilfe.matrix);
      mesh.setColorAt(i, ton.setScalar(0.8 + z() * 0.3));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [anzahl, mitteX, breite, tiefe, hoehe, dicke, start]);
  return <instancedMesh ref={ref} args={[fransenForm(), flausch(farbe), anzahl]} castShadow receiveShadow />;
}

const FRANSEN_TIEFE: [number, number] = [5, 7.4];
const FRANSEN_HOEHE: [number, number] = [0.6, 1.35];

/**
 * Fransen-Gras: viele Garnfäden in Büscheln, in mehreren Farben.
 * Ganz vorne steht es so nah an der Kamera, dass die Tiefenunschärfe es weich zeichnet, wie bei einem Makrofoto.
 */
export function Fransen({
  farben,
  anzahl = 300,
  mitteX = 0,
  breite = 34,
  tiefe = FRANSEN_TIEFE,
  hoehe = FRANSEN_HOEHE,
  dicke = 1,
  start = 1,
}: FransenProps) {
  return (
    <>
      {farben.map((farbe, k) => (
        <FransenBuendel
          key={farbe}
          farbe={farbe}
          anzahl={Math.round(anzahl / farben.length)}
          mitteX={mitteX}
          breite={breite}
          tiefe={tiefe}
          hoehe={hoehe}
          dicke={dicke}
          start={start * 10 + k}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ Farn */

/** Farn: mehrere gebogene Wedel aus Garn, an jedem Wedel Fiederblättchen, die zur Spitze hin kleiner werden */
function farnGeometrie(wedel: number, laenge: number, start: number) {
  const z = zufall(start * 71 + 3);
  const teile: THREE.BufferGeometry[] = [];
  const blatt = new THREE.CapsuleGeometry(0.05, 1, 2, 6);
  for (let k = 0; k < wedel; k++) {
    const dreh = new THREE.Matrix4().makeRotationY((k / wedel) * Math.PI * 2 + z() * 0.6);
    const l = laenge * (0.75 + z() * 0.35);
    const bogen = 0.75 + z() * 0.3;
    const kurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(l * 0.15, l * 0.95, 0),
      new THREE.Vector3(l * 0.8 * bogen, l * 0.35, 0),
    );
    teile.push(new THREE.TubeGeometry(kurve, 32, 0.045, 6, false).applyMatrix4(dreh));
    const paare = 12;
    for (let i = 1; i < paare; i++) {
      const u = 0.14 + (i / paare) * 0.84;
      const p = kurve.getPointAt(u);
      const t = kurve.getTangentAt(u);
      const blattLaenge = l * 0.3 * (1 - u * 0.75);
      for (const seite of [-1, 1]) {
        const richtung = new THREE.Vector3(0, -0.15, seite).addScaledVector(t, 0.5).normalize();
        const m = new THREE.Matrix4().compose(
          p.clone().addScaledVector(richtung, blattLaenge / 2),
          new THREE.Quaternion().setFromUnitVectors(OBEN, richtung),
          new THREE.Vector3(1, blattLaenge, 1),
        );
        teile.push(blatt.clone().applyMatrix4(m).applyMatrix4(dreh));
      }
    }
  }
  const g = mergeGeometries(teile);
  teile.forEach((t) => t.dispose());
  blatt.dispose();
  return g;
}

export function Farn({ farbe = "#4F8F33", wedel = 6, laenge = 1.6, start = 1, ...lage }: Lage & { farbe?: string; wedel?: number; laenge?: number; start?: number }) {
  const geometrie = useMemo(() => farnGeometrie(wedel, laenge, start), [wedel, laenge, start]);
  useEffect(() => () => geometrie.dispose(), [geometrie]);
  return (
    <group {...lage}>
      <mesh geometry={geometrie} material={flausch(farbe)} castShadow receiveShadow />
    </group>
  );
}

/* ------------------------------------------------------------------ Häkelblume */

let bluetenGeo: THREE.ExtrudeGeometry | null = null;

/** Eine gehäkelte Blüte: fünf runde Blütenblätter, leicht gepolstert */
function bluetenForm() {
  bluetenGeo ??= polsterGeometrie(blumenForm(5, 0.46), 0.06, 0.08, 24);
  return bluetenGeo;
}

/** Häkelblume: runde Blütenblätter mit Maschen-Struktur, dicke gelbe Mitte, Garnstiel */
export function HaekelBlume({ farbe, mitte = "#F4CF4A", hoehe = 1, groesse = 1, ...lage }: Lage & { farbe: string; mitte?: string; hoehe?: number; groesse?: number }) {
  const stiel = useMemo<Punkt[]>(
    () => [
      [0, 0, 0],
      [0.05, hoehe * 0.45, 0.02],
      [-0.03, hoehe * 0.8, 0],
      [0, hoehe, 0],
    ],
    [hoehe],
  );
  return (
    <group {...lage}>
      <Garnfaden punkte={stiel} dicke={0.055} farbe="#4F8F33" />
      <group position={[0, hoehe, 0.04]} rotation={[-0.25, 0, 0]} scale={groesse}>
        <mesh geometry={bluetenForm()} material={strick(farbe, 0.9, 1.7)} castShadow receiveShadow />
        <FilzKugel radius={0.17} farbe={mitte} position={[0, 0, 0.13]} scale={[1, 1, 0.65]} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ Strickbuchstabe */

/**
 * Gestrickter Buchstabe wie ein Kissen: dick gepolstert, grobe Maschen, vorne und hinten
 * ein weisser Vorstich knapp innerhalb der Kante.
 *
 * Löcher (das Dreieck im A) wären für das dicke Polster zu klein: Es würde sie zudrücken.
 * Darum wird der Buchstabe voll gebaut und das Loch als dunkler Flicken mit Vorstich aufgenäht.
 */
export function StrickBuchstabe({ form, farbe, dicke = 0.6, polster = 0.4, ...lage }: Lage & { form: THREE.Shape; farbe: string; dicke?: number; polster?: number }) {
  const teile = useMemo(() => {
    const voll = new THREE.Shape(form.getPoints(24));
    const loecher = form.holes.map((l) => new THREE.Shape(l.getPoints(24)));
    return {
      koerper: polsterGeometrie(voll, dicke, polster, 24),
      flicken: loecher.map((loch) => polsterGeometrie(loch, 0.02, 0.06, 12)),
      stiche: stichPunkte(voll, 0.17, 0.27),
      lochStiche: loecher.map((loch) => stichPunkte(loch, -0.13, 0.22)),
      vorne: dicke / 2 + polster,
    };
  }, [form, dicke, polster]);
  useEffect(
    () => () => {
      teile.koerper.dispose();
      teile.flicken.forEach((f) => f.dispose());
    },
    [teile],
  );
  const z = teile.vorne + 0.008;
  return (
    <group {...lage}>
      <mesh geometry={teile.koerper} material={strick(farbe, 2.1, 2.2)} castShadow receiveShadow />
      {[z, -z].map((seiteZ) => (
        <group key={seiteZ}>
          <Naht stiche={teile.stiche} z={seiteZ} farbe="#FBF5EA" laenge={1.25} dicke={1.3} />
          {teile.flicken.map((f, i) => (
            <group key={i}>
              <mesh geometry={f} position={[0, 0, seiteZ]} material={strick(toenen(farbe, 0.55), 2.1, 2.2)} receiveShadow />
              <Naht stiche={teile.lochStiche[i]} z={seiteZ + Math.sign(seiteZ) * 0.01} farbe="#FBF5EA" laenge={1.1} dicke={1.2} />
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ Patchwork-Hügel */

let deckenStich: THREE.CapsuleGeometry | null = null;
let muschelBogen: THREE.TorusGeometry | null = null;

function deckenStichForm() {
  deckenStich ??= new THREE.CapsuleGeometry(0.03, 0.22, 2, 6);
  return deckenStich;
}

/** Halber Ring: ein Bogen der gehäkelten Muschelkante */
function muschelForm() {
  muschelBogen ??= new THREE.TorusGeometry(0.14, 0.035, 6, 14, Math.PI);
  return muschelBogen;
}

type StichArt = "decke" | "muschel" | "kordel" | "keiner";

/**
 * Hügel aus Stoff (Tweed mit Fischgrat oder Filz), dick gepolstert. Die Oberkante ist verziert:
 * - «decke»: Deckenstich (Faden auf der Kante, kurze Stiche senkrecht in den Stoff)
 * - «muschel»: gehäkelte Muschelkante (kleine Bögen, die über die Kante stehen)
 * - «kordel»: aufgenähte Kordel ein Stück unterhalb der Kante
 */
export function StoffHuegel({
  oben,
  von = -75,
  bis = 75,
  x = 0,
  z,
  farbe,
  stoff = "tweed",
  stich = "decke",
  garnFarbe = "#FBF5EA",
  dicke = 0.5,
  polster = 0.35,
}: {
  oben: (x: number) => number;
  von?: number;
  bis?: number;
  x?: number;
  z: number;
  farbe: string;
  stoff?: "tweed" | "filz";
  stich?: StichArt;
  garnFarbe?: string;
  dicke?: number;
  polster?: number;
}) {
  const stichRef = useRef<THREE.InstancedMesh>(null);
  const { koerper, rand, stiche, kordel } = useMemo(() => {
    const koerper = polsterGeometrie(obenForm(oben, von, bis, BODEN_Y - 0.6), dicke, polster, 12);
    const vorne = dicke / 2 + polster;
    const anfang = Math.max(von + 0.4, -36);
    const ende = Math.min(bis - 0.4, 36);
    const stiche: THREE.Matrix4[] = [];
    const randPunkte: THREE.Vector3[] = [];
    const kordel: Punkt[] = [];
    const hilfe = new THREE.Object3D();
    const abstand = stich === "muschel" ? 0.26 : 0.3;
    const tief = 0.26;
    let strecke = 0;
    let naechster = 0;
    let vorher = oben(anfang);
    for (let px = anfang; px <= ende; px += 0.02) {
      const y = oben(px);
      strecke += Math.hypot(0.02, y - vorher);
      vorher = y;
      if (strecke < naechster) continue;
      naechster += abstand;
      const steigung = (oben(px + 0.01) - oben(px - 0.01)) / 0.02;
      const l = Math.hypot(1, steigung);
      // Normale nach unten, also in den Hügel hinein
      const nx = steigung / l;
      const ny = -1 / l;
      randPunkte.push(new THREE.Vector3(px, y + 0.01, vorne - 0.015));
      if (stich === "decke") {
        hilfe.position.set(px + nx * (tief / 2 + 0.02), y + ny * (tief / 2 + 0.02), vorne + 0.012);
        hilfe.quaternion.setFromUnitVectors(OBEN, new THREE.Vector3(nx, ny, 0));
      } else if (stich === "muschel") {
        // Der Bogen steht über die Kante hinaus und zeigt von ihr weg
        hilfe.position.set(px + nx * 0.03, y + ny * 0.03, vorne - 0.05);
        hilfe.rotation.set(0, 0, Math.atan2(nx, -ny));
      } else if (stich === "kordel") {
        kordel.push([px + nx * 0.32, y + ny * 0.32, vorne + 0.02]);
        continue;
      } else continue;
      hilfe.updateMatrix();
      stiche.push(hilfe.matrix.clone());
    }
    const rand =
      stich === "decke" || stich === "muschel"
        ? new THREE.TubeGeometry(new THREE.CatmullRomCurve3(randPunkte), randPunkte.length * 4, 0.035, 6, false)
        : null;
    return { koerper, rand, stiche, kordel };
  }, [oben, von, bis, dicke, polster, stich]);
  useEffect(
    () => () => {
      koerper.dispose();
      rand?.dispose();
    },
    [koerper, rand],
  );
  useLayoutEffect(() => {
    const mesh = stichRef.current;
    if (!mesh) return;
    stiche.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [stiche]);

  return (
    <group position={[x, 0, z]}>
      <mesh geometry={koerper} material={stoff === "tweed" ? tweed(farbe, 2) : filz(farbe, 1.6)} castShadow receiveShadow />
      {rand && <mesh geometry={rand} material={faden(garnFarbe)} castShadow />}
      {stiche.length > 0 && (
        <instancedMesh
          ref={stichRef}
          args={[stich === "muschel" ? muschelForm() : deckenStichForm(), faden(garnFarbe), stiche.length]}
          castShadow
        />
      )}
      {kordel.length > 1 && <Kordel punkte={kordel} dicke={0.075} farben={[garnFarbe, toenen(garnFarbe, 0.8)]} />}
    </group>
  );
}

/* ------------------------------------------------------------------ Wollknäuel mit Faden */

/**
 * Wollknäuel, das auf dem Boden liegt, mit einem losen Faden, der sich über den Boden schlängelt.
 * Auf Wunsch mit zwei Stricknadeln, die oben drin stecken.
 */
export function KnaeuelMitFaden({
  radius = 0.6,
  farbe,
  start = 1,
  richtung = 1,
  nadeln = false,
  ...lage
}: Lage & { radius?: number; farbe: string; start?: number; richtung?: 1 | -1; nadeln?: boolean }) {
  const r = radius;
  const d = richtung;
  const fadenPunkte = useMemo<Punkt[]>(
    () => [
      [d * r * 0.62, r * 1.25, r * 0.72],
      [d * r * 1.05, r * 0.55, r * 1.02],
      [d * r * 1.5, r * 0.06, r * 1.25],
      [d * r * 2.4, r * 0.06, r * 0.95],
      [d * r * 3.3, r * 0.06, r * 1.5],
      [d * r * 4.4, r * 0.06, r * 1.2],
    ],
    [r, d],
  );
  return (
    <group {...lage}>
      <Garnknaeuel radius={r} farbe={farbe} start={start} position={[0, r * 0.95, 0]} />
      <Garnfaden punkte={fadenPunkte} dicke={r * 0.05} farbe={farbe} />
      {nadeln &&
        [0.55, -0.4].map((w, i) => (
          <group key={i} position={[0, r * 1.25, 0]} rotation={[0.35 * (i ? -1 : 1), 0.3, w]}>
            <mesh material={holz()} castShadow>
              <cylinderGeometry args={[r * 0.045, r * 0.045, r * 3.2, 12]} />
            </mesh>
            <mesh position={[0, r * 1.6, 0]} material={holz("#B5733F")} castShadow>
              <sphereGeometry args={[r * 0.1, 16, 12]} />
            </mesh>
          </group>
        ))}
    </group>
  );
}

/** Knopf, der flach auf dem Boden liegt */
export function LiegenderKnopf({ radius = 0.3, farbe, drehung = 0, ...lage }: Lage & { radius?: number; farbe: string; drehung?: number }) {
  return (
    <group {...lage}>
      <group rotation={[-Math.PI / 2, 0, drehung]} position={[0, radius * 0.06, 0]}>
        <Knopf3D radius={radius} farbe={farbe} />
      </group>
    </group>
  );
}
