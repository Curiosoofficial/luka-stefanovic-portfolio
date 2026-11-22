import { BergFenster, BergNavigation } from "./BergFenster";
import { BergText } from "./BergText";

/**
 * Die Seite in der Berg-Welt: kein sichtbarer 2D-Inhalt, nur die 3D-Reise vom Gipfel ins Tal.
 *
 * - Die Seite gibt es auf Deutsch und Englisch (siehe sprache.ts und texte.ts).
 * - Oben eine Mini-Navigation: «Luka», die Sprachwahl und «Kontakt» (öffnet das Kontaktfenster). Sie ist nur im Startbild zu sehen
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
        {/* Unsichtbare Textfassung der ganzen Seite, in der gewählten Sprache */}
        <BergText />

        {/* Die Scroll-Strecke: oben der Gipfel, unten das Tal mit dem Briefkasten für den Kontakt */}
        <div id="gipfel" aria-hidden className="h-px" />
        <div aria-hidden className="h-[620svh]" />
        <div id="kontakt" aria-hidden className="h-svh" />
      </main>
    </>
  );
}
