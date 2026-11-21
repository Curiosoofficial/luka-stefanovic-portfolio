"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, BrightnessContrast, DepthOfField, EffectComposer, GodRays, HueSaturation, N8AO, ToneMapping, Vignette } from "@react-three/postprocessing";
import { type DepthOfFieldEffect, ToneMappingMode } from "postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useWeltEingaben } from "@/components/welt/eingaben";
import { BLICKPUNKT, Berg, HIMMEL, Kamerafahrt, KAMERA_START, SONNE_ORT } from "./Berg";
import { Ladeanzeige } from "./Ladeanzeige";

/** Weiches Studiolicht als Umgebung: gibt Wolle und Filz ihren weichen Glanz */
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

/** Meldet, sobald der Berg wirklich zu sehen ist: nach den ersten gezeichneten Bildern */
function Bereit({ melden }: { melden: () => void }) {
  const bilder = useRef(0);
  useFrame(() => {
    bilder.current += 1;
    if (bilder.current === 3) melden();
  });
  return null;
}

/**
 * Misst nach dem Laden kurz, wie flüssig der Berg läuft. Sind es deutlich unter 30 Bilder pro Sekunde,
 * meldet sie das einmal: Die Szene schaltet dann teure Effekte ab und rechnet mit weniger Bildpunkten.
 * Bilder aus einem Tab im Hintergrund (lange Pausen) zählen nicht mit.
 */
function Leistung({ melden }: { melden: () => void }) {
  const messung = useRef({ bilder: 0, zeit: 0, fertig: false });
  useFrame((_, delta) => {
    const m = messung.current;
    if (m.fertig || delta > 0.25) return;
    m.bilder += 1;
    // Die ersten Bilder nach dem Laden sind immer langsam: nicht mitzählen
    if (m.bilder <= 40) return;
    m.zeit += delta;
    if (m.bilder === 160) {
      m.fertig = true;
      if (m.zeit / 120 > 1 / 27) melden();
    }
  });
  return null;
}

/**
 * Der Himmel: eine grosse Kugel rund um die Kamera mit einem Farbverlauf vom hellen Horizont ins tiefe Blau.
 * Die Farben kommen aus HIMMEL und ändern sich mit der Höhe der Kamera (oben Mittag, unten Abend).
 */
function Himmelskugel() {
  const kugel = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uHorizont: { value: HIMMEL.horizont },
          uZenit: { value: HIMMEL.zenit },
        },
        vertexShader: "varying vec3 vRichtung;\nvoid main() {\n  vRichtung = normalize(position);\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n}",
        fragmentShader:
          "uniform vec3 uHorizont;\nuniform vec3 uZenit;\nvarying vec3 vRichtung;\nvoid main() {\n  float hoch = clamp(normalize(vRichtung).y / 0.3, 0.0, 1.0);\n  gl_FragColor = vec4(mix(uHorizont, uZenit, pow(hoch, 0.75)), 1.0);\n  #include <tonemapping_fragment>\n  #include <colorspace_fragment>\n}",
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  // Die Kugel wandert mit der Kamera mit: Der Horizont bleibt immer auf Augenhöhe
  useFrame((state) => {
    kugel.current?.position.copy(state.camera.position);
  });
  return (
    <mesh ref={kugel} material={material} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[430, 32, 20]} />
    </mesh>
  );
}

/**
 * Tiefenunschärfe wie bei einem Makro-Objektiv: Scharf ist, wohin die Kamera gerade schaut.
 * Ganz nahe Dinge verschwimmen stärker als ferne, das lässt den Berg wie eine echte Miniatur wirken.
 */
function MakroUnschaerfe() {
  const ref = useRef<DepthOfFieldEffect>(null);
  useEffect(() => {
    const coc = ref.current?.cocMaterial;
    if (!coc) return;
    const alt = "float magnitude=smoothstep(0.0,focusRange,abs(signedDistance));gl_FragColor.rg=magnitude*vec2(step(signedDistance,0.0),step(0.0,signedDistance));";
    if (!coc.fragmentShader.includes(alt)) return;
    coc.fragmentShader = coc.fragmentShader.replace(
      alt,
      "float nah=smoothstep(focusRange*0.25,focusRange*1.1,-signedDistance);float fern=smoothstep(0.0,focusRange*2.5,signedDistance)*0.3;gl_FragColor.rg=vec2(nah,fern);",
    );
    coc.needsUpdate = true;
  }, []);
  // Schärfe folgt dem Blickpunkt der Kamera
  useFrame(() => {
    ref.current?.target?.copy(BLICKPUNKT);
  });
  return <DepthOfField ref={ref} target={KAMERA_START} worldFocusRange={20} bokehScale={3} />;
}

function Welt({
  ruhig,
  sparsam,
  hochformat,
  sonnenschein,
}: {
  ruhig: React.RefObject<boolean>;
  sparsam: boolean;
  hochformat: boolean;
  sonnenschein: (kugel: THREE.Mesh | null) => void;
}) {
  const licht = useRef<THREE.DirectionalLight>(null);
  const umgebung = useRef<THREE.HemisphereLight>(null);
  const nebel = useRef<THREE.Fog>(null);
  const himmel = useRef<THREE.Color>(null);
  return (
    <>
      <color ref={himmel} attach="background" args={["#BFE2F8"]} />
      <fog ref={nebel} attach="fog" args={["#BFE2F8", 95, 380]} />
      <Himmelskugel />
      {/* Bläuliches Grundlicht von oben, warmes Rückstrahlen vom Boden: Die Schatten bekommen Farbe statt Grau */}
      <hemisphereLight ref={umgebung} args={["#9EC6FF", "#7C6C58", 0.62]} />
      {/* Kräftige warme Sonne von der Seite: Maschen, Rippen und Bäume werfen deutliche Schatten */}
      <directionalLight
        ref={licht}
        intensity={3.1}
        color="#FFF3E0"
        castShadow
        shadow-mapSize={sparsam ? [1024, 1024] : [2048, 2048]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={1}
        shadow-camera-far={150}
        shadow-bias={-0.0005}
        shadow-normalBias={0.06}
      />
      {/* Lichthof hinter der Sonne: Von ihm gehen die Sonnenstrahlen aus (siehe GodRays unten) */}
      <mesh ref={sonnenschein} position={[SONNE_ORT[0], SONNE_ORT[1], SONNE_ORT[2] - 4]}>
        <sphereGeometry args={[12, 24, 16]} />
        <meshBasicMaterial color="#FFE9A6" transparent opacity={0.55} depthWrite={false} fog={false} toneMapped={false} />
      </mesh>
      <Kamerafahrt ruhig={ruhig} licht={licht} umgebung={umgebung} nebel={nebel} himmel={himmel} />
      <Berg ruhig={ruhig} sparsam={sparsam} hochformat={hochformat} />
    </>
  );
}

/**
 * Der Strick-Berg als 3D-Canvas, fix hinter der ganzen Seite.
 * Die Seite selbst ist nur eine lange, leere Scroll-Strecke: Scrollen heisst, am Berg hinunterzufahren.
 */
export default function BergSzene() {
  const ruhig = useWeltEingaben();
  // Handys und schwache Geräte bekommen ein gröberes Gelände, weniger Bäume und Wolken
  const [sparsam] = useState(() => window.matchMedia("(max-width: 767px)").matches || (navigator.hardwareConcurrency ?? 8) <= 4);
  // Hochformat: Die Schilder am Gipfel stehen dann untereinander (ändert sich, wenn man das Handy dreht)
  const [hochformat, setHochformat] = useState(() => window.innerHeight > window.innerWidth);
  useEffect(() => {
    const pruefen = () => setHochformat(window.innerHeight > window.innerWidth);
    window.addEventListener("resize", pruefen);
    return () => window.removeEventListener("resize", pruefen);
  }, []);
  // Die Ladeanzeige bleibt, bis die ersten Bilder des Bergs gezeichnet sind
  const [bereit, setBereit] = useState(false);
  // Der Lichthof der Sonne, sobald er in der Welt steht: Von ihm gehen die Sonnenstrahlen aus
  const [sonne, setSonne] = useState<THREE.Mesh | null>(null);
  // Läuft der Berg auf diesem Gerät zu langsam, fallen Tiefenunschärfe und Sonnenstrahlen weg und die Auflösung sinkt
  const [schwach, setSchwach] = useState(false);
  return (
    <>
      <Canvas
        shadows
        camera={{ fov: 46, position: KAMERA_START, near: 0.3, far: 460 }}
        // Das Studiolicht nur schwach: Zu viel davon macht alle Farben blass
        scene={{ environmentIntensity: 0.4 }}
        dpr={schwach ? 1 : sparsam ? [1, 1.5] : [1, 1.75]}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
        }}
        // Die Bühne liegt hinter der Seite: Zeiger-Ereignisse kommen darum vom ganzen Dokument, damit man Gondeln anklicken kann
        eventSource={document.body}
        eventPrefix="client"
        fallback={null}
      >
        <Studio />
        <Bereit melden={() => setBereit(true)} />
        <Leistung melden={() => setSchwach(true)} />
        <Welt ruhig={ruhig} sparsam={sparsam} hochformat={hochformat} sonnenschein={setSonne} />
        {/* autoClear aus: Sonst löscht der Strahlen-Effekt die Tiefe der Szene, und die Sonne scheint durch den Berg hindurch */}
        <EffectComposer autoClear={false} multisampling={sparsam || schwach ? 0 : 4}>
          <N8AO aoRadius={1.6} distanceFalloff={1.2} intensity={2.8} color="#2a1c14" halfRes quality="medium" />
          {schwach ? <></> : <MakroUnschaerfe />}
          {/* Sonnenstrahlen: Lichtbündel, die von der Sonne ausgehen und von den Gipfeln unterbrochen werden (nicht auf schwachen Geräten) */}
          {sonne && !sparsam && !schwach ? <GodRays sun={sonne} samples={45} density={0.96} decay={0.94} weight={0.26} exposure={0.34} clampMax={0.8} blur /> : <></>}
          {/* Sanftes Überstrahlen: Schnee in der Sonne, die Sonne selbst und die Fenster im Dorf leuchten */}
          <Bloom mipmapBlur intensity={0.38} luminanceThreshold={0.92} luminanceSmoothing={0.25} radius={0.7} />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
          {/* Sattere Farben und mehr Kontrast */}
          <HueSaturation saturation={0.12} />
          <BrightnessContrast brightness={-0.03} contrast={0.14} />
          <Vignette offset={0.28} darkness={0.42} />
        </EffectComposer>
      </Canvas>
      <Ladeanzeige weg={bereit} />
    </>
  );
}
