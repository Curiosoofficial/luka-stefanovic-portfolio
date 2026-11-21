/**
 * Welche 3D-Welt hinter der Seite läuft.
 * - "glas": helles, klares Design nach der 60-30-10-Regel (Off-White, Tintenblau, Orange) mit einer Glasskulptur.
 * - "code": dunkle, futuristische Welt. Beim Scrollen wird aus Code Schritt für Schritt eine fertige Website.
 * - "strick": die gestrickte Bastelwelt (Stand «v2-strick»), bleibt komplett erhalten.
 * Umschalten: Wert ändern, fertig. Texte und Farben der Seite passen sich über data-thema an.
 */
export type Thema = "glas" | "code" | "strick";

export const THEMA: Thema = "glas";

/** Kleine Texte, die zur jeweiligen Welt passen */
export const WELT_TEXTE: Record<Thema, { maus: string; klick: string; signatur: string; ueberMich: string }> = {
  glas: {
    maus: "Maus bewegen: das Glas dreht sich mit",
    klick: "Klicken: der Ring schwingt",
    signatur: "Live gerendert mit Three.js",
    ueberMich: "Klar gebaut, mit Tiefe.",
  },
  code: {
    maus: "Maus bewegen: die Kamera folgt",
    klick: "Klicken: der Code springt",
    signatur: "Live gerendert mit Three.js",
    ueberMich: "Aus Code wird ein Gerüst.",
  },
  strick: {
    maus: "Maus bewegen: die Welt kippt",
    klick: "Klicken: die Buchstaben hüpfen",
    signatur: "Handgestrickt mit Three.js",
    ueberMich: "Willkommen unter der Erde.",
  },
};
