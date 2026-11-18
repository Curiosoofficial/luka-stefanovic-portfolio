"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Eigener Cursor: ein Punkt, der exakt folgt, und ein Ring, der mit einer Feder nachzieht.
 * Über Links und Buttons wird der Ring gross. Nur mit Maus und ohne «Bewegung reduzieren».
 */
export function Cursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 260, damping: 28, mass: 0.6 });
  const ringY = useSpring(y, { stiffness: 260, damping: 28, mass: 0.6 });
  const [ueberLink, setUeberLink] = useState(false);
  const [gedrueckt, setGedrueckt] = useState(false);

  useEffect(() => {
    const maus = window.matchMedia("(pointer: fine)").matches;
    const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!maus || ruhig) return;

    const html = document.documentElement;
    html.classList.add("eigener-cursor");

    const bewegen = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const ziel = e.target instanceof Element ? e.target.closest("a, button, [data-cursor]") : null;
      setUeberLink(ziel !== null);
    };
    const runter = () => setGedrueckt(true);
    const hoch = () => setGedrueckt(false);

    window.addEventListener("pointermove", bewegen, { passive: true });
    window.addEventListener("pointerdown", runter);
    window.addEventListener("pointerup", hoch);
    return () => {
      html.classList.remove("eigener-cursor");
      window.removeEventListener("pointermove", bewegen);
      window.removeEventListener("pointerdown", runter);
      window.removeEventListener("pointerup", hoch);
    };
  }, [x, y]);

  return (
    <>
      <motion.div
        aria-hidden
        className="cursor-teil pointer-events-none fixed top-0 left-0 z-[80] size-2 rounded-full bg-gelb"
        style={{ x, y, translateX: "-50%", translateY: "-50%" }}
      />
      <motion.div
        aria-hidden
        className="cursor-teil pointer-events-none fixed top-0 left-0 z-[80] rounded-full border border-schrift/60"
        style={{ x: ringX, y: ringY, translateX: "-50%", translateY: "-50%" }}
        animate={{
          width: ueberLink ? 64 : 34,
          height: ueberLink ? 64 : 34,
          backgroundColor: ueberLink ? "rgba(212, 255, 58, 0.14)" : "rgba(212, 255, 58, 0)",
          scale: gedrueckt ? 0.8 : 1,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
      />
    </>
  );
}
