// Alle Projekte an einem Ort. Neue Projekte hier eintragen, die Seite passt sich an.
// Kundenseiten mit Lovable, Bootcamp- und Tutorial-Projekte sind über «art» gekennzeichnet.
// Woher ein Kurs oder ein Tutorial stammt (Anbieter, Kanal), steht bewusst nirgends.
// Reihenfolge: grosse Web-Apps (Next.js und React), El Pollo Loco, Curiosolution samt Kundenprojekten, Join, zuletzt dieses Portfolio.
// Texte kurz halten (Beschreibung um 100 Zeichen, höchstens 5 Technik-Stichworte): Alle Karten sind gleich hoch.

export type ProjektArt = "Kundenprojekt" | "Eigenes Projekt" | "Bootcamp" | "Tutorial";

export type Projekt = {
  slug: string;
  titel: string;
  art: ProjektArt;
  /** Kurzer Zusatz zur Entstehung, z. B. «React, KI-gestützt mit Lovable». Keine Namen von Kursen oder Tutorials. */
  hinweis?: string;
  kurz: string;
  technik: string[];
  /** Akzentfarbe: färbt das Filz-Cover der Karte */
  farbe: string;
  /** Öffentliche Adresse der ganzen Seite, öffnet sich in einem neuen Tab */
  live?: string;
  github?: string;
  /** Screenshot in public/projekte/, z. B. "/projekte/mampfi.jpg". Ohne Bild gibt es ein Farb-Cover. */
  bild?: string;
};

export const projekte: Projekt[] = [
  // ------------------------------------------------------------------ Grosse Web-Apps
  {
    slug: "airbnb",
    titel: "Airbnb Klon",
    art: "Tutorial",
    hinweis: "KI-gestützt erweitert",
    kurz: "Unterkünfte suchen, auf der Karte finden und mit Kalender buchen, dazu Bewertungen und eigene Inserate.",
    technik: ["Next.js 16", "TypeScript", "Prisma", "Supabase", "Kinde Auth"],
    farbe: "#EE4F86",
    live: "https://airbnb-klon-curioso.vercel.app/",
    github: "https://github.com/Curiosoofficial/airbnb",
  },
  {
    slug: "stack-overflow",
    titel: "Stack Overflow Klon",
    art: "Tutorial",
    kurz: "Frage-Antwort-Plattform mit Code-Beispielen, Abstimmen, Tags, Suche und Profilen mit Reputation.",
    technik: ["Next.js 16", "TypeScript", "MongoDB", "Clerk", "Zod"],
    farbe: "#F48A35",
    live: "https://stack-overflow-next14-nu.vercel.app/",
    github: "https://github.com/Curiosoofficial/stack_overflow_next14",
  },
  {
    slug: "snapgram",
    titel: "Snapgram",
    art: "Tutorial",
    hinweis: "KI-gestützt erweitert",
    kurz: "Social-Media-App im Stil von Instagram: Fotos posten, liken, speichern und Leuten folgen, mit Demo-Login.",
    technik: ["React", "TypeScript", "TanStack Query", "Node.js", "PostgreSQL"],
    farbe: "#3A86D8",
    live: "https://snapgram-woad.vercel.app/",
    github: "https://github.com/Curiosoofficial/snapgram",
  },
  {
    slug: "lingo",
    titel: "Lingo",
    art: "Tutorial",
    kurz: "Sprachlern-App im Stil von Duolingo: Lektionen mit Aufgaben, Rangliste, Quests und Shop mit Stripe.",
    technik: ["Next.js 16", "TypeScript", "Drizzle", "Clerk", "Stripe"],
    farbe: "#5BB54A",
    live: "https://lingo-nine-iota.vercel.app/",
    github: "https://github.com/Curiosoofficial/lingo",
  },

  // ------------------------------------------------------------------ Spiel
  {
    slug: "el-pollo-loco",
    titel: "El Pollo Loco",
    art: "Bootcamp",
    kurz: "2D-Jump-and-Run im Browser, objektorientiert in reinem JavaScript.",
    technik: ["JavaScript", "OOP", "Canvas"],
    farbe: "#F48A35",
    live: "https://curiosoofficial.github.io/ell-pollo-loco-final/",
    github: "https://github.com/Curiosoofficial/ell-pollo-loco-final",
  },

  // ------------------------------------------------------------------ Curiosolution und Kundenprojekte
  {
    slug: "curiosolution",
    titel: "Curiosolution",
    art: "Eigenes Projekt",
    hinweis: "Live neuer als der Code",
    kurz: "Website meiner Firma: Leistungen, Webdesign-Angebot, Preise, Portfolio und Kontakt.",
    technik: ["Next.js 14", "TypeScript", "Tailwind CSS", "Framer Motion"],
    farbe: "#8C5BE0",
    // Die heutige curiosolution.com ist ein neuerer Stand als der Code auf GitHub (siehe Hinweis)
    live: "https://curiosolution.com/",
    github: "https://github.com/Curiosoofficial/curiosolution",
  },
  {
    slug: "mampfi",
    titel: "Mampfi Dübendorf",
    art: "Kundenprojekt",
    hinweis: "React, KI-gestützt mit Lovable",
    kurz: "Restaurant-Website mit Speisekarte und Online-Bestellung.",
    technik: ["React", "Tailwind CSS", "Lovable"],
    farbe: "#F48A35",
    live: "https://restaurantmampfi.ch/",
  },
  {
    slug: "birac",
    titel: "BIRAC Plattenleger",
    art: "Kundenprojekt",
    hinweis: "React, KI-gestützt mit Lovable",
    kurz: "Mehrseitige Website, Mobile-First, lokales SEO und ein Offertformular.",
    technik: ["React", "Tailwind CSS", "SEO", "Lovable"],
    farbe: "#FFC93C",
    live: "https://birac.ch/",
  },
  {
    slug: "hls",
    titel: "HLS Consulting & Planung",
    art: "Kundenprojekt",
    hinweis: "React, KI-gestützt mit Lovable",
    kurz: "Zweisprachiger Onepager (DE/EN) mit Anfrageformular.",
    technik: ["React", "Tailwind CSS", "i18n", "Lovable"],
    farbe: "#3A86D8",
    live: "https://hls-cp.com/",
  },
  {
    slug: "durisch",
    titel: "Raumkonzepte Durisch",
    art: "Kundenprojekt",
    // PLATZHALTER: Technik klären und unter «technik» eintragen
    kurz: "Website mit Projektgalerie, dazu Betreuung der Social-Media-Kanäle.",
    technik: ["Webdesign", "Galerie", "Social Media"],
    farbe: "#EE4F86",
    live: "https://raumkonzeptedurisch.ch/",
  },

  // ------------------------------------------------------------------ Zuletzt
  {
    slug: "join",
    titel: "Join",
    art: "Bootcamp",
    kurz: "Kanban-Taskmanager mit Board, Aufgaben und Kontakten.",
    technik: ["HTML", "CSS", "JavaScript"],
    farbe: "#3A86D8",
    live: "https://curiosoofficial.github.io/Join-App/",
    github: "https://github.com/Curiosoofficial/Join-App",
  },
  {
    slug: "portfolio",
    titel: "Dieses Portfolio",
    art: "Eigenes Projekt",
    kurz: "Next.js mit einer 3D-Welt aus Three.js, die sich beim Scrollen Schritt für Schritt verwandelt.",
    technik: ["Next.js", "TypeScript", "Three.js", "React Three Fiber", "Motion"],
    farbe: "#FFC93C",
    github: "https://github.com/Curiosoofficial/luka-stefanovic-portfolio",
  },
];
