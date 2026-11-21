import { Footer } from "@/components/abschnitte/Footer";
import { BergSeite } from "@/components/berg/BergSeite";
import { THEMA } from "@/components/welt/thema";
import { Hero } from "@/components/abschnitte/Hero";
import { Kontakt } from "@/components/abschnitte/Kontakt";
import { Navigation } from "@/components/abschnitte/Navigation";
import { Projekte } from "@/components/abschnitte/Projekte";
import { Skills } from "@/components/abschnitte/Skills";
import { Spielplatz } from "@/components/abschnitte/Spielplatz";
import { UeberMich } from "@/components/abschnitte/UeberMich";

/**
 * Die Seite. Jeder Abschnitt hat ein data-partikel-Attribut (0–5):
 * Daran erkennt die Partikel-Szene, welche Form gerade dran ist.
 */
export default function Seite() {
  // Berg-Welt: Die ganze Seite ist die 3D-Reise, es gibt keine sichtbaren 2D-Abschnitte
  if (THEMA === "berg") return <BergSeite />;
  return (
    <>
      <Navigation />
      <main id="inhalt" className="relative z-10">
        <Hero />
        <UeberMich />
        <Projekte />
        <Skills />
        <Spielplatz />
        <Kontakt />
      </main>
      <Footer />
    </>
  );
}
