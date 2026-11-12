"use client";

import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";

/**
 * Text, der sich beim Scrollen Wort für Wort einfärbt.
 * useScroll liefert den Fortschritt 0–1, während der Absatz durchs Bild wandert.
 * Jedes Wort bekommt ein eigenes Stück davon: Wort 3 von 10 leuchtet zwischen 0.3 und 0.4 auf.
 */
export function WortReveal({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.55"] });
  const woerter = text.split(" ");

  return (
    <p ref={ref} className={className}>
      {woerter.map((wort, i) => (
        <Wort key={i} fortschritt={scrollYProgress} von={i / woerter.length} bis={(i + 1) / woerter.length}>
          {wort}
        </Wort>
      ))}
    </p>
  );
}

function Wort({
  fortschritt,
  von,
  bis,
  children,
}: {
  fortschritt: MotionValue<number>;
  von: number;
  bis: number;
  children: string;
}) {
  const deckkraft = useTransform(fortschritt, [von, bis], [0.15, 1]);
  return (
    <>
      <motion.span style={{ opacity: deckkraft }}>{children}</motion.span>{" "}
    </>
  );
}
