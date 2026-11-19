/**
 * Welche 3D-Welt hinter der Seite läuft.
 * - "code": dunkle, futuristische Welt. Beim Scrollen wird aus Code Schritt für Schritt eine fertige Website.
 * - "strick": die gestrickte Bastelwelt (Stand «v2-strick»), bleibt komplett erhalten.
 * Umschalten: Wert ändern, fertig. Texte und Farben der Seite passen sich über data-thema an.
 */
export type Thema = "code" | "strick";

export const THEMA: Thema = "code";

/** Kleine Texte im Hero, die zur jeweiligen Welt passen */
export const WELT_TEXTE: Record<Thema, { maus: string; klick: string; signatur: string; ueberMich: string }> = {
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
