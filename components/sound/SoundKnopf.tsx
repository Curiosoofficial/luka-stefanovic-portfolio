"use client";

import { useSyncExternalStore, type CSSProperties } from "react";
import { beat } from "./beat";

/** true, solange der Beat läuft. Jede Komponente, die das nutzt, rendert beim Umschalten neu. */
export function useSoundAn() {
  return useSyncExternalStore(beat.subscribe, beat.istAn, () => false);
}

export function SoundKnopf({ className = "" }: { className?: string }) {
  const an = useSoundAn();

  return (
    <button
      type="button"
      aria-pressed={an}
      onClick={() => beat.umschalten()}
      title={an ? "Beat stoppen" : "Live-Beat starten"}
      className={`inline-flex items-center gap-2 rounded-full border border-schrift/20 bg-grund/40 px-3.5 py-2 font-mono text-xs tracking-widest uppercase backdrop-blur transition-colors hover:border-akzent hover:text-akzent aria-pressed:border-akzent aria-pressed:text-akzent ${className}`}
    >
      <span aria-hidden className="flex h-3 items-end gap-[2px]">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="eq-balken h-full w-[3px] rounded-full bg-current" style={{ "--i": i } as CSSProperties} />
        ))}
      </span>
      Sound
    </button>
  );
}
