"use client";

import { useEffect } from "react";
import { kontaktEcht, profil } from "@/data/profil";
import { setzeSprache, spracheErmitteln } from "./sprache";
import { useTexte } from "./texte";

/**
 * Die unsichtbare Textfassung der ganzen Seite (sr-only): für Google, Screenreader und Tastatur.
 * Wer eine 3D-Welt nicht sehen kann, bekommt so trotzdem Name, Projekte, Skills, Kontakt und den Lebenslauf.
 *
 * Hier wird auch die Sprache der Seite festgelegt: Der Server liefert Deutsch, nach dem Laden gilt
 * die Sprache aus der Adresse (?lang=en), die zuletzt gewählte oder die des Browsers (siehe sprache.ts).
 * Titel der Seite und lang-Attribut folgen der Sprache.
 */
export function BergText() {
  const t = useTexte();

  useEffect(() => {
    setzeSprache(spracheErmitteln());
  }, []);

  useEffect(() => {
    document.documentElement.lang = t.kennung;
    document.title = t.seitenTitel;
  }, [t]);

  return (
    <div className="sr-only">
      <h1>
        {profil.name}: {t.rolle} ({profil.stack}) in {t.ort}
      </h1>
      <p>{t.status}</p>
      <section aria-labelledby="titel-ueber">
        <h2 id="titel-ueber">{t.ueberMich.titel}</h2>
        <p>{t.ueberMich.text}</p>
        <p>
          <a href={t.cv} download>
            {t.ui.lebenslauf}
          </a>
        </p>
      </section>
      <section aria-labelledby="titel-projekte">
        <h2 id="titel-projekte">{t.ui.projekte}</h2>
        <ul>
          {t.projekte.map((p) => (
            <li key={p.slug}>
              <h3>{p.titel}</h3>
              <p>
                {p.artText}
                {p.hinweis ? ` (${p.hinweis})` : ""}: {p.kurz} {t.ui.technik}: {p.technik.join(", ")}.
              </p>
              {p.live && <a href={p.live}>{t.ui.liveVon(p.titel)}</a>}
              {p.github && <a href={p.github}>{t.ui.codeVon(p.titel)}</a>}
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="titel-skills">
        <h2 id="titel-skills">{t.ui.skills}</h2>
        <p>{t.skillsAlle.join(", ")}</p>
      </section>
      <section aria-labelledby="titel-kontakt">
        <h2 id="titel-kontakt">{t.ui.kontakt}</h2>
        {kontaktEcht.email && (
          <p>
            <a href={`mailto:${profil.email}`}>{profil.email}</a>
          </p>
        )}
        <p>
          {t.ui.telefon}: <a href={`tel:${profil.telefon.replace(/\s/g, "")}`}>{profil.telefon}</a>
        </p>
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
  );
}
