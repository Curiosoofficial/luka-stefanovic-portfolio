"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Watte } from "@/components/welt/handarbeit";
import { filz, filzKugel, kunststoff } from "@/components/welt/materialien";
import { type Lage } from "@/components/welt/teile";
import { zufall } from "@/components/welt/texturen";
import { ZEIT } from "./bauteile";
import { hoehe } from "./gelaende";

/**
 * Die Tiere des Bergs, wie von Hand gefilzt: runde kleine Vögel mit Schnabel, Knopfaugen und bunten Bäuchen
 * und flauschige Kühe aus Watte mit grossen Köpfen, rosa Schnauze, Glocke und wedelndem Schwanz.
 */

/* ------------------------------------------------------------------ Vögel */

/** Gefieder: Körper, Bauch, Flügel (Blaumeise, Rotkehlchen, Kanarienvogel, Gimpel, Schneefink) */
const GEFIEDER = [
  { koerper: "#3F8FE0", bauch: "#FFE27A", fluegel: "#2F6FC4" },
  { koerper: "#8A5A3C", bauch: "#F26B3A", fluegel: "#6E452C" },
  { koerper: "#F5C12E", bauch: "#FFF2B0", fluegel: "#E09A1F" },
  { koerper: "#69788A", bauch: "#F590A8", fluegel: "#4E5B6B" },
  { koerper: "#F6F7FA", bauch: "#FFFFFF", fluegel: "#C9D2DE" },
];

/**
 * Ein Vogel, Schnabel nach +x: kugeliger Körper, heller Bauch, runder Kopf, oranger Schnabel,
 * glänzende Knopfaugen, Schwanz und zwei Flügel. «fluegel» nimmt die beiden Flügel auf, damit sie schlagen können.
 */
function Vogel({ art, fluegel }: { art: number; fluegel: (seite: number, g: THREE.Group | null) => void }) {
  const f = GEFIEDER[art % GEFIEDER.length];
  return (
    <>
      <mesh material={filzKugel(f.koerper, 2)} scale={[1.2, 1, 1]} castShadow>
        <sphereGeometry args={[0.3, 20, 16]} />
      </mesh>
      <mesh material={filzKugel(f.bauch, 2)} position={[0.07, -0.075, 0]} scale={[1.05, 0.9, 0.93]}>
        <sphereGeometry args={[0.25, 18, 14]} />
      </mesh>
      {/* Kopf mit Schnabel und Augen */}
      <mesh material={filzKugel(f.koerper, 2)} position={[0.3, 0.2, 0]} castShadow>
        <sphereGeometry args={[0.215, 18, 14]} />
      </mesh>
      <mesh material={filz("#F39A2B", 1)} position={[0.55, 0.17, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.07, 0.19, 10]} />
      </mesh>
      {[1, -1].map((s) => (
        <group key={s}>
          <mesh material={kunststoff("#1E1A18")} position={[0.42, 0.27, s * 0.145]}>
            <sphereGeometry args={[0.05, 12, 10]} />
          </mesh>
          <mesh position={[0.455, 0.295, s * 0.165]}>
            <sphereGeometry args={[0.017, 8, 6]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Flügel: dreht um die Schulter */}
          <group ref={(g) => fluegel(s, g)} position={[0.02, 0.1, s * 0.2]}>
            <mesh material={filzKugel(f.fluegel, 2)} position={[-0.04, 0, s * 0.3]} scale={[0.27, 0.055, 0.36]} castShadow>
              <sphereGeometry args={[1, 14, 10]} />
            </mesh>
          </group>
        </group>
      ))}
      {/* Schwanz */}
      <mesh material={filzKugel(f.fluegel, 2)} position={[-0.46, 0.09, 0]} rotation={[0, 0, 1.2]} scale={[1, 1, 0.34]}>
        <coneGeometry args={[0.13, 0.36, 10]} />
      </mesh>
    </>
  );
}

/** Höchster Boden rund um eine Stelle: Darüber muss ein Vogel bleiben, damit er nirgends in den Hang fliegt */
const UMKREIS = [
  [0, 0],
  [1.5, 0],
  [-1.5, 0],
  [0, 1.5],
  [0, -1.5],
];
function flugboden(x: number, z: number) {
  let h = -Infinity;
  for (const [dx, dz] of UMKREIS) h = Math.max(h, hoehe(x + dx, z + dz));
  return h;
}

/**
 * Ein kleiner Schwarm über der Stelle «mitte» (x, z): Jeder Vogel zieht eine flache, lang gezogene Runde quer zum Hang.
 * Seine Flughöhe liegt fest über dem höchsten Boden, den die Runde überquert, mit Luft für Tannen und Dächer:
 * So fliegt keiner durch den Berg, ein Haus oder einen Baum. Die Schwärme stehen seitlich neben der Seilbahn.
 */
export function Voegel({ mitte, anzahl = 4, start = 1, groesse = 0.55 }: { mitte: [number, number]; anzahl?: number; start?: number; groesse?: number }) {
  const voegel = useRef<(THREE.Group | null)[]>([]);
  const fluegel = useRef<(THREE.Group | null)[]>([]);
  const [mx, mz] = mitte;
  const bahnen = useMemo(() => {
    const z = zufall(start * 17 + 3);
    return Array.from({ length: anzahl }, (_, i) => {
      const radius = 4 + z() * 3.5;
      // Wie tief die Runde in den Hang hinein reicht (Anteil am Radius): flach, damit sie vor der Wand bleibt
      const tief = 0.18 + z() * 0.1;
      let boden = -Infinity;
      for (let k = 0; k < 48; k++) {
        const w = (k / 48) * Math.PI * 2;
        boden = Math.max(boden, flugboden(mx + Math.cos(w) * radius, mz + Math.sin(w) * radius * tief));
      }
      return {
        radius,
        tief,
        tempo: (0.38 + z() * 0.22) * (i % 2 ? 1 : -1),
        phase: z() * 6.28,
        hoch: boden + 5.8 + z() * 2,
        art: Math.floor(z() * GEFIEDER.length),
      };
    });
  }, [anzahl, start, mx, mz]);
  useFrame(() => {
    const t = ZEIT.value;
    bahnen.forEach((b, i) => {
      const v = voegel.current[i];
      if (!v) return;
      const w = t * b.tempo + b.phase;
      v.position.set(mx + Math.cos(w) * b.radius, b.hoch + Math.sin(t * 0.8 + i * 1.7) * 0.4, mz + Math.sin(w) * b.radius * b.tief);
      // Schnabel in Flugrichtung, in den engen Kehren legt sich der Vogel in die Kurve, beim Steigen geht die Nase hoch
      const vx = -Math.sin(w) * b.tempo;
      const vz = Math.cos(w) * b.tief * b.tempo;
      v.rotation.set(Math.sign(b.tempo) * 0.55 * Math.cos(w) ** 2, Math.atan2(-vz, vx), Math.cos(t * 0.8 + i * 1.7) * 0.1, "YZX");
      // Flügelschlag: ein paar schnelle Schläge, dann kurz gleiten
      const kraft = 0.45 + 0.4 * Math.max(0, Math.sin(t * 0.9 + i * 2.1));
      const schlag = Math.sin(t * 16 + i * 2) * kraft;
      fluegel.current[i * 2]?.rotation.set(-0.15 - schlag, 0, 0);
      fluegel.current[i * 2 + 1]?.rotation.set(0.15 + schlag, 0, 0);
    });
  });
  return (
    <group>
      {bahnen.map((b, i) => (
        <group
          key={i}
          ref={(g) => {
            voegel.current[i] = g;
          }}
          scale={groesse}
        >
          <Vogel
            art={b.art}
            fluegel={(seite, g) => {
              fluegel.current[i * 2 + (seite > 0 ? 0 : 1)] = g;
            }}
          />
        </group>
      ))}
    </group>
  );
}

/** Ein Vogel, der irgendwo sitzt (Zaun, Dach, Briefkasten): Er wippt, dreht den Kopf hin und her und zuckt mit den Flügeln */
export function SitzVogel({ art = 0, phase = 0, groesse = 0.5, ...lage }: Lage & { art?: number; phase?: number; groesse?: number }) {
  const koerper = useRef<THREE.Group>(null);
  const fluegel = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    const t = ZEIT.value + phase;
    const k = koerper.current;
    if (!k) return;
    // Hüpfer alle paar Sekunden, dazwischen sitzt er still und schaut sich um
    const huepfer = Math.max(0, Math.sin(t * 1.3)) ** 14;
    // Die Füsse stehen genau auf dem Platz, an den der Vogel gesetzt wird
    k.position.y = (0.36 + huepfer * 0.2) * groesse;
    k.rotation.y = Math.sin(t * 0.7) * 0.7 + Math.sin(t * 2.3) * 0.12;
    k.rotation.z = Math.sin(t * 2.6) * 0.05;
    const zucken = huepfer * 0.9;
    fluegel.current[0]?.rotation.set(-0.95 - zucken, 0, 0);
    fluegel.current[1]?.rotation.set(0.95 + zucken, 0, 0);
  });
  return (
    <group {...lage}>
      <group ref={koerper} scale={groesse}>
        <Vogel
          art={art}
          fluegel={(seite, g) => {
            fluegel.current[seite > 0 ? 0 : 1] = g;
          }}
        />
        {/* Füsse */}
        {[1, -1].map((s) => (
          <mesh key={s} material={filz("#F39A2B", 1)} position={[0.05, -0.3, s * 0.1]}>
            <cylinderGeometry args={[0.022, 0.022, 0.16, 6]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ Kühe */

type Kugel = [number, number, number, number];
const RUMPF: Kugel[] = [
  [-0.4, 0, 0, 0.5],
  [0.04, 0.05, 0, 0.57],
  [0.44, 0.02, 0, 0.5],
];
/** Flecken: kleinere Wattebäusche, die aus dem Rumpf herausschauen */
const FLECKEN: Kugel[] = [
  [0.2, 0.2, 0.36, 0.32],
  [-0.42, 0.12, -0.34, 0.3],
  [-0.12, 0.38, 0.02, 0.3],
  [0.5, 0.1, -0.3, 0.24],
  [-0.62, 0.16, 0.2, 0.22],
];
const KOPF: Kugel[] = [[0, 0, 0, 0.43]];
/**
 * Die vier Beine aus Watte: je drei Bäusche übereinander, nach oben etwas dicker.
 * Die Masse sind doppelt so gross angegeben und werden halb so gross gezeichnet: So bleibt der Flaum an den dünnen Beinen kurz.
 */
const BEINE: Kugel[] = [-0.46, 0.46].flatMap((x) =>
  [-0.27, 0.27].flatMap((z): Kugel[] => [
    [x * 2, 0.5, z * 2, 0.25],
    [x * 2, 0.84, z * 2, 0.27],
    [x * 2, 1.16, z * 2, 0.29],
  ]),
);
const STIRNLOCKE: Kugel[] = [
  [0.02, 0.38, 0, 0.17],
  [0.14, 0.32, 0, 0.12],
];

/**
 * Kuh aus Watte, Kopf nach +x: flauschiger weisser Rumpf mit farbigen Flecken, grosser Kopf mit rosa Schnauze,
 * Knopfaugen, roten Bäckchen, Hörnchen und Stirnlocke, rotes Halsband mit goldener Glocke, kurze Beine mit Hufen.
 * Sie grast (der Kopf geht hinunter und wieder hoch), wackelt mit den Ohren und wedelt mit dem Schwanz.
 */
export function Kuh({ flecken = "#8A5230", phase = 0, ...lage }: Lage & { flecken?: string; phase?: number }) {
  const rumpf = useRef<THREE.Group>(null);
  const kopf = useRef<THREE.Group>(null);
  const schwanz = useRef<THREE.Group>(null);
  const ohren = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(() => {
    const t = ZEIT.value + phase;
    // Grasen: eine Weile unten bleiben, dann den Kopf heben und kauen
    const unten = THREE.MathUtils.smoothstep(Math.sin(t * 0.45), -0.2, 0.5);
    if (kopf.current) {
      kopf.current.rotation.z = -0.1 - unten * 0.75 + Math.sin(t * 5) * 0.03 * (1 - unten);
      kopf.current.rotation.y = Math.sin(t * 0.33) * 0.25 * (1 - unten);
    }
    if (schwanz.current) schwanz.current.rotation.x = Math.sin(t * 3.1) * 0.55;
    ohren.current.forEach((o, i) => {
      if (o) o.rotation.x = (i ? -1 : 1) * (0.35 + Math.max(0, Math.sin(t * 2.3 + i)) ** 6 * 0.5);
    });
    // Atmen
    if (rumpf.current) rumpf.current.scale.set(1, 1 + Math.sin(t * 1.4) * 0.018, 1 + Math.sin(t * 1.4) * 0.018);
  });
  const fell = "#FBF7EE";
  const dunkel = filz("#3A2A22", 1);
  return (
    <group {...lage}>
      {/* Rumpf und Flecken aus Watte */}
      <group ref={rumpf} position={[0, 1, 0]}>
        <Watte kugeln={RUMPF} farbe={fell} />
        <Watte kugeln={FLECKEN} farbe={flecken} schatten={false} />
      </group>
      {/* Euter */}
      <mesh material={filzKugel("#F4AFAE", 2)} position={[-0.3, 0.53, 0]}>
        <sphereGeometry args={[0.17, 14, 10]} />
      </mesh>
      {/* Kurze, dicke Beine aus Watte, darunter dunkle Hufe */}
      <Watte kugeln={BEINE} farbe={fell} grob scale={0.5} />
      {[-0.46, 0.46].map((x) =>
        [-0.27, 0.27].map((z) => (
          <mesh key={`${x}${z}`} material={dunkel} position={[x, 0.08, z]} castShadow>
            <cylinderGeometry args={[0.15, 0.165, 0.16, 12]} />
          </mesh>
        )),
      )}
      {/* Halsband mit Glocke */}
      <mesh material={filz("#D8342A", 1)} position={[0.66, 1.1, 0]} rotation={[0, Math.PI / 2, 0.25]}>
        <torusGeometry args={[0.34, 0.05, 10, 28]} />
      </mesh>
      <mesh material={kunststoff("#F2C64F")} position={[0.76, 0.76, 0]} castShadow>
        <sphereGeometry args={[0.115, 14, 12]} />
      </mesh>
      {/* Kopf: dreht um den Hals */}
      <group ref={kopf} position={[0.78, 1.26, 0]}>
        <group position={[0.3, 0.06, 0]}>
          <Watte kugeln={KOPF} farbe={fell} />
          <Watte kugeln={STIRNLOCKE} farbe={flecken} schatten={false} />
          {/* Schnauze mit Nasenlöchern */}
          <mesh material={filzKugel("#F6B4AE", 2)} position={[0.33, -0.15, 0]} scale={[0.85, 0.74, 1.08]}>
            <sphereGeometry args={[0.26, 18, 14]} />
          </mesh>
          {[1, -1].map((s) => (
            <group key={s}>
              <mesh material={dunkel} position={[0.54, -0.1, s * 0.09]}>
                <sphereGeometry args={[0.032, 8, 6]} />
              </mesh>
              {/* Grosse Knopfaugen mit Lichtpunkt */}
              <mesh material={kunststoff("#1E1A18")} position={[0.33, 0.12, s * 0.21]}>
                <sphereGeometry args={[0.078, 14, 12]} />
              </mesh>
              <mesh position={[0.385, 0.16, s * 0.235]}>
                <sphereGeometry args={[0.026, 8, 6]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              {/* Rote Bäckchen */}
              <mesh material={filzKugel("#F58FA0", 2)} position={[0.3, -0.03, s * 0.34]} scale={[1, 0.8, 0.4]}>
                <sphereGeometry args={[0.085, 10, 8]} />
              </mesh>
              {/* Ohren und Hörnchen */}
              <mesh
                ref={(m) => {
                  ohren.current[s > 0 ? 0 : 1] = m;
                }}
                material={filzKugel(flecken, 2)}
                position={[-0.06, 0.2, s * 0.46]}
                scale={[0.55, 0.3, 1]}
              >
                <sphereGeometry args={[0.2, 12, 10]} />
              </mesh>
              <mesh material={filz("#F1E4C6", 1)} position={[-0.04, 0.42, s * 0.2]} rotation={[s * 0.5, 0, 0]}>
                <coneGeometry args={[0.06, 0.22, 10]} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
      {/* Schwanz mit Quaste */}
      <group ref={schwanz} position={[-0.92, 1.2, 0]}>
        <mesh material={filzKugel(fell, 2)} position={[-0.1, -0.3, 0]} rotation={[0, 0, -0.3]}>
          <cylinderGeometry args={[0.035, 0.035, 0.66, 8]} />
        </mesh>
        <mesh material={filzKugel(flecken, 2)} position={[-0.2, -0.64, 0]}>
          <sphereGeometry args={[0.1, 10, 8]} />
        </mesh>
      </group>
    </group>
  );
}
