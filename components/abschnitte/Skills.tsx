"use client";

import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import { useRuhig } from "@/components/ui/medien";
import { skills } from "@/data/profil";
import { SektionsKopf } from "./SektionsKopf";

const gruppen = [
  { titel: "Kern", eintraege: skills.kern },
  { titel: "Werkzeuge", eintraege: skills.werkzeuge },
  { titel: "Ausserdem", eintraege: skills.ausserdem },
];

type Band = { eintraege: string[]; farbe: string; text: string; drehung: number; richtung: 1 | -1 };

const baender: Band[] = [
  { eintraege: skills.kern, farbe: "#D4FF3A", text: "#0b0b14", drehung: -4, richtung: 1 },
  { eintraege: skills.werkzeuge, farbe: "#FF2E93", text: "#0b0b14", drehung: 3, richtung: -1 },
  { eintraege: skills.ausserdem, farbe: "#3D2BFF", text: "#f5f3ff", drehung: -1.5, richtung: 1 },
];

/** Ein schräges Absperrband. Beim Scrollen schiebt es sich seitlich, jedes zweite in die Gegenrichtung. */
function Absperrband({ band, fortschritt, ruhig }: { band: Band; fortschritt: MotionValue<number>; ruhig: boolean }) {
  const x = useTransform(fortschritt, [0, 1], band.richtung > 0 ? ["0%", "-30%"] : ["-30%", "0%"]);
  // Dreimal hintereinander, damit das Band nie leer wird, egal wie weit es fährt
  const liste = [...band.eintraege, ...band.eintraege, ...band.eintraege];

  return (
    <div
      className="ohne-schein relative -mx-[5vw] py-3 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] md:py-5"
      style={{ backgroundColor: band.farbe, color: band.text, rotate: `${band.drehung}deg` }}
    >
      <motion.ul
        style={ruhig ? undefined : { x }}
        className="flex w-max items-center font-display text-4xl font-extrabold tracking-tight whitespace-nowrap md:text-7xl"
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
        <div className="min-w-0">
          <SektionsKopf nummer="03" label="Skills" titel="Mein Werkzeugkasten." />
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {gruppen.map((gruppe) => (
              <div key={gruppe.titel}>
                <h3 className="font-mono text-[11px] tracking-[0.2em] text-limette uppercase">{gruppe.titel}</h3>
                <ul className="mt-3 space-y-1.5 text-papier/90">
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
