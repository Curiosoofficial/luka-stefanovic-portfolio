"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { stichPunkte, type Stich } from "./formen";
import { faden, filz, filzKugel, garn, kunststoff, pappe, pappeKante, strick, toenen } from "./materialien";
import { zufall } from "./texturen";

/**
 * 3D-Bauteile der Bastelwelt. Jedes Teil wirft Schatten und empfängt welche.
 *
 * Der Trick hinter Filz und Pappe heisst ExtrudeGeometry: Ein 2D-Umriss wird in die Tiefe gezogen.
 * - Filz bekommt ein dickes, rundes «Polster» (Bevel): sieht weich und gestopft aus.
 * - Pappe bekommt fast keine Rundung, dafür eine eigene Kante mit Rillen.
 */

export type Lage = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
};

let stichGeometrie: THREE.CapsuleGeometry | null = null;

/** Ein einziger Mini-Körper für alle Stiche, wird beim ersten Gebrauch gebaut */
function stichForm() {
  stichGeometrie ??= new THREE.CapsuleGeometry(0.024, 0.09, 2, 6);
  return stichGeometrie;
}

/** Naht: viele kleine Stiche als Instanzen eines einzigen Mini-Körpers (schnell, auch bei hunderten Stichen) */
export function Naht({ stiche, z, farbe, laenge = 1, dicke = 1 }: { stiche: Stich[]; z: number; farbe?: string; laenge?: number; dicke?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const hilfe = new THREE.Object3D();
    stiche.forEach((s, i) => {
      hilfe.position.set(s.x, s.y, z);
      // Die Kapsel liegt entlang ihrer Y-Achse; gedreht zeigt sie in Richtung der Kante
      hilfe.rotation.set(0, 0, s.winkel - Math.PI / 2);
      hilfe.scale.set(dicke, laenge, dicke);
      hilfe.updateMatrix();
      mesh.setMatrixAt(i, hilfe.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [stiche, z, laenge, dicke]);

  return <instancedMesh ref={ref} args={[stichForm(), faden(farbe), stiche.length]} castShadow />;
}

/**
 * Gepolsterter Körper aus einem Umriss: in die Tiefe gezogen, mit runder Kante (Bevel).
 * Die Vorderseite liegt bei z = dicke / 2 + polster.
 */
export function polsterGeometrie(form: THREE.Shape, dicke: number, polster: number, kurven = 40) {
  const g = new THREE.ExtrudeGeometry(form, {
    depth: dicke,
    bevelEnabled: true,
    bevelThickness: polster,
    bevelSize: polster * 0.85,
    bevelSegments: 8,
    curveSegments: kurven,
  });
  g.translate(0, 0, -dicke / 2);
  return g;
}

type FilzProps = Lage & {
  form: THREE.Shape;
  farbe: string;
  dicke?: number;
  polster?: number;
  naht?: boolean;
  nahtEinzug?: number;
  nahtFarbe?: string;
};

/** Gepolstertes Filzteil mit Naht */
export function FilzTeil({ form, farbe, dicke = 0.22, polster = 0.16, naht = true, nahtEinzug = 0.17, nahtFarbe, ...lage }: FilzProps) {
  const geometrie = useMemo(() => polsterGeometrie(form, dicke, polster), [form, dicke, polster]);
  const stiche = useMemo(() => (naht ? stichPunkte(form, nahtEinzug, 0.21) : []), [form, naht, nahtEinzug]);
  useEffect(() => () => geometrie.dispose(), [geometrie]);

  return (
    <group {...lage}>
      <mesh geometry={geometrie} material={filz(farbe)} castShadow receiveShadow />
      {naht && <Naht stiche={stiche} z={dicke / 2 + polster + 0.004} farbe={nahtFarbe} />}
    </group>
  );
}

/** Ausgeschnittene Pappe: flache Vorderseite, Wellpappe-Kante */
export function PappeTeil({ form, farbe, dicke = 0.28, ...lage }: Lage & { form: THREE.Shape; farbe: string; dicke?: number }) {
  const geometrie = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(form, {
      depth: dicke,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 1,
      curveSegments: 40,
    });
    g.translate(0, 0, -dicke / 2);
    return g;
  }, [form, dicke]);
  useEffect(() => () => geometrie.dispose(), [geometrie]);
  // Zwei Materialien: [0] Vorder- und Rückseite, [1] Kante
  const materialien = useMemo(() => [pappe(farbe), pappeKante(dicke)], [farbe, dicke]);

  return (
    <group {...lage}>
      <mesh geometry={geometrie} material={materialien} castShadow receiveShadow />
    </group>
  );
}

/** Gestricktes Teil: leicht gepolstert, Maschen als Relief */
export function StrickTeil({ form, farbe, dicke = 0.3, ...lage }: Lage & { form: THREE.Shape; farbe: string; dicke?: number }) {
  const geometrie = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(form, {
      depth: dicke,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.08,
      bevelSegments: 4,
      curveSegments: 24,
    });
    g.translate(0, 0, -dicke / 2);
    return g;
  }, [form, dicke]);
  useEffect(() => () => geometrie.dispose(), [geometrie]);

  return (
    <group {...lage}>
      <mesh geometry={geometrie} material={strick(farbe)} castShadow receiveShadow />
    </group>
  );
}

/**
 * Garnknäuel: ein einziger langer Faden, der in vielen Runden um eine Kugel gewickelt ist.
 * Jede Runde ist ein Kreis um die Kugel mit einer zufälligen Achse, alle Runden hintereinander
 * ergeben eine Kurve, und TubeGeometry macht daraus einen Schlauch.
 */
export function Garnknaeuel({ radius = 1, farbe, start = 1, ...lage }: Lage & { radius?: number; farbe: string; start?: number }) {
  const { geometrie, laenge, dicke } = useMemo(() => {
    const z = zufall(start * 977);
    const punkte: THREE.Vector3[] = [];
    const runden = 34;
    for (let r = 0; r < runden; r++) {
      const achse = new THREE.Vector3(z() - 0.5, z() - 0.5, z() - 0.5).normalize();
      const u = new THREE.Vector3().crossVectors(achse, new THREE.Vector3(0.3, 1, 0.2)).normalize();
      const v = new THREE.Vector3().crossVectors(achse, u);
      const versatz = z() * Math.PI * 2;
      for (let i = 0; i < 36; i++) {
        const w = versatz + (i / 36) * Math.PI * 2;
        punkte.push(u.clone().multiplyScalar(Math.cos(w) * radius).addScaledVector(v, Math.sin(w) * radius));
      }
    }
    const kurve = new THREE.CatmullRomCurve3(punkte);
    const fadenDicke = radius * 0.05;
    return {
      geometrie: new THREE.TubeGeometry(kurve, runden * 48, fadenDicke, 8, false),
      laenge: kurve.getLength(),
      dicke: fadenDicke,
    };
  }, [radius, start]);
  useEffect(() => () => geometrie.dispose(), [geometrie]);

  return (
    <group {...lage}>
      <mesh geometry={geometrie} material={garn(farbe, laenge, dicke)} castShadow receiveShadow />
      <mesh material={filzKugel(toenen(farbe, 0.8))} castShadow receiveShadow>
        <sphereGeometry args={[radius * 0.97, 48, 32]} />
      </mesh>
    </group>
  );
}

/** Garnfaden entlang einer Kurve: Wurzeln, Algen, Schnüre */
export function Garnfaden({ punkte, dicke = 0.09, farbe, ...lage }: Lage & { punkte: [number, number, number][]; dicke?: number; farbe: string }) {
  const { geometrie, laenge } = useMemo(() => {
    const kurve = new THREE.CatmullRomCurve3(punkte.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    return { geometrie: new THREE.TubeGeometry(kurve, 120, dicke, 10, false), laenge: kurve.getLength() };
  }, [punkte, dicke]);
  useEffect(() => () => geometrie.dispose(), [geometrie]);

  return (
    <group {...lage}>
      <mesh geometry={geometrie} material={garn(farbe, laenge, dicke)} castShadow receiveShadow />
    </group>
  );
}

/** Filzkugel: Grundbaustein für runde Körper */
export function FilzKugel({ radius = 1, farbe, ...lage }: Lage & { radius?: number; farbe: string }) {
  return (
    <mesh {...lage} material={filzKugel(farbe)} castShadow receiveShadow>
      <sphereGeometry args={[radius, 56, 40]} />
    </mesh>
  );
}

/** Wolke aus mehreren Filzkugeln: rundherum plastisch, nicht flach */
export function Wolke3D({ farbe = "#FDF8F0", ...lage }: Lage & { farbe?: string }) {
  const kugeln: [number, number, number, number][] = [
    [-1.15, 0, 0, 0.78],
    [0, 0.3, 0.05, 1.05],
    [1.1, 0, 0, 0.72],
    [-0.45, -0.28, 0.45, 0.62],
    [0.55, -0.22, 0.5, 0.64],
    [0.05, 0.05, -0.55, 0.8],
  ];
  return (
    <group {...lage}>
      {kugeln.map(([x, y, z, r], i) => (
        <FilzKugel key={i} radius={r} farbe={farbe} position={[x, y, z]} scale={[1, 0.82, 1]} />
      ))}
    </group>
  );
}

/** Baum: Stamm aus Pappe, Krone aus Filzkugeln */
export function Baum3D({ hoehe = 2.6, krone = "#4FA545", ...lage }: Lage & { hoehe?: number; krone?: string }) {
  return (
    <group {...lage}>
      <mesh position={[0, hoehe / 2, 0]} material={pappe("#a26f42")} castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.26, hoehe, 20]} />
      </mesh>
      {[
        [0, hoehe + 0.3, 0, 0.95],
        [-0.65, hoehe - 0.15, 0.15, 0.68],
        [0.65, hoehe - 0.1, -0.1, 0.7],
        [0.1, hoehe - 0.3, 0.55, 0.6],
      ].map(([x, y, z, r], i) => (
        <FilzKugel key={i} radius={r} farbe={i % 2 ? toenen(krone, 0.85) : krone} position={[x, y, z]} />
      ))}
    </group>
  );
}

/** Filzblume: Garnstiel, fünf Blütenblätter aus abgeflachten Filzkugeln, gelbe Mitte */
export function Blume({ farbe, hoehe = 1.4, ...lage }: Lage & { farbe: string; hoehe?: number }) {
  const stiel = useMemo<[number, number, number][]>(
    () => [
      [0, 0, 0],
      [0.08, hoehe * 0.4, 0],
      [-0.05, hoehe * 0.75, 0],
      [0, hoehe, 0],
    ],
    [hoehe],
  );
  return (
    <group {...lage}>
      <Garnfaden punkte={stiel} dicke={0.06} farbe="#4FA545" />
      <group position={[0, hoehe, 0.05]}>
        {Array.from({ length: 5 }, (_, i) => {
          const w = (i / 5) * Math.PI * 2;
          return (
            <FilzKugel
              key={i}
              radius={0.26}
              farbe={farbe}
              position={[Math.cos(w) * 0.3, Math.sin(w) * 0.3, 0]}
              scale={[1, 1, 0.45]}
            />
          );
        })}
        <FilzKugel radius={0.18} farbe="#FFC93C" position={[0, 0, 0.1]} />
      </group>
    </group>
  );
}

/** Stein: abgeflachte graue Filzkugel */
export function Stein({ groesse = 1, farbe = "#9c958a", ...lage }: Lage & { groesse?: number; farbe?: string }) {
  return <FilzKugel {...lage} radius={groesse} farbe={farbe} scale={[1.3, 0.7, 1]} />;
}

/** Koralle: mehrere Garnäste, die nach oben wachsen */
export function Koralle({ farbe, ...lage }: Lage & { farbe: string }) {
  const aeste = useMemo<[number, number, number][][]>(
    () => [
      [
        [0, 0, 0],
        [0.1, 0.7, 0],
        [-0.2, 1.4, 0.1],
        [-0.1, 2, 0],
      ],
      [
        [0, 0, 0],
        [0.3, 0.6, 0.1],
        [0.6, 1.2, 0],
        [0.7, 1.6, -0.1],
      ],
      [
        [0, 0, 0],
        [-0.3, 0.5, -0.1],
        [-0.6, 1, 0],
        [-0.75, 1.3, 0.1],
      ],
    ],
    [],
  );
  return (
    <group {...lage}>
      {aeste.map((punkte, i) => (
        <Garnfaden key={i} punkte={punkte} dicke={0.13 - i * 0.02} farbe={farbe} />
      ))}
    </group>
  );
}

/**
 * Knopf: gedrechselt wie ein echter Knopf (LatheGeometry dreht ein Profil um die Achse),
 * vier Löcher und ein Faden über Kreuz.
 */
export function Knopf3D({ radius = 1, farbe, ...lage }: Lage & { radius?: number; farbe: string }) {
  const koerper = useMemo(() => {
    // Profil von unten nach oben: So zeigen die Flächen nach aussen (sonst sieht man den Knopf nur von innen)
    const profil = [
      [0, -0.06],
      [0.9, -0.06],
      [0.99, 0.02],
      [1, 0.1],
      [0.93, 0.17],
      [0.8, 0.19],
      [0.62, 0.14],
      [0.5, 0.1],
      [0, 0.1],
    ].map(([x, y]) => new THREE.Vector2(x * radius, y * radius));
    const g = new THREE.LatheGeometry(profil, 48);
    g.rotateX(Math.PI / 2);
    return g;
  }, [radius]);
  useEffect(() => () => koerper.dispose(), [koerper]);

  const a = radius * 0.22;
  return (
    <group {...lage}>
      <mesh geometry={koerper} material={kunststoff(farbe)} castShadow receiveShadow />
      {[
        [-a, -a],
        [a, -a],
        [-a, a],
        [a, a],
      ].map(([x, y]) => (
        <mesh key={`${x}${y}`} position={[x, y, radius * 0.1]} rotation={[Math.PI / 2, 0, 0]} material={kunststoff("#2e1f15")}>
          <cylinderGeometry args={[radius * 0.075, radius * 0.075, radius * 0.04, 16]} />
        </mesh>
      ))}
      {[Math.PI / 4, -Math.PI / 4].map((w) => (
        <mesh key={w} position={[0, 0, radius * 0.13]} rotation={[0, 0, w]} material={faden()} castShadow>
          <boxGeometry args={[radius * 0.62, radius * 0.07, radius * 0.05]} />
        </mesh>
      ))}
    </group>
  );
}
