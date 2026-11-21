"use client";

import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { type ReactNode, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Kordel, type Punkt } from "@/components/welt/handarbeit";
import { filz, filzKugel, holz, toenen } from "@/components/welt/materialien";
import { polsterGeometrie, type Lage } from "@/components/welt/teile";
import { type Projekt } from "@/data/projects";
import { FilzSchild, ZEIT } from "./bauteile";
import { type Fenster, fensterStand, oeffneFenster } from "./fenster";

/**
 * Die Inhalte der Seite als Gegenstände in der Welt:
 * - Jede Gondel der Seilbahn ist ein Projekt. Die Gondeln hängen in fester Reihenfolge am Seil,
 *   vom Gipfel bis ins Tal, mit dem Namen des Projekts auf einer Tafel.
 * - Ein Briefkasten am See ist der Kontakt, ein Schild auf der Alp ist «Über mich».
 * Ein Klick (oder Tippen) öffnet das passende Infofenster.
 */

/* ------------------------------------------------------------------ Anklickbare Gegenstände */

/** Darf die Welt auf diesen Zeiger reagieren? Nicht, wenn ein Fenster offen ist oder der Zeiger über Navigation oder Fenster liegt. */
function weltFrei(e: ThreeEvent<PointerEvent | MouseEvent>) {
  const ziel = e.nativeEvent.target;
  return fensterStand() === null && !(ziel instanceof Element && ziel.closest("[data-ui], a, button"));
}

/**
 * Macht einen Gegenstand anklickbar: Er wird unter dem Zeiger etwas grösser, der Zeiger wird zur Hand,
 * ein Klick öffnet das Fenster. Eine gelbe Plus-Marke zeigt, dass man hier etwas öffnen kann.
 * «griff» ist die Grösse der unsichtbaren Klickfläche (grösser als der Gegenstand, damit man ihn leicht trifft).
 */
export function Klickbar({
  ziel,
  griff,
  griffMitte = [0, 0, 0],
  marke,
  onZeiger,
  children,
  ...lage
}: Lage & { ziel: Fenster; griff: [number, number, number]; griffMitte?: Punkt; marke?: Punkt; onZeiger?: (an: boolean) => void; children: ReactNode }) {
  const inhalt = useRef<THREE.Group>(null);
  const plus = useRef<THREE.Group>(null);
  const zustand = useRef({ zeiger: false, groesse: 1 });
  useFrame((_, delta) => {
    const z = zustand.current;
    z.groesse += ((z.zeiger ? 1.1 : 1) - z.groesse) * Math.min(1, delta * 9);
    inhalt.current?.scale.setScalar(z.groesse);
    // Die Marke pulsiert, damit man sie bemerkt
    plus.current?.scale.setScalar(1 + Math.sin(ZEIT.value * 3.2) * 0.12 + (z.zeiger ? 0.25 : 0));
  });
  // Beim Entfernen den Zeiger zurücksetzen
  useEffect(
    () => () => {
      document.body.style.cursor = "";
    },
    [],
  );
  return (
    <group {...lage}>
      <group ref={inhalt}>
        {children}
        {marke && (
          <group ref={plus} position={marke}>
            <mesh material={filzKugel("#FFC93C", 2)} castShadow>
              <sphereGeometry args={[0.3, 20, 14]} />
            </mesh>
            <mesh material={filz("#FFFFFF", 1)} position={[0, 0, 0.27]}>
              <boxGeometry args={[0.3, 0.085, 0.08]} />
            </mesh>
            <mesh material={filz("#FFFFFF", 1)} position={[0, 0, 0.27]}>
              <boxGeometry args={[0.085, 0.3, 0.08]} />
            </mesh>
          </group>
        )}
      </group>
      <mesh
        visible={false}
        position={griffMitte}
        onPointerOver={(e) => {
          if (!weltFrei(e)) return;
          e.stopPropagation();
          if (!zustand.current.zeiger) onZeiger?.(true);
          zustand.current.zeiger = true;
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          if (zustand.current.zeiger) onZeiger?.(false);
          zustand.current.zeiger = false;
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          if (!weltFrei(e)) return;
          e.stopPropagation();
          if (zustand.current.zeiger) onZeiger?.(false);
          zustand.current.zeiger = false;
          document.body.style.cursor = "";
          oeffneFenster(ziel);
        }}
      >
        <boxGeometry args={griff} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ Seilbahn mit Projekt-Gondeln */

/**
 * Das Seil läuft genau in der Bildmitte (die Kamera schaut ihm entlang). Die Gondeln hängen an Auslegern
 * links und rechts daneben: So läuft das Seil nie vor einer Namenstafel durch.
 */
export const GONDEL_SEITE = 2.3;
/** Abstand der beiden Seile zur Mitte der Bahn */
const SEIL_ABSTAND = 0.28;

/** Seil-Kurve durch die Stützpunkte, zwischen den Stützen leicht durchhängend */
function seilKurve(punkte: Punkt[]) {
  const mitDurchhang: THREE.Vector3[] = [];
  for (let i = 0; i < punkte.length - 1; i++) {
    const a = new THREE.Vector3(...punkte[i]);
    const b = new THREE.Vector3(...punkte[i + 1]);
    mitDurchhang.push(a);
    for (const f of [0.33, 0.66]) {
      const p = a.clone().lerp(b, f);
      p.y -= a.distanceTo(b) * 0.03 * Math.sin(Math.PI * f) * 1.15;
      mitDurchhang.push(p);
    }
  }
  mitDurchhang.push(new THREE.Vector3(...punkte[punkte.length - 1]));
  return new THREE.CatmullRomCurve3(mitDurchhang, false, "centripetal");
}

/** Abgerundetes Rechteck */
function rundRechteck(b: number, h: number, r: number) {
  const f = new THREE.Shape();
  f.moveTo(-b / 2 + r, -h / 2);
  f.lineTo(b / 2 - r, -h / 2);
  f.quadraticCurveTo(b / 2, -h / 2, b / 2, -h / 2 + r);
  f.lineTo(b / 2, h / 2 - r);
  f.quadraticCurveTo(b / 2, h / 2, b / 2 - r, h / 2);
  f.lineTo(-b / 2 + r, h / 2);
  f.quadraticCurveTo(-b / 2, h / 2, -b / 2, h / 2 - r);
  f.lineTo(-b / 2, -h / 2 + r);
  f.quadraticCurveTo(-b / 2, -h / 2, -b / 2 + r, -h / 2);
  return f;
}

type KabinenTeile = { koerper: THREE.BufferGeometry; fenster: THREE.BufferGeometry };

/** Stand der Bahn: zurückgelegter Weg (Anteil der Seillänge) und wie viele Gondeln gerade unter dem Zeiger sind */
type Fahrt = { weg: number; tempo: number; halt: number; zeit: number };

/**
 * Eine Gondel: Sie fährt am Seil entlang, schaukelt im Fahrtwind und zeigt den Namen ihres Projekts.
 * «seite» ist -1 für links vom Seil (fährt talwärts) und +1 für rechts (fährt bergwärts).
 * «start» ist ihr Platz am Seil zu Beginn (0 = Bergstation, 1 = Talstation).
 */
function Gondel({
  projekt,
  index,
  kurve,
  start,
  seite,
  teile,
  fahrt,
  onHalt,
}: {
  projekt: Projekt;
  index: number;
  kurve: THREE.CatmullRomCurve3;
  start: number;
  seite: 1 | -1;
  teile: KabinenTeile;
  fahrt: React.RefObject<Fahrt>;
  onHalt: (an: boolean) => void;
}) {
  const gruppe = useRef<THREE.Group>(null);
  const hilfe = useMemo(() => new THREE.Vector3(), []);
  const titel = useMemo(() => [projekt.titel], [projekt.titel]);
  useFrame(() => {
    const g = gruppe.current;
    if (!g) return;
    const t = ZEIT.value;
    // Links geht es talwärts, rechts bergwärts. Am Ende des Seils fährt die Gondel in die Station und kommt am anderen Ende wieder heraus.
    const u = (((start - seite * fahrt.current.weg) % 1) + 1) % 1;
    kurve.getPointAt(u, hilfe);
    g.position.copy(hilfe);
    // In den Stationen wird sie klein: Sie verschwindet im Tor
    g.scale.setScalar(Math.max(0.001, Math.min(1, u / 0.06, (1 - u) / 0.06)));
    // Schaukeln: beim Fahren stärker als im Stand
    g.rotation.z = Math.sin(t * 1.6 + index * 0.9) * (0.02 + 0.045 * fahrt.current.tempo);
    g.rotation.x = Math.sin(t * 1.1 + index * 1.7) * 0.03 * fahrt.current.tempo;
  });
  const tafelBreite = Math.min(4.3, Math.max(2.5, projekt.titel.length * 0.2 + 0.9));
  // Die Kabine hängt neben dem Seil. Die Tafel rückt so weit nach aussen, dass sie das Seil nicht berührt.
  const x = seite * GONDEL_SEITE;
  const tafelX = seite * Math.max(GONDEL_SEITE, 0.4 + tafelBreite / 2);
  return (
    <group ref={gruppe}>
      <Klickbar
        ziel={{ art: "projekt", index }}
        griff={[4.6, 4.3, 2.4]}
        griffMitte={[tafelX, -1.95, 0.2]}
        marke={[tafelX + seite * (tafelBreite / 2 - 0.05), -0.42, 0.55]}
        // Solange der Zeiger auf einer Gondel liegt, hält die ganze Bahn an: So trifft man sie leicht
        onZeiger={onHalt}
      >
        {/* Klemme am Seil, Ausleger zur Seite und Gehänge */}
        <mesh material={holz("#4A3A2C")} position={[seite * SEIL_ABSTAND, 0.02, 0]} castShadow>
          <boxGeometry args={[0.34, 0.26, 0.7]} />
        </mesh>
        <mesh material={holz("#4A3A2C")} position={[x / 2, -0.12, 0]} castShadow>
          <boxGeometry args={[Math.abs(x) + 0.14, 0.14, 0.14]} />
        </mesh>
        <mesh material={holz("#4A3A2C")} position={[x, -0.9, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 1.6, 8]} />
        </mesh>
        {/* Tafel mit dem Namen des Projekts */}
        <FilzSchild zeilen={titel} breite={tafelBreite} hoehe={0.76} haengend position={[tafelX, -0.8, 0.42]} />
        {/* Kabine in der Farbe des Projekts, mit hellem Fenster und dunklem Dach */}
        <mesh material={holz("#4A3A2C")} position={[x, -1.66, 0]} castShadow>
          <boxGeometry args={[1.75, 0.16, 1.15]} />
        </mesh>
        <mesh geometry={teile.koerper} material={filz(projekt.farbe, 1)} position={[x, -2.62, 0]} castShadow receiveShadow />
        <mesh geometry={teile.fenster} material={filz("#FFF3D6", 0.8)} position={[x, -2.36, 0.83]} />
        <mesh material={filz(toenen(projekt.farbe, 0.72), 1)} position={[x, -3.12, 0.84]}>
          <boxGeometry args={[1.5, 0.16, 0.06]} />
        </mesh>
      </Klickbar>
    </group>
  );
}

/** Fahrgeschwindigkeit der Gondeln in Welt-Einheiten pro Sekunde */
const TEMPO = 2.4;

/**
 * Die Seilbahn: zwei Seile aus Kordel dicht nebeneinander von der Bergstation ins Tal, genau in der Bildmitte.
 * Daran fahren die Projekte als Gondeln: links vom Seil talwärts, rechts bergwärts, in gleichen Abständen.
 * Zeigt man auf eine Gondel, hält die Bahn an, bis man sie angeklickt hat oder weiterfährt.
 */
export function Projektbahn({ punkte, projekte }: { punkte: Punkt[]; projekte: Projekt[] }) {
  const kurven = useMemo(() => {
    const versetzt = (d: number) => punkte.map(([x, y, z]) => [x + d, y, z] as Punkt);
    const mitte = seilKurve(punkte);
    const dicht = (k: THREE.CatmullRomCurve3) => k.getSpacedPoints(70).map((p) => [p.x, p.y, p.z] as Punkt);
    return { mitte, laenge: mitte.getLength(), punkteLinks: dicht(seilKurve(versetzt(-SEIL_ABSTAND))), punkteRechts: dicht(seilKurve(versetzt(SEIL_ABSTAND))) };
  }, [punkte]);

  // Antrieb: Der Weg wächst mit der Uhr der Welt. Liegt der Zeiger auf einer Gondel, bremst die Bahn weich ab.
  const fahrt = useRef<Fahrt>({ weg: 0, tempo: 1, halt: 0, zeit: 0 });
  useFrame(() => {
    const f = fahrt.current;
    const dt = Math.min(0.1, Math.max(0, ZEIT.value - f.zeit));
    f.zeit = ZEIT.value;
    f.tempo += ((f.halt > 0 || fensterStand() !== null ? 0 : 1) - f.tempo) * Math.min(1, dt * 6);
    f.weg += (dt * f.tempo * TEMPO) / kurven.laenge;
  });
  const halten = (an: boolean) => {
    fahrt.current.halt = Math.max(0, fahrt.current.halt + (an ? 1 : -1));
  };

  const teile = useMemo<KabinenTeile>(
    () => ({ koerper: polsterGeometrie(rundRechteck(2, 1.9, 0.42), 1.2, 0.2, 10), fenster: polsterGeometrie(rundRechteck(1.5, 0.62, 0.2), 0.06, 0.04, 8) }),
    [],
  );
  useEffect(
    () => () => {
      teile.koerper.dispose();
      teile.fenster.dispose();
    },
    [teile],
  );

  return (
    <group>
      <Kordel punkte={kurven.punkteLinks} dicke={0.12} farben={["#5A4A3C", "#3E3228"]} />
      <Kordel punkte={kurven.punkteRechts} dicke={0.12} farben={["#5A4A3C", "#3E3228"]} />
      {projekte.map((projekt, i) => (
        <Gondel
          key={projekt.slug}
          projekt={projekt}
          index={i}
          kurve={kurven.mitte}
          seite={i % 2 === 0 ? -1 : 1}
          // Gleichmässig verteilt, die rechte Reihe um einen halben Abstand versetzt
          start={(Math.floor(i / 2) + (i % 2) * 0.5) / Math.ceil(projekte.length / 2)}
          teile={teile}
          fahrt={fahrt}
          onHalt={halten}
        />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ Briefkasten und Schild */

/** Gelber Briefkasten auf einem Holzpfosten, darüber eine Tafel: der Kontakt */
export function Briefkasten({ ...lage }: Lage) {
  const text = useMemo(() => ["Kontakt"], []);
  return (
    <group {...lage}>
      <Klickbar ziel={{ art: "kontakt" }} griff={[4, 4.6, 2.2]} griffMitte={[0, 2.1, 0]} marke={[1.5, 3.55, 0.4]}>
        <mesh material={holz("#8A5A34")} position={[0, 0.65, 0]} castShadow>
          <boxGeometry args={[0.2, 1.5, 0.2]} />
        </mesh>
        {/* Kasten mit Schlitz und roter Fahne */}
        <mesh material={filz("#FFC93C", 1)} position={[0, 1.75, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.25, 0.9, 0.8]} />
        </mesh>
        <mesh material={filz("#FFC93C", 1)} position={[0, 2.2, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.5, 1, 1]} castShadow>
          <cylinderGeometry args={[0.4, 0.4, 1.25, 20, 1, false, 0, Math.PI]} />
        </mesh>
        <mesh material={filz("#2E1F15", 1)} position={[0, 1.95, 0.41]}>
          <boxGeometry args={[0.8, 0.09, 0.04]} />
        </mesh>
        <mesh material={filz("#FFFFFF", 1)} position={[0.1, 1.98, 0.45]} rotation={[0, 0, 0.18]}>
          <boxGeometry args={[0.6, 0.34, 0.03]} />
        </mesh>
        <mesh material={filz("#E0392B", 1)} position={[0.7, 2, 0]} castShadow>
          <boxGeometry args={[0.07, 0.62, 0.34]} />
        </mesh>
        <FilzSchild zeilen={text} breite={2.8} hoehe={0.8} farbe="#FBF5EA" haengend position={[0, 3.35, 0]} />
        <mesh material={holz("#8A5A34")} position={[0, 2.75, -0.12]}>
          <boxGeometry args={[0.14, 0.7, 0.14]} />
        </mesh>
      </Klickbar>
    </group>
  );
}

/** Schild «Über mich» an einem Holzpfosten */
export function UeberMichSchild({ ...lage }: Lage) {
  const text = useMemo(() => ["Über mich"], []);
  return (
    <group {...lage}>
      <Klickbar ziel={{ art: "ueber" }} griff={[4.4, 3.6, 1.6]} griffMitte={[0, 1.7, 0]} marke={[1.75, 2.75, 0.3]}>
        <FilzSchild zeilen={text} breite={3.4} hoehe={0.95} farbe="#F9B9D0" pfosten={1.9} />
      </Klickbar>
    </group>
  );
}
