"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useWeltEingaben } from "@/components/welt/eingaben";
import { weltStore } from "@/components/welt/zustand";

/**
 * Glas-Welt: eine ruhige Skulptur aus Glas, Tintenblau und Orange auf Off-White (60-30-10-Regel).
 *
 * Echtes Glas in three.js: MeshPhysicalMaterial mit «transmission». Der Renderer zeichnet zuerst alles hinter dem Glas
 * in eine Textur und bricht sie dann durch die Glasform (Brechung, Dicke, Farbsäume durch «dispersion»).
 * Darum stehen hinter dem Glasring bewusst farbige Körper: Ohne etwas dahinter wäre Glas auf Weiss unsichtbar.
 */

export const GRUND = "#F3F2EE";
const TINTE = "#14213D";
const ORANGE = "#FCA311";

/** Weiches Studiolicht als Umgebung: gibt dem Glas Spiegelungen und Lichtkanten */
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

/** Weicher Schatten unter der Skulptur: ein Kreisverlauf auf einer Ebene, wird schwächer, je höher sie schwebt */
function schattenTextur() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  if (ctx) {
    const v = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    v.addColorStop(0, "rgba(20, 33, 61, 0.55)");
    v.addColorStop(0.5, "rgba(20, 33, 61, 0.18)");
    v.addColorStop(1, "rgba(20, 33, 61, 0)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, 256, 256);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Glas: klar, kaum Rauheit, ganz leichte kühle Tönung, Farbsäume an den Kanten */
function glas(dicke: number) {
  return new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    transmission: 1,
    thickness: dicke,
    roughness: 0.02,
    ior: 1.5,
    dispersion: 0.4,
    iridescence: 0.2,
    iridescenceIOR: 1.3,
    attenuationColor: new THREE.Color("#e6ecfa"),
    attenuationDistance: 9,
    envMapIntensity: 0.85,
  });
}

/** Flache Platte mit runden Ecken: wie eine Karte oder ein Bildschirm hinter dem Glas */
function plattenGeometrie(b: number, h: number, r: number, tiefe: number) {
  const form = new THREE.Shape();
  const x = -b / 2;
  const y = -h / 2;
  form.moveTo(x + r, y);
  form.lineTo(x + b - r, y);
  form.absarc(x + b - r, y + r, r, -Math.PI / 2, 0, false);
  form.lineTo(x + b, y + h - r);
  form.absarc(x + b - r, y + h - r, r, 0, Math.PI / 2, false);
  form.lineTo(x + r, y + h);
  form.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  form.lineTo(x, y + r);
  form.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  const geo = new THREE.ExtrudeGeometry(form, {
    depth: tiefe,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.06,
    bevelSegments: 4,
    curveSegments: 16,
  });
  geo.translate(0, 0, -tiefe / 2);
  return geo;
}

/** Kurzer Puls nach einem Klick, 0 bis 1 */
function klickPuls() {
  const seit = performance.now() - weltStore.klick.zeit;
  return seit < 2500 ? Math.exp(-seit / 600) : 0;
}

function Skulptur({ ruhig }: { ruhig: React.RefObject<boolean> }) {
  const gruppe = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const kugel = useRef<THREE.Mesh>(null);
  const platte = useRef<THREE.Mesh>(null);
  const perle = useRef<THREE.Mesh>(null);
  const schatten = useRef<THREE.Mesh>(null);
  const zustand = useRef({ mx: 0, my: 0, scroll: 0, dreh: 0, drehZiel: 0, letzterKlick: -1 });

  const teile = useMemo(() => {
    const ringGeo = new THREE.TorusGeometry(2.05, 0.66, 96, 192);
    const kugelGeo = new THREE.SphereGeometry(0.95, 64, 64);
    const platteGeo = plattenGeometrie(3.3, 4.3, 0.42, 0.22);
    const perleGeo = new THREE.SphereGeometry(0.55, 64, 64);
    const schattenGeo = new THREE.PlaneGeometry(5.5, 2);
    const ringMat = glas(1.6);
    const perleMat = glas(1.1);
    const kugelMat = new THREE.MeshPhysicalMaterial({
      color: ORANGE,
      roughness: 0.28,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      envMapIntensity: 0.9,
    });
    const platteMat = new THREE.MeshPhysicalMaterial({
      color: TINTE,
      roughness: 0.35,
      clearcoat: 0.6,
      clearcoatRoughness: 0.25,
      envMapIntensity: 0.8,
    });
    const schattenTex = schattenTextur();
    const schattenMat = new THREE.MeshBasicMaterial({ map: schattenTex, transparent: true, depthWrite: false });
    return { ringGeo, kugelGeo, platteGeo, perleGeo, schattenGeo, ringMat, perleMat, kugelMat, platteMat, schattenTex, schattenMat };
  }, []);

  useEffect(
    () => () => {
      for (const ding of Object.values(teile)) ding.dispose();
    },
    [teile],
  );

  useFrame((state, delta) => {
    const g = gruppe.current;
    if (!g || !ring.current || !kugel.current || !platte.current || !perle.current || !schatten.current) return;
    const s = zustand.current;
    const dt = Math.min(delta, 0.05);
    const still = ruhig.current;
    const zeit = still ? 0 : state.clock.elapsedTime;
    const kamera = state.camera as THREE.PerspectiveCamera;

    // Platz im Bild: auf breiten Bildschirmen rechts neben dem Text, auf dem Handy oben über dem Text
    const halbeBreite = Math.tan(THREE.MathUtils.degToRad(kamera.fov / 2)) * kamera.position.z * kamera.aspect;
    const breit = kamera.aspect >= 1.05;
    const zielX = breit ? Math.min(3.6, halbeBreite * 0.48) : 0;
    const zielY = breit ? 0.1 : 2.45;
    const groesse = breit ? 0.8 : Math.min(0.55, halbeBreite / 4.4);

    // Scrollen: Die Skulptur dreht sich weiter und steigt leicht nach oben weg
    const scrollZiel = window.scrollY / Math.max(1, window.innerHeight);
    s.scroll += (scrollZiel - s.scroll) * Math.min(1, dt * 4);

    // Maus: Die Skulptur neigt sich weich zur Maus
    const maus = weltStore.maus;
    const mausAn = maus.aktiv && !still;
    s.mx += ((mausAn ? maus.x : 0) - s.mx) * Math.min(1, dt * 2.2);
    s.my += ((mausAn ? maus.y : 0) - s.my) * Math.min(1, dt * 2.2);

    // Klick: Der Ring dreht sich einmal ganz herum und die Skulptur federt kurz
    const puls = still ? 0 : klickPuls();
    if (weltStore.klick.zeit !== s.letzterKlick) {
      s.letzterKlick = weltStore.klick.zeit;
      if (!still && performance.now() - weltStore.klick.zeit < 200) s.drehZiel += Math.PI * 2;
    }
    s.dreh += (s.drehZiel - s.dreh) * Math.min(1, dt * 2.4);

    g.position.set(zielX, zielY + s.scroll * 0.9, 0);
    g.scale.setScalar(groesse * (1 + puls * 0.05));
    g.rotation.set(-s.my * 0.25 + s.scroll * 0.25, s.mx * 0.45, 0);

    // Ring: schaut zur Kamera, damit man durch die Öffnung auf die orange Kugel sieht; pendelt sanft hin und her
    ring.current.rotation.x = 0.42 + Math.sin(zeit * 0.35) * 0.08;
    ring.current.rotation.y = Math.sin(zeit * 0.25) * 0.45 + s.dreh + s.scroll * 0.8;
    ring.current.position.y = Math.sin(zeit * 0.7) * 0.12;

    // Orange Kugel hinter dem Ring: Man sieht sie durch das Loch und gebrochen durch das Glas
    kugel.current.position.set(0.55 + Math.sin(zeit * 0.5) * 0.15, 0.35 + Math.sin(zeit * 0.8 + 1) * 0.18, -1.3);

    // Tintenblaue Platte dahinter, leicht versetzt: Das Glas bricht ihre Kante sichtbar
    platte.current.position.set(1.05, 0.75 + Math.sin(zeit * 0.5 + 2) * 0.1, -2.6);
    platte.current.rotation.set(0.05, -0.32 + Math.sin(zeit * 0.3) * 0.05, -0.12);

    // Kleine Glasperle vorne
    perle.current.position.set(2.35, -1.75 + Math.sin(zeit * 0.9 + 3) * 0.2, 1.3);

    // Schatten am Boden: wird blasser, wenn die Skulptur hochfährt
    schatten.current.position.set(0.2, -3.3, -0.4);
    (schatten.current.material as THREE.MeshBasicMaterial).opacity = 0.4 * (1 - Math.min(1, s.scroll * 0.6));
  });

  return (
    <group ref={gruppe}>
      <mesh ref={platte} geometry={teile.platteGeo} material={teile.platteMat} />
      <mesh ref={kugel} geometry={teile.kugelGeo} material={teile.kugelMat} />
      <mesh ref={ring} geometry={teile.ringGeo} material={teile.ringMat} />
      <mesh ref={perle} geometry={teile.perleGeo} material={teile.perleMat} />
      <mesh ref={schatten} geometry={teile.schattenGeo} material={teile.schattenMat} rotation-x={-Math.PI / 2} />
    </group>
  );
}

/**
 * Der 3D-Canvas der Glas-Welt, fix hinter der ganzen Seite.
 * Bewusst ohne Nachbearbeitung (kein Bloom, keine Unschärfe): Das Design soll klar und ruhig bleiben.
 */
export default function GlasSzene() {
  const ruhig = useWeltEingaben();
  return (
    <Canvas
      camera={{ fov: 32, position: [0, 0, 14], near: 0.1, far: 100 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance", toneMapping: THREE.NeutralToneMapping }}
      fallback={null}
    >
      <color attach="background" args={[GRUND]} />
      <Umgebung />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 6]} intensity={1.6} color="#fff6ea" />
      <directionalLight position={[-6, -2, -4]} intensity={0.7} color="#dfe8ff" />
      <Skulptur ruhig={ruhig} />
    </Canvas>
  );
}
