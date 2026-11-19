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
  { pos: [0, 0.5, 24], ziel: [0, 0, -2] }, // Hero: Editor oben rechts, Text der Seite links unten
  { pos: [8, 3.5, 20], ziel: [0, 0.4, 0] }, // Drahtgitter, schräg von oben rechts
  { pos: [-6.5, 1.8, 20], ziel: [0, 0, 0] }, // fertige Seite, leicht von links: zeigt die Projekte
  { pos: [-2.5, 0.6, 20.5], ziel: [0, 0, 0] }, // fast frontal, die Seite geht live
  { pos: [4, -3, 20], ziel: [0, -3.2, 0] }, // Spielplatz: Seite rutscht nach oben, über die Kacheln
  { pos: [-2, 1.2, 23], ziel: [0, -0.2, -1] }, // Finale mit den leuchtenden Rahmen
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
const blickRichtung = new THREE.Vector3();
const seitwaerts = new THREE.Vector3();
const OBEN = new THREE.Vector3(0, 1, 0);

/** Breite der fertigen Seite plus etwas Luft: so viel muss in die rechte Bildhälfte passen */
const SEITE_MIT_RAND = 20;

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

    // Die 3D-Seite zeigt das Projekt, das links gerade offen ist (nur solange der Projekt-Abschnitt läuft)
    welt.zeigeProjekt(weltStore.projekt.index);
    welt.update(s.t, state.clock.elapsedTime, dt, puls, still);

    // Kamera auf der Kurve
    const u = s.t / (STATIONEN.length - 1);
    KURVE_POS.getPoint(u, pos);
    KURVE_ZIEL.getPoint(u, ziel);
    const kamera = state.camera as THREE.PerspectiveCamera;
    const sichtbreite = 2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * kamera.aspect;
    const abstandStation = pos.distanceTo(ziel);

    // Aufteilung des Bildschirms: Ab «Über mich» steht der Text links, die 3D-Seite rechts daneben.
    // Auf schmalen (Hochformat-)Bildschirmen geht das nicht, dort bleibt die Seite mittig hinter dem Text.
    const breitbild = THREE.MathUtils.smoothstep(kamera.aspect, 1.05, 1.35);
    const rechts = THREE.MathUtils.smoothstep(s.t, 0.5, 1.1) * breitbild;
    // So weit weg, dass die Seite in die rechte Hälfte (bzw. auf dem Handy ganz ins Bild) passt
    const abstandHaelfte = SEITE_MIT_RAND / (sichtbreite * 0.5);
    const abstandGanz = 14 / sichtbreite;
    const zielAbstand = THREE.MathUtils.lerp(abstandGanz, abstandHaelfte, breitbild);
    const aufbau = THREE.MathUtils.smoothstep(s.t, 0.45, 1.1);
    const faktor = Math.max(1, 1 + (zielAbstand / abstandStation - 1) * aufbau);
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

    // Kamera und Blickpunkt gemeinsam nach links schieben: Die Seite rutscht dadurch in die rechte Bildhälfte
    blickRichtung.copy(blickZiel).sub(kamera.position).normalize();
    seitwaerts.crossVectors(blickRichtung, OBEN).normalize();
    const verschiebung = sichtbreite * kamera.position.distanceTo(blickZiel) * 0.25 * rechts;
    kamera.position.addScaledVector(seitwaerts, -verschiebung);
    blickZiel.addScaledVector(seitwaerts, -verschiebung);
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
