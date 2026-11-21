"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { beat } from "@/components/sound/beat";
import { useSoundAn } from "@/components/sound/SoundKnopf";
import { Einblenden } from "@/components/ui/Einblenden";
import { Knopf } from "@/components/ui/Knopf";
import { TiltKarte } from "@/components/ui/TiltKarte";
import { THEMA } from "@/components/welt/thema";
import { spielplatz, type SpielplatzEintrag } from "@/data/profil";
import { SektionsKopf } from "./SektionsKopf";

/** Der 3D-Körper der Kacheln (Filzplatte, Naht, Knopf) läuft nur im Browser */
const KartenKoerper = dynamic(() => import("@/components/welt/KartenKoerper"), { ssr: false });

/** Dunkle Schrift auf hellen Filzfarben, helle auf dunklen */
function istHell(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150;
}

/**
 * Eine Spielplatz-Kachel: dicke 3D-Filzplatte mit Naht und Knopf (siehe KartenKoerper), der Text liegt als HTML darüber.
 * Bis das 3D-Bild gezeichnet ist, steht eine flache Filzfläche als Platzhalter da.
 */
function Kachel({ eintrag, index }: { eintrag: SpielplatzEintrag; index: number }) {
  const soundAn = useSoundAn();
  const hell = istHell(eintrag.farbe);
  const knopfFarbe = hell ? "#3A86D8" : "#FFC93C";
  const [koerperDa, setKoerperDa] = useState(false);
  const code = THEMA === "code";
  const glas = THEMA === "glas";
  const dunkel = glas && index === 1;
  // Glas-Welt: helle Kacheln, die mittlere tintenblau; Code-Welt: dunkles Glas mit Lichtschein
  const flaeche = glas
    ? { backgroundColor: dunkel ? "#14213D" : "#F5F1E8", color: dunkel ? "#F5F1E8" : "#14213D" }
    : code
    ? {
        background: `radial-gradient(120% 110% at 0% 0%, color-mix(in oklab, ${eintrag.farbe} 40%, transparent) 0%, transparent 60%), linear-gradient(170deg, #121a33 0%, #0a0e1d 100%)`,
        color: "#e9edff",
      }
    : { backgroundColor: koerperDa ? "transparent" : eintrag.farbe, color: hell ? "#2E1F15" : "#FFF8EE" };

  return (
    <TiltKarte farbe={eintrag.farbe} className="h-full rounded-3xl" effekteVorne>
      {/* Weicher Schatten der Platte auf die Welt dahinter (in der Glas-Welt reicht der feine Kartenschatten) */}
      {!glas && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-4 top-6 -bottom-4 rounded-3xl shadow-[0_26px_44px_-18px_rgb(20_10_40_/_0.65)]"
        />
      )}
      {THEMA === "strick" && (
        <KartenKoerper
          farbe={eintrag.farbe}
          radius={24}
          polster={11}
          dicke={12}
          naht={15}
          knopf={{ farbe: knopfFarbe, groesse: 48, ecke: "oben-links", abstand: 52 }}
          onBereit={setKoerperDa}
        />
      )}
      <div
        className={`ohne-schein relative flex h-full flex-col rounded-3xl p-7 ${
          code
            ? "border border-white/10"
            : glas
              ? `stoff-schatten ${dunkel ? "" : "border border-schrift/10"}`
              : koerperDa
                ? ""
                : "filz naht [--naht-abstand:12px]"
        }`}
        style={flaeche}
      >
        <div className="flex items-center justify-between">
          {/* Platz für den 3D-Knopf; bis er da ist, steht ein flacher Knopf dort (Code-Welt: leuchtender Knoten) */}
          {koerperDa && THEMA === "strick" ? (
            <span aria-hidden className="size-12" />
          ) : (
            <Knopf farbe={code ? eintrag.farbe : knopfFarbe} groesse={48} />
          )}
          <span
            className="font-hand text-2xl leading-none"
            style={code ? { color: eintrag.farbe } : glas ? { color: dunkel ? "#FCA311" : "#B86E00" } : undefined}
          >
            {eintrag.werkzeug}
          </span>
        </div>
        <h3 className="mt-8 font-display text-3xl font-bold">{eintrag.titel}</h3>
        <p className="mt-2 flex-1 font-semibold opacity-90">{eintrag.text}</p>
        <div className="mt-6">
          {eintrag.aktion === "sound" ? (
            <button
              type="button"
              aria-pressed={soundAn}
              onClick={() => beat.umschalten()}
              className="bastel-knopf filz rounded-full bg-gelb px-5 py-2.5 text-sm font-extrabold text-tinte [--kante:#c9951a]"
            >
              {soundAn ? "Beat stoppen" : "Beat starten"}
            </button>
          ) : eintrag.link ? (
            <a href={eintrag.link} target="_blank" rel="noopener noreferrer" className="text-sm font-extrabold underline-offset-4 hover:underline">
              Ansehen <span aria-hidden>↗</span>
            </a>
          ) : (
            <span className="font-hand text-2xl leading-none opacity-80">Bald mehr …</span>
          )}
        </div>
      </div>
    </TiltKarte>
  );
}

export function Spielplatz() {
  return (
    <section id="spielplatz" data-partikel="5" className="relative overflow-x-clip px-4 py-28 md:px-8 md:py-40">
      <div className="mx-auto max-w-7xl">
        <div className="ohne-schein stoff-schatten relative inline-block max-w-2xl -rotate-1 rounded-2xl bg-wolle p-6 md:p-8">
          <span aria-hidden className="klebeband -top-3 left-10 w-28 -rotate-6" />
          <SektionsKopf nummer="04" label="Spielplatz" titel="Wenn ich nicht code …" />
          <p className="mt-5 text-lg font-semibold text-schrift/85">
            … baue ich 3D-Welten, kleine Spiele und Beats. Das schult das Auge für Details. Manchmal landet es direkt im
            Code, wie die 3D-Welt hinter diesem Text.
          </p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {spielplatz.map((eintrag, i) => (
            <Einblenden key={eintrag.titel} verzoegerung={i * 0.1} className="h-full">
              <Kachel eintrag={eintrag} index={i} />
            </Einblenden>
          ))}
        </div>
      </div>
    </section>
  );
}
