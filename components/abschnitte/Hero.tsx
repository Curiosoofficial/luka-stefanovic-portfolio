import type { CSSProperties } from "react";
import { PunkteZaehler } from "@/components/partikel/PunkteZaehler";
import { MagnetKnopf } from "@/components/ui/MagnetKnopf";
import { profil } from "@/data/profil";

/** Mischt zwei Hex-Farben, t von 0 bis 1 */
function mischeFarbe(a: string, b: string, t: number) {
  const ka = parseInt(a.slice(1), 16);
  const kb = parseInt(b.slice(1), 16);
  const kanal = (k: number, shift: number) => (k >> shift) & 255;
  const mix = (shift: number) => Math.round(kanal(ka, shift) + (kanal(kb, shift) - kanal(ka, shift)) * t);
  return `rgb(${mix(16)} ${mix(8)} ${mix(0)})`;
}

/** Farbverlauf Pink → Orange → Limette über die Buchstaben des Nachnamens */
function verlauf(i: number, anzahl: number) {
  const t = anzahl <= 1 ? 0 : i / (anzahl - 1);
  return t < 0.5 ? mischeFarbe("#FF2E93", "#FF7A1A", t * 2) : mischeFarbe("#FF7A1A", "#D4FF3A", (t - 0.5) * 2);
}

export function Hero() {
  const [vorname, ...rest] = profil.name.split(" ");
  const nachname = rest.join(" ");
  let index = 0;

  const zeile = (wort: string, bunt: boolean) => (
    <span className="block whitespace-nowrap">
      {wort.split("").map((buchstabe, i) => (
        <span
          key={i}
          className="buchstabe"
          style={{ "--i": index++, color: bunt ? verlauf(i, wort.length) : undefined } as CSSProperties}
        >
          {buchstabe}
        </span>
      ))}
    </span>
  );

  return (
    <section
      id="start"
      data-partikel="0"
      className="relative flex min-h-svh flex-col justify-end px-4 pt-28 pb-8 md:px-8 md:pb-10"
    >
      <div className="absolute inset-x-4 top-20 flex items-start justify-between md:inset-x-8 md:top-24">
        <p className="inline-flex items-center gap-2 rounded-full border border-papier/15 bg-tinte/40 px-3 py-1.5 font-mono text-[11px] tracking-[0.2em] uppercase backdrop-blur">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-limette opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-limette" />
          </span>
          {profil.status}
        </p>
        <div className="hidden text-right md:block">
          <PunkteZaehler />
          <p className="mt-1 font-mono text-[11px] tracking-[0.2em] text-nebel/70 uppercase">Maus drüber bewegen</p>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-8 md:grid-cols-12 md:items-end">
        <div className="md:col-span-7">
          <h1 className="font-display text-[clamp(3rem,8vw,7.5rem)] leading-[0.88] font-extrabold tracking-[-0.03em]">
            <span className="sr-only">{profil.name}</span>
            <span aria-hidden>
              {zeile(vorname, false)}
              {zeile(nachname, true)}
            </span>
          </h1>
          <p className="mt-5 font-mono text-sm tracking-[0.2em] text-nebel uppercase">
            {profil.rolle} · {profil.stack} · {profil.ort}
          </p>
        </div>

        <div className="md:col-span-5 md:pb-3">
          <p className="max-w-md text-lg leading-relaxed text-papier/85">
            Ich baue schnelle, auffällige Websites. Seit 2023 für echte Kunden rund um Zürich, jetzt suche ich mein
            nächstes Team.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <MagnetKnopf href="#projekte" className="rounded-full bg-limette px-6 py-3.5 font-semibold text-tinte">
              Projekte ansehen
            </MagnetKnopf>
            <MagnetKnopf
              href="#kontakt"
              className="rounded-full border border-papier/30 bg-tinte/30 px-6 py-3.5 font-semibold backdrop-blur transition-colors hover:border-papier"
            >
              Kontakt
            </MagnetKnopf>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 flex w-full max-w-7xl items-center justify-between font-mono text-[11px] tracking-[0.2em] text-nebel uppercase">
        <span>Zürich, Schweiz</span>
        <span className="flex items-center gap-3">
          Scrollen
          <span className="relative block h-px w-12 overflow-hidden bg-nebel/30">
            <span className="absolute inset-y-0 left-0 w-1/2 animate-pulse bg-limette" />
          </span>
        </span>
      </div>
    </section>
  );
}
