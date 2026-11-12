"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import { useRef } from "react";

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
  /** Wie stark der Knopf der Maus folgt (0 = gar nicht, 1 = komplett) */
  staerke?: number;
  extern?: boolean;
};

/** Link, der von der Maus angezogen wird und per Feder zurückschnappt. */
export function MagnetKnopf({ href, children, className = "", staerke = 0.35, extern = false }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const federX = useSpring(x, { stiffness: 220, damping: 14, mass: 0.4 });
  const federY = useSpring(y, { stiffness: 220, damping: 14, mass: 0.4 });

  return (
    <motion.a
      ref={ref}
      href={href}
      target={extern ? "_blank" : undefined}
      rel={extern ? "noopener noreferrer" : undefined}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * staerke);
        y.set((e.clientY - (r.top + r.height / 2)) * staerke);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      whileTap={{ scale: 0.95 }}
      style={{ x: federX, y: federY }}
      className={`inline-flex items-center justify-center ${className}`}
    >
      {children}
    </motion.a>
  );
}
