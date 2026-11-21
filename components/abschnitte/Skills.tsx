"use client";

import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import { useRuhig } from "@/components/ui/medien";
import { THEMA } from "@/components/welt/thema";
import { skills } from "@/data/profil";
import { SektionsKopf } from "./SektionsKopf";

const gruppen = [
  { titel: "Kern", eintraege: skills.kern },
  { titel: "Werkzeuge", eintraege: skills.werkzeuge },
  { titel: "Ausserdem", eintraege: skills.ausserdem },
];

type Band = { eintraege: string[]; farbe: string; text: string; drehung: number; richtung: 1 | -1; stufe: number };

const baender: Band[] = [
  { eintraege: skills.kern, farbe: "#FFC93C", text: "#2E1F15", drehung: -4, richtung: 1, stufe: 0 },
  { eintraege: skills.werkzeuge, farbe: "#EE4F86", text: "#2E1F15", drehung: 3, richtung: -1, stufe: 1 },
  { eintraege: skills.ausserdem, farbe: "#3A86D8", text: "#FFF8EE", drehung: -1.5, richtung: 1, stufe: 2 },
];

/** Ein schräges Absperrband. Beim Scrollen schiebt es sich seitlich, jedes zweite in die Gegenrichtung. */
function Absperrband({ band, fortschritt, ruhig }: { band: Band; fortschritt: MotionValue<number>; ruhig: boolean }) {
  const x = useTransform(fortschritt, [0, 1], band.richtung > 0 ? ["0%", "-30%"] : ["-30%", "0%"]);
  // Dreimal hintereinander, damit das Band nie leer wird, egal wie weit es fährt
  const liste = [...band.eintraege, ...band.eintraege, ...band.eintraege];

  // Code-Welt: dunkler Laufschrift-Streifen mit leuchtenden Kanten statt Absperrband aus Filz
  const code = THEMA === "code";
  // Glas-Welt: gerade, ruhige Bänder in den drei Farben der 60-30-10-Regel
  const glasStil = [
    { backgroundColor: "#14213D", color: "#F5F1E8" },
    { backgroundColor: "#F5F1E8", color: "#14213D", borderColor: "rgb(20 33 61 / 0.12)" },
    { backgroundColor: "#FCA311", color: "#14213D" },
  ][band.stufe];
  return (
    <div
      className={`ohne-schein relative -mx-[5vw] py-4 md:py-6 ${
        code
          ? "border-y backdrop-blur-md"
          : THEMA === "glas"
            ? "border-y border-transparent"
            : "filz stoff-schatten outline-[3px] -outline-offset-[10px] outline-white/70 outline-dashed"
      }`}
      style={
        THEMA === "glas"
          ? glasStil
          : code
          ? {
              backgroundColor: "rgb(9 13 27 / 0.82)",
              borderColor: `color-mix(in oklab, ${band.farbe} 70%, transparent)`,
              boxShadow: `0 0 40px -10px ${band.farbe}`,
              color: band.farbe,
              textShadow: `0 0 24px color-mix(in oklab, ${band.farbe} 60%, transparent)`,
              rotate: `${band.drehung}deg`,
            }
          : { backgroundColor: band.farbe, color: band.text, rotate: `${band.drehung}deg` }
      }
    >
      <motion.ul
        style={ruhig ? undefined : { x }}
        className="flex w-max items-center font-display text-4xl font-bold tracking-tight whitespace-nowrap md:text-7xl"
      >
        {liste.map((eintrag, i) => (
          <li key={i} className="flex items-center">
            <span className="px-5 md:px-8">{eintrag}</span>
            <span className="text-[0.45em]">✦</span>
          </li>
        ))}
      </motion.ul>
    </div>
  );
}

export function Skills() {
  const ruhig = useRuhig();
  const baenderRef = useRef<HTMLDivElement>(null);
  // Fortschritt von «Bänder kommen unten ins Bild» bis «Bänder verlassen oben das Bild»
  const { scrollYProgress } = useScroll({ target: baenderRef, offset: ["start end", "end start"] });

  return (
    <section id="skills" data-partikel="4" className="relative py-28 md:py-40">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 md:grid-cols-2 md:px-8">
        <div className="ohne-schein stoff-schatten relative min-w-0 rotate-1 rounded-2xl bg-wolle p-6 md:p-8">
          <span aria-hidden className="klebeband -top-3 right-12 w-28 rotate-3" />
          <SektionsKopf nummer="03" label="Skills" titel="Mein Werkzeugkasten." />
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {gruppen.map((gruppe) => (
              <div key={gruppe.titel}>
                <h3 className="font-hand text-2xl leading-none text-akzent">{gruppe.titel}</h3>
                <ul className="mt-3 space-y-1.5 font-semibold text-schrift/90">
                  {gruppe.eintraege.map((eintrag) => (
                    <li key={eintrag}>{eintrag}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Die Bänder wiederholen nur die Listen oben, darum für Screenreader ausgeblendet */}
      <div ref={baenderRef} aria-hidden className="relative mt-20 overflow-hidden py-16 md:mt-28 md:py-24">
        <div className="flex flex-col [&>*+*]:-mt-4 md:[&>*+*]:-mt-8">
          {baender.map((band) => (
            <Absperrband key={band.farbe} band={band} fortschritt={scrollYProgress} ruhig={ruhig} />
          ))}
        </div>
      </div>
    </section>
  );
}
