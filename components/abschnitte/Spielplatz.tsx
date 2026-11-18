"use client";

import { beat } from "@/components/sound/beat";
import { useSoundAn } from "@/components/sound/SoundKnopf";
import { Einblenden } from "@/components/ui/Einblenden";
import { TiltKarte } from "@/components/ui/TiltKarte";
import { spielplatz, type SpielplatzEintrag } from "@/data/profil";
import { SektionsKopf } from "./SektionsKopf";

function Kachel({ eintrag }: { eintrag: SpielplatzEintrag }) {
  const soundAn = useSoundAn();

  return (
    <TiltKarte farbe={eintrag.farbe} className="h-full rounded-3xl border border-papier/10 bg-tinte-2/70 p-6 backdrop-blur-md">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between">
          <span
            aria-hidden
            className="size-14 rounded-full transition-transform duration-500 group-hover:scale-110"
            style={{
              background: `radial-gradient(circle at 30% 30%, color-mix(in oklab, ${eintrag.farbe} 50%, white), ${eintrag.farbe} 60%)`,
            }}
          />
          <span className="font-mono text-[11px] tracking-[0.2em] text-nebel uppercase">{eintrag.werkzeug}</span>
        </div>
        <h3 className="mt-8 font-display text-3xl font-bold">{eintrag.titel}</h3>
        <p className="mt-2 flex-1 text-papier/75">{eintrag.text}</p>
        <div className="mt-6">
          {eintrag.aktion === "sound" ? (
            <button
              type="button"
              aria-pressed={soundAn}
              onClick={() => beat.umschalten()}
              className="rounded-full bg-pink px-5 py-2.5 text-sm font-semibold text-tinte transition-transform hover:scale-105"
            >
              {soundAn ? "Beat stoppen" : "Beat starten"}
            </button>
          ) : eintrag.link ? (
            <a
              href={eintrag.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold transition-colors hover:text-limette"
            >
              Ansehen <span aria-hidden>↗</span>
            </a>
          ) : (
            <span className="font-mono text-[11px] tracking-[0.2em] text-nebel uppercase">Bald mehr</span>
          )}
        </div>
      </div>
    </TiltKarte>
  );
}

export function Spielplatz() {
  return (
    <section id="spielplatz" data-partikel="5" className="relative px-4 py-28 md:px-8 md:py-40">
      <div className="mx-auto max-w-7xl">
        <SektionsKopf nummer="04" label="Spielplatz" titel="Wenn ich nicht code …" />
        <p className="mt-6 max-w-xl text-lg text-papier/80">
          … baue ich 3D-Welten, kleine Spiele und Beats. Das schult das Auge für Details. Manchmal landet es direkt im
          Code, wie die Galaxie hinter diesem Text.
        </p>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {spielplatz.map((eintrag, i) => (
            <Einblenden key={eintrag.titel} verzoegerung={i * 0.1} className="h-full">
              <Kachel eintrag={eintrag} />
            </Einblenden>
          ))}
        </div>
      </div>
    </section>
  );
}
