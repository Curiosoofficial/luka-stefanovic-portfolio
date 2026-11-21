// Alle persönlichen Angaben an einem Ort.
// Platzhalter sind mit «PLATZHALTER» markiert: einfach ersetzen, die Seite passt sich an.

export const profil = {
  name: "Luka Stefanovic",
  vorname: "Luka",
  rolle: "Webentwickler",
  stack: "React / Next.js",
  ort: "Zürich",
  status: "Offen für neue Stellen",

  // PLATZHALTER: echte E-Mail-Adresse eintragen
  email: "kontakt@example.ch",
  github: "https://github.com/Curiosoofficial",
  // PLATZHALTER: Link zum eigenen LinkedIn-Profil eintragen
  linkedin: "https://www.linkedin.com/",
  firma: { name: "Curiosolution", url: "https://curiosolution.com" },

  // Optional: eigener Track als public/track.mp3 ablegen und hier "/track.mp3" eintragen.
  // Ohne Track erzeugt der Browser den Beat live (siehe components/sound/beat.ts).
  track: null as string | null,
};

/** Die vier Karten, die sich im Hero beim Scrollen übereinanderstapeln */
export const heroKarten = [
  {
    kicker: "Was ich mache",
    titel: "Websites, die knallen.",
    text: "Schnell, mobil und mit Liebe zum Detail. Seiten, die man nicht nach drei Sekunden wieder vergisst.",
    farbe: "#EE4F86",
    textFarbe: "#2E1F15",
  },
  {
    kicker: "Erfahrung",
    titel: "Seit 2023 für echte Kunden.",
    text: "Restaurant, Plattenleger, Beratung, Innenarchitektur: Mit meiner Firma Curiosolution baue ich Websites für Betriebe rund um Zürich.",
    farbe: "#F48A35",
    textFarbe: "#2E1F15",
  },
  {
    kicker: "Stack",
    titel: "React. Next.js. TypeScript.",
    text: "Dazu Tailwind CSS, Motion und Three.js. Die Welt hinter diesen Karten ist echtes 3D.",
    farbe: "#FFC93C",
    textFarbe: "#2E1F15",
  },
  {
    kicker: "Jetzt",
    titel: "Offen für dein Team.",
    text: "Ich suche eine Stelle als Junior Frontend-Entwickler in Zürich und Umgebung.",
    farbe: "#3A86D8",
    textFarbe: "#FFF8EE",
  },
];

export const ueberMich = {
  titel: "Vom Bootcamp zu echten Kunden.",
  text:
    "Ich baue Websites, die auffallen und funktionieren. Seit 2023 mache ich das mit meiner Firma Curiosolution für Betriebe rund um Zürich, vom Restaurant in Dübendorf bis zum Plattenleger. Das Handwerk habe ich im Fullstack-Bootcamp der Developer Akademie gelernt, danach habe ich mich auf React und Next.js spezialisiert. Jetzt suche ich ein Team, in dem ich als Frontend-Entwickler richtig wachsen kann.",
  /** Kurze Zeile unter den Zahlen-Kacheln */
  fakten: [
    { label: "Standort", wert: "Zürich" },
    { label: "Bürgerrecht", wert: "Schweiz / Serbien" },
    { label: "Ausbildung", wert: "Developer Akademie 2022–2023, JS Mastery 2023" },
  ],
};

/** Zahlen-Kacheln im «Über mich»: zählen beim Scrollen von «von» auf «wert» hoch */
export const kennzahlen = [
  { wert: 2023, von: 1999, label: "selbständig mit meiner Firma Curiosolution", farbe: "#EE4F86", textFarbe: "#2E1F15" },
  { wert: 4, von: 0, label: "Kunden-Websites live, rund um Zürich", farbe: "#F48A35", textFarbe: "#2E1F15" },
  { wert: 2, von: 0, label: "Ausbildungen: Fullstack-Bootcamp und Next.js", farbe: "#FFC93C", textFarbe: "#2E1F15" },
  {
    wert: 4,
    von: 0,
    label: "Sprachen: Deutsch und Serbisch (Muttersprache), Englisch, Französisch",
    farbe: "#3A86D8",
    textFarbe: "#FFF8EE",
  },
];

export const skills = {
  kern: ["React", "Next.js", "TypeScript", "JavaScript", "Tailwind CSS", "HTML", "CSS"],
  werkzeuge: ["Git & GitHub", "Vercel", "Three.js", "Motion", "Lovable", "Claude Code"],
  ausserdem: ["Responsive Design", "Lokales SEO", "Kundenkontakt", "Social Media", "Blender", "Godot", "Musikproduktion"],
};

export type SpielplatzEintrag = {
  titel: string;
  werkzeug: string;
  text: string;
  farbe: string;
  /** "sound" macht aus der Kachel einen Knopf, der den Beat startet */
  aktion?: "sound";
  link?: string;
};

export const spielplatz: SpielplatzEintrag[] = [
  {
    titel: "3D-Welten",
    werkzeug: "Blender",
    // PLATZHALTER: Renders in public/spielplatz/ ablegen und hier verlinken
    text: "Modelle, Licht und Szenen. Renderings folgen hier bald.",
    farbe: "#F48A35",
  },
  {
    titel: "Kleine Spiele",
    werkzeug: "Godot",
    // PLATZHALTER: Link zum Spiel (z. B. itch.io) unter «link» eintragen
    text: "Prototypen und Game-Jams. Das erste spielbare Projekt kommt hierhin.",
    farbe: "#3A86D8",
  },
  {
    titel: "Beats",
    werkzeug: "Musikproduktion",
    text: "Der Beat auf dieser Seite entsteht live in deinem Browser. Probier's aus.",
    farbe: "#EE4F86",
    aktion: "sound",
  },
];

/** Sind E-Mail und LinkedIn schon echt eingetragen? Platzhalter werden auf der Seite nicht angezeigt. */
export const kontaktEcht = {
  email: !profil.email.includes("example"),
  linkedin: profil.linkedin.replace(/\/$/, "") !== "https://www.linkedin.com",
};
