"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { filz, filzKugel, garn, holz } from "@/components/welt/materialien";
import { type Lage } from "@/components/welt/teile";
import { zufall } from "@/components/welt/texturen";
import { ZEIT, type Baumplatz } from "./bauteile";

/**
 * Die kleinen Dinge, die den Berg wie eine handgemachte Welt wirken lassen: Grasbüschel, Blumen mit Blütenblättern,
 * Schilf und Seerosen am See, Trittsteine auf den Wegen, Steine am Bach, Brücken, Holzstapel.
 *
 * Alles, was in grosser Zahl vorkommt, wird in einem einzigen Aufruf gezeichnet (InstancedMesh):
 * So sind tausende Grashalme möglich, ohne dass die Seite ruckelt. Gras, Blumen und Schilf wiegen sich im Wind.
 */

/* ------------------------------------------------------------------ Wind */

/**
 * Baut Wind in ein Material ein: Jede Pflanze schwingt in ihrem eigenen Takt (abhängig vom Standort),
 * unten am Boden bleibt sie fest, die Spitze schwingt am stärksten.
 * «faerben» mischt zusätzlich die Farbe pro Pflanze nur dort ein, wo die Ecke als färbbar markiert ist (Blütenblätter).
 */
function mitWind<T extends THREE.Material>(material: T, schluessel: string, staerke: number, faerben = false) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uZeit = ZEIT;
    let vs = shader.vertexShader.replace("#include <common>", "#include <common>\nuniform float uZeit;\nattribute float faerbbar;").replace(
      "#include <begin_vertex>",
      [
        "#include <begin_vertex>",
        "#ifdef USE_INSTANCING",
        "  float wo = instanceMatrix[3].x * 0.61 + instanceMatrix[3].z * 0.47;",
        `  float schwung = (sin(uZeit * 2.1 + wo) + 0.5 * sin(uZeit * 3.7 + wo * 1.9)) * ${staerke.toFixed(3)};`,
        "  transformed.x += schwung * transformed.y * transformed.y;",
        "  transformed.z += schwung * 0.4 * transformed.y * transformed.y;",
        "#endif",
      ].join("\n"),
    );
    if (faerben) {
      vs = vs.replace("#include <color_vertex>", "vColor = vec4(color, 1.0);\n#ifdef USE_INSTANCING_COLOR\n  vColor.rgb = mix(vColor.rgb, vColor.rgb * instanceColor, faerbbar);\n#endif");
    }
    shader.vertexShader = vs;
  };
  material.customProgramCacheKey = () => schluessel;
  return material;
}

/** Setzt alle Pflanzen an ihren Platz. «drehen» ist die grösste zufällige Drehung um die Hochachse. */
function pflanzen(
  netz: THREE.InstancedMesh,
  plaetze: Baumplatz[],
  saat: number,
  drehen: number,
  farben: string[] | null,
  streckung: [number, number] = [1, 1],
) {
  const z = zufall(saat * 31 + 11);
  const hilfe = new THREE.Object3D();
  const farbe = new THREE.Color();
  plaetze.forEach(([x, y, zz, g], i) => {
    hilfe.position.set(x, y, zz);
    hilfe.rotation.set(0, (z() - 0.5) * 2 * drehen, 0);
    hilfe.scale.set(g, g * (streckung[0] + z() * (streckung[1] - streckung[0])), g);
    hilfe.updateMatrix();
    netz.setMatrixAt(i, hilfe.matrix);
    if (farben) netz.setColorAt(i, farbe.set(farben[Math.floor(z() * farben.length)]));
  });
  netz.instanceMatrix.needsUpdate = true;
  if (netz.instanceColor) netz.instanceColor.needsUpdate = true;
  netz.computeBoundingSphere();
}

/** Hängt an jede Ecke eine feste Farbe und die Markierung «färbbar» */
function bemalt(g: THREE.BufferGeometry, farbe: string, faerbbar = 0) {
  const n = g.attributes.position.count;
  const c = new THREE.Color(farbe);
  const farben = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) farben.set([c.r, c.g, c.b], i * 3);
  g.setAttribute("color", new THREE.BufferAttribute(farben, 3));
  g.setAttribute("faerbbar", new THREE.BufferAttribute(new Float32Array(n).fill(faerbbar), 1));
  return g;
}

/* ------------------------------------------------------------------ Gras */

/** Ein Grasbüschel: sechs schmale Halme, die sich nach aussen biegen. Unten dunkler, an der Spitze hell. */
function grasGeometrie() {
  const pos: number[] = [];
  const nor: number[] = [];
  const farbe: number[] = [];
  const index: number[] = [];
  const z = zufall(9);
  for (let b = 0; b < 6; b++) {
    const w = (b / 6) * Math.PI * 2 + z() * 0.8;
    const hoch = 0.3 + z() * 0.3;
    const neigung = 0.1 + z() * 0.2;
    const [dx, dz] = [Math.cos(w), Math.sin(w)];
    const start = pos.length / 3;
    for (let s = 0; s <= 3; s++) {
      const t = s / 3;
      const aus = 0.07 + neigung * t * t;
      const halb = 0.07 * (1 - t * 0.88);
      for (const seite of [-1, 1]) {
        pos.push(dx * aus - dz * halb * seite, hoch * t, dz * aus + dx * halb * seite);
        // Normale fast senkrecht: Das Gras wird beleuchtet wie der Boden darunter, weich und ohne harte Kanten
        nor.push(dx * 0.25, 0.94, dz * 0.25);
        const hell = 0.78 + 0.32 * t;
        farbe.push(hell, hell, hell);
      }
    }
    for (let s = 0; s < 3; s++) {
      const a = start + s * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(farbe, 3));
  g.setAttribute("faerbbar", new THREE.BufferAttribute(new Float32Array(pos.length / 3).fill(1), 1));
  g.setIndex(index);
  return g;
}

let grasStoff: THREE.MeshStandardMaterial | null = null;

/** Grasbüschel in grosser Zahl. «farben» sind die Grüntöne, aus denen jedes Büschel einen bekommt. */
export function Gras({ plaetze, farben, saat = 1 }: { plaetze: Baumplatz[]; farben: string[]; saat?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometrie = useMemo(() => grasGeometrie(), []);
  useEffect(() => () => geometrie.dispose(), [geometrie]);
  const material = useMemo(() => {
    grasStoff ??= mitWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), "berg-gras", 0.55);
    return grasStoff;
  }, []);
  useLayoutEffect(() => {
    if (ref.current) pflanzen(ref.current, plaetze, saat, Math.PI, farben, [0.8, 1.25]);
  }, [plaetze, farben, saat]);
  return <instancedMesh ref={ref} args={[geometrie, material, plaetze.length]} receiveShadow />;
}

/* ------------------------------------------------------------------ Blumen */

const BLUETEN = ["#F56FA1", "#FFD23F", "#FFFFFF", "#B58CF5", "#FF8A3D", "#5BB7F0", "#F04F5E", "#FFFFFF"];

/**
 * Eine ganze Blume in einem Stück: Stiel mit zwei Blättern, darauf sechs Blütenblätter um eine gelbe Mitte.
 * Die Blüte schaut schräg nach vorne zur Kamera. Nur die Blütenblätter nehmen die Farbe der einzelnen Blume an.
 */
function blumenGeometrie() {
  const teile: THREE.BufferGeometry[] = [];
  teile.push(bemalt(new THREE.CylinderGeometry(0.028, 0.034, 1, 5).translate(0, 0.5, 0), "#3F8A36"));
  for (const [seite, hoch] of [
    [1, 0.34],
    [-1, 0.52],
  ]) {
    teile.push(bemalt(new THREE.SphereGeometry(1, 6, 4).scale(0.16, 0.03, 0.07).rotateZ(seite * 0.5).translate(seite * 0.15, hoch, 0), "#4FA53C"));
  }
  // Blüte: liegt zuerst flach um den Ursprung, wird dann zur Kamera geneigt und auf den Stiel gesetzt
  const kopf: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const w = (i / 6) * Math.PI * 2;
    kopf.push(
      bemalt(
        new THREE.SphereGeometry(1, 7, 4)
          .scale(0.2, 0.05, 0.115)
          .rotateZ(0.22)
          .translate(0.2, 0.02, 0)
          .rotateY(w),
        "#ffffff",
        1,
      ),
    );
  }
  kopf.push(bemalt(new THREE.SphereGeometry(0.115, 8, 6).scale(1, 0.7, 1).translate(0, 0.05, 0), "#F4C534"));
  for (const k of kopf) teile.push(k.rotateX(0.75).translate(0, 1, 0.03));
  const g = mergeGeometries(teile);
  teile.forEach((t) => t.dispose());
  return g;
}

let blumenStoff: THREE.MeshStandardMaterial | null = null;

/** Blumenwiese: viele Blumen mit richtigen Blütenblättern in bunten Farben, alle zusammen in einem Aufruf gezeichnet */
export function Blumenwiese({ plaetze, saat = 1 }: { plaetze: Baumplatz[]; saat?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometrie = useMemo(() => blumenGeometrie(), []);
  useEffect(() => () => geometrie.dispose(), [geometrie]);
  const material = useMemo(() => {
    blumenStoff ??= mitWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), "berg-blumen", 0.09, true);
    return blumenStoff;
  }, []);
  useLayoutEffect(() => {
    if (ref.current) pflanzen(ref.current, plaetze, saat, 0.5, BLUETEN, [0.85, 1.2]);
  }, [plaetze, saat]);
  return <instancedMesh ref={ref} args={[geometrie, material, plaetze.length]} receiveShadow />;
}

/* ------------------------------------------------------------------ Schilf und Seerosen */

function schilfGeometrie() {
  const teile = [
    bemalt(new THREE.CylinderGeometry(0.022, 0.03, 1, 5).translate(0, 0.5, 0), "#6F9A3C"),
    bemalt(new THREE.CapsuleGeometry(0.06, 0.22, 3, 8).translate(0, 0.92, 0), "#7A4A2A"),
    bemalt(new THREE.SphereGeometry(1, 6, 4).scale(0.04, 0.4, 0.012).rotateZ(-0.35).translate(0.14, 0.42, 0), "#7FB046"),
    bemalt(new THREE.SphereGeometry(1, 6, 4).scale(0.04, 0.32, 0.012).rotateZ(0.4).translate(-0.12, 0.32, 0), "#7FB046"),
  ];
  const g = mergeGeometries(teile);
  teile.forEach((t) => t.dispose());
  return g;
}

let schilfStoff: THREE.MeshStandardMaterial | null = null;

/** Schilf am Seeufer: Halme mit braunen Kolben, die sich im Wind wiegen */
export function Schilf({ plaetze, saat = 1 }: { plaetze: Baumplatz[]; saat?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometrie = useMemo(() => schilfGeometrie(), []);
  useEffect(() => () => geometrie.dispose(), [geometrie]);
  const material = useMemo(() => {
    schilfStoff ??= mitWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), "berg-schilf", 0.13);
    return schilfStoff;
  }, []);
  useLayoutEffect(() => {
    if (ref.current) pflanzen(ref.current, plaetze, saat, Math.PI, null, [0.8, 1.25]);
  }, [plaetze, saat]);
  return <instancedMesh ref={ref} args={[geometrie, material, plaetze.length]} castShadow />;
}

/** Seerosen: grüne Filzblätter auf dem Wasser, auf einigen sitzt eine rosa Blüte. Plätze: [x, y, z, Grösse]. */
export function Seerosen({ plaetze }: { plaetze: Baumplatz[] }) {
  return (
    <group>
      {plaetze.map(([x, y, z, g], i) => (
        <group key={i} position={[x, y + 0.03, z]} rotation={[0, i * 1.9, 0]} scale={g}>
          <mesh material={filz(i % 2 ? "#3F9A4A" : "#57B052", 1)} receiveShadow>
            <cylinderGeometry args={[0.55, 0.55, 0.05, 20, 1, false, 0.5, Math.PI * 2 - 0.6]} />
          </mesh>
          {i % 3 === 0 && (
            <>
              {[0, 1, 2, 3, 4].map((b) => (
                <mesh key={b} material={filzKugel(i % 2 ? "#F9A8C8" : "#FFFFFF", 2)} position={[Math.cos(b * 1.257) * 0.14, 0.12, Math.sin(b * 1.257) * 0.14]} rotation={[0, -b * 1.257, 0.7]} scale={[0.2, 0.06, 0.12]}>
                  <sphereGeometry args={[1, 8, 6]} />
                </mesh>
              ))}
              <mesh material={filzKugel("#F4C534", 2)} position={[0, 0.13, 0]}>
                <sphereGeometry args={[0.09, 8, 6]} />
              </mesh>
            </>
          )}
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ Steine */

const STEIN_FARBEN = ["#9A948B", "#B5AEA2", "#827B73", "#C4BBA9", "#A39C90"];

/** Flache Filzsteine in grosser Zahl: Trittsteine auf den Wegen, Kiesel am Bach und am Ufer. Plätze: [x, y, z, Grösse]. */
export function Steine({ plaetze, saat = 1, flach = 0.42 }: { plaetze: Baumplatz[]; saat?: number; flach?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const netz = ref.current;
    if (!netz) return;
    const z = zufall(saat * 13 + 3);
    const hilfe = new THREE.Object3D();
    const farbe = new THREE.Color();
    plaetze.forEach(([x, y, zz, g], i) => {
      hilfe.position.set(x, y, zz);
      hilfe.rotation.set(0, z() * Math.PI, 0);
      hilfe.scale.set(g * (0.9 + z() * 0.35), g * flach, g * (0.75 + z() * 0.3));
      hilfe.updateMatrix();
      netz.setMatrixAt(i, hilfe.matrix);
      netz.setColorAt(i, farbe.set(STEIN_FARBEN[Math.floor(z() * STEIN_FARBEN.length)]));
    });
    netz.instanceMatrix.needsUpdate = true;
    if (netz.instanceColor) netz.instanceColor.needsUpdate = true;
    netz.computeBoundingSphere();
  }, [plaetze, saat, flach]);
  return (
    <instancedMesh ref={ref} args={[undefined, filzKugel("#ffffff", 2), plaetze.length]} castShadow receiveShadow>
      <sphereGeometry args={[1, 10, 7]} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ Brücke, Holzstapel, Baumstumpf */

/** Kleine Holzbrücke über den Bach: Bretter quer, links und rechts ein Geländer. Der Ursprung liegt in der Mitte, die Brücke führt entlang x. */
export function Bruecke({ laenge = 3.4, ...lage }: Lage & { laenge?: number }) {
  const bretter = Math.round(laenge / 0.42);
  return (
    <group {...lage}>
      {Array.from({ length: bretter }, (_, i) => {
        const t = (i + 0.5) / bretter - 0.5;
        // Leicht gewölbt wie eine richtige kleine Bogenbrücke
        return (
          <mesh key={i} material={holz(i % 2 ? "#A9743F" : "#96643A")} position={[t * laenge, 0.34 - t * t * 0.9, 0]} rotation={[0, 0, -t * 0.55]} castShadow receiveShadow>
            <boxGeometry args={[0.38, 0.09, 1.5]} />
          </mesh>
        );
      })}
      {[-0.72, 0.72].map((z) => (
        <group key={z}>
          {[-0.5, 0, 0.5].map((t) => (
            <mesh key={t} material={holz("#7A5233")} position={[t * laenge * 0.92, 0.62 - t * t * 0.9, z]} castShadow>
              <boxGeometry args={[0.11, 0.8, 0.11]} />
            </mesh>
          ))}
          <mesh material={holz("#8A5A34")} position={[0, 0.98, z]} castShadow>
            <boxGeometry args={[laenge * 0.98, 0.09, 0.09]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Holzstapel: sechs Scheite in drei Lagen, vorne die hellen Schnittflächen */
export function Holzstapel({ ...lage }: Lage) {
  const scheite: [number, number][] = [
    [-0.4, 0.2],
    [0, 0.2],
    [0.4, 0.2],
    [-0.2, 0.54],
    [0.2, 0.54],
    [0, 0.88],
  ];
  return (
    <group {...lage}>
      {scheite.map(([x, y], i) => (
        <group key={i} position={[x, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh material={garn("#8A5A34", 4, 0.4)} castShadow receiveShadow>
            <cylinderGeometry args={[0.2, 0.2, 1.3, 12]} />
          </mesh>
          <mesh material={filz("#E3C592", 1)} position={[0, 0.66, 0]}>
            <cylinderGeometry args={[0.17, 0.17, 0.03, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Baumstumpf mit hellen Jahresringen */
export function Baumstumpf({ groesse = 1, ...lage }: Lage & { groesse?: number }) {
  return (
    <group {...lage} scale={groesse}>
      <mesh material={garn("#7A5233", 3, 0.5)} position={[0, 0.22, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.36, 0.44, 0.46, 14]} />
      </mesh>
      <mesh material={filz("#E3C592", 1)} position={[0, 0.46, 0]}>
        <cylinderGeometry args={[0.33, 0.33, 0.03, 14]} />
      </mesh>
      <mesh material={filz("#C9A56E", 1)} position={[0, 0.48, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.02, 12]} />
      </mesh>
    </group>
  );
}
