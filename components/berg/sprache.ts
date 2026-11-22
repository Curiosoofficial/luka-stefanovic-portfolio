import { useSyncExternalStore } from "react";

/**
 * Die Sprache der Seite: Deutsch oder Englisch. Ein kleiner eigener Speicher (wie fenster.ts),
 * weil die 3D-Welt und die Seite zwei getrennte React-Bäume sind und beide gleichzeitig umschalten müssen.
 *
 * Der Server liefert die Seite immer auf Deutsch aus. Nach dem Laden entscheidet spracheErmitteln(),
 * ob umgeschaltet wird: Adresse mit ?lang=en, sonst die zuletzt gewählte Sprache, sonst die Sprache des Browsers.
 */
export type Sprache = "de" | "en";

const SCHLUESSEL = "sprache";

let aktuell: Sprache = "de";
const hoerer = new Set<() => void>();

function istSprache(wert: unknown): wert is Sprache {
  return wert === "de" || wert === "en";
}

/** Schaltet die Sprache um. Die Wahl selbst zu merken, ist Sache von waehleSprache. */
export function setzeSprache(sprache: Sprache) {
  if (sprache === aktuell) return;
  aktuell = sprache;
  hoerer.forEach((h) => h());
}

/** Der Besucher wählt eine Sprache: umschalten, für den nächsten Besuch merken und in die Adresse schreiben (zum Teilen) */
export function waehleSprache(sprache: Sprache) {
  setzeSprache(sprache);
  try {
    window.localStorage.setItem(SCHLUESSEL, sprache);
  } catch {
    // Ohne Speicher (privates Fenster) gilt die Wahl einfach bis zum Neuladen
  }
  const adresse = new URL(window.location.href);
  if (sprache === "de") adresse.searchParams.delete("lang");
  else adresse.searchParams.set("lang", sprache);
  window.history.replaceState(window.history.state, "", adresse);
}

/** Welche Sprache soll beim Öffnen der Seite gelten? */
export function spracheErmitteln(): Sprache {
  const ausAdresse = new URL(window.location.href).searchParams.get("lang");
  if (istSprache(ausAdresse)) return ausAdresse;
  try {
    const gemerkt = window.localStorage.getItem(SCHLUESSEL);
    if (istSprache(gemerkt)) return gemerkt;
  } catch {
    // kein Speicher: weiter mit der Sprache des Browsers
  }
  // Steht Deutsch irgendwo in den Sprachen des Browsers, bleibt die Seite deutsch. Sonst Englisch.
  const sprachen = navigator.languages?.length ? navigator.languages : [navigator.language];
  return sprachen.some((s) => s.toLowerCase().startsWith("de")) ? "de" : "en";
}

/** Aktueller Stand, für die 3D-Welt (ohne React) */
export function spracheStand() {
  return aktuell;
}

function abonnieren(h: () => void) {
  hoerer.add(h);
  return () => {
    hoerer.delete(h);
  };
}

/** Aktuelle Sprache als React-Wert: Alles, was Text zeigt, zeichnet beim Umschalten neu */
export function useSprache() {
  return useSyncExternalStore(abonnieren, spracheStand, () => "de" as Sprache);
}
