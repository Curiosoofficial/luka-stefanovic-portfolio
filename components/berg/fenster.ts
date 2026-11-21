import { useSyncExternalStore } from "react";

/**
 * Welches Infofenster gerade offen ist. Die 3D-Welt öffnet es (Klick auf eine Gondel, den Briefkasten, ein Schild),
 * die Seite zeigt es an. Ein kleiner eigener Speicher, weil Welt und Seite zwei getrennte React-Bäume sind.
 */
export type Fenster = { art: "projekt"; index: number } | { art: "ueber" } | { art: "kontakt" } | null;

let aktuell: Fenster = null;
const hoerer = new Set<() => void>();

export function oeffneFenster(fenster: Fenster) {
  aktuell = fenster;
  hoerer.forEach((h) => h());
}

export function schliesseFenster() {
  oeffneFenster(null);
}

/** Aktueller Stand, für die 3D-Welt (ohne React) */
export function fensterStand() {
  return aktuell;
}

function abonnieren(h: () => void) {
  hoerer.add(h);
  return () => {
    hoerer.delete(h);
  };
}

/** Aktueller Stand als React-Wert: Die Seite zeichnet neu, sobald ein Fenster auf- oder zugeht */
export function useFenster() {
  return useSyncExternalStore(abonnieren, fensterStand, () => null);
}
