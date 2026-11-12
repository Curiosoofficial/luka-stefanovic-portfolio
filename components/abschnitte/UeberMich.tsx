import { WortReveal } from "@/components/ui/WortReveal";
import { ueberMich } from "@/data/profil";
import { SektionsKopf } from "./SektionsKopf";

export function UeberMich() {
  return (
    <section id="ueber-mich" data-partikel="1" className="relative px-4 py-28 md:px-8 md:py-40">
      <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-2">
        <div className="min-w-0">
          <SektionsKopf nummer="01" label="Über mich" titel={ueberMich.titel} />
          <WortReveal text={ueberMich.text} className="mt-10 text-2xl leading-snug font-medium md:text-3xl" />
          <dl className="mt-14 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {ueberMich.fakten.map((fakt) => (
              <div key={fakt.label} className="border-t border-papier/10 pt-3">
                <dt className="font-mono text-[11px] tracking-[0.2em] text-nebel uppercase">{fakt.label}</dt>
                <dd className="mt-1 text-papier/90">{fakt.wert}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="hidden items-end justify-end md:flex">
          <p className="font-mono text-[11px] tracking-[0.2em] text-nebel uppercase">Das bin ich, in Punkten.</p>
        </div>
      </div>
    </section>
  );
}
