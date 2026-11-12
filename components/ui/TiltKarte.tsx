"use client";

import { motion, useSpring, type MotionStyle } from "motion/react";
import { useRef } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Farbe von Spotlight und leuchtendem Rand */
  farbe?: string;
  /** Maximale Neigung in Grad */
  neigung?: number;
};

/**
 * Karte, die sich zur Maus neigt (3D-Tilt), mit Spotlight und leuchtendem Rand,
 * die der Maus folgen. Inspiriert von Aceternity UI, aber selbst gebaut:
 * Die Mausposition landet als CSS-Variable (--sx, --sy) auf der Karte, die Verläufe lesen sie aus.
 */
export function TiltKarte({ children, className = "", farbe = "#D4FF3A", neigung = 8 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const drehX = useSpring(0, { stiffness: 180, damping: 18 });
  const drehY = useSpring(0, { stiffness: 180, damping: 18 });

  const style = {
    rotateX: drehX,
    rotateY: drehY,
    transformPerspective: 1000,
    "--farbe": farbe,
  } as MotionStyle;

  return (
    <motion.div
      ref={ref}
      style={style}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        drehY.set((px - 0.5) * neigung * 2);
        drehX.set(-(py - 0.5) * neigung * 2);
        ref.current.style.setProperty("--sx", `${px * 100}%`);
        ref.current.style.setProperty("--sy", `${py * 100}%`);
      }}
      onPointerLeave={() => {
        drehX.set(0);
        drehY.set(0);
      }}
      className={`group relative ${className}`}
    >
      {/* Spotlight auf der Fläche */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(420px circle at var(--sx, 50%) var(--sy, 50%), color-mix(in oklab, var(--farbe) 20%, transparent), transparent 65%)",
        }}
      />
      {/* Leuchtender Rand: derselbe Verlauf, aber per Maske nur 1px breit sichtbar */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          padding: 1,
          background: "radial-gradient(260px circle at var(--sx, 50%) var(--sy, 50%), var(--farbe), transparent 70%)",
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      <div className="relative h-full">{children}</div>
    </motion.div>
  );
}
