"use client";

import { motion, useInView, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { partikelStore } from "@/components/partikel/zustand";
import { TiltKarte } from "@/components/ui/TiltKarte";
import { projekte, type Projekt } from "@/data/projects";
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
  const hell = istHell(projekt.farbe);
  return (
    <div
      className="absolute inset-0 flex flex-col justify-between overflow-hidden p-5"
      style={{
        backgroundColor: projekt.farbe,
        color: hell ? "#0b0b14" : "#f5f3ff",
        backgroundImage: `radial-gradient(circle at 1px 1px, ${hell ? "rgba(11,11,20,0.2)" : "rgba(245,243,255,0.25)"} 1px, transparent 0)`,
        backgroundSize: "14px 14px",
      }}
    >
      <span
        aria-hidden
        className="absolute -right-14 -bottom-20 size-60 rounded-full border-[22px] transition-transform duration-700 group-hover:scale-110"
        style={{ borderColor: hell ? "rgba(11,11,20,0.12)" : "rgba(245,243,255,0.16)" }}
      />
      <span
        aria-hidden
        className="absolute top-6 right-6 size-10 rotate-12 rounded-xl transition-transform duration-700 group-hover:rotate-45"
        style={{ backgroundColor: hell ? "rgba(11,11,20,0.16)" : "rgba(245,243,255,0.2)" }}
      />
      <span className="relative font-mono text-[11px] tracking-[0.2em] uppercase">{adresse(projekt)}</span>
      <span className="relative max-w-[85%] font-display text-4xl leading-[0.9] font-extrabold tracking-tight md:text-5xl flach:text-3xl">
        {projekt.titel}
      </span>
    </div>
  );
}

function ProjektKarte({ projekt, index, gesamt }: { projekt: Projekt; index: number; gesamt: number }) {
  return (
    <motion.article
      onViewportEnter={() => (partikelStore.tint = projekt.farbe)}
      viewport={{ amount: 0.6 }}
      className="w-full shrink-0 md:w-[min(30rem,70vw)] flach:w-[min(26rem,60vw)]"
    >
      <TiltKarte farbe={projekt.farbe} className="h-full rounded-3xl border border-papier/10 bg-tinte-2/80 p-3 backdrop-blur-md">
        <div className="relative aspect-video overflow-hidden rounded-2xl flach:aspect-[21/9]">
          <Cover projekt={projekt} />
        </div>
        <div className="px-3 pt-5 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2.5 py-1 font-mono text-[10px] tracking-[0.15em] uppercase"
              style={{
                backgroundColor: `color-mix(in oklab, ${projekt.farbe} 18%, transparent)`,
                color: `color-mix(in oklab, ${projekt.farbe} 70%, white)`,
              }}
            >
              {projekt.art}
            </span>
            {projekt.hinweis && (
              <span className="font-mono text-[10px] tracking-[0.15em] text-nebel uppercase">{projekt.hinweis}</span>
            )}
            <span className="ml-auto font-mono text-[11px] text-nebel tabular-nums">
              {String(index + 1).padStart(2, "0")} / {String(gesamt).padStart(2, "0")}
            </span>
          </div>
          <h3 className="mt-3 font-display text-2xl font-bold md:text-3xl">{projekt.titel}</h3>
          <p className="mt-2 text-papier/75">{projekt.kurz}</p>
          <ul className="mt-4 flex flex-wrap gap-1.5 flach:hidden" aria-label="Technik">
            {projekt.technik.map((t) => (
              <li key={t} className="rounded-full border border-papier/15 px-2.5 py-1 text-xs text-papier/80">
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-5 text-sm font-semibold">
            {projekt.live && <ProjektLink href={projekt.live}>Live ansehen</ProjektLink>}
            {projekt.github && <ProjektLink href={projekt.github}>Code auf GitHub</ProjektLink>}
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
      className="group/link inline-flex items-center gap-1.5 text-papier transition-colors hover:text-limette"
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
export function Projekte() {
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

  // Solange der Abschnitt sichtbar ist, nehmen die Partikel die Projektfarbe an
  const imBild = useInView(huelle, { margin: "-30% 0px -30% 0px" });
  useEffect(() => {
    partikelStore.tintAn = imBild;
  }, [imBild]);

  return (
    <section
      id="projekte"
      data-partikel="2"
      ref={huelle}
      className="relative py-28 md:py-0"
      style={distanz > 0 ? { height: `calc(100svh + ${distanz}px)` } : undefined}
    >
      <div className="md:sticky md:top-0 md:flex md:h-svh md:flex-col md:justify-center md:overflow-hidden md:pt-16">
        <div className="mx-auto mb-10 flex w-full max-w-7xl items-end justify-between gap-8 px-4 md:mb-8 md:px-8 flach:mb-4">
          <SektionsKopf
            nummer="02"
            label="Projekte"
            titel="Ausgewählte Arbeiten."
            titelKlasse="flach:mt-2 flach:text-4xl"
          />
          <div className="hidden shrink-0 text-right md:block">
            <p className="font-display text-5xl font-extrabold tabular-nums flach:text-3xl">
              {String(aktiv + 1).padStart(2, "0")}
              <span className="text-nebel">/{String(projekte.length).padStart(2, "0")}</span>
            </p>
            <p className="mt-1 max-w-56 text-sm text-nebel flach:hidden">
              Ehrlich gekennzeichnet, wie jedes Projekt entstanden ist.
            </p>
          </div>
        </div>
        <motion.div
          ref={spur}
          style={{ x }}
          className="flex flex-col gap-6 px-4 md:w-max md:flex-row md:px-8"
        >
          {projekte.map((projekt, i) => (
            <ProjektKarte key={projekt.slug} projekt={projekt} index={i} gesamt={projekte.length} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
