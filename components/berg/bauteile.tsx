"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { filz, holz, strickKugel } from "@/components/welt/materialien";
import { polsterGeometrie, type Lage } from "@/components/welt/teile";
import { zufall } from "@/components/welt/texturen";

/**
 * Bauteile des Strick-Bergs, die auf dem Gelände stehen: Tannen, See, Seilbahn, Schilder, Sonne.
 * Gleiche Sprache wie die Bastelwelt: Strick, Filz, Pappe und Kordel.
 */

/* ------------------------------------------------------------------ Tannen (viele Bäume in einem Aufruf) */

export type Baumplatz = [number, number, number, number]; // x, y, z, Grösse

const TANNEN_GRUEN = ["#1F6B3A", "#2A7D3F", "#1B5C3A", "#3A8F45", "#2D7030", "#256B4A"];

/** Die Uhr der Welt in Sekunden: Wind, Wasser und Fahnen lesen sie (steht still, wenn Bewegung reduziert ist) */
export const ZEIT = { value: 0 };
export function uhrStellen(sekunden: number) {
  ZEIT.value = sekunden;
}

let tannenStrick: THREE.MeshPhysicalMaterial | null = null;

/** Strick für die Baumkronen: wenig Glanz (satte Farbe) und Wind, der die Spitzen leicht hin und her wiegt */
function tannenMaterial() {
  if (tannenStrick) return tannenStrick;
  const m = (strickKugel("#ffffff", 2, 0.6) as THREE.MeshPhysicalMaterial).clone();
  m.sheen = 0.15;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uZeit = ZEIT;
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nuniform float uZeit;").replace(
      "#include <begin_vertex>",
      [
        "#include <begin_vertex>",
        "#ifdef USE_INSTANCING",
        // Jeder Baum schwingt in seinem eigenen Takt (abhängig vom Standort), die Spitze am stärksten
        "  float wo = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.29;",
        "  float schwung = sin(uZeit * 1.5 + wo) * 0.035 + sin(uZeit * 0.63 + wo * 0.4) * 0.03;",
        "  transformed.x += schwung * transformed.y * transformed.y * 0.36;",
        "  transformed.z += schwung * transformed.y * transformed.y * 0.16;",
        "#endif",
      ].join("\n"),
    );
    // Flaum: Am Rand der Krone leuchtet die Wolle in ihrer eigenen Farbe, wie Fasern im Gegenlicht
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      "#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), 2.4) * 0.5;",
    );
  };
  m.customProgramCacheKey = () => "tanne-wind";
  tannenStrick = m;
  return m;
}

/**
 * Tannen aus drei gestrickten Kegeln übereinander, dazu ein Holzstamm.
 * Alle Tannen zusammen sind zwei InstancedMeshes: schnell, auch bei hunderten Bäumen.
 */
export function Tannen({ baeume, saat = 1 }: { baeume: Baumplatz[]; saat?: number }) {
  const krone = useRef<THREE.InstancedMesh>(null);
  const stamm = useRef<THREE.InstancedMesh>(null);

  const geos = useMemo(() => {
    const teile = [
      new THREE.ConeGeometry(1.05, 1.5, 20, 1, false).translate(0, 1.3, 0),
      new THREE.ConeGeometry(0.85, 1.35, 20, 1, false).translate(0, 2.05, 0),
      new THREE.ConeGeometry(0.6, 1.2, 20, 1, false).translate(0, 2.75, 0),
    ];
    const kroneGeo = mergeGeometries(teile);
    teile.forEach((t) => t.dispose());
    const stammGeo = new THREE.CylinderGeometry(0.14, 0.18, 1.1, 10).translate(0, 0.35, 0);
    return { kroneGeo, stammGeo };
  }, []);
  useEffect(
    () => () => {
      geos.kroneGeo.dispose();
      geos.stammGeo.dispose();
    },
    [geos],
  );

  useLayoutEffect(() => {
    const k = krone.current;
    const s = stamm.current;
    if (!k || !s) return;
    const z = zufall(saat * 53 + 5);
    const hilfe = new THREE.Object3D();
    const farbe = new THREE.Color();
    baeume.forEach(([x, y, zz, g], i) => {
      hilfe.position.set(x, y, zz);
      hilfe.rotation.set(0, z() * Math.PI * 2, (z() - 0.5) * 0.06);
      hilfe.scale.set(g * (0.9 + z() * 0.2), g * (0.9 + z() * 0.3), g * (0.9 + z() * 0.2));
      hilfe.updateMatrix();
      k.setMatrixAt(i, hilfe.matrix);
      s.setMatrixAt(i, hilfe.matrix);
      k.setColorAt(i, farbe.set(TANNEN_GRUEN[Math.floor(z() * TANNEN_GRUEN.length)]));
    });
    k.instanceMatrix.needsUpdate = true;
    s.instanceMatrix.needsUpdate = true;
    if (k.instanceColor) k.instanceColor.needsUpdate = true;
    // Die Bäume stehen weit verstreut: Grenzen neu berechnen, sonst verschwinden sie am Bildrand
    k.computeBoundingSphere();
    s.computeBoundingSphere();
  }, [baeume, saat]);

  return (
    <>
      <instancedMesh ref={krone} args={[geos.kroneGeo, tannenMaterial(), baeume.length]} castShadow receiveShadow />
      <instancedMesh ref={stamm} args={[geos.stammGeo, holz("#7A5233"), baeume.length]} castShadow />
    </>
  );
}

/* ------------------------------------------------------------------ See */

/** See aus blauem Filz: eine Fläche auf Höhe des Wasserspiegels, das Gelände formt das Ufer */
export function See({ rx, rz, ...lage }: Lage & { rx: number; rz: number }) {
  // Blauer Filz mit etwas Glanz: matt genug, dass der Himmel nicht als weisser Fleck darin spiegelt
  const wasser = useMemo(() => {
    const m = filz("#2A84D8", 3).clone();
    // Die Kreisfläche hat UVs von 0 bis 1: Filzfasern so oft wiederholen, dass sie zur Grösse des Sees passen
    for (const t of [m.map, m.normalMap]) {
      if (!t) continue;
      t.repeat.set(rx / 1.5, rz / 1.5);
      t.needsUpdate = true;
    }
    m.sheen = 0.8;
    m.sheenColor = new THREE.Color("#9FD6FF");
    m.sheenRoughness = 0.35;
    // Wellen: helle Kämme wandern in zwei Richtungen über den See und glitzern, wo sie sich kreuzen
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uZeit = ZEIT;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec2 vWasser;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvWasser = (modelMatrix * vec4(position, 1.0)).xz;");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uZeit;\nvarying vec2 vWasser;")
        .replace(
          "#include <map_fragment>",
          [
            "#include <map_fragment>",
            "float welle1 = sin(vWasser.y * 2.3 - uZeit * 1.0 + sin(vWasser.x * 0.7 + uZeit * 0.3) * 1.7) * 0.5 + 0.5;",
            "float welle2 = sin(vWasser.y * 3.7 + vWasser.x * 0.9 - uZeit * 1.4 + sin(vWasser.x * 1.3 - uZeit * 0.4) * 1.2) * 0.5 + 0.5;",
            "float kamm = smoothstep(0.93, 0.995, welle1) * 0.42 + smoothstep(0.95, 0.998, welle2) * 0.3;",
            "diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78, 0.92, 1.0), kamm);",
          ].join("\n"),
        )
        .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(0.55, 0.8, 1.0) * kamm * kamm * 0.45;");
    };
    m.customProgramCacheKey = () => "berg-see";
    return m;
  }, [rx, rz]);
  useEffect(() => () => wasser.dispose(), [wasser]);
  const boote = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    const t = ZEIT.value;
    // Das Wasser lebt: Die Filzfasern wandern langsam, wie kleine Wellen
    if (wasser.normalMap) wasser.normalMap.offset.set(t * 0.012, Math.sin(t * 0.25) * 0.05);
    // Die Segelboote ziehen Kreise und schaukeln
    boote.current.forEach((boot, i) => {
      if (!boot) return;
      const [radius, tempo, start] = BOOTE[i];
      const w = t * tempo + start;
      boot.position.set(Math.sin(w) * rx * radius, 0.2 + Math.sin(t * 1.3 + i) * 0.04, Math.cos(w) * rz * radius * 0.8);
      boot.rotation.set(Math.sin(t * 1.1 + i) * 0.05, w + Math.PI / 2, Math.sin(t * 0.9 + i * 2) * 0.07);
    });
  });
  return (
    <group {...lage}>
      <mesh material={wasser} rotation={[-Math.PI / 2, 0, 0]} scale={[rx, rz, 1]} receiveShadow>
        <circleGeometry args={[1, 72]} />
      </mesh>
      {/* Segelboote aus Filz */}
      {BOOTE.map(([, , , segel], i) => (
        <group
          key={i}
          ref={(g) => {
            boote.current[i] = g;
          }}
        >
          <mesh material={filz("#E7E1D3", 1)} rotation={[0, 0, Math.PI / 2]} castShadow>
            <capsuleGeometry args={[0.26, 1.2, 6, 16]} />
          </mesh>
          <mesh material={holz("#8A5A34")} position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 1.6, 8]} />
          </mesh>
          <mesh material={filz(segel, 1)} position={[0.32, 1, 0]} castShadow>
            <coneGeometry args={[0.5, 1.2, 3]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Segelboote auf dem See: Radius der Runde (Anteil des Sees), Tempo, Startwinkel, Segelfarbe */
const BOOTE: [number, number, number, string][] = [
  [0.4, 0.1, 0, "#E0392B"],
  [0.26, -0.07, 2.2, "#F2C64F"],
  [0.52, 0.06, 4.1, "#FFFFFF"],
];

/* ------------------------------------------------------------------ Seilbahn */

/** Stütze aus Holz: zwei Beine, oben ein Querbalken für die Seile */
export function Stuetze({ hoehe = 6, breite = 2.2, ...lage }: Lage & { hoehe?: number; breite?: number }) {
  return (
    <group {...lage}>
      {[-0.4, 0.4].map((z) => (
        <mesh key={z} material={holz("#9A6B42")} position={[0, hoehe / 2 - 0.4, z]} rotation={[z > 0 ? -0.07 : 0.07, 0, 0]} castShadow>
          <boxGeometry args={[0.3, hoehe + 0.8, 0.3]} />
        </mesh>
      ))}
      <mesh material={holz("#8A5A34")} position={[0, hoehe, 0]} castShadow>
        <boxGeometry args={[0.38, 0.32, breite]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ Filzschild mit Text */

/** Zeichnet Text mittig auf die Leinwand einer Textur, in der Rundschrift der Seite */
function zeichneText(textur: THREE.CanvasTexture, zeilen: string[], farbe: string) {
  const c = textur.image as HTMLCanvasElement;
  const ctx = c.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, c.width, c.height);
  const familie = getComputedStyle(document.documentElement).getPropertyValue("--font-fredoka").trim() || "sans-serif";
  // So gross wie möglich: begrenzt durch die Höhe der Zeile und die Breite der Tafel
  let groesse = (c.height / zeilen.length) * 0.62;
  ctx.font = `700 ${groesse}px ${familie}`;
  const breiteste = Math.max(...zeilen.map((z) => ctx.measureText(z).width));
  if (breiteste > c.width * 0.9) groesse *= (c.width * 0.9) / breiteste;
  ctx.font = `700 ${groesse}px ${familie}`;
  ctx.fillStyle = farbe;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  zeilen.forEach((z, i) => ctx.fillText(z, c.width / 2, (c.height / zeilen.length) * (i + 0.53)));
  textur.needsUpdate = true;
}

/** Filztafel mit Text an einem Holzpfosten. Der Ursprung liegt am Boden, die Tafel schaut nach +z. */
export function FilzSchild({
  zeilen,
  breite = 4,
  hoehe = 1.2,
  farbe = "#FBF5EA",
  schrift = "#2E1F15",
  pfosten = 1.5,
  haengend = false,
  ...lage
}: Lage & { zeilen: string[]; breite?: number; hoehe?: number; farbe?: string; schrift?: string; pfosten?: number; haengend?: boolean }) {
  const geometrie = useMemo(() => {
    const f = new THREE.Shape();
    const r = Math.min(0.3, hoehe / 3);
    const [b, h] = [breite, hoehe];
    f.moveTo(-b / 2 + r, -h / 2);
    f.lineTo(b / 2 - r, -h / 2);
    f.quadraticCurveTo(b / 2, -h / 2, b / 2, -h / 2 + r);
    f.lineTo(b / 2, h / 2 - r);
    f.quadraticCurveTo(b / 2, h / 2, b / 2 - r, h / 2);
    f.lineTo(-b / 2 + r, h / 2);
    f.quadraticCurveTo(-b / 2, h / 2, -b / 2, h / 2 - r);
    f.lineTo(-b / 2, -h / 2 + r);
    f.quadraticCurveTo(-b / 2, -h / 2, -b / 2 + r, -h / 2);
    return polsterGeometrie(f, 0.12, 0.1, 8);
  }, [breite, hoehe]);
  useEffect(() => () => geometrie.dispose(), [geometrie]);

  const textur = useMemo(() => {
    const c = document.createElement("canvas");
    const px = 200;
    c.width = Math.round(breite * px);
    c.height = Math.round(hoehe * px);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    zeichneText(t, zeilen, schrift);
    return t;
  }, [breite, hoehe, zeilen, schrift]);
  useEffect(() => () => textur.dispose(), [textur]);

  // Nochmals zeichnen, sobald die Schrift der Seite sicher geladen ist
  useEffect(() => {
    let aktiv = true;
    document.fonts.ready.then(() => {
      if (aktiv) zeichneText(textur, zeilen, schrift);
    });
    return () => {
      aktiv = false;
    };
  }, [textur, zeilen, schrift]);

  // Hängend: kein Pfosten, der Ursprung liegt in der Mitte der Tafel
  const mitte = haengend ? 0 : pfosten + hoehe / 2;
  return (
    <group {...lage}>
      <mesh material={holz("#8A5A34")} position={[0, (pfosten + hoehe * 0.6) / 2 - 0.3, -0.14]} visible={!haengend} castShadow>
        <boxGeometry args={[0.2, pfosten + hoehe * 0.6 + 0.6, 0.2]} />
      </mesh>
      <mesh geometry={geometrie} material={filz(farbe, 1)} position={[0, mitte, 0]} castShadow receiveShadow />
      <mesh position={[0, mitte, 0.06 + 0.1 + 0.012]}>
        <planeGeometry args={[breite * 0.94, hoehe * 0.9]} />
        <meshBasicMaterial map={textur} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ Gipfelkreuz und Sonne */

/** Gipfelkreuz aus Holz */
export function Gipfelkreuz({ ...lage }: Lage) {
  return (
    <group {...lage}>
      <mesh material={holz("#8A5A34")} position={[0, 1.6, 0]} castShadow>
        <boxGeometry args={[0.32, 4, 0.32]} />
      </mesh>
      <mesh material={holz("#8A5A34")} position={[0, 2.5, 0]} castShadow>
        <boxGeometry args={[2.2, 0.32, 0.32]} />
      </mesh>
    </group>
  );
}

/**
 * Sonne als echte Kugel: ein grosses gelbes Wollknäuel mit Filzzacken rundherum.
 * Sie leuchtet leicht von selbst und wird vom Dunst nicht verschluckt.
 */
export function StrickSonne({ radius = 6, ...lage }: Lage & { radius?: number }) {
  const materialien = useMemo(() => {
    const kugel = (strickKugel("#F6C945", 4, 2) as THREE.MeshPhysicalMaterial).clone();
    kugel.emissive = new THREE.Color("#F2B63A");
    kugel.emissiveIntensity = 1.25;
    kugel.fog = false;
    const zacke = (filz("#EE8A2E", 1) as THREE.MeshPhysicalMaterial).clone();
    zacke.emissive = new THREE.Color("#E07A2A");
    zacke.emissiveIntensity = 0.9;
    zacke.fog = false;
    return { kugel, zacke };
  }, []);
  useEffect(
    () => () => {
      materialien.kugel.dispose();
      materialien.zacke.dispose();
    },
    [materialien],
  );
  const strahlen = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (strahlen.current) strahlen.current.rotation.z = state.clock.elapsedTime * 0.04;
  });
  return (
    <group {...lage}>
      <mesh material={materialien.kugel}>
        <sphereGeometry args={[radius, 48, 32]} />
      </mesh>
      <group ref={strahlen}>
        {Array.from({ length: 12 }, (_, i) => {
          const w = (i / 12) * Math.PI * 2;
          return (
            <mesh
              key={i}
              material={materialien.zacke}
              position={[Math.cos(w) * radius * 1.42, Math.sin(w) * radius * 1.42, 0]}
              rotation={[0, 0, w - Math.PI / 2]}
            >
              <coneGeometry args={[radius * 0.2, radius * 0.6, 12]} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
