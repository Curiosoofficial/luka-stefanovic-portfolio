import { Laufband } from "@/components/ui/Laufband";
import { skills } from "@/data/profil";
import { SektionsKopf } from "./SektionsKopf";

const gruppen = [
  { titel: "Kern", eintraege: skills.kern },
  { titel: "Werkzeuge", eintraege: skills.werkzeuge },
  { titel: "Ausserdem", eintraege: skills.ausserdem },
];

export function Skills() {
  return (
    <section id="skills" data-partikel="3" className="relative py-28 md:py-40">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 md:grid-cols-2 md:px-8">
        <div className="min-w-0">
          <SektionsKopf nummer="03" label="Skills" titel="Mein Werkzeugkasten." />
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {gruppen.map((gruppe) => (
              <div key={gruppe.titel}>
                <h3 className="font-mono text-[11px] tracking-[0.2em] text-limette uppercase">{gruppe.titel}</h3>
                <ul className="mt-3 space-y-1.5 text-papier/90">
                  {gruppe.eintraege.map((eintrag) => (
                    <li key={eintrag}>{eintrag}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-20 space-y-2 md:mt-28" aria-hidden>
        <Laufband
          eintraege={[...skills.kern, ...skills.werkzeuge]}
          className="font-display text-5xl font-extrabold tracking-tight md:text-8xl"
        />
        <Laufband
          eintraege={skills.ausserdem}
          rueckwaerts
          dauer={55}
          className="font-display text-5xl font-extrabold tracking-tight text-transparent [-webkit-text-stroke:1.5px_var(--color-papier)] md:text-8xl"
        />
      </div>
    </section>
  );
}
