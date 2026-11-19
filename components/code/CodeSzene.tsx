"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, ChromaticAberration, EffectComposer, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useWeltEingaben } from "@/components/welt/eingaben";
import { weltStore } from "@/components/welt/zustand";
import { CodeWelt } from "./codeWelt";
import { schriftenLesen, type Schriften } from "./texturen";

const FOV = 40;
const HINTERGRUND = "#05060c";
const ABSCHNITTE = ["start", "ueber-mich", "projekte", "skills", "spielplatz", "kontakt"];

/**
 * Kamerafahrt: eine Station pro Abschnitt. Dazwischen fährt die Kamera auf einer weichen Kurve (Catmull-Rom).
 * pos = wo die Kamera steht, ziel = wohin sie schaut.
 */
const STATIONEN: { pos: [number, number, number]; ziel: [number, number, number] }[] = [
  { pos: [0, 0.5, 24], ziel: [0, 0, -2] }, // Code-Wolke, frontal
  { pos: [11, 4.5, 19], ziel: [0, 0.4, 0] }, // Drahtgitter, schräg von oben rechts
  { pos: [-10.5, 2.5, 18.5], ziel: [0.5, 0, 0] }, // Glas-Bausteine, von links
  { pos: [0, 0.3, 19.5], ziel: [0, 0, 0] }, // fertige Seite, frontal
  { pos: [6, -2.2, 17.5], ziel: [1, -0.8, 0] }, // näher an den Karten, die Seite geht live
  { pos: [-2.5, 1.5, 29], ziel: [0, -0.3, -2] }, // zurück: Rahmen breiten sich um die fertige Seite aus
];

const KURVE_POS = new THREE.CatmullRomCurve3(
  STATIONEN.map((s) => new THREE.Vector3(...s.pos)),
  false,
  "centripetal",
);
const KURVE_ZIEL = new THREE.CatmullRomCurve3(
  STATIONEN.map((s) => new THREE.Vector3(...s.ziel)),
  false,
  "centripetal",
);

// Hilfsvektoren, einmal angelegt und in jedem Frame wiederverwendet
const pos = new THREE.Vector3();
const ziel = new THREE.Vector3();
const versatz = new THREE.Vector3();
const blickZiel = new THREE.Vector3();

/**
 * Fortschritt aus der Scroll-Position: 0 bis 5, eine Stufe pro Abschnitt.
 * Am Anfang eines Abschnitts bleibt die Welt fast stehen (zum Lesen), im hinteren Teil baut sie weiter.
 */
function fortschrittAusScroll() {
  const bezug = window.scrollY + window.innerHeight * 0.3;
  const oben = ABSCHNITTE.map((id) => {
    const el = document.getElementById(id);
    return el ? el.getBoundingClientRect().top + window.scrollY : 0;
  });
  oben.push(document.documentElement.scrollHeight);
  for (let i = 0; i < ABSCHNITTE.length; i++) {
    if (bezug < oben[i + 1]) {
      const p = Math.min(1, Math.max(0, (bezug - oben[i]) / Math.max(1, oben[i + 1] - oben[i])));
      return Math.min(ABSCHNITTE.length - 1, i + p * 0.12 + THREE.MathUtils.smoothstep(p, 0.3, 1) * 0.88);
    }
  }
  return ABSCHNITTE.length - 1;
}

/** Weiches Studiolicht als Umgebung: gibt den dunklen Glasplatten Reflexe */
function Umgebung() {
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

function Welt({ schriften, sparsam, ruhig }: { schriften: Schriften; sparsam: boolean; ruhig: React.RefObject<boolean> }) {
  const welt = useMemo(() => new CodeWelt(schriften, sparsam), [schriften, sparsam]);
  useEffect(() => () => welt.dispose(), [welt]);
  const zustand = useRef({ t: 0, mx: 0, my: 0, erstes: true });

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const still = ruhig.current;
    const s = zustand.current;

    // Fortschritt weich nachziehen; beim ersten Bild direkt springen (z. B. nach Neuladen mitten auf der Seite)
    const zielT = fortschrittAusScroll();
    s.t = s.erstes || still ? zielT : s.t + (zielT - s.t) * Math.min(1, dt * 3.5);
    s.erstes = false;

    // Klick: kurzer Puls, klingt in etwa einer Sekunde ab
    const seitKlick = performance.now() - weltStore.klick.zeit;
    const puls = still ? 0 : Math.exp(-seitKlick / 320) * (seitKlick < 1500 ? 1 : 0);

    welt.update(s.t, state.clock.elapsedTime, dt, puls, still);

    // Kamera auf der Kurve; auf schmalen Bildschirmen weiter weg, damit die Seite ganz ins Bild passt
    const u = s.t / (STATIONEN.length - 1);
    KURVE_POS.getPoint(u, pos);
    KURVE_ZIEL.getPoint(u, ziel);
    const kamera = state.camera as THREE.PerspectiveCamera;
    const sichtbreite = 2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * kamera.aspect;
    // Ganz zurück erst, wenn die Seite als Ganzes zu sehen ist; die Code-Wolke darf über den Rand gehen
    const vollFaktor = Math.max(1, 14 / sichtbreite / 19.5);
    const faktor = 1 + (vollFaktor - 1) * THREE.MathUtils.smoothstep(s.t, 0.6, 2.2);
    versatz.copy(pos).sub(ziel).multiplyScalar(faktor);

    // Maus: Kamera folgt leicht (Parallaxe)
    const maus = weltStore.maus;
    const mausAn = maus.aktiv && !still;
    s.mx += ((mausAn ? maus.x : 0) - s.mx) * Math.min(1, dt * 2.5);
    s.my += ((mausAn ? maus.y : 0) - s.my) * Math.min(1, dt * 2.5);
    const abstand = versatz.length() / 20;
    kamera.position.copy(ziel).add(versatz);
    kamera.position.x += s.mx * 1.8 * abstand;
    kamera.position.y += s.my * 1.0 * abstand;
    blickZiel.copy(ziel);
    kamera.lookAt(blickZiel);
  });

  return <primitive object={welt} />;
}

/**
 * Der 3D-Canvas der Code-Welt, fix hinter der ganzen Seite.
 * Nachbearbeitung für den Neon-Look:
 * - Bloom: Alles, was heller als Weiss leuchtet (Kanten, Code, Scan), bekommt einen weichen Schein
 * - leichte chromatische Aberration am Rand und feines Filmkorn: wirkt wie eine echte Kamera
 * - Vignette: Ränder dunkler, der Blick geht in die Mitte
 */
export default function CodeSzene() {
  const ruhig = useWeltEingaben();
  const [schriften, setSchriften] = useState<Schriften | null>(null);
  const [sparsam, setSparsam] = useState(false);
  const aberration = useMemo(() => new THREE.Vector2(sparsam ? 0 : 0.0007, sparsam ? 0 : 0.0005), [sparsam]);

  useEffect(() => {
    let aktiv = true;
    // Die Texturen zeichnen Text mit den Schriften der Seite: erst loslegen, wenn sie geladen sind
    document.fonts.ready.then(() => {
      if (!aktiv) return;
      setSparsam(window.matchMedia("(max-width: 767px)").matches || (navigator.hardwareConcurrency ?? 8) <= 4);
      setSchriften(schriftenLesen());
    });
    return () => {
      aktiv = false;
    };
  }, []);

  return (
    <Canvas
      flat
      camera={{ fov: FOV, position: [0, 0.5, 24], near: 0.1, far: 200 }}
      dpr={sparsam ? [1, 1.5] : [1, 1.75]}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      fallback={null}
    >
      <color attach="background" args={[HINTERGRUND]} />
      <fog attach="fog" args={[HINTERGRUND, 26, 85]} />
      <Umgebung />
      {schriften && <Welt schriften={schriften} sparsam={sparsam} ruhig={ruhig} />}
      <EffectComposer multisampling={sparsam ? 0 : 4}>
        <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.85} luminanceSmoothing={0.25} radius={0.75} />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        <ChromaticAberration
          offset={aberration}
          radialModulation
          modulationOffset={0.35}
        />
        <Noise premultiply blendFunction={BlendFunction.ADD} opacity={0.035} />
        <Vignette offset={0.25} darkness={0.6} />
      </EffectComposer>
    </Canvas>
  );
}
