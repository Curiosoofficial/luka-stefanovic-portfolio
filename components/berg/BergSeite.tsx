import { BergFenster, BergNavigation } from "./BergFenster";
import { kontaktEcht, profil, skills, ueberMich } from "@/data/profil";
import { projekte } from "@/data/projects";

/**
 * Die Seite in der Berg-Welt: kein sichtbarer 2D-Inhalt, nur die 3D-Reise vom Gipfel ins Tal.
 *
 * - Oben eine Mini-Navigation: «Luka» und «Kontakt» (öffnet das Kontaktfenster). Sie ist nur im Startbild zu sehen
 *   und blendet beim Hinunterscrollen aus.
 * - Die Inhalte sind Gegenstände in der Welt: Gondeln sind Projekte, ein Schild auf der Alp ist «Über mich»,
 *   der Briefkasten am See ist der Kontakt. Ein Klick öffnet das Infofenster (BergFenster).
 * - Alle Inhalte stehen zusätzlich unsichtbar im HTML (sr-only): für Google, Screenreader und Tastatur.
 *   Wer eine 3D-Welt nicht sehen kann, bekommt so trotzdem Name, Projekte, Skills und Kontakt.
 * - Darunter eine lange, leere Strecke: Sie gibt dem Scrollen den Weg, den die Kamera den Berg hinunterfährt.
 */
export function BergSeite() {
  return (
    <>
      <BergNavigation />

      {/* Infofenster: geht auf, wenn man in der Welt eine Gondel, das Schild oder den Briefkasten anklickt */}
      <BergFenster />

      <main id="inhalt" className="relative z-10">
        {/* Unsichtbare Textfassung der ganzen Seite */}
        <div className="sr-only">
          <h1>
            {profil.name}: {profil.rolle} ({profil.stack}) in {profil.ort}
          </h1>
          <p>{profil.status}</p>
          <section aria-labelledby="titel-ueber">
            <h2 id="titel-ueber">{ueberMich.titel}</h2>
            <p>{ueberMich.text}</p>
          </section>
          <section aria-labelledby="titel-projekte">
            <h2 id="titel-projekte">Projekte</h2>
            <ul>
              {projekte.map((p) => (
                <li key={p.slug}>
                  <h3>{p.titel}</h3>
                  <p>
                    {p.art}
                    {p.hinweis ? ` (${p.hinweis})` : ""}: {p.kurz} Technik: {p.technik.join(", ")}.
                  </p>
                  {p.live && <a href={p.live}>{p.titel} live ansehen</a>}
                  {p.github && <a href={p.github}>Code von {p.titel} auf GitHub</a>}
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="titel-skills">
            <h2 id="titel-skills">Skills</h2>
            <p>{[...skills.kern, ...skills.werkzeuge, ...skills.ausserdem].join(", ")}</p>
          </section>
          <section aria-labelledby="titel-kontakt">
            <h2 id="titel-kontakt">Kontakt</h2>
            {kontaktEcht.email && (
              <p>
                <a href={`mailto:${profil.email}`}>{profil.email}</a>
              </p>
            )}
            <p>
              <a href={profil.github}>GitHub</a>
              {kontaktEcht.linkedin && (
                <>
                  {" "}
                  · <a href={profil.linkedin}>LinkedIn</a>
                </>
              )}
            </p>
          </section>
        </div>

        {/* Die Scroll-Strecke: oben der Gipfel, unten das Tal mit dem Briefkasten für den Kontakt */}
        <div id="gipfel" aria-hidden className="h-px" />
        <div aria-hidden className="h-[620svh]" />
        <div id="kontakt" aria-hidden className="h-svh" />
      </main>
    </>
  );
}
