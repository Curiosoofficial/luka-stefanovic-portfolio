import type { CSSProperties } from "react";

type Props = {
  eintraege: string[];
  rueckwaerts?: boolean;
  /** Sekunden für eine volle Runde */
  dauer?: number;
  className?: string;
};

/**
 * Endloses Laufband, nur mit CSS.
 * Der Inhalt steht zweimal hintereinander. Die Animation schiebt um genau 50 %,
 * also eine Kopie weit, und springt dann unsichtbar zurück an den Anfang.
 */
export function Laufband({ eintraege, rueckwaerts = false, dauer = 40, className = "" }: Props) {
  const liste = (
    <ul className="flex shrink-0 items-center">
      {[...eintraege, ...eintraege].map((eintrag, i) => (
        <li key={i} className="flex items-center whitespace-nowrap">
          <span className="px-6 md:px-10">{eintrag}</span>
          <span aria-hidden className="text-[0.5em] text-pink [-webkit-text-stroke:0]">
            ✦
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className={`laufband overflow-hidden ${className}`}>
      <div
        className={`laufband-spur flex w-max ${rueckwaerts ? "laufband-rueckwaerts" : ""}`}
        style={{ "--dauer": `${dauer}s` } as CSSProperties}
      >
        {liste}
        <div aria-hidden className="flex shrink-0">
          {liste}
        </div>
      </div>
    </div>
  );
}
