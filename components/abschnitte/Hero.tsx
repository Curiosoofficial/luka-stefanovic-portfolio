"use client";

import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import dynamic from "next/dynamic";
import { useRef, useState, type CSSProperties } from "react";
import { Knopf } from "@/components/ui/Knopf";
import { MagnetKnopf } from "@/components/ui/MagnetKnopf";
import { useRuhig } from "@/components/ui/medien";
import { THEMA, WELT_TEXTE } from "@/components/welt/thema";
import { heroKarten, profil } from "@/data/profil";

/** Garnfarben für die Buchstaben des Nachnamens, der Reihe nach */
const GARN = ["#EE4F86", "#F48A35", "#FFC93C", "#5BB54A", "#3A86D8", "#8C5BE0"];

/** Code-Welt: ein Farbverlauf über die Buchstaben (Pink → Violett → Blau) statt bunter Garnfarben */
const VERLAUF = ["#ff4f93", "#9b6bff", "#4b8dff"];

function mischen(a: string, b: string, t: number) {
  const zahl = (hex: string) => parseInt(hex.slice(1), 16);
  const [x, y] = [zahl(a), zahl(b)];
  const kanal = (v: number, s: number) => Math.round(((v >> s) & 255) * (1 - t) + ((y >> s) & 255) * t);
  return `rgb(${kanal(x, 16)} ${kanal(x, 8)} ${kanal(x, 0)})`;
}

function buchstabenFarbe(i: number, anzahl: number) {
  if (THEMA !== "code") return GARN[i % GARN.length];
  const pos = (i / Math.max(1, anzahl - 1)) * (VERLAUF.length - 1);
  const k = Math.min(VERLAUF.length - 2, Math.floor(pos));
  return mischen(VERLAUF[k], VERLAUF[k + 1], pos - k);
}

/** Knopffarbe pro Filz-Patch, passend zur Patch-Farbe */
const KNOPF_FARBEN = ["#FFC93C", "#3A86D8", "#EE4F86", "#FFC93C"];

/*
 * Drehbuch des Heros, als Anteil des Scroll-Wegs (0 = ganz oben, 1 = Hero zu Ende):
 *   0.00–0.12  Startbildschirm blendet aus, Vor- und Nachname fahren auseinander
 *   ~0.10–0.28 Knöpfe: aus dem Namen wird der Knopf-Wirbel (über den Marker bei 120svh)
 *   0.30–0.91  Vier Filz-Patches kippen nacheinander rein und stapeln sich
 *   bis 1.00   Die Bastelbühne (Hügel, Wolken, Sonne) sinkt weg, der Strick-Himmel blendet aus
 */
const KARTEN_START = 0.3;
const KARTEN_ABSTAND = 0.16;
const KARTEN_DAUER = 0.13;
const SCHRAEG = [-2, 1.5, -1, 0.5];

type Karte = (typeof heroKarten)[number];

/** Der 3D-Körper der Karten (Filzplatte, Naht, Knopf) läuft nur im Browser */
const KartenKoerper = dynamic(() => import("@/components/welt/KartenKoerper"), { ssr: false });

/**
 * Ein Filz-Patch, der beim Scrollen reinkippt und sich auf den Stapel legt.
 * Der Körper (dicke Filzplatte, Naht, Knopf) ist echtes 3D (siehe KartenKoerper), der Text liegt als HTML darüber.
 * Bis das 3D-Bild gezeichnet ist, steht eine flache Filzfläche als Platzhalter da.
 */
function FilzPatch({
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
  // Zeitpunkte, an denen spätere Patches landen: Jedes Mal rutscht dieser ein Stück nach hinten
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
    spaeter.length ? [0, ...spaeter.map((_, k) => Math.min(0.45, (k + 1) * 0.16))] : [0, 0],
  );

  const letzte = i === n - 1;
  const [koerperDa, setKoerperDa] = useState(false);
  const code = THEMA === "code";
  // Code-Welt: dunkles Glas, die Farbe der Karte leuchtet als Lichtschein aus der Ecke
  const flaeche = code
    ? {
        background: `radial-gradient(110% 120% at 100% 0%, color-mix(in oklab, ${karte.farbe} 45%, transparent) 0%, transparent 55%), linear-gradient(165deg, #131b36 0%, #0a0e1d 100%)`,
        color: "#e9edff",
      }
    : { backgroundColor: koerperDa ? "transparent" : karte.farbe, color: karte.textFarbe };

  return (
    <motion.article
      style={ruhig ? undefined : { y, scale: skala, rotateX: kippen, rotate: drehen, transformPerspective: 1400 }}
      className={`pointer-events-auto ${ruhig ? "relative w-full" : "absolute h-[min(74svh,38rem)] w-[min(92vw,64rem)]"}`}
    >
      {/* Weicher Schatten der Platte auf die Welt dahinter */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-6 top-8 -bottom-5 rounded-[2.2rem] ${
          code ? "shadow-[0_40px_80px_-30px_rgb(0_0_0_/_0.9)]" : "shadow-[0_34px_60px_-22px_rgb(50_28_12_/_0.6)]"
        }`}
      />
      {!code && (
        <KartenKoerper
          farbe={karte.farbe}
          knopf={{ farbe: KNOPF_FARBEN[i], groesse: 64, ecke: "oben-rechts", abstand: [64, 72] }}
          onBereit={setKoerperDa}
        />
      )}

      <div
        style={flaeche}
        className={`ohne-schein relative flex flex-col justify-between gap-6 overflow-hidden rounded-[2.2rem] p-8 md:p-12 ${
          code ? "border border-white/10" : koerperDa ? "" : "filz naht [--naht-abstand:18px]"
        } ${ruhig ? "min-h-[60svh]" : "h-full"}`}
      >
        {/* Platzhalter-Knopf, bis der 3D-Knopf da ist (in der Code-Welt bleibt der leuchtende Knoten) */}
        {(code || !koerperDa) && (
          <Knopf
            farbe={code ? karte.farbe : KNOPF_FARBEN[i]}
            groesse={64}
            className="absolute top-8 right-8 md:top-10 md:right-10"
          />
        )}

        <p className="relative font-hand text-3xl leading-none" style={code ? { color: karte.farbe } : undefined}>
          {String(i + 1).padStart(2, "0")} · {karte.kicker}
        </p>
        <h2 className="relative max-w-[13ch] font-display text-[clamp(2.75rem,8vw,7.5rem)] leading-[0.9] font-bold tracking-[-0.02em]">
          {karte.titel}
        </h2>
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <p className="max-w-md text-base leading-relaxed font-semibold opacity-90 md:text-lg">{karte.text}</p>
          {letzte && (
            <div className="flex shrink-0 flex-wrap gap-4">
              <MagnetKnopf
                href="#projekte"
                className="bastel-knopf filz rounded-full bg-gelb px-7 py-3.5 font-bold text-tinte [--kante:#c9951a]"
              >
                Projekte ansehen
              </MagnetKnopf>
              <MagnetKnopf
                href="#kontakt"
                className="bastel-knopf filz rounded-full bg-wolle px-7 py-3.5 font-bold text-schrift [--kante:#cdbb9c]"
              >
                Kontakt
              </MagnetKnopf>
            </div>
          )}
        </div>
      </div>

      {/* Wird dunkler, sobald weitere Patches darüber landen: so entsteht Tiefe im Stapel */}
      {!ruhig && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 -bottom-[18px] rounded-[2.2rem] bg-tinte"
          style={{ opacity: abdunkeln }}
        />
      )}
    </motion.article>
  );
}

/** Die grosse Botschaft im Hero, in zwei Zeilen (die zweite bunt) */
const SPRUCH = ["Websites", "zum Anfassen."];

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const ruhig = useRuhig();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const startDeckkraft = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const startSichtbar = useTransform(scrollYProgress, (v) => (v > 0.13 ? "hidden" : "visible"));
  const zeile1X = useTransform(scrollYProgress, [0, 0.2], ["0vw", "-55vw"]);
  const zeile2X = useTransform(scrollYProgress, [0, 0.2], ["0vw", "55vw"]);

  let index = 0;

  const zeile = (wort: string, bunt: boolean, x: MotionValue<string>) => (
    <motion.span className="block whitespace-nowrap" style={ruhig ? undefined : { x }}>
      {wort.split("").map((buchstabe, i) => (
        <span
          key={i}
          className="buchstabe"
          style={{ "--i": index++, color: bunt ? buchstabenFarbe(i, wort.length) : undefined } as CSSProperties}
        >
          {/* Ein normales Leerzeichen hätte in einem inline-block keine Breite */}
          {buchstabe === " " ? " " : buchstabe}
        </span>
      ))}
    </motion.span>
  );

  return (
    <section id="start" ref={ref} data-partikel="0" className={`relative ${ruhig ? "" : "h-[440svh]"}`}>
      {/* Unsichtbarer Marker: Wenn er ins Bild scrollt, wird aus dem Knopf-Namen der Knopf-Wirbel */}
      <div aria-hidden data-partikel="1" className="pointer-events-none absolute inset-x-0 top-[120svh] h-px" />

      <div className={ruhig ? "" : "sticky top-0 h-svh overflow-hidden"}>
        {/* Startbildschirm */}
        <motion.div
          style={ruhig ? undefined : { opacity: startDeckkraft, visibility: startSichtbar }}
          className="relative flex h-svh flex-col justify-end px-4 pt-28 pb-8 md:px-8 md:pb-10"
        >
          <div className="absolute inset-x-4 top-20 flex items-start justify-between md:inset-x-8 md:top-24">
            {/* Etikett mit Loch und Schnur */}
            <p className="ohne-schein stoff-schatten relative inline-flex -rotate-3 items-center gap-2 rounded-lg bg-wolle py-2 pr-5 pl-8 font-hand text-2xl leading-none">
              <span aria-hidden className="absolute top-1/2 left-3 size-2.5 -translate-y-1/2 rounded-full bg-grund ring-2 ring-schrift/25" />
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-gruen opacity-75 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2.5 rounded-full bg-gruen" />
              </span>
              {profil.status}
            </p>
            <div className="ohne-schein hidden rotate-2 rounded-lg bg-wolle/90 px-4 py-2 text-right stoff-schatten md:block">
              <p className="font-hand text-2xl leading-none">{WELT_TEXTE[THEMA].maus}</p>
              <p className="font-hand text-xl leading-none text-leise">{WELT_TEXTE[THEMA].klick}</p>
            </div>
          </div>

          <div className="mx-auto grid w-full max-w-7xl gap-8 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7">
              {/*
                Der Name hängt schon als Strickbuchstaben in der Welt. Hier steht er darum nur klein auf einem
                Papieretikett, gross ist die Botschaft. Für Google und Screenreader bleibt der Name Teil der Hauptüberschrift.
              */}
              <h1>
                <span className="ohne-schein stoff-schatten mb-5 inline-block -rotate-2 rounded-lg bg-wolle px-4 py-2 font-display text-lg leading-none font-bold md:text-xl">
                  {profil.name}
                  <span className="font-semibold text-leise">
                    {" "}
                    · {profil.rolle} in {profil.ort}
                  </span>
                </span>
                <span className="sr-only">: </span>
                {/* Aufkleber-Schrift: heller dicker Rand um jeden Buchstaben */}
                <span className="aufkleber block font-display text-[clamp(2.8rem,6.6vw,6.4rem)] leading-[0.95] font-bold tracking-[-0.01em] drop-shadow-[0_4px_0_rgb(46_31_21_/_0.25)]">
                  <span className="sr-only">{SPRUCH.join(" ")}</span>
                  <span aria-hidden>
                    {zeile(SPRUCH[0], false, zeile1X)}
                    {zeile(SPRUCH[1], true, zeile2X)}
                  </span>
                </span>
              </h1>
              <p className="filz ohne-schein mt-5 inline-block -rotate-1 rounded-md bg-pink px-4 py-1.5 text-sm font-extrabold tracking-[0.18em] text-hell uppercase stoff-schatten">
                {profil.stack} · TypeScript
              </p>
            </div>

            {/* Papierkärtchen, mit Klebeband festgeklebt */}
            <div className="ohne-schein stoff-schatten relative rotate-1 rounded-lg bg-wolle p-6 md:col-span-5">
              <span aria-hidden className="klebeband -top-3 left-1/2 w-28 -translate-x-1/2 -rotate-3" />
              <p className="max-w-md text-lg leading-relaxed font-semibold">
                Ich baue schnelle, auffällige Websites. Seit 2023 für echte Kunden rund um Zürich, jetzt suche ich mein
                nächstes Team.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <MagnetKnopf
                  href="#projekte"
                  className="bastel-knopf filz gap-2 rounded-full bg-gelb px-6 py-3 font-bold text-tinte [--kante:#c9951a]"
                >
                  <Knopf farbe="#EE4F86" groesse={22} />
                  Projekte ansehen
                </MagnetKnopf>
                <MagnetKnopf
                  href="#kontakt"
                  className="bastel-knopf filz rounded-full bg-grund px-6 py-3 font-bold text-schrift [--kante:#cdbb9c]"
                >
                  Kontakt
                </MagnetKnopf>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-8 flex w-full max-w-7xl items-center justify-between font-hand text-2xl text-hell drop-shadow-[0_1px_2px_rgb(46_31_21_/_0.6)]">
            <span className="hidden sm:inline">{WELT_TEXTE[THEMA].signatur}</span>
            <span className="ml-auto">Runterscrollen ↓</span>
          </div>
        </motion.div>

        {/* Stapel aus Filz-Patches */}
        <div
          className={
            ruhig
              ? "flex flex-col gap-12 px-4 pb-16 md:px-8"
              : "pointer-events-none absolute inset-0 flex items-center justify-center"
          }
        >
          {heroKarten.map((karte, i) => (
            <FilzPatch key={karte.titel} karte={karte} i={i} fortschritt={scrollYProgress} ruhig={ruhig} />
          ))}
        </div>
      </div>
    </section>
  );
}
