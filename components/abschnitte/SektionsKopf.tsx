import { Einblenden } from "@/components/ui/Einblenden";

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
      <p className="font-mono text-xs tracking-[0.25em] text-nebel uppercase">
        <span className="text-limette">{nummer}</span> / {label}
      </p>
      <Einblenden>
        <h2
          className={`mt-4 font-display text-4xl leading-[0.95] font-extrabold tracking-tight text-balance hyphens-auto sm:text-5xl md:text-7xl ${titelKlasse}`}
        >
          {titel}
        </h2>
      </Einblenden>
    </div>
  );
}
