"use client";

import { useTexte } from "./texte";

/**
 * Ladeanzeige für die Berg-Welt: Sie liegt über der Bühne, bis der Berg wirklich zu sehen ist,
 * und blendet dann weich aus. So schaut niemand auf eine leere blaue Fläche.
 */
export function Ladeanzeige({ weg = false }: { weg?: boolean }) {
  const t = useTexte();
  return (
    <div className={`absolute inset-0 grid place-items-center bg-[#bfe2f8] transition-opacity duration-700 ${weg ? "opacity-0" : "opacity-100"}`}>
      <div className="flex flex-col items-center gap-4 font-display text-lg font-bold text-tinte">
        <span className="h-11 w-11 animate-spin rounded-full border-4 border-tinte/15 border-t-[#EE4F86] motion-reduce:animate-none" />
        {t.ui.laden}
      </div>
    </div>
  );
}
