"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { stichPunkte } from "./formen";
import { filz } from "./materialien";
import { Knopf3D, Naht, polsterGeometrie } from "./teile";

/**
 * Der Körper einer Filzkarte als echtes 3D-Objekt: eine dicke, gepolsterte Filzplatte,
 * darauf eine Naht aus einzelnen Fadenstichen und ein gedrechselter Knopf, beleuchtet und mit Schatten.
 *
 * Jede Karte bekommt ein eigenes kleines 3D-Bild (Canvas), das genau hinter dem HTML-Text der Karte liegt.
 * So bleibt die Reihenfolge richtig (vordere Karten verdecken hintere samt Text),
 * und der Text bleibt echtes HTML: scharf, durchsuchbar, anklickbar.
 *
 * Masseinheit in dieser Szene: CSS-Pixel. Die orthografische Kamera bildet 1 Einheit auf 1 Pixel ab,
 * darum passt die Vorderseite der Platte exakt auf das Rechteck der Karte.
 *
 * Das 3D-Bild existiert nur, solange die Karte in der Nähe des sichtbaren Bereichs ist.
 * So hat der Browser nie zu viele 3D-Bilder gleichzeitig offen.
 */

/** So viel Platz bleibt rund um die Karte im Canvas: für die Dicke unten, den Knopf und Schatten */
const RAND = 40;
/** Schräge Projektion: Je weiter hinten, desto weiter unten. So sieht man unten die Dicke der Platte. */
const SCHERUNG = 0.42;

export type KnopfAngabe = {
  farbe: string;
  /** Durchmesser in Pixeln */
  groesse: number;
  ecke: "oben-links" | "oben-rechts";
  /** Abstand der Knopfmitte von beiden Kanten; zwei Werte: [schmale Karte, breite Karte ab 700 px] */
  abstand: number | [number, number];
};

type Masse = {
  /** Eckenradius der Karte in Pixeln */
  radius?: number;
  /** Höhe der runden Filzkante */
  polster?: number;
  /** Gerader Teil der Dicke */
  dicke?: number;
  /** Abstand der Naht vom sichtbaren Rand */
  naht?: number;
};

type Props = Masse & {
  farbe: string;
  knopf?: KnopfAngabe;
  /** Meldet, ob das 3D-Bild gerade gezeichnet ist (true) oder nicht mehr existiert (false) */
  onBereit?: (da: boolean) => void;
};

/** Rechteck mit runden Ecken, Mitte im Ursprung */
function rundRechteck(breite: number, hoehe: number, radius: number) {
  const r = Math.max(1, Math.min(radius, breite / 2, hoehe / 2));
  const x = -breite / 2;
  const y = -hoehe / 2;
  const form = new THREE.Shape();
  form.moveTo(x + r, y);
  form.lineTo(x + breite - r, y);
  form.absarc(x + breite - r, y + r, r, -Math.PI / 2, 0, false);
  form.lineTo(x + breite, y + hoehe - r);
  form.absarc(x + breite - r, y + hoehe - r, r, 0, Math.PI / 2, false);
  form.lineTo(x + r, y + hoehe);
  form.absarc(x + r, y + hoehe - r, r, Math.PI / 2, Math.PI, false);
  form.lineTo(x, y + r);
  form.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return form;
}

/** Weiches Studiolicht als Umgebung, wie in der grossen Welt */
function Studio() {
  const gl = useThree((s) => s.gl);
  const textur = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const t = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return t;
  }, [gl]);
  useEffect(() => () => textur.dispose(), [textur]);
  return <primitive object={textur} attach="environment" />;
}

function Platte({ farbe, knopf, radius = 35, polster = 14, dicke = 16, naht = 20, onBereit }: Props) {
  const { width, height } = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const schraeg = useRef<THREE.Group>(null);
  const gemeldet = useRef(false);

  const breite = Math.max(10, width - RAND * 2);
  const hoehe = Math.max(10, height - RAND * 2);
  const vorne = dicke / 2 + polster;
  // Die runde Kante legt rundherum so viel zu: Der Umriss ist um genau so viel kleiner
  const kante = polster * 0.85;

  const { geometrie, stiche } = useMemo(() => {
    const form = rundRechteck(breite - kante * 2, hoehe - kante * 2, radius - kante);
    return {
      geometrie: polsterGeometrie(form, dicke, polster, 12),
      stiche: stichPunkte(form, Math.max(3, naht - kante), 19),
    };
  }, [breite, hoehe, kante, radius, dicke, polster, naht]);
  useEffect(() => () => geometrie.dispose(), [geometrie]);

  // Schräge Projektion als feste Matrix: y' = y + SCHERUNG · z
  useLayoutEffect(() => {
    const g = schraeg.current;
    if (!g) return;
    g.matrixAutoUpdate = false;
    g.matrix.set(1, 0, 0, 0, 0, 1, SCHERUNG, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    g.matrixWorldNeedsUpdate = true;
  }, []);

  // Die Szene ändert sich nicht von selbst: Nur nach dem Aufbau ein paar Mal neu zeichnen
  useEffect(() => {
    const zeiten = [30, 250, 900].map((ms) => window.setTimeout(() => invalidate(), ms));
    return () => zeiten.forEach((t) => window.clearTimeout(t));
  }, [invalidate, breite, hoehe]);

  useFrame(() => {
    if (gemeldet.current) return;
    gemeldet.current = true;
    onBereit?.(true);
  });

  const knopfPos = useMemo(() => {
    if (!knopf) return null;
    const a = Array.isArray(knopf.abstand) ? knopf.abstand[breite >= 700 ? 1 : 0] : knopf.abstand;
    const x = knopf.ecke === "oben-rechts" ? breite / 2 - a : -breite / 2 + a;
    return [x, hoehe / 2 - a, vorne + 1.5] as [number, number, number];
  }, [knopf, breite, hoehe, vorne]);

  const schatten = Math.max(breite, hoehe) * 0.7;

  return (
    <>
      <hemisphereLight args={["#fff8ec", "#a08060", 1.15]} />
      <directionalLight
        position={[-breite * 0.35, hoehe * 0.8, 900]}
        intensity={1.5}
        color="#fff1dc"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-schatten}
        shadow-camera-right={schatten}
        shadow-camera-top={schatten}
        shadow-camera-bottom={-schatten}
        shadow-camera-near={10}
        shadow-camera-far={2500}
        shadow-bias={-0.0008}
      />
      <group ref={schraeg}>
        <group position={[0, 0, -vorne]}>
          <mesh geometry={geometrie} material={filz(farbe, 220)} castShadow receiveShadow />
          <Naht stiche={stiche} z={vorne + 0.8} farbe="#FFF8EE" laenge={80} dicke={75} />
          {knopf && knopfPos && <Knopf3D radius={knopf.groesse / 2} farbe={knopf.farbe} position={knopfPos} />}
        </group>
      </group>
    </>
  );
}

const CANVAS_STIL: React.CSSProperties = {
  position: "absolute",
  top: -RAND,
  left: -RAND,
  width: `calc(100% + ${RAND * 2}px)`,
  height: `calc(100% + ${RAND * 2}px)`,
  pointerEvents: "none",
};

export default function KartenKoerper(props: Props) {
  const huelle = useRef<HTMLDivElement>(null);
  const [nah, setNah] = useState(false);
  const { onBereit } = props;

  // Nur zeichnen, solange die Karte höchstens eine Bildschirmhöhe vom sichtbaren Bereich entfernt ist
  useEffect(() => {
    const el = huelle.current;
    if (!el) return;
    const beobachter = new IntersectionObserver(([eintrag]) => setNah(eintrag.isIntersecting), { rootMargin: "100% 0px" });
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, []);

  // Verschwindet das 3D-Bild, muss die Karte wieder ihre flache Filzfläche zeigen
  useEffect(() => {
    if (!nah) onBereit?.(false);
  }, [nah, onBereit]);

  return (
    <div ref={huelle} aria-hidden style={CANVAS_STIL}>
      {nah && (
        <Canvas
          orthographic
          camera={{ position: [0, 0, 1200], zoom: 1, near: 1, far: 4000 }}
          dpr={[1, 2]}
          frameloop="demand"
          shadows
          // «Neutral» lässt die Farben, wie sie sind: gleiche Farbwiedergabe wie die Welt
          gl={{ alpha: true, antialias: true, powerPreference: "low-power", toneMapping: THREE.NeutralToneMapping }}
          // Grösse ohne CSS-Transformationen messen: Die Karte wird beim Reinfliegen gekippt und skaliert
          resize={{ offsetSize: true, scroll: false }}
          fallback={null}
          style={{ position: "absolute", inset: 0 }}
        >
          <Studio />
          <Platte {...props} />
        </Canvas>
      )}
    </div>
  );
}
