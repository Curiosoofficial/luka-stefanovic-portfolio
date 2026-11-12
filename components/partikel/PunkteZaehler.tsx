"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect } from "react";
import { usePartikelStatus } from "./zustand";

const format = new Intl.NumberFormat("de-CH");

/** Zählt hoch, sobald die Partikel bereit sind: «24’000 Punkte». */
export function PunkteZaehler() {
  const { anzahl, bereit } = usePartikelStatus();
  const wert = useMotionValue(0);
  const text = useTransform(wert, (v) => format.format(Math.round(v)));

  useEffect(() => {
    if (!bereit) return;
    const animation = animate(wert, anzahl, { duration: 2, ease: [0.2, 0.8, 0.2, 1] });
    return () => animation.stop();
  }, [bereit, anzahl, wert]);

  return (
    <p className="font-mono text-[11px] tracking-[0.2em] text-nebel uppercase">
      {bereit ? (
        <>
          <motion.span className="text-papier tabular-nums">{text}</motion.span> Punkte
        </>
      ) : (
        "Punkte laden …"
      )}
    </p>
  );
}
