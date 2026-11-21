"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { TiltKarte } from "@/components/ui/TiltKarte";
import { projekte, type Projekt } from "@/data/projects";
import { THEMA } from "@/components/welt/thema";
import { weltStore } from "@/components/welt/zustand";
import { SektionsKopf } from "./SektionsKopf";

/** Ist die Farbe so hell, dass dunkler Text darauf besser lesbar ist? */
function istHell(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

function adresse(projekt: Projekt) {
  if (projekt.live) return new URL(projekt.live).hostname.replace(/^www\./, "");
  if (projekt.github) return "github.com";
  return "";
}

/** Ohne Screenshot: ein knalliges Cover in der Projektfarbe */
function Cover({ projekt }: { projekt: Projekt }) {
  if (projekt.bild) {
    return (
      <Image
        src={projekt.bild}
        alt={`Screenshot von ${projekt.titel}`}
        fill
        sizes="(min-width: 768px) 30rem, 100vw"
        className="object-cover object-top"
      />
    );
  }
  const code = THEMA === "code";
  const glas = THEMA === "glas";
  const hell = !code && !glas && istHell(projekt.farbe);
  // Glas-Welt: alle Cover tintenblau (die 30 %), Code-Welt: dunkles Glas mit Lichtschein in der Projektfarbe
  const flaeche = glas
    ? { backgroundColor: "#14213D", color: "#F3F2EE" }
    : code
    ? {
        background: `radial-gradient(130% 120% at 100% 0%, color-mix(in oklab, ${projekt.farbe} 75%, transparent) 0%, transparent 62%), linear-gradient(160deg, color-mix(in oklab, ${projekt.farbe} 22%, #0b1022) 0%, #090d1b 100%)`,
        color: "#f4f6ff",
      }
    : { backgroundColor: projekt.farbe, color: hell ? "#2E1F15" : "#FFF8EE" };
  return (
    <div
      className={`ohne-schein absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[inherit] p-6 ${
        code || glas ? "" : "filz naht [--naht-abstand:8px]"
      }`}
      style={flaeche}
    >
      <span
        aria-hidden
        className="absolute -right-14 -bottom-20 size-60 rounded-full border-[22px] transition-transform duration-700 group-hover:scale-110"
        style={{ borderColor: glas ? "rgb(252 163 17 / 0.22)" : hell ? "rgba(11,11,20,0.12)" : "rgba(245,243,255,0.16)" }}
      />
      <span
        aria-hidden
        className="absolute top-6 right-6 size-10 rotate-12 rounded-xl transition-transform duration-700 group-hover:rotate-45"
        style={{ backgroundColor: glas ? "#FCA311" : hell ? "rgba(11,11,20,0.16)" : "rgba(245,243,255,0.2)" }}
      />
      <span className="relative font-hand text-2xl leading-none">{adresse(projekt)}</span>
      <span className="relative max-w-[85%] font-display text-4xl leading-[0.9] font-bold tracking-tight md:text-5xl flach:text-3xl">
        {projekt.titel}
      </span>
    </div>
  );
}

function ProjektKarte({
  projekt,
  index,
  gesamt,
}: {
  projekt: Projekt;
  index: number;
  gesamt: number;
}) {
  return (
    <motion.article
      className="w-full shrink-0 md:w-[min(30rem,70vw)] flach:w-[min(27rem,60vw)]"
    >
      {/* Karte aus Wellpappe: Cover aus Filz, Text auf Papier, mit Klebeband festgemacht.
          Alle Karten einer Reihe sind gleich hoch: Das Papier füllt den Rest, die Links stehen immer unten. */}
      <TiltKarte farbe={projekt.farbe} className="wellpappe stoff-schatten h-full rounded-3xl p-3">
        <span aria-hidden className="klebeband -top-3 left-1/2 z-10 w-24 -translate-x-1/2 rotate-2" />
        <div className="flex h-full flex-col">
          <div className="relative aspect-video shrink-0 overflow-hidden rounded-2xl flach:aspect-[21/9]">
            <Cover projekt={projekt} />
          </div>
          <div className="ohne-schein mt-3 flex flex-1 flex-col rounded-2xl bg-wolle px-4 pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[0.12em] uppercase"
                style={
                  THEMA === "glas"
                    ? { backgroundColor: "rgb(20 33 61 / 0.07)", color: "#14213D" }
                    : {
                        backgroundColor: `color-mix(in oklab, ${projekt.farbe} 25%, transparent)`,
                        color: `color-mix(in oklab, ${projekt.farbe} ${THEMA === "code" ? "65%, white" : "50%, black"})`,
                      }
                }
              >
                {projekt.art}
              </span>
              {projekt.hinweis && (
                <span className="font-mono text-[10px] tracking-[0.15em] text-leise uppercase">{projekt.hinweis}</span>
              )}
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-3">
              <h3 className="font-display text-2xl font-bold md:text-3xl">{projekt.titel}</h3>
              <span className="shrink-0 font-mono text-[11px] text-leise tabular-nums">
                {String(index + 1).padStart(2, "0")} / {String(gesamt).padStart(2, "0")}
              </span>
            </div>
            <p className="mt-2 text-schrift/75">{projekt.kurz}</p>
            <ul className="mt-4 flex flex-wrap gap-1.5 flach:hidden" aria-label="Technik">
              {projekt.technik.map((t) => (
                <li key={t} className="rounded-full border border-schrift/15 px-2.5 py-1 text-xs text-schrift/80">
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-3 pt-5 text-sm font-semibold">
              {/* Die ganze Seite in einem neuen Tab: besser als ein eingebettetes Fenster */}
              {projekt.live && (
                <a
                  href={projekt.live}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bastel-knopf filz inline-flex items-center gap-2 rounded-full bg-gelb px-4 py-2 font-extrabold text-tinte [--kante:#c9951a]"
                >
                  Live ansehen <span aria-hidden>↗</span>
                  <span className="sr-only">(öffnet in neuem Tab)</span>
                </a>
              )}
              {projekt.github && <ProjektLink href={projekt.github}>Code auf GitHub</ProjektLink>}
            </div>
          </div>
        </div>
      </TiltKarte>
    </motion.article>
  );
}

function ProjektLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group/link inline-flex items-center gap-1.5 text-schrift transition-colors hover:text-akzent"
    >
      {children}
      <span aria-hidden className="transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5">
        ↗
      </span>
      <span className="sr-only">(öffnet in neuem Tab)</span>
    </a>
  );
}

/**
 * Projekte: Auf dem Desktop bleibt der Abschnitt stehen (sticky) und die Karten fahren horizontal vorbei.
 * Trick: Der Abschnitt ist genau so viel höher als der Bildschirm, wie die Kartenreihe breiter ist.
 * Vertikales Scrollen wird so 1:1 in horizontale Bewegung übersetzt.
 * Auf dem Handy sind die Karten einfach untereinander.
 */
function ProjekteBand() {
  const huelle = useRef<HTMLElement>(null);
  const spur = useRef<HTMLDivElement>(null);
  const [distanz, setDistanz] = useState(0);

  useEffect(() => {
    const el = spur.current;
    if (!el) return;
    const breit = window.matchMedia("(min-width: 768px)");
    const messen = () => setDistanz(breit.matches ? Math.max(0, el.scrollWidth - window.innerWidth) : 0);
    // ResizeObserver meldet sich sofort einmal, damit ist auch die erste Messung erledigt
    const beobachter = new ResizeObserver(messen);
    beobachter.observe(el);
    breit.addEventListener("change", messen);
    window.addEventListener("resize", messen);
    return () => {
      beobachter.disconnect();
      breit.removeEventListener("change", messen);
      window.removeEventListener("resize", messen);
    };
  }, []);

  const { scrollYProgress } = useScroll({ target: huelle, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, (v) => -v * distanz);
  const [aktiv, setAktiv] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (distanz > 0) setAktiv(Math.round(v * (projekte.length - 1)));
  });

  return (
    <section
      id="projekte"
      data-partikel="3"
      ref={huelle}
      className="relative py-28 md:py-0"
      style={distanz > 0 ? { height: `calc(100svh + ${distanz}px)` } : undefined}
    >
      <div className="md:sticky md:top-0 md:flex md:h-svh md:flex-col md:justify-center md:overflow-hidden md:pt-16">
        <div className="mx-auto mb-10 flex w-full max-w-7xl items-end justify-between gap-8 px-4 md:mb-8 md:px-8 flach:mb-4">
          <div className="ohne-schein stoff-schatten relative -rotate-1 rounded-2xl bg-wolle px-6 py-5 flach:py-3">
            <span aria-hidden className="klebeband -top-3 left-8 w-24 -rotate-6" />
            <SektionsKopf
              nummer="02"
              label="Projekte"
              titel="Ausgewählte Arbeiten."
              titelKlasse="flach:mt-1 flach:text-4xl"
            />
          </div>
          <div className="ohne-schein stoff-schatten hidden shrink-0 rotate-2 rounded-2xl bg-wolle px-5 py-3 text-right md:block">
            <p className="font-display text-5xl font-bold tabular-nums flach:text-3xl">
              {String(aktiv + 1).padStart(2, "0")}
              <span className="text-leise">/{String(projekte.length).padStart(2, "0")}</span>
            </p>
            <p className="mt-1 max-w-56 font-hand text-xl leading-tight text-leise flach:hidden">
              Ehrlich gekennzeichnet, wie jedes Projekt entstanden ist.
            </p>
          </div>
        </div>
        <motion.div
          ref={spur}
          style={{ x }}
          // Handy: Raster mit gleich hohen Zeilen, damit auch untereinander alle Karten gleich gross sind
          className="grid auto-rows-fr gap-6 px-4 md:flex md:w-max md:flex-row md:px-8"
        >
          {projekte.map((projekt, i) => (
            <ProjektKarte key={projekt.slug} projekt={projekt} index={i} gesamt={projekte.length} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/** Projekte: Die Code-Welt zeigt sie als «Monitor» neben der 3D-Seite, die Strickwelt als horizontales Band. */
export function Projekte() {
  return THEMA === "code" ? <ProjekteMonitor /> : <ProjekteBand />;
}

/**
 * Projekte in der Code-Welt: Der Abschnitt bleibt stehen (sticky), links ist immer ein Projekt offen,
 * rechts zeigt die 3D-Seite im Hintergrund genau dieses Projekt (Titel, Adresse, Technik).
 * Scrollen blättert zum nächsten Projekt, die Leiste darunter springt direkt hin.
 * Auf dem Handy stehen die Karten einfach untereinander.
 */
function ProjekteMonitor() {
  const huelle = useRef<HTMLElement>(null);
  const n = projekte.length;
  const { scrollYProgress } = useScroll({ target: huelle, offset: ["start start", "end end"] });
  const [aktiv, setAktiv] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const i = Math.min(n - 1, Math.max(0, Math.floor(v * n)));
    setAktiv(i);
    // Nur solange der Abschnitt läuft, zeigt die 3D-Seite ein Projekt, sonst ihren eigenen Inhalt
    weltStore.projekt.index = v > 0 && v < 1 ? i : -1;
  });

  useEffect(
    () => () => {
      weltStore.projekt.index = -1;
    },
    [],
  );

  const springe = (i: number) => {
    const el = huelle.current;
    if (!el) return;
    const weg = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: el.offsetTop + ((i + 0.5) / n) * weg, behavior: "smooth" });
  };

  const p = projekte[aktiv];

  return (
    <section
      id="projekte"
      data-partikel="3"
      ref={huelle}
      className="relative py-28 md:h-[var(--hoehe)] md:py-0"
      style={{ "--hoehe": `${100 + n * 38}svh` } as CSSProperties}
    >
      {/* Desktop: links das offene Projekt, rechts bleibt Platz für die 3D-Seite */}
      <div className="sticky top-0 hidden h-svh items-center px-8 md:flex">
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex w-[min(34rem,46%)] flex-col gap-4 flach:gap-3">
            <div className="ohne-schein stoff-schatten rounded-2xl bg-wolle px-6 py-5 flach:py-3">
              <SektionsKopf
                nummer="02"
                label="Projekte"
                titel="Ausgewählte Arbeiten."
                titelKlasse="flach:mt-1 flach:text-4xl"
              />
            </div>

            <div className="relative min-h-[20rem] flach:min-h-[17rem]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.article
                  key={p.slug}
                  initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className="ohne-schein stoff-schatten absolute inset-0 flex flex-col overflow-hidden rounded-2xl bg-wolle p-6 flach:p-5"
                >
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-[3px]"
                    style={{ background: `linear-gradient(90deg, ${p.farbe}, transparent 80%)` }}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[0.12em] uppercase"
                      style={{
                        backgroundColor: `color-mix(in oklab, ${p.farbe} 25%, transparent)`,
                        color: `color-mix(in oklab, ${p.farbe} 65%, white)`,
                      }}
                    >
                      {p.art}
                    </span>
                    {p.hinweis && (
                      <span className="font-mono text-[10px] tracking-[0.15em] text-leise uppercase">{p.hinweis}</span>
                    )}
                    <span className="ml-auto font-mono text-xs text-leise tabular-nums">
                      {String(aktiv + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-3xl font-bold md:text-4xl flach:mt-3 flach:text-3xl">{p.titel}</h3>
                  <p className="mt-2 text-schrift/75">{p.kurz}</p>
                  <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Technik">
                    {p.technik.map((t) => (
                      <li key={t} className="rounded-full border border-schrift/15 px-2.5 py-1 text-xs text-schrift/80">
                        {t}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-3 pt-5 text-sm font-semibold">
                    {p.live && (
                      <a
                        href={p.live}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bastel-knopf filz inline-flex items-center gap-2 rounded-full bg-gelb px-4 py-2 font-extrabold text-tinte"
                      >
                        Live ansehen <span aria-hidden>↗</span>
                        <span className="sr-only">(öffnet in neuem Tab)</span>
                      </a>
                    )}
                    {p.github && <ProjektLink href={p.github}>Code auf GitHub</ProjektLink>}
                  </div>
                </motion.article>
              </AnimatePresence>
            </div>

            {/* Leiste mit allen Projekten: zeigt, wo man ist, und springt per Klick direkt hin */}
            <nav aria-label="Alle Projekte">
              <ol className="flex items-center gap-1.5">
                {projekte.map((q, i) => (
                  <li key={q.slug} className="flex-1">
                    <button
                      type="button"
                      onClick={() => springe(i)}
                      aria-label={`${i + 1}: ${q.titel}`}
                      aria-current={i === aktiv ? "true" : undefined}
                      title={q.titel}
                      className="block h-2 w-full rounded-full transition-[background-color,box-shadow] duration-300"
                      style={{
                        backgroundColor: i === aktiv ? q.farbe : "rgb(255 255 255 / 0.16)",
                        boxShadow: i === aktiv ? `0 0 14px ${q.farbe}` : undefined,
                      }}
                    />
                  </li>
                ))}
              </ol>
              <p className="mt-2 font-mono text-xs text-leise">Weiterscrollen für das nächste Projekt · rechts im Bild live in 3D</p>
            </nav>
          </div>
        </div>
      </div>

      {/* Handy: Karten untereinander, alle gleich gross */}
      <div className="md:hidden">
        <div className="mb-10 px-4">
          <div className="ohne-schein stoff-schatten rounded-2xl bg-wolle px-6 py-5">
            <SektionsKopf nummer="02" label="Projekte" titel="Ausgewählte Arbeiten." />
          </div>
        </div>
        <div className="grid auto-rows-fr gap-6 px-4">
          {projekte.map((projekt, i) => (
            <ProjektKarte key={projekt.slug} projekt={projekt} index={i} gesamt={n} />
          ))}
        </div>
      </div>
    </section>
  );
}
