"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Kordel, type Punkt } from "@/components/welt/handarbeit";
import { filz, filzKugel, garn, holz } from "@/components/welt/materialien";
import { type Lage } from "@/components/welt/teile";
import { zufall } from "@/components/welt/texturen";
import { ZEIT } from "./bauteile";
import { BACH_KARTE, hoehe, netzHoehe } from "./gelaende";

/**
 * Was den Berg lebendig macht: fliessendes Wasser, Rauch aus den Kaminen, Schneeflocken, eine wehende Fahne,
 * ein Steg am See, Wimpel im Dorf und Heuballen. Die Tiere stehen in tiere.tsx, Gras und Blumen in natur.tsx.
 * Die Bewegung läuft nach der Uhr der Welt (ZEIT) und steht still, wenn Bewegung reduziert ist.
 */

/* ------------------------------------------------------------------ Bach und Wasserfall */

type BachStelle = {
  x: number;
  z: number;
  /** Richtung quer zum Wasser (waagrecht, Länge 1) */
  qx: number;
  qz: number;
  /** Halbe Breite des Wassers */
  breit: number;
  /** Wie wild das Wasser hier ist: 0 ruhig, um 0.45 Wildbach im Wald, 1 Wasserfall in der Felswand */
  wild: number;
  /** Nach so vielen Sekunden kommt das Wasser von der Quelle hier an */
  zeit: number;
  /** Strecke von der Quelle bis hierher */
  lauf: number;
};

/**
 * Der Lauf des Bachs, Stelle für Stelle. Wo es steil ist, fliesst das Wasser schneller und breitet sich über den Fels aus.
 * Die Ankunftszeit braucht es, damit die Strömungslinien überall gleichmässig mit dem Wasser wandern,
 * auch dort, wo es schneller oder langsamer wird.
 */
const BACH: BachStelle[] = (() => {
  const n = BACH_KARTE.length;
  const stellen: BachStelle[] = [];
  let zeit = 0;
  let lauf = 0;
  for (let i = 0; i < n; i++) {
    const [x, z] = BACH_KARTE[i];
    const [ax, az] = BACH_KARTE[Math.max(0, i - 1)];
    const [bx, bz] = BACH_KARTE[Math.min(n - 1, i + 1)];
    const l = Math.hypot(bx - ax, bz - az) || 1;
    const gefaelle = Math.abs(hoehe(bx, bz) - hoehe(ax, az)) / l;
    const wild = 0.45 * THREE.MathUtils.smoothstep(gefaelle, 0.5, 1.3) + 0.55 * THREE.MathUtils.smoothstep(gefaelle, 1.45, 1.9);
    if (i > 0) {
      const [vx, vz] = BACH_KARTE[i - 1];
      const strecke = Math.hypot(x - vx, hoehe(x, z) - hoehe(vx, vz), z - vz);
      lauf += strecke;
      zeit += strecke / (1.5 + 3.2 * (wild + stellen[i - 1].wild) * 0.5);
    }
    // Die Breite schwankt: mal eng zwischen Steinen, mal ein kleines Becken
    const breit = (0.86 + 0.16 * wild) * (1 + 0.2 * Math.sin(lauf * 0.5) + 0.1 * Math.sin(lauf * 1.7 + 1));
    stellen.push({ x, z, qx: -(bz - az) / l, qz: (bx - ax) / l, breit, wild, zeit, lauf });
  }
  return stellen;
})();

/**
 * Höhe der Wasseroberfläche an einer Stelle quer im Bach (quer von -1 bis 1): in der Mitte gewölbt, am Rand knapp über dem Boden.
 * Gemessen wird am gezeichneten Gelände (netzHoehe), nicht an der glatten Formel: Am Steilhang weichen die beiden
 * voneinander ab, und das Wasser würde sonst stellenweise im Fels verschwinden.
 */
function wasserHoehe(x: number, z: number, quer: number, wild: number, schritt: number) {
  return netzHoehe(x, z, schritt) + 0.13 + (1 - quer * quer) * (0.17 + 0.1 * wild);
}

/** Fünf Punkte quer über den Bach: Das Wasser ist ein gewölbtes Band, kein flacher Streifen */
const BACH_QUER = [-1, -0.6, 0, 0.6, 1];

function bachGeometrie(schritt: number) {
  const n = BACH.length;
  const m = BACH_QUER.length;
  const pos = new Float32Array(n * m * 3);
  const uv = new Float32Array(n * m * 2);
  // Für den Shader: Ankunftszeit des Wassers, Lage quer im Bach (-1 bis 1), Wildheit
  const fluss = new Float32Array(n * m * 3);
  BACH.forEach((s, i) => {
    BACH_QUER.forEach((quer, k) => {
      const x = s.x + s.qx * quer * s.breit;
      const z = s.z + s.qz * quer * s.breit;
      pos.set([x, wasserHoehe(x, z, quer, s.wild, schritt), z], (i * m + k) * 3);
      uv.set([s.lauf, quer * s.breit], (i * m + k) * 2);
      fluss.set([s.zeit, quer, s.wild], (i * m + k) * 3);
    });
  });
  const index: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < m - 1; k++) {
      const a = i * m + k;
      index.push(a, a + m, a + 1, a + 1, a + m, a + m + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setAttribute("fluss", new THREE.BufferAttribute(fluss, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/**
 * Das Wasser: blauer Filz wie der See. Helle Strömungslinien wandern talwärts, in der Mitte voraus (wie ein V),
 * im Wildbach dichter und schneller, im Wasserfall fast weiss. Zum Rand hin wird das Wasser dunkler, das gibt ihm Tiefe.
 */
function bachMaterial() {
  const m = (filz("#2A84D8", 1.5) as THREE.MeshPhysicalMaterial).clone();
  m.side = THREE.DoubleSide;
  m.sheen = 0.9;
  m.sheenColor = new THREE.Color("#BFE4FF");
  m.sheenRoughness = 0.4;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uZeit = ZEIT;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec3 fluss;\nvarying vec3 vFluss;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvFluss = fluss;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uZeit;\nvarying vec3 vFluss;")
      .replace(
        "#include <map_fragment>",
        [
          "#include <map_fragment>",
          "float bachQuer = vFluss.y;",
          "float bachWild = vFluss.z;",
          // Am Rand kommt das Wasser etwas später an: Die Linien biegen sich zu einem V, das talwärts zeigt
          "float bachLauf = vFluss.x + abs(bachQuer) * 0.3;",
          "float bachLinie1 = sin((bachLauf - uZeit) * 5.9 + sin(bachQuer * 2.6 + vFluss.x * 1.3) * 1.2) * 0.5 + 0.5;",
          "float bachLinie2 = sin((bachLauf * 1.07 - uZeit * 1.31) * 9.7 + sin(bachQuer * 4.1 - vFluss.x * 2.1)) * 0.5 + 0.5;",
          "float bachKamm = smoothstep(mix(0.9, 0.7, bachWild), 0.99, bachLinie1) * 0.5 + smoothstep(mix(0.93, 0.78, bachWild), 0.995, bachLinie2) * 0.42;",
          "bachKamm = clamp(bachKamm * (1.0 + bachWild * 0.8), 0.0, 1.0);",
          "diffuseColor.rgb *= mix(0.58, 1.1, 1.0 - bachQuer * bachQuer);",
          "diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.72, 1.0), bachWild * 0.45);",
          "diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.96, 0.985, 1.0), bachKamm);",
        ].join("\n"),
      )
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(0.6, 0.82, 1.0) * bachKamm * 0.3;");
  };
  m.customProgramCacheKey = () => "berg-bach";
  return m;
}

/**
 * Der Bach: gewölbtes Wasser mit wandernden Strömungslinien, im Wasserfall mit weissen Schlieren.
 * «schritt» ist die Maschenweite des gezeichneten Geländes, damit das Wasser genau darauf liegt.
 */
export function Bach({ schritt }: { schritt: number }) {
  const geometrie = useMemo(() => bachGeometrie(schritt), [schritt]);
  const wasser = useMemo(() => bachMaterial(), []);
  useEffect(() => () => geometrie.dispose(), [geometrie]);
  useEffect(() => () => wasser.dispose(), [wasser]);
  return <mesh geometry={geometrie} material={wasser} receiveShadow />;
}

/** Gischt am Fuss des Wasserfalls: weisse Wattebäusche, die auf und ab hüpfen, und ein kleiner Tümpel */
export function Gischt({ ...lage }: Lage) {
  const baeusche = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(() => {
    baeusche.current.forEach((b, i) => {
      if (!b) return;
      const a = (ZEIT.value * 0.9 + i * 0.37) % 1;
      b.position.y = 0.25 + a * 0.7;
      b.scale.setScalar((0.3 + i * 0.05) * (1 - a * 0.7));
    });
  });
  return (
    <group {...lage}>
      <mesh material={filz("#2F8BDD", 1.5)} scale={[1.9, 0.14, 1.5]} receiveShadow>
        <sphereGeometry args={[1, 28, 16]} />
      </mesh>
      {[-0.5, 0, 0.5, 0.2].map((x, i) => (
        <mesh
          key={i}
          ref={(m) => {
            baeusche.current[i] = m;
          }}
          material={filzKugel("#FFFFFF", 3)}
          position={[x, 0.3, -0.7 + (i % 2) * 0.3]}
        >
          <sphereGeometry args={[1, 14, 10]} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ Rauch aus den Kaminen */

const RAUCH_JE_KAMIN = 4;

/** Rauch: Aus jedem Kamin steigen kleine Wattebäusche auf, werden grösser und lösen sich auf */
export function Rauch({ kamine }: { kamine: Punkt[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const hilfe = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    const netz = ref.current;
    if (!netz) return;
    const t = ZEIT.value;
    kamine.forEach(([x, y, z], k) => {
      for (let i = 0; i < RAUCH_JE_KAMIN; i++) {
        const a = (t * 0.16 + i / RAUCH_JE_KAMIN + k * 0.31) % 1;
        // Der Wind trägt den Rauch nach rechts, je höher, desto weiter
        hilfe.position.set(x + a * a * 1.4 + Math.sin(t * 0.8 + k + i) * 0.08, y + a * 2.4, z);
        hilfe.scale.setScalar((0.16 + a * 0.42) * Math.min(1, (1 - a) * 3));
        hilfe.updateMatrix();
        netz.setMatrixAt(k * RAUCH_JE_KAMIN + i, hilfe.matrix);
      }
    });
    netz.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, filzKugel("#F4F1EA", 3), kamine.length * RAUCH_JE_KAMIN]} frustumCulled={false}>
      <sphereGeometry args={[1, 14, 10]} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ Schneeflocken am Gipfel */

/** Schneeflocken: weiche weisse Punkte, die rund um den Gipfel langsam fallen und im Wind treiben */
export function Schneeflocken({ anzahl = 260, unten = 70, hoch = 36 }: { anzahl?: number; unten?: number; hoch?: number }) {
  const { geometrie, material } = useMemo(() => {
    const z = zufall(77);
    const pos = new Float32Array(anzahl * 3);
    const saat = new Float32Array(anzahl * 4);
    for (let i = 0; i < anzahl; i++) {
      pos.set([(z() - 0.5) * 76, z() * hoch, 2 + z() * 44], i * 3);
      saat.set([z(), 0.7 + z() * 1.1, 0.4 + z() * 1.2, 0.6 + z() * 0.9], i * 4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("saat", new THREE.BufferAttribute(saat, 4));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uZeit: ZEIT, uMass: { value: 600 }, uUnten: { value: unten }, uHoch: { value: hoch } },
      vertexShader: [
        "uniform float uZeit;",
        "uniform float uMass;",
        "uniform float uUnten;",
        "uniform float uHoch;",
        "attribute vec4 saat;",
        "void main() {",
        "  vec3 p = position;",
        "  p.y = uUnten + mod(position.y - uZeit * saat.y, uHoch);",
        "  p.x += sin(uZeit * 0.6 + saat.x * 6.283) * saat.z;",
        "  p.z += cos(uZeit * 0.4 + saat.x * 9.0) * saat.z * 0.5;",
        "  vec4 mv = modelViewMatrix * vec4(p, 1.0);",
        "  gl_PointSize = uMass * 0.2 * saat.w / -mv.z;",
        "  gl_Position = projectionMatrix * mv;",
        "}",
      ].join("\n"),
      fragmentShader: [
        "void main() {",
        "  float d = length(gl_PointCoord - 0.5);",
        "  gl_FragColor = vec4(vec3(1.0), smoothstep(0.5, 0.15, d) * 0.92);",
        "  #include <tonemapping_fragment>",
        "  #include <colorspace_fragment>",
        "}",
      ].join("\n"),
    });
    return { geometrie: g, material: m };
  }, [anzahl, unten, hoch]);
  useEffect(
    () => () => {
      geometrie.dispose();
      material.dispose();
    },
    [geometrie, material],
  );
  // Grösse der Flocken in Bildpunkten: hängt von Bildhöhe und Blickwinkel ab
  const flocken = useRef<THREE.Points>(null);
  useFrame((state) => {
    const m = flocken.current?.material as THREE.ShaderMaterial | undefined;
    if (!m) return;
    const kamera = state.camera as THREE.PerspectiveCamera;
    m.uniforms.uMass.value = (state.size.height * state.viewport.dpr) / (2 * Math.tan((kamera.fov * Math.PI) / 360));
  });
  return <points ref={flocken} geometry={geometrie} material={material} frustumCulled={false} />;
}

/* ------------------------------------------------------------------ Fahne am Gipfel */

/** Schweizer Fahne aus Stoff an einem Holzmast. Der Stoff weht im Wind. */
export function Fahne({ ...lage }: Lage) {
  const stoff = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#E0241B";
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(52, 24, 24, 80);
      ctx.fillRect(24, 52, 80, 24);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.95 });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uZeit = ZEIT;
      shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nuniform float uZeit;").replace(
        "#include <begin_vertex>",
        // Am Mast (uv.x = 0) hängt der Stoff fest, zum freien Ende hin schlägt er stärker aus
        "#include <begin_vertex>\ntransformed.z += (sin(uv.x * 7.0 - uZeit * 5.0) * 0.14 + sin(uv.y * 4.0 + uZeit * 3.1) * 0.05) * uv.x;",
      );
    };
    m.customProgramCacheKey = () => "berg-fahne";
    return m;
  }, []);
  useEffect(
    () => () => {
      stoff.map?.dispose();
      stoff.dispose();
    },
    [stoff],
  );
  return (
    <group {...lage}>
      <mesh material={holz("#8A5A34")} position={[0, 1.9, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 3.8, 10]} />
      </mesh>
      <mesh material={stoff} position={[0.82, 3, 0]} castShadow>
        <planeGeometry args={[1.5, 1.5, 16, 8]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ Steg am See */

/** Holzsteg mit Pfosten, daran ein Ruderboot, das im Wasser schaukelt. Der Ursprung liegt am Ufer auf Wasserhöhe, der Steg führt nach +z. */
export function Steg({ laenge = 5.4, ...lage }: Lage & { laenge?: number }) {
  const boot = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!boot.current) return;
    const t = ZEIT.value;
    boot.current.position.y = 0.16 + Math.sin(t * 1.4) * 0.05;
    boot.current.rotation.set(Math.sin(t * 1.1) * 0.06, 0.25, Math.sin(t * 0.8) * 0.05);
  });
  const bretter = Math.round(laenge / 0.6);
  return (
    <group {...lage}>
      {Array.from({ length: bretter }, (_, i) => (
        <mesh key={i} material={holz(i % 2 ? "#A9743F" : "#96643A")} position={[0, 0.5, 0.3 + i * 0.6]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.09, 0.52]} />
        </mesh>
      ))}
      {[0.4, laenge - 0.2].map((z) =>
        [-0.72, 0.72].map((x) => (
          <mesh key={`${x}${z}`} material={holz("#7A5233")} position={[x, 0.1, z]} castShadow>
            <cylinderGeometry args={[0.09, 0.1, 1.7, 8]} />
          </mesh>
        )),
      )}
      <group ref={boot} position={[1.7, 0.16, laenge - 1.4]}>
        <mesh material={filz("#A85C32", 1)} scale={[0.55, 0.3, 1.15]} castShadow>
          <sphereGeometry args={[1, 18, 12]} />
        </mesh>
        <mesh material={filz("#E9D6B0", 1)} position={[0, 0.17, 0]} scale={[0.42, 0.1, 0.98]}>
          <sphereGeometry args={[1, 16, 10]} />
        </mesh>
        <mesh material={holz("#8A5A34")} position={[0, 0.22, 0]}>
          <boxGeometry args={[0.8, 0.06, 0.2]} />
        </mesh>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ Wimpelkette und Heuballen */

const WIMPEL_FARBEN = ["#E0392B", "#F2C64F", "#3A98EC", "#5FAF3C", "#EE8B3D", "#B58CF5", "#F56FA1"];

/** Wimpelkette zwischen zwei Holzmasten: eine durchhängende Kordel mit bunten Filzdreiecken, die im Wind zappeln */
export function Wimpelkette({ von, bis, hoch = 3.3, anzahl = 9 }: { von: Punkt; bis: Punkt; hoch?: number; anzahl?: number }) {
  const { leine, plaetze } = useMemo(() => {
    const a = new THREE.Vector3(von[0], von[1] + hoch, von[2]);
    const b = new THREE.Vector3(bis[0], bis[1] + hoch, bis[2]);
    const durchhang = a.distanceTo(b) * 0.09;
    const auf = (t: number) => {
      const p = a.clone().lerp(b, t);
      p.y -= Math.sin(Math.PI * t) * durchhang;
      return p;
    };
    const leine = Array.from({ length: 13 }, (_, i) => auf(i / 12)).map((p) => [p.x, p.y, p.z] as Punkt);
    const plaetze = Array.from({ length: anzahl }, (_, i) => auf((i + 0.5) / anzahl));
    return { leine, plaetze };
  }, [von, bis, hoch, anzahl]);
  const wimpel = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(() => {
    wimpel.current.forEach((w, i) => {
      if (w) w.rotation.x = Math.PI + Math.sin(ZEIT.value * 4 + i * 1.3) * 0.22;
    });
  });
  return (
    <group>
      {[von, bis].map(([x, y, z], i) => (
        <mesh key={i} material={holz("#8A5A34")} position={[x, y + hoch / 2, z]} castShadow>
          <cylinderGeometry args={[0.08, 0.1, hoch + 0.2, 8]} />
        </mesh>
      ))}
      <Kordel punkte={leine} dicke={0.05} />
      {plaetze.map((p, i) => (
        <mesh
          key={i}
          ref={(m) => {
            wimpel.current[i] = m;
          }}
          material={filz(WIMPEL_FARBEN[i % WIMPEL_FARBEN.length], 1)}
          position={[p.x, p.y - 0.26, p.z]}
          rotation={[Math.PI, 0, 0]}
          scale={[1, 1, 0.16]}
          castShadow
        >
          <coneGeometry args={[0.24, 0.46, 3]} />
        </mesh>
      ))}
    </group>
  );
}

/** Heuballen: eine liegende Rolle aus goldgelbem Garn */
export function Heuballen({ ...lage }: Lage) {
  return (
    <group {...lage}>
      <mesh material={garn("#E3B94A", 6, 0.3)} position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.72, 20]} />
      </mesh>
    </group>
  );
}
