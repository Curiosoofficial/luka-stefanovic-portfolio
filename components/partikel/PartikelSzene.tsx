"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { beat } from "@/components/sound/beat";
import { profil } from "@/data/profil";
import { erzeugeFormen, type FormDaten } from "./formen";
import { fragmentShader, vertexShader } from "./shader";
import { partikelStore, setzePartikelStatus } from "./zustand";

const FOV = 35;
const KAMERA_Z = 14;
// Formen: 0 Name, 1 Tunnel, 2 Porträt, 3 Welle, 4 Atom, 5 Galaxie, 6 @
const LETZTE_FORM = 6;

/** Hex-Farbe direkt als RGB von 0 bis 1, ohne Farbraum-Umrechnung: so leuchtet #FF2E93 genau als #FF2E93. */
function rgb(hex: string, ziel = new THREE.Vector3()) {
  const n = parseInt(hex.slice(1), 16);
  return ziel.set(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Wie viele Punkte das Gerät verträgt */
function anzahlPartikel() {
  const schmal = window.innerWidth < 768;
  const schwach = (navigator.hardwareConcurrency ?? 8) <= 4;
  if (schmal) return schwach ? 6000 : 9000;
  return schwach ? 14000 : 24000;
}

type Platz = { x: number; y: number; s: number; dreh: number; alpha: number };

/**
 * Wo jede Form auf dem Bildschirm sitzt. b und h sind die sichtbare Breite und Höhe in Welt-Einheiten.
 * Auf schmalen Bildschirmen sitzt alles mittig und gedimmt, damit der Text darüber lesbar bleibt.
 */
function layout(form: number, b: number, h: number): Platz {
  const schmal = b / h < 1;
  switch (form) {
    case 0: // Name: so gross wie möglich, das ist der erste Eindruck
      return schmal
        ? { x: 0, y: h * 0.19, s: (b * 0.9) / 10, dreh: 0.12, alpha: 1 }
        : { x: 0, y: h * 0.13, s: Math.min(1.45, (b * 0.88) / 10), dreh: 0.12, alpha: 1 };
    case 1: // Tunnel (Warp): mittig, die Kamera fliegt hindurch
      return schmal
        ? { x: 0, y: 0, s: 0.75, dreh: 0, alpha: 0.85 }
        : { x: 0, y: 0, s: 1, dreh: 0, alpha: 1 };
    case 2: // Porträt
      return schmal
        ? { x: 0, y: h * 0.1, s: Math.min(0.75, (b * 0.8) / 4.6), dreh: 0.3, alpha: 0.45 }
        : { x: b * 0.25, y: h * 0.08, s: Math.min(1, (h * 0.6) / 6.4), dreh: 0.35, alpha: 1 };
    case 3: // Welle
      return schmal
        ? { x: 0, y: -h * 0.25, s: 0.55, dreh: 0, alpha: 0.5 }
        : { x: 0, y: -h * 0.22, s: 1, dreh: 0, alpha: 0.85 };
    case 4: // Atom
      return schmal
        ? { x: 0, y: h * 0.12, s: (b * 0.85) / 7, dreh: 0.5, alpha: 0.45 }
        : { x: b * 0.27, y: 0, s: Math.min(1, (b * 0.36) / 7), dreh: 0.5, alpha: 1 };
    case 5: // Galaxie
      return schmal
        ? { x: 0, y: 0, s: (b * 0.98) / 9.4, dreh: 0, alpha: 0.4 }
        : { x: 0, y: h * 0.04, s: Math.min(1.2, (b * 0.72) / 9.4), dreh: 0, alpha: 0.65 };
    default: // @
      return schmal
        ? { x: 0, y: h * 0.2, s: (b * 0.55) / 4.6, dreh: 0.35, alpha: 0.5 }
        : { x: b * 0.25, y: -h * 0.02, s: Math.min(1, (h * 0.6) / 4.6), dreh: 0.4, alpha: 1 };
  }
}

const mische = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Welche Form gerade dran ist, als Kommazahl: 1.4 heisst «40 % auf dem Weg von Form 1 zu Form 2».
 * Jedes Element mit data-partikel (Abschnitt oder unsichtbarer Marker) startet seinen Übergang,
 * wenn seine Oberkante ins untere Bilddrittel kommt.
 */
function formAusScroll(sektionen: HTMLElement[]) {
  const vh = window.innerHeight;
  const nummer = (el: HTMLElement) => Number(el.dataset.partikel);
  let f = sektionen.length ? nummer(sektionen[0]) : 0;
  for (let i = 1; i < sektionen.length; i++) {
    const oben = sektionen[i].getBoundingClientRect().top;
    const p = Math.min(1, Math.max(0, (vh * 0.85 - oben) / (vh * 0.6)));
    if (p <= 0) break;
    const von = nummer(sektionen[i - 1]);
    f = von + (nummer(sektionen[i]) - von) * p;
  }
  return Math.min(f, LETZTE_FORM);
}

function Wolke({ formen }: { formen: FormDaten }) {
  const geometrie = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(formen.name, 3));
    g.setAttribute("aName", new THREE.BufferAttribute(formen.name, 3));
    g.setAttribute("aPortrait", new THREE.BufferAttribute(formen.portrait, 3));
    g.setAttribute("aWelle", new THREE.BufferAttribute(formen.welle, 3));
    g.setAttribute("aAtom", new THREE.BufferAttribute(formen.atom, 3));
    g.setAttribute("aGalaxie", new THREE.BufferAttribute(formen.galaxie, 3));
    g.setAttribute("aAt", new THREE.BufferAttribute(formen.at, 3));
    g.setAttribute("aZufall", new THREE.BufferAttribute(formen.zufall, 4));
    return g;
  }, [formen]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uZeit: { value: 0 },
          uFormA: { value: 0 },
          uFormB: { value: 1 },
          uMix: { value: 0 },
          uVersatz: { value: new THREE.Vector3() },
          uSkala: { value: 1 },
          uDrehung: { value: 0 },
          uMaus: { value: new THREE.Vector2(999, 999) },
          uMausKraft: { value: 0 },
          uKnallOrt: { value: new THREE.Vector2() },
          uKnallZeit: { value: 100 },
          uFlug: { value: 0 },
          uWarpTempo: { value: 0 },
          uPuls: { value: 0 },
          uIntro: { value: 0 },
          uGroesse: { value: 0.055 },
          uPixel: { value: 1000 },
          uTint: { value: new THREE.Vector3(1, 1, 1) },
          uTintStaerke: { value: 0 },
          uAlpha: { value: 1 },
          // Reihenfolge der Farbbänder: Orange → Limette → Pink → Blau → (wieder Orange)
          uFarbe0: { value: rgb("#FF7A1A") },
          uFarbe1: { value: rgb("#D4FF3A") },
          uFarbe2: { value: rgb("#FF2E93") },
          uFarbe3: { value: rgb("#3D2BFF") },
        },
      }),
    [],
  );

  useEffect(() => () => geometrie.dispose(), [geometrie]);
  useEffect(() => () => material.dispose(), [material]);

  // Im Frame-Loop wird das Material über die Ref angesprochen (so will es React: kein Verändern von useMemo-Werten)
  const punkte = useRef<THREE.Points>(null);
  const sektionen = useRef<HTMLElement[]>([]);
  const ruhig = useRef(false);
  const z = useRef({
    form: 0,
    zeit: 0,
    intro: 0,
    mausKraft: 0,
    mx: 0,
    my: 0,
    tintStaerke: 0,
    tintZiel: new THREE.Vector3(),
    flug: 0,
    tempo: 3,
    letztesY: 0,
  });

  useEffect(() => {
    const sammeln = () => {
      sektionen.current = Array.from(document.querySelectorAll<HTMLElement>("[data-partikel]")).sort(
        (a, b) => Number(a.dataset.partikel) - Number(b.dataset.partikel),
      );
    };
    sammeln();

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    ruhig.current = mq.matches;
    const mqAenderung = (e: MediaQueryListEvent) => (ruhig.current = e.matches);
    mq.addEventListener("change", mqAenderung);

    const bewegen = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      partikelStore.maus.x = (e.clientX / window.innerWidth) * 2 - 1;
      partikelStore.maus.y = -((e.clientY / window.innerHeight) * 2 - 1);
      partikelStore.maus.aktiv = true;
    };
    const verlassen = () => (partikelStore.maus.aktiv = false);
    // Klick (oder Tippen) irgendwo, ausser auf Links und Buttons: Knall an dieser Stelle
    const klicken = (e: PointerEvent) => {
      if (e.target instanceof Element && e.target.closest("a, button")) return;
      partikelStore.knall.x = (e.clientX / window.innerWidth) * 2 - 1;
      partikelStore.knall.y = -((e.clientY / window.innerHeight) * 2 - 1);
      partikelStore.knall.zeit = performance.now();
    };
    window.addEventListener("pointerdown", klicken);
    window.addEventListener("pointermove", bewegen, { passive: true });
    document.documentElement.addEventListener("pointerleave", verlassen);
    window.addEventListener("blur", verlassen);
    window.addEventListener("resize", sammeln);

    return () => {
      mq.removeEventListener("change", mqAenderung);
      window.removeEventListener("pointerdown", klicken);
      window.removeEventListener("pointermove", bewegen);
      document.documentElement.removeEventListener("pointerleave", verlassen);
      window.removeEventListener("blur", verlassen);
      window.removeEventListener("resize", sammeln);
    };
  }, []);

  useFrame((state, delta) => {
    if (!punkte.current) return;
    const u = (punkte.current.material as THREE.ShaderMaterial).uniforms;
    const s = z.current;
    const dt = Math.min(delta, 0.05);
    const still = ruhig.current;
    const b = state.viewport.width;
    const h = state.viewport.height;

    // Scroll → welche Form, wie weit gemischt
    const ziel = formAusScroll(sektionen.current);
    s.form += (ziel - s.form) * Math.min(1, dt * 8);
    const a = Math.min(Math.floor(s.form), LETZTE_FORM);
    const naechste = Math.min(a + 1, LETZTE_FORM);
    let m = s.form - a;
    if (still) m = m > 0.5 ? 1 : 0;
    u.uFormA.value = a;
    u.uFormB.value = naechste;
    u.uMix.value = m;

    // Layout der beiden Formen mischen
    const la = layout(a, b, h);
    const lb = layout(naechste, b, h);
    const mm = m * m * (3 - 2 * m);
    u.uVersatz.value.set(mische(la.x, lb.x, mm), mische(la.y, lb.y, mm), 0);
    u.uSkala.value = mische(la.s, lb.s, mm);
    u.uAlpha.value = mische(la.alpha, lb.alpha, mm);

    // Zeit, Drehung, Intro
    if (!still) s.zeit += dt;
    u.uZeit.value = s.zeit;
    const maus = partikelStore.maus;
    u.uDrehung.value =
      Math.sin(s.zeit * 0.4) * mische(la.dreh, lb.dreh, mm) + (maus.aktiv && !still ? maus.x * 0.15 : 0);
    s.intro = still ? 1 : Math.min(1, s.intro + dt / 2.4);
    u.uIntro.value = s.intro;

    // Maus (weich nachgezogen)
    s.mausKraft += ((maus.aktiv && !still ? 1 : 0) - s.mausKraft) * Math.min(1, dt * 4);
    s.mx += ((maus.x * b) / 2 - s.mx) * Math.min(1, dt * 12);
    s.my += ((maus.y * h) / 2 - s.my) * Math.min(1, dt * 12);
    u.uMaus.value.set(s.mx, s.my);
    u.uMausKraft.value = s.mausKraft;

    // Klick-Knall: Sekunden seit dem letzten Klick und Ort in Welt-Koordinaten
    const knall = partikelStore.knall;
    u.uKnallZeit.value = still ? 100 : (performance.now() - knall.zeit) / 1000;
    u.uKnallOrt.value.set((knall.x * b) / 2, (knall.y * h) / 2);

    // Warp-Flug: Grundtempo plus Scroll-Geschwindigkeit. Wer schneller scrollt, fliegt schneller.
    const y = window.scrollY;
    const scrollTempo = Math.abs(y - s.letztesY) / Math.max(dt, 0.001);
    s.letztesY = y;
    s.tempo += (Math.min(40, 3 + scrollTempo * 0.015) - s.tempo) * Math.min(1, dt * 3);
    if (!still) s.flug += dt * s.tempo;
    u.uFlug.value = s.flug;
    u.uWarpTempo.value = still ? 0 : Math.min(1, Math.max(0, (s.tempo - 3) / 25));

    // Sound
    u.uPuls.value = still ? 0 : beat.puls();

    // Projektfarbe
    rgb(partikelStore.tint, s.tintZiel);
    u.uTint.value.lerp(s.tintZiel, Math.min(1, dt * 4));
    s.tintStaerke += ((partikelStore.tintAn ? 1 : 0) - s.tintStaerke) * Math.min(1, dt * 3);
    u.uTintStaerke.value = s.tintStaerke;

    // Pixel pro Welteinheit in 1 Einheit Abstand
    u.uPixel.value = (state.size.height * state.viewport.dpr) / (2 * Math.tan((FOV * Math.PI) / 360));
  });

  return <points ref={punkte} geometry={geometrie} material={material} frustumCulled={false} />;
}

function ladeBild(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const bild = new Image();
    bild.onload = () => resolve(bild);
    bild.onerror = reject;
    bild.src = src;
  });
}

export default function PartikelSzene() {
  const [formen, setFormen] = useState<FormDaten | null>(null);

  useEffect(() => {
    let abgebrochen = false;
    (async () => {
      const n = anzahlPartikel();
      // Die Titelschrift muss geladen sein, bevor wir «LUKA» aufs Canvas zeichnen
      const schrift =
        getComputedStyle(document.documentElement).getPropertyValue("--font-bricolage").trim() || "sans-serif";
      try {
        await document.fonts.load(`800 100px ${schrift}`, "LUKA@");
      } catch {
        // Ersatzschrift ist auch okay
      }
      const bild = profil.portrait ? await ladeBild(profil.portrait).catch(() => null) : null;
      const daten = erzeugeFormen(n, { schrift, name: profil.vorname.toUpperCase(), portraitBild: bild });
      if (abgebrochen) return;
      setFormen(daten);
      setzePartikelStatus({ anzahl: n, bereit: true });
    })();
    return () => {
      abgebrochen = true;
    };
  }, []);

  if (!formen) return null;

  return (
    <Canvas
      camera={{ fov: FOV, position: [0, 0, KAMERA_Z], near: 0.1, far: 100 }}
      dpr={[1, 1.75]}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      fallback={null}
    >
      <color attach="background" args={["#0b0b14"]} />
      <Wolke formen={formen} />
    </Canvas>
  );
}
