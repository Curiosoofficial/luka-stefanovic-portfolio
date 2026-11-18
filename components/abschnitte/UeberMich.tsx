"use client";

import { animate, motion, useInView, useMotionValue, useScroll, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef } from "react";
import { useBreit, useRuhig } from "@/components/ui/medien";
import { WortReveal } from "@/components/ui/WortReveal";
import { kennzahlen, ueberMich } from "@/data/profil";
import { SektionsKopf } from "./SektionsKopf";

type Kennzahl = (typeof kennzahlen)[number];

/*
 * Drehbuch (Anteil des Scroll-Wegs, solange der Abschnitt steht):
 *   0.02–0.45  der Text färbt sich Wort für Wort ein
 *   0.50–0.92  vier Zahlen-Kacheln springen nacheinander rein und zählen hoch
 */
const KACHEL_START = 0.5;
const KACHEL_ABSTAND = 0.1;
const KACHEL_DAUER = 0.12;

/** Kachel im stehenden Abschnitt: Position und Zahl hängen direkt am Scroll */
function ScrollKachel({ zahl, i, fortschritt }: { zahl: Kennzahl; i: number; fortschritt: MotionValue<number> }) {
  const start = KACHEL_START + i * KACHEL_ABSTAND;
  const ende = start + KACHEL_DAUER;
  const y = useTransform(fortschritt, [start, ende], [140, 0]);
  const deckkraft = useTransform(fortschritt, [start, start + 0.04], [0, 1]);
  const drehen = useTransform(fortschritt, [start, ende], [i % 2 === 0 ? -10 : 10, i % 2 === 0 ? -1.5 : 1.5]);
  const wert = useTransform(fortschritt, [start, ende + 0.06], [zahl.von, zahl.wert]);
  const text = useTransform(wert, (v) => String(Math.round(v)));

  return (
    <KachelHuelle zahl={zahl} style={{ y, opacity: deckkraft, rotate: drehen }}>
      <motion.span>{text}</motion.span>
    </KachelHuelle>
  );
}

/** Kachel auf dem Handy: blendet beim Erscheinen ein und zählt einmal hoch */
function EinblendKachel({ zahl }: { zahl: Kennzahl }) {
  const ref = useRef<HTMLDivElement>(null);
  const imBild = useInView(ref, { once: true, amount: 0.6 });
  const wert = useMotionValue(zahl.von);
  const text = useTransform(wert, (v) => String(Math.round(v)));

  useEffect(() => {
    if (!imBild) return;
    const animation = animate(wert, zahl.wert, { duration: 1.4, ease: [0.2, 0.8, 0.2, 1] });
    return () => animation.stop();
  }, [imBild, wert, zahl.wert]);

  return (
    <div ref={ref}>
      <KachelHuelle zahl={zahl}>
        <motion.span>{text}</motion.span>
      </KachelHuelle>
    </div>
  );
}

function KachelHuelle({
  zahl,
  style,
  children,
}: {
  zahl: Kennzahl;
  style?: React.ComponentProps<typeof motion.div>["style"];
  children: React.ReactNode;
}) {
  const hell = zahl.textFarbe !== "#f5f3ff";
  return (
    <motion.div
      style={{ backgroundColor: zahl.farbe, color: zahl.textFarbe, ...style }}
      className="ohne-schein relative h-full overflow-hidden rounded-3xl p-5 md:p-6 flach:py-4"
    >
      <span
        aria-hidden
        className="absolute -right-8 -bottom-10 size-32 rounded-full border-[14px]"
        style={{ borderColor: hell ? "rgba(11,11,20,0.12)" : "rgba(245,243,255,0.16)" }}
      />
      <p className="relative font-display text-5xl leading-none font-extrabold tracking-tight tabular-nums md:text-6xl flach:text-5xl">
        {children}
      </p>
      <p className="relative mt-3 text-sm leading-snug font-medium md:text-base flach:mt-2 flach:text-sm">{zahl.label}</p>
    </motion.div>
  );
}

/**
 * Über mich: Auf breiten Bildschirmen bleibt der Abschnitt stehen (sticky), das Scrollen färbt den Text ein
 * und lässt danach die Zahlen-Kacheln reinspringen. Auf dem Handy läuft alles ganz normal untereinander.
 */
export function UeberMich() {
  const ref = useRef<HTMLElement>(null);
  const breit = useBreit();
  const ruhig = useRuhig();
  const gepinnt = breit && !ruhig;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const textFortschritt = useTransform(scrollYProgress, [0.02, 0.45], [0, 1]);

  return (
    <section
      id="ueber-mich"
      data-partikel="2"
      ref={ref}
      className={`relative px-4 md:px-8 ${gepinnt ? "h-[280svh]" : "py-28"}`}
    >
      <div className={gepinnt ? "sticky top-0 flex h-svh flex-col justify-center pt-16" : ""}>
        <div className="mx-auto grid w-full max-w-7xl gap-10 md:grid-cols-2">
          <div className="min-w-0">
            <SektionsKopf nummer="01" label="Über mich" titel={ueberMich.titel} titelKlasse="flach:text-5xl" />
            <WortReveal
              text={ueberMich.text}
              fortschritt={gepinnt ? textFortschritt : undefined}
              className="mt-8 text-2xl leading-snug font-medium lg:text-[1.65rem] flach:mt-5 flach:text-xl"
            />
          </div>
          <div className="hidden items-start justify-end md:flex">
            <p className="font-mono text-[11px] tracking-[0.2em] text-nebel uppercase">Das bin ich, in Punkten.</p>
          </div>
        </div>

        <div className="mx-auto mt-10 grid w-full max-w-7xl grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 flach:mt-6">
          {kennzahlen.map((zahl, i) =>
            gepinnt ? (
              <ScrollKachel key={zahl.label} zahl={zahl} i={i} fortschritt={scrollYProgress} />
            ) : (
              <EinblendKachel key={zahl.label} zahl={zahl} />
            ),
          )}
        </div>

        <p className="mx-auto mt-6 w-full max-w-7xl font-mono text-[11px] leading-relaxed tracking-[0.2em] text-nebel uppercase">
          {ueberMich.fakten.map((fakt) => `${fakt.label}: ${fakt.wert}`).join("  ·  ")}
        </p>
      </div>
    </section>
  );
}
