// Die englische Fassung aller Texte. Die deutschen Texte stehen in profil.ts und projects.ts.
// Wer dort etwas ändert, passt hier die Übersetzung an: Die Einträge der Projekte sind über «slug» verknüpft.

import type { ProjektArt } from "./projects";

export const englisch = {
  rolle: "Web Developer",
  ort: "Zurich",
  status: "Open to new roles",

  ueberMich: {
    titel: "From bootcamp to real clients.",
    text: "I build websites that stand out and work. Since 2023 I have been doing this with my company Curiosolution for businesses around Zurich, from a restaurant in Dübendorf to a tiler. I learned the craft in the full-stack bootcamp at Developer Akademie and then specialised in React and Next.js. Now I am looking for a team where I can really grow as a frontend developer.",
    fakten: [
      { label: "Location", wert: "Zurich" },
      { label: "Citizenship", wert: "Switzerland / Serbia" },
      { label: "Training", wert: "Developer Akademie 2022–2023, JS Mastery 2023" },
    ],
  },

  /** Entspricht skills.ausserdem in profil.ts (gleiche Reihenfolge) */
  skillsAusserdem: ["Responsive design", "Local SEO", "Client communication", "Social media", "Blender", "Godot", "Music production"],

  art: {
    Kundenprojekt: "Client project",
    "Eigenes Projekt": "Own project",
    Bootcamp: "Bootcamp",
    Tutorial: "Tutorial",
  } satisfies Record<ProjektArt, string>,

  /** Pro Projekt (slug): was sich auf Englisch ändert. Fehlt «titel», «hinweis» oder «technik», gilt der deutsche Eintrag. */
  projekte: {
    airbnb: {
      titel: "Airbnb Clone",
      hinweis: "Extended with AI assistance",
      kurz: "Search for places to stay, find them on the map and book with a calendar, plus reviews and your own listings.",
    },
    "stack-overflow": {
      titel: "Stack Overflow Clone",
      kurz: "Q&A platform with code examples, voting, tags, search and profiles with reputation.",
    },
    snapgram: {
      hinweis: "Extended with AI assistance",
      kurz: "Social media app in the style of Instagram: post photos, like, save and follow people, with a demo login.",
    },
    lingo: {
      kurz: "Language learning app in the style of Duolingo: lessons with exercises, leaderboard, quests and a shop with Stripe.",
    },
    "el-pollo-loco": {
      kurz: "2D jump-and-run in the browser, object-oriented in plain JavaScript.",
    },
    curiosolution: {
      hinweis: "Live site newer than the code",
      kurz: "My company's website: services, web design offer, prices, portfolio and contact.",
    },
    mampfi: {
      hinweis: "React, AI-assisted with Lovable",
      kurz: "Restaurant website with menu and online ordering.",
    },
    birac: {
      hinweis: "React, AI-assisted with Lovable",
      kurz: "Multi-page website, mobile-first, local SEO and a quote request form.",
    },
    hls: {
      hinweis: "React, AI-assisted with Lovable",
      kurz: "Bilingual one-pager (DE/EN) with an enquiry form.",
    },
    durisch: {
      kurz: "Website with a project gallery, plus management of the social media channels.",
      technik: ["Web design", "Gallery", "Social media"],
    },
    join: {
      kurz: "Kanban task manager with board, tasks and contacts.",
    },
    portfolio: {
      titel: "This Portfolio",
      kurz: "Next.js with a 3D world built in Three.js that changes step by step as you scroll.",
    },
  } as Record<string, { titel?: string; hinweis?: string; kurz: string; technik?: string[] }>,
};
