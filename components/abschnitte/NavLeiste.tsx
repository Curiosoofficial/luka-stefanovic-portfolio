"use client";

import { useEffect, useState } from "react";

/**
 * Hülle der Navigation, die auf das Scrollen reagiert:
 * - ganz oben: immer sichtbar
 * - beim Runterscrollen: gleitet nach oben weg, damit nichts die Welt verdeckt
 * - beim Hochscrollen: kommt sofort zurück
 * Mit der Tastatur bleibt sie immer erreichbar (sobald etwas darin den Fokus hat, ist sie sichtbar).
 */
export function NavLeiste({ children }: { children: React.ReactNode }) {
  const [zustand, setZustand] = useState({ oben: true, weg: false });

  useEffect(() => {
    let letzte = window.scrollY;
    let wartet = false;
    const pruefen = () => {
      wartet = false;
      const y = window.scrollY;
      const oben = y < 40;
      const schritt = y - letzte;
      // Kleine Zitterbewegungen ignorieren, erst ab ein paar Pixeln Richtung zählt es
      if (!oben && Math.abs(schritt) < 6) return;
      letzte = y;
      setZustand((z) => {
        const weg = oben ? false : schritt > 0;
        return z.oben === oben && z.weg === weg ? z : { oben, weg };
      });
    };
    const beimScrollen = () => {
      if (wartet) return;
      wartet = true;
      requestAnimationFrame(pruefen);
    };
    // Falls die Seite schon gescrollt geladen wird (z. B. nach Neuladen weiter unten)
    requestAnimationFrame(pruefen);
    window.addEventListener("scroll", beimScrollen, { passive: true });
    return () => window.removeEventListener("scroll", beimScrollen);
  }, []);

  return (
    <header
      data-oben={zustand.oben}
      data-weg={zustand.weg}
      className="group/nav fixed inset-x-0 top-0 z-50 px-3 pt-3 transition-[translate,opacity] duration-500 ease-out focus-within:translate-y-0! focus-within:opacity-100! data-[weg=true]:-translate-y-[130%] data-[weg=true]:opacity-0 motion-reduce:transition-none md:px-6"
    >
      {children}
    </header>
  );
}
