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

export const ueberMich = {
  titel: "Vom Bootcamp zu echten Kunden.",
  text:
    "Ich baue Websites, die auffallen und funktionieren. Seit 2023 mache ich das mit meiner Firma Curiosolution für Betriebe rund um Zürich, vom Restaurant in Dübendorf bis zum Plattenleger. Das Handwerk habe ich im Fullstack-Bootcamp der Developer Akademie gelernt, danach habe ich mich auf React und Next.js spezialisiert. Jetzt suche ich ein Team, in dem ich als Frontend-Entwickler richtig wachsen kann.",
  fakten: [
    { label: "Standort", wert: "Zürich" },
    { label: "Selbständig seit", wert: "2023 · Curiosolution" },
    { label: "Ausbildung", wert: "Fullstack-Bootcamp, Developer Akademie (2022–2023)" },
    { label: "Weiterbildung", wert: "Next.js, JS Mastery (2023)" },
    {
      label: "Sprachen",
      wert: "Deutsch, Serbisch (Muttersprache), Englisch (fliessend), Französisch (Schulkenntnisse)",
    },
    { label: "Bürgerrecht", wert: "Schweiz / Serbien" },
  ],
};

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
