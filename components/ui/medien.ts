"use client";

import { useSyncExternalStore } from "react";

/**
 * Hört auf eine CSS-Media-Query und liefert true/false.
 * Auf dem Server ist der Wert immer false; React gleicht nach dem Laden ohne Fehler ab.
 */
function useMedienAbfrage(anfrage: string) {
  return useSyncExternalStore(
    (melden) => {
      const mq = window.matchMedia(anfrage);
      mq.addEventListener("change", melden);
      return () => mq.removeEventListener("change", melden);
    },
    () => window.matchMedia(anfrage).matches,
    () => false,
  );
}

/** true, wenn im System «Bewegung reduzieren» eingeschaltet ist */
export function useRuhig() {
  return useMedienAbfrage("(prefers-reduced-motion: reduce)");
}

/** true ab Tablet-Breite (768 px): Dort haben Abschnitte Platz, um beim Scrollen stehen zu bleiben */
export function useBreit() {
  return useMedienAbfrage("(min-width: 768px)");
}
