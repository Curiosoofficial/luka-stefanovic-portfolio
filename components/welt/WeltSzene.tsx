"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { DepthOfField, EffectComposer, N8AO, ToneMapping, Vignette } from "@react-three/postprocessing";
import { type DepthOfFieldEffect, ToneMappingMode } from "postprocessing";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { FOV, KAMERA_START, Welt } from "./Welt";
import { weltStore } from "./zustand";

/**
 * Studio-Umgebung: Eine prozedurale «Fotostudio»-Szene von three.js wird in eine Umgebungs-Textur umgerechnet.
 * Alle Materialien bekommen davon weiches Umgebungslicht und leichte Reflexe, wie unter Softboxen.
 */
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

/**
 * Tiefenunschärfe wie bei einem Makro-Objektiv.
 * Die Standard-Unschärfe macht Nahes und Fernes gleich stark unscharf. Bei einer echten Linse
 * verschwimmt aber der Vordergrund viel stärker als der Hintergrund. Darum wird die Formel im Shader angepasst:
 * nah: volle Unschärfe schon nach 55 % des Bereichs, fern: nur 45 % der Unschärfe.
 */
function MakroUnschaerfe() {
  const ref = useRef<DepthOfFieldEffect>(null);
  useEffect(() => {
    const coc = ref.current?.cocMaterial;
    if (!coc) return;
    const alt =
      "float magnitude=smoothstep(0.0,focusRange,abs(signedDistance));gl_FragColor.rg=magnitude*vec2(step(signedDistance,0.0),step(0.0,signedDistance));";
    if (!coc.fragmentShader.includes(alt)) return;
    coc.fragmentShader = coc.fragmentShader.replace(
      alt,
      "float nah=smoothstep(0.0,focusRange*0.55,-signedDistance);float fern=smoothstep(0.0,focusRange,signedDistance)*0.45;gl_FragColor.rg=vec2(nah,fern);",
    );
    coc.needsUpdate = true;
  }, []);
  // Scharf in 19 Einheiten Abstand: genau die Ebene der Buchstaben
  return <DepthOfField ref={ref} worldFocusDistance={19} worldFocusRange={12} bokehScale={4} />;
}

/**
 * Der 3D-Canvas hinter der ganzen Seite.
 * Nachbearbeitung wie bei einer echten Kamera:
 * - N8AO (Ambient Occlusion): weiche Schatten in Ecken, Ritzen und überall, wo Teile sich berühren
 * - Tiefenunschärfe wie bei einem Makro-Objektiv: scharf sind die Buchstaben, das Fransen-Gras ganz vorne
 *   und die Hügel hinten werden weich. Das lässt die Szene wie eine echte Miniatur wirken.
 * - ToneMapping (filmisch) und eine leichte Vignette
 */
export default function WeltSzene() {
  const ruhig = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    ruhig.current = mq.matches;
    const aenderung = (e: MediaQueryListEvent) => (ruhig.current = e.matches);
    mq.addEventListener("change", aenderung);

    const bewegen = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      weltStore.maus.x = (e.clientX / window.innerWidth) * 2 - 1;
      weltStore.maus.y = -((e.clientY / window.innerHeight) * 2 - 1);
      weltStore.maus.aktiv = true;
    };
    const verlassen = () => (weltStore.maus.aktiv = false);
    // Klick (oder Tippen) irgendwo, ausser auf Links und Buttons: die Filzbuchstaben pendeln
    const klicken = (e: PointerEvent) => {
      if (e.target instanceof Element && e.target.closest("a, button")) return;
      weltStore.klick.zeit = performance.now();
    };
    window.addEventListener("pointermove", bewegen, { passive: true });
    window.addEventListener("pointerdown", klicken);
    document.documentElement.addEventListener("pointerleave", verlassen);
    window.addEventListener("blur", verlassen);
    return () => {
      mq.removeEventListener("change", aenderung);
      window.removeEventListener("pointermove", bewegen);
      window.removeEventListener("pointerdown", klicken);
      document.documentElement.removeEventListener("pointerleave", verlassen);
      window.removeEventListener("blur", verlassen);
    };
  }, []);

  return (
    <Canvas
      shadows
      flat
      camera={{ fov: FOV, position: KAMERA_START, near: 0.5, far: 120 }}
      dpr={[1, 1.75]}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      fallback={null}
    >
      <Studio />
      <Welt ruhig={ruhig} />
      <EffectComposer multisampling={4}>
        <N8AO aoRadius={1.2} distanceFalloff={1.2} intensity={2.2} color="#3a2a1a" halfRes quality="medium" />
        <MakroUnschaerfe />
        {/* «Neutral» (Khronos) lässt Materialfarben originalgetreu, statt sie wie AgX zu entsättigen */}
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        <Vignette offset={0.3} darkness={0.35} />
      </EffectComposer>
    </Canvas>
  );
}
