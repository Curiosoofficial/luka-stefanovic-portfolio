"use client";

import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef, type CSSProperties } from "react";
import { PunkteZaehler } from "@/components/partikel/PunkteZaehler";
import { MagnetKnopf } from "@/components/ui/MagnetKnopf";
import { useRuhig } from "@/components/ui/medien";
import { heroKarten, profil } from "@/data/profil";

/** Mischt zwei Hex-Farben, t von 0 bis 1 */
function mischeFarbe(a: string, b: string, t: number) {
  const ka = parseInt(a.slice(1), 16);
  const kb = parseInt(b.slice(1), 16);
  const kanal = (k: number, shift: number) => (k >> shift) & 255;
  const mix = (shift: number) => Math.round(kanal(ka, shift) + (kanal(kb, shift) - kanal(ka, shift)) * t);
  return `rgb(${mix(16)} ${mix(8)} ${mix(0)})`;
}

/** Farbverlauf Pink → Orange → Limette über die Buchstaben des Nachnamens */
function verlauf(i: number, anzahl: number) {
  const t = anzahl <= 1 ? 0 : i / (anzahl - 1);
  return t < 0.5 ? mischeFarbe("#FF2E93", "#FF7A1A", t * 2) : mischeFarbe("#FF7A1A", "#D4FF3A", (t - 0.5) * 2);
}

/*
 * Drehbuch des Heros, als Anteil des Scroll-Wegs (0 = ganz oben, 1 = Hero zu Ende):
 *   0.00–0.12  Startbildschirm blendet aus, Vor- und Nachname fahren auseinander
 *   ~0.10–0.28 Partikel: aus dem Namen wird der Warp-Tunnel (über den Marker bei 120svh)
 *   0.30–0.91  Vier Karten kippen nacheinander rein und stapeln sich
 */
const KARTEN_START = 0.3;
const KARTEN_ABSTAND = 0.16;
const KARTEN_DAUER = 0.13;
const SCHRAEG = [-2, 1.5, -1, 0.5];

type Karte = (typeof heroKarten)[number];

function StapelKarte({
  karte,
  i,
  fortschritt,
  ruhig,
}: {
  karte: Karte;
  i: number;
  fortschritt: MotionValue<number>;
  ruhig: boolean;
}) {
  const n = heroKarten.length;
  const start = KARTEN_START + i * KARTEN_ABSTAND;
  const ende = start + KARTEN_DAUER;
  // Zeitpunkte, an denen spätere Karten landen: Jedes Mal rutscht diese Karte ein Stück nach hinten
  const spaeter = Array.from({ length: n - 1 - i }, (_, k) => KARTEN_START + (i + 1 + k) * KARTEN_ABSTAND + KARTEN_DAUER);

  const y = useTransform(
    fortschritt,
    [start, ende, ...spaeter],
    ["115vh", "0vh", ...spaeter.map((_, k) => `${-(k + 1) * 3.5}vh`)],
  );
  const skala = useTransform(fortschritt, [start, ende, ...spaeter], [1, 1, ...spaeter.map((_, k) => 1 - (k + 1) * 0.05)]);
  const kippen = useTransform(fortschritt, [start, ende], [50, 0]);
  const drehen = useTransform(fortschritt, [start, ende], [i % 2 === 0 ? -12 : 12, SCHRAEG[i] ?? 0]);
  const abdunkeln = useTransform(
    fortschritt,
    spaeter.length ? [ende, ...spaeter] : [0, 1],
    spaeter.length ? [0, ...spaeter.map((_, k) => Math.min(0.55, (k + 1) * 0.2))] : [0, 0],
  );

  const hell = karte.textFarbe !== "#f5f3ff";
  const letzte = i === n - 1;

  return (
    <motion.article
      style={{
        backgroundColor: karte.farbe,
        color: karte.textFarbe,
        backgroundImage: `radial-gradient(circle at 1px 1px, ${hell ? "rgba(11,11,20,0.16)" : "rgba(245,243,255,0.22)"} 1px, transparent 0)`,
        backgroundSize: "16px 16px",
        ...(ruhig ? {} : { y, scale: skala, rotateX: kippen, rotate: drehen, transformPerspective: 1400 }),
      }}
      className={`ohne-schein pointer-events-auto flex flex-col justify-between gap-6 overflow-hidden rounded-[2rem] p-6 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.75)] md:p-10 ${
        ruhig ? "relative min-h-[60svh] w-full" : "absolute h-[min(74svh,38rem)] w-[min(92vw,64rem)]"
      }`}
    >
      {/* Deko wie bei den Projekt-Covern: Ring und gedrehtes Quadrat */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-24 -bottom-32 size-[28rem] rounded-full border-[44px]"
        style={{ borderColor: hell ? "rgba(11,11,20,0.1)" : "rgba(245,243,255,0.14)" }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-6 right-6 size-14 rotate-12 rounded-2xl md:top-10 md:right-10 md:size-20"
        style={{ backgroundColor: hell ? "rgba(11,11,20,0.14)" : "rgba(245,243,255,0.18)" }}
      />

      <p className="relative font-mono text-xs tracking-[0.25em] uppercase">
        {String(i + 1).padStart(2, "0")} · {karte.kicker}
      </p>
      <h2 className="relative max-w-[13ch] font-display text-[clamp(2.75rem,8.5vw,8rem)] leading-[0.86] font-extrabold tracking-[-0.035em]">
        {karte.titel}
      </h2>
      <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <p className="max-w-md text-base leading-relaxed opacity-85 md:text-lg">{karte.text}</p>
        {letzte && (
          <div className="flex shrink-0 flex-wrap gap-3">
            <MagnetKnopf href="#projekte" className="rounded-full bg-limette px-6 py-3.5 font-semibold text-tinte">
              Projekte ansehen
            </MagnetKnopf>
            <MagnetKnopf href="#kontakt" className="rounded-full border border-papier/50 px-6 py-3.5 font-semibold">
              Kontakt
            </MagnetKnopf>
          </div>
        )}
      </div>

      {/* Wird dunkler, sobald weitere Karten darüber landen: so entsteht Tiefe im Stapel */}
      {!ruhig && (
        <motion.div aria-hidden className="pointer-events-none absolute inset-0 bg-tinte" style={{ opacity: abdunkeln }} />
      )}
    </motion.article>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const ruhig = useRuhig();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const startDeckkraft = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const startSichtbar = useTransform(scrollYProgress, (v) => (v > 0.13 ? "hidden" : "visible"));
  const vornameX = useTransform(scrollYProgress, [0, 0.2], ["0vw", "-55vw"]);
  const nachnameX = useTransform(scrollYProgress, [0, 0.2], ["0vw", "55vw"]);

  const [vorname, ...rest] = profil.name.split(" ");
  const nachname = rest.join(" ");
  let index = 0;

  const zeile = (wort: string, bunt: boolean, x: MotionValue<string>) => (
    <motion.span className="block whitespace-nowrap" style={ruhig ? undefined : { x }}>
      {wort.split("").map((buchstabe, i) => (
        <span
          key={i}
          className="buchstabe"
          style={{ "--i": index++, color: bunt ? verlauf(i, wort.length) : undefined } as CSSProperties}
        >
          {buchstabe}
        </span>
      ))}
    </motion.span>
  );

  return (
    <section id="start" ref={ref} data-partikel="0" className={`relative ${ruhig ? "" : "h-[440svh]"}`}>
      {/* Unsichtbarer Marker: Wenn er ins Bild scrollt, wird aus dem Partikel-Namen der Warp-Tunnel */}
      <div aria-hidden data-partikel="1" className="pointer-events-none absolute inset-x-0 top-[120svh] h-px" />

      <div className={ruhig ? "" : "sticky top-0 h-svh overflow-hidden"}>
        {/* Startbildschirm */}
        <motion.div
          style={ruhig ? undefined : { opacity: startDeckkraft, visibility: startSichtbar }}
          className="relative flex h-svh flex-col justify-end px-4 pt-28 pb-8 md:px-8 md:pb-10"
        >
          <div className="absolute inset-x-4 top-20 flex items-start justify-between md:inset-x-8 md:top-24">
            <p className="inline-flex items-center gap-2 rounded-full border border-papier/15 bg-tinte/40 px-3 py-1.5 font-mono text-[11px] tracking-[0.2em] uppercase backdrop-blur">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-limette opacity-75 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-limette" />
              </span>
              {profil.status}
            </p>
            <div className="hidden text-right md:block">
              <PunkteZaehler />
              <p className="mt-1 font-mono text-[11px] tracking-[0.2em] text-nebel/70 uppercase">
                Maus = Welle · Klick = Knall
              </p>
            </div>
          </div>

          <div className="mx-auto grid w-full max-w-7xl gap-8 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7">
              <h1 className="font-display text-[clamp(3rem,8vw,7.5rem)] leading-[0.88] font-extrabold tracking-[-0.03em]">
                <span className="sr-only">{profil.name}</span>
                <span aria-hidden>
                  {zeile(vorname, false, vornameX)}
                  {zeile(nachname, true, nachnameX)}
                </span>
              </h1>
              <p className="mt-5 font-mono text-sm tracking-[0.2em] text-nebel uppercase">
                {profil.rolle} · {profil.stack} · {profil.ort}
              </p>
            </div>

            <div className="md:col-span-5 md:pb-3">
              <p className="max-w-md text-lg leading-relaxed text-papier/85">
                Ich baue schnelle, auffällige Websites. Seit 2023 für echte Kunden rund um Zürich, jetzt suche ich mein
                nächstes Team.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <MagnetKnopf href="#projekte" className="rounded-full bg-limette px-6 py-3.5 font-semibold text-tinte">
                  Projekte ansehen
                </MagnetKnopf>
                <MagnetKnopf
                  href="#kontakt"
                  className="rounded-full border border-papier/30 bg-tinte/30 px-6 py-3.5 font-semibold backdrop-blur transition-colors hover:border-papier"
                >
                  Kontakt
                </MagnetKnopf>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-10 flex w-full max-w-7xl items-center justify-between font-mono text-[11px] tracking-[0.2em] text-nebel uppercase">
            <span>Zürich, Schweiz</span>
            <span className="flex items-center gap-3">
              Scrollen für den Warp
              <span className="relative block h-px w-12 overflow-hidden bg-nebel/30">
                <span className="absolute inset-y-0 left-0 w-1/2 animate-pulse bg-limette" />
              </span>
            </span>
          </div>
        </motion.div>

        {/* Kartenstapel */}
        <div
          className={
            ruhig
              ? "flex flex-col gap-6 px-4 pb-16 md:px-8"
              : "pointer-events-none absolute inset-0 flex items-center justify-center"
          }
        >
          {heroKarten.map((karte, i) => (
            <StapelKarte key={karte.titel} karte={karte} i={i} fortschritt={scrollYProgress} ruhig={ruhig} />
          ))}
        </div>
      </div>
    </section>
  );
}
