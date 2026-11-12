// Alle Projekte an einem Ort. Neue Projekte hier eintragen, die Seite passt sich an.
// Ehrlichkeit zuerst: Kundenseiten mit Lovable, Bootcamp- und Tutorial-Projekte sind klar gekennzeichnet.

export type ProjektArt = "Kundenprojekt" | "Eigenes Projekt" | "Bootcamp" | "Tutorial";

export type Projekt = {
  slug: string;
  titel: string;
  art: ProjektArt;
  /** Ehrlicher Zusatz zur Entstehung, z. B. «React, KI-gestützt mit Lovable» */
  hinweis?: string;
  kurz: string;
  technik: string[];
  /** Akzentfarbe: färbt das Cover und die Partikel-Welle, solange die Karte sichtbar ist */
  farbe: string;
  live?: string;
  github?: string;
  /** Screenshot in public/projekte/, z. B. "/projekte/mampfi.jpg". Ohne Bild gibt es ein Farb-Cover. */
  bild?: string;
};

export const projekte: Projekt[] = [
  {
    slug: "mampfi",
    titel: "Mampfi Dübendorf",
    art: "Kundenprojekt",
    hinweis: "React, KI-gestützt mit Lovable",
    kurz: "Restaurant-Website mit Speisekarte und Online-Bestellung.",
    technik: ["React", "Tailwind CSS", "Lovable"],
    farbe: "#FF7A1A",
    live: "https://restaurantmampfi.ch/",
  },
  {
    slug: "birac",
    titel: "BIRAC Plattenleger",
    art: "Kundenprojekt",
    hinweis: "React, KI-gestützt mit Lovable",
    kurz: "Mehrseitige Website, Mobile-First, lokales SEO und ein Offertformular.",
    technik: ["React", "Tailwind CSS", "SEO", "Lovable"],
    farbe: "#D4FF3A",
    live: "https://birac.ch/",
  },
  {
    slug: "hls",
    titel: "HLS Consulting & Planung",
    art: "Kundenprojekt",
    hinweis: "React, KI-gestützt mit Lovable",
    kurz: "Zweisprachiger Onepager (DE/EN) mit Anfrageformular.",
    technik: ["React", "Tailwind CSS", "i18n", "Lovable"],
    farbe: "#3D2BFF",
    live: "https://hls-cp.com/",
  },
  {
    slug: "durisch",
    titel: "Raumkonzepte Durisch",
    art: "Kundenprojekt",
    // PLATZHALTER: Technik klären und unter «technik» eintragen
    kurz: "Website mit Projektgalerie, dazu Betreuung der Social-Media-Kanäle.",
    technik: ["Webdesign", "Galerie", "Social Media"],
    farbe: "#FF2E93",
    live: "https://raumkonzeptedurisch.ch/",
  },
  {
    slug: "portfolio",
    titel: "Dieses Portfolio",
    art: "Eigenes Projekt",
    kurz: "Next.js mit eigenem Partikel-Shader: Tausende Punkte formen sich beim Scrollen neu, dazu ein Beat aus der Web Audio API.",
    technik: ["Next.js", "TypeScript", "Three.js", "GLSL", "Motion"],
    farbe: "#D4FF3A",
    github: "https://github.com/Curiosoofficial/luka-stefanovic-portfolio",
  },
  {
    slug: "join",
    titel: "Join",
    art: "Bootcamp",
    hinweis: "Developer Akademie",
    kurz: "Kanban-Taskmanager mit Board, Aufgaben und Kontakten.",
    technik: ["HTML", "CSS", "JavaScript"],
    farbe: "#3D2BFF",
    github: "https://github.com/Curiosoofficial/Join-App",
  },
  {
    slug: "el-pollo-loco",
    titel: "El Pollo Loco",
    art: "Bootcamp",
    hinweis: "Developer Akademie",
    kurz: "2D-Jump-and-Run im Browser, objektorientiert in reinem JavaScript.",
    technik: ["JavaScript", "OOP", "Canvas"],
    farbe: "#FF7A1A",
    github: "https://github.com/Curiosoofficial/ell-pollo-loco-final",
  },
  // PLATZHALTER: Nächstes eigenes Next.js-Projekt hier eintragen, sobald es online ist.
];
