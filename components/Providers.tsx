"use client";

import { ReactLenis } from "lenis/react";
import { MotionConfig, useReducedMotion } from "motion/react";

/**
 * Globale Hüllen für die ganze Seite:
 * - MotionConfig: Alle Motion-Animationen respektieren «Bewegung reduzieren» im System.
 * - Lenis: Weiches Scrollen. Wird bei reduzierter Bewegung gar nicht erst gestartet.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const reduziert = useReducedMotion();

  return (
    <MotionConfig reducedMotion="user">
      {reduziert === false && <ReactLenis root options={{ lerp: 0.1, anchors: true }} />}
      {children}
    </MotionConfig>
  );
}
