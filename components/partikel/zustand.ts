import { useSyncExternalStore } from "react";

/**
 * Schneller, veränderbarer Zustand, den die Partikel in jedem Frame lesen.
 * Absichtlich kein React-State: 60-mal pro Sekunde neu rendern wäre viel zu teuer.
 */
export const partikelStore = {
  /** Mausposition in Bildschirm-Koordinaten von -1 bis 1 */
  maus: { x: 0, y: 0, aktiv: false },
  /** Farbe, die die Partikel annehmen, solange ein Projekt sichtbar ist */
  tint: "#ffffff",
  tintAn: false,
};

/* Lade-Status für die Anzeige im Hero («24'000 Punkte»). Hier lohnt sich React-State. */

type Status = { anzahl: number; bereit: boolean };

const SERVER_STATUS: Status = { anzahl: 0, bereit: false };
let status = SERVER_STATUS;
const hoerer = new Set<() => void>();

export function setzePartikelStatus(neu: Status) {
  status = neu;
  hoerer.forEach((h) => h());
}

function abonnieren(h: () => void) {
  hoerer.add(h);
  return () => {
    hoerer.delete(h);
  };
}

export function usePartikelStatus() {
  return useSyncExternalStore(
    abonnieren,
    () => status,
    () => SERVER_STATUS,
  );
}
