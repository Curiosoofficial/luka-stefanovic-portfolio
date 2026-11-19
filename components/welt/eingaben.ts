"use client";

import { useEffect, useRef } from "react";
import { weltStore } from "./zustand";

/**
 * Maus, Klicks und «weniger Bewegung» für die 3D-Welten.
 * Schreibt direkt in den weltStore (kein React-State), die Welt liest ihn in jedem Frame.
 * Gibt eine Ref zurück, die sagt, ob die Person reduzierte Bewegung eingestellt hat.
 */
export function useWeltEingaben() {
  const ruhig = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    ruhig.current = mq.matches;
    const aenderung = (e: MediaQueryListEvent) => (ruhig.current = e.matches);
    mq.addEventListener("change", aenderung);

    const bewegen = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      weltStore.maus.x = (e.clientX / window.innerWidth) * 2 - 1;
      weltStore.maus.y = -((e.clientY / window.innerHeight) * 2 - 1);
      weltStore.maus.aktiv = true;
    };
    const verlassen = () => (weltStore.maus.aktiv = false);
    // Klick (oder Tippen) irgendwo, ausser auf Links und Buttons, löst in der Welt eine Reaktion aus
    const klicken = (e: PointerEvent) => {
      if (e.target instanceof Element && e.target.closest("a, button")) return;
      weltStore.klick.zeit = performance.now();
    };
    window.addEventListener("pointermove", bewegen, { passive: true });
    window.addEventListener("pointerdown", klicken);
    document.documentElement.addEventListener("pointerleave", verlassen);
    window.addEventListener("blur", verlassen);
    return () => {
      mq.removeEventListener("change", aenderung);
      window.removeEventListener("pointermove", bewegen);
      window.removeEventListener("pointerdown", klicken);
      document.documentElement.removeEventListener("pointerleave", verlassen);
      window.removeEventListener("blur", verlassen);
    };
  }, []);

  return ruhig;
}
