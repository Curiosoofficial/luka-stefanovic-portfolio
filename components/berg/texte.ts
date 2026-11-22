import { englisch } from "@/data/englisch";
import { profil, skills, ueberMich } from "@/data/profil";
import { type Projekt, projekte } from "@/data/projects";
import { type Sprache, useSprache } from "./sprache";

/**
 * Alle Texte der Berg-Welt in beiden Sprachen: für die Schilder in der 3D-Welt, die Infofenster und die unsichtbare Textfassung.
 * Jede Sprache ist ein fertiges Paket. Die Listen darin bleiben dieselben Objekte, solange die Sprache gleich bleibt:
 * Die Schilder der Welt zeichnen ihre Schrift nur neu, wenn wirklich umgeschaltet wird.
 */

/** Ein Projekt in der gewählten Sprache, dazu die Art als lesbares Etikett */
export type ProjektText = Projekt & { artText: string };

export type Texte = {
  sprache: Sprache;
  /** Kennung für das lang-Attribut der Seite */
  kennung: string;
  seitenTitel: string;
  rolle: string;
  ort: string;
  status: string;
  projekte: ProjektText[];
  ueberMich: { titel: string; text: string; fakten: { label: string; wert: string }[] };
  /** Alle Skills für die Textfassung */
  skillsAlle: string[];
  /** Lebenslauf als PDF in dieser Sprache */
  cv: string;
  /** Schrift auf den Schildern der Welt (jede Liste ist eine Tafel, jeder Eintrag eine Zeile) */
  schilder: {
    rolle: string[];
    stack: string[];
    tal: string[];
    /** Breite der Tafel «Ab ins Tal»: Der englische Text ist länger */
    talBreite: number;
    gondeln: string[];
    gondelnHandy: string[];
    ueberMich: string[];
    kontakt: string[];
  };
  ui: {
    laden: string;
    navigation: string;
    sprachwahl: string;
    kontakt: string;
    ueberMich: string;
    schliessen: string;
    neuerTab: string;
    live: string;
    code: string;
    vorheriges: string;
    naechstes: string;
    womit: string;
    schreibMir: string;
    kontaktText: string;
    telefon: string;
    lebenslauf: string;
    projekte: string;
    skills: string;
    technik: string;
    liveVon: (titel: string) => string;
    codeVon: (titel: string) => string;
  };
};

const STACK = ["React · Next.js · TypeScript"];

const DEUTSCH: Texte = {
  sprache: "de",
  kennung: "de-CH",
  seitenTitel: `${profil.name} · ${profil.rolle} (${profil.stack}) in ${profil.ort}`,
  rolle: profil.rolle,
  ort: profil.ort,
  status: profil.status,
  projekte: projekte.map((p) => ({ ...p, artText: p.art })),
  ueberMich,
  skillsAlle: [...skills.kern, ...skills.werkzeuge, ...skills.ausserdem],
  cv: profil.cv.de,
  schilder: {
    rolle: [`${profil.rolle} in ${profil.ort}`],
    stack: STACK,
    tal: ["↓ Ab ins Tal"],
    talBreite: 2.8,
    gondeln: ["↓ Projekte: Gondel anklicken"],
    gondelnHandy: ["↓ Projekte:", "Gondel antippen"],
    ueberMich: ["Über mich"],
    kontakt: ["Kontakt"],
  },
  ui: {
    laden: "Der Berg wird gestrickt …",
    navigation: "Hauptnavigation",
    sprachwahl: "Sprache",
    kontakt: "Kontakt",
    ueberMich: "Über mich",
    schliessen: "Fenster schliessen",
    neuerTab: "(öffnet in neuem Tab)",
    live: "Live ansehen",
    code: "Code auf GitHub",
    vorheriges: "‹ Vorheriges",
    naechstes: "Nächstes ›",
    womit: "Womit ich arbeite",
    schreibMir: "Schreib mir.",
    kontaktText: `Ich bin ${profil.name}, ${profil.rolle} (${profil.stack}) in ${profil.ort}. Ich freue mich über deine Nachricht.`,
    telefon: "Telefon",
    lebenslauf: "Lebenslauf (PDF)",
    projekte: "Projekte",
    skills: "Skills",
    technik: "Technik",
    liveVon: (titel) => `${titel} live ansehen`,
    codeVon: (titel) => `Code von ${titel} auf GitHub`,
  },
};

const ENGLISCH: Texte = {
  sprache: "en",
  kennung: "en",
  seitenTitel: `${profil.name} · ${englisch.rolle} (${profil.stack}) in ${englisch.ort}`,
  rolle: englisch.rolle,
  ort: englisch.ort,
  status: englisch.status,
  projekte: projekte.map((p) => {
    const en = englisch.projekte[p.slug];
    return {
      ...p,
      titel: en?.titel ?? p.titel,
      hinweis: en?.hinweis ?? p.hinweis,
      kurz: en?.kurz ?? p.kurz,
      technik: en?.technik ?? p.technik,
      artText: englisch.art[p.art],
    };
  }),
  ueberMich: englisch.ueberMich,
  skillsAlle: [...skills.kern, ...skills.werkzeuge, ...englisch.skillsAusserdem],
  cv: profil.cv.en,
  schilder: {
    rolle: [`${englisch.rolle} in ${englisch.ort}`],
    stack: STACK,
    tal: ["↓ To the valley"],
    talBreite: 3.4,
    gondeln: ["↓ Projects: click a gondola"],
    gondelnHandy: ["↓ Projects:", "tap a gondola"],
    ueberMich: ["About me"],
    kontakt: ["Contact"],
  },
  ui: {
    laden: "Knitting the mountain …",
    navigation: "Main navigation",
    sprachwahl: "Language",
    kontakt: "Contact",
    ueberMich: "About me",
    schliessen: "Close window",
    neuerTab: "(opens in a new tab)",
    live: "View live",
    code: "Code on GitHub",
    vorheriges: "‹ Previous",
    naechstes: "Next ›",
    womit: "What I work with",
    schreibMir: "Get in touch.",
    kontaktText: `I'm ${profil.name}, ${englisch.rolle} (${profil.stack}) in ${englisch.ort}. I look forward to hearing from you.`,
    telefon: "Phone",
    lebenslauf: "CV (PDF)",
    projekte: "Projects",
    skills: "Skills",
    technik: "Tech",
    liveVon: (titel) => `View ${titel} live`,
    codeVon: (titel) => `Code of ${titel} on GitHub`,
  },
};

export const TEXTE: Record<Sprache, Texte> = { de: DEUTSCH, en: ENGLISCH };

/** Die Texte in der gewählten Sprache. Funktioniert in der Seite und in der 3D-Welt. */
export function useTexte() {
  return TEXTE[useSprache()];
}
