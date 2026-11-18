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

  // PLATZHALTER: Foto als public/portrait.jpg ablegen und hier "/portrait.jpg" eintragen.
  // Ideal: Kopf und Schultern, dunkler ruhiger Hintergrund, Gesicht gut ausgeleuchtet.
  // Helle Stellen werden zu Punkten, dunkle bleiben leer.
  portrait: null as string | null,

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
    farbe: "#FF2E93",
    textFarbe: "#0b0b14",
  },
  {
    kicker: "Erfahrung",
    titel: "Seit 2023 für echte Kunden.",
    text: "Restaurant, Plattenleger, Beratung, Innenarchitektur: Mit meiner Firma Curiosolution baue ich Websites für Betriebe rund um Zürich.",
    farbe: "#FF7A1A",
    textFarbe: "#0b0b14",
  },
  {
    kicker: "Stack",
    titel: "React. Next.js. TypeScript.",
    text: "Dazu Tailwind CSS, Motion und Three.js. Die Punkte hinter diesen Karten sind ein eigener Shader.",
    farbe: "#D4FF3A",
    textFarbe: "#0b0b14",
  },
  {
    kicker: "Jetzt",
    titel: "Offen für dein Team.",
    text: "Ich suche eine Stelle als Junior Frontend-Entwickler in Zürich und Umgebung.",
    farbe: "#3D2BFF",
    textFarbe: "#f5f3ff",
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
  { wert: 2023, von: 1999, label: "selbständig mit meiner Firma Curiosolution", farbe: "#FF2E93", textFarbe: "#0b0b14" },
  { wert: 4, von: 0, label: "Kunden-Websites live, rund um Zürich", farbe: "#FF7A1A", textFarbe: "#0b0b14" },
  { wert: 2, von: 0, label: "Ausbildungen: Fullstack-Bootcamp und Next.js", farbe: "#D4FF3A", textFarbe: "#0b0b14" },
  {
    wert: 4,
    von: 0,
    label: "Sprachen: Deutsch und Serbisch (Muttersprache), Englisch, Französisch",
    farbe: "#3D2BFF",
    textFarbe: "#f5f3ff",
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
    farbe: "#FF7A1A",
  },
  {
    titel: "Kleine Spiele",
    werkzeug: "Godot",
    // PLATZHALTER: Link zum Spiel (z. B. itch.io) unter «link» eintragen
    text: "Prototypen und Game-Jams. Das erste spielbare Projekt kommt hierhin.",
    farbe: "#3D2BFF",
  },
  {
    titel: "Beats",
    werkzeug: "Musikproduktion",
    text: "Der Beat auf dieser Seite entsteht live in deinem Browser. Probier's aus.",
    farbe: "#FF2E93",
    aktion: "sound",
  },
];
