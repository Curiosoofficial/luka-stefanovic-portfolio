import { Einblenden } from "@/components/ui/Einblenden";

/** Überschrift eines Abschnitts: handgeschriebenes Label plus dicker runder Titel */
export function SektionsKopf({
  nummer,
  label,
  titel,
  className = "",
  titelKlasse = "",
}: {
  nummer: string;
  label: string;
  titel: string;
  className?: string;
  /** Zusätzliche Klassen für den Titel, z. B. kleinere Schrift */
  titelKlasse?: string;
}) {
  return (
    <div className={className}>
      <p className="inline-block -rotate-2 font-hand text-3xl leading-none text-akzent">
        Nr. {nummer} · {label}
      </p>
      <Einblenden>
        <h2
          className={`mt-3 font-display text-4xl leading-[0.95] font-bold tracking-tight text-balance hyphens-auto sm:text-5xl md:text-6xl ${titelKlasse}`}
        >
          {titel}
        </h2>
      </Einblenden>
    </div>
  );
}
