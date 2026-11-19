/**
 * Bauplan der Website, die in der Code-Welt beim Scrollen entsteht.
 *
 * Jedes Modul ist ein Baustein einer echten Seite (Navigation, Titel, Knopf, Bild, Karten ...).
 * Es durchläuft vier Zustände: Code-Zeile → Drahtgitter → Glasplatte mit Inhalt → Teil der fertigen Seite.
 * Masse in Welt-Einheiten, Mittelpunkt der Seite im Ursprung. Die ganze Seite ist 18 × 11 Einheiten gross.
 */

export type ModulArt = "seite" | "leiste" | "logo" | "link" | "titel" | "text" | "knopf" | "bild" | "karte" | "fuss";

export type Modul = {
  art: ModulArt;
  /** Mittelpunkt und Grösse in der fertigen Seite */
  x: number;
  y: number;
  b: number;
  h: number;
  /** Abstand nach vorne in der «Explosionszeichnung», bevor die Seite zusammengesetzt wird */
  tiefe: number;
  /** Leuchtfarbe für Kanten und Glühen */
  farbe: string;
  /** Sichtbarer Inhalt im fertigen Baustein */
  text?: string;
  /** Knopf ohne Füllung, nur mit Rand */
  umriss?: boolean;
  /** Der Code, aus dem der Baustein entsteht */
  code: string[];
};

export const NEON = {
  pink: "#ff4f93",
  gelb: "#ffcc3d",
  blau: "#4b8dff",
  gruen: "#53d28a",
  lila: "#9b6bff",
  orange: "#ff8a3d",
};

export const SEITE = { b: 18, h: 11 };

export const BAUPLAN: Modul[] = [
  {
    art: "seite",
    x: 0,
    y: 0,
    b: SEITE.b,
    h: SEITE.h,
    tiefe: -2.6,
    farbe: NEON.lila,
    code: ["export default function Seite() {", '  return <main className="min-h-svh">'],
  },
  {
    art: "leiste",
    x: 0,
    y: 4.75,
    b: 17.2,
    h: 0.85,
    tiefe: 1.2,
    farbe: NEON.blau,
    code: ['<nav className="sticky top-0 flex">'],
  },
  { art: "logo", x: -7.3, y: 4.75, b: 1.9, h: 0.52, tiefe: 2.6, farbe: NEON.pink, text: "LUKA", code: ['<Logo name="Luka" />'] },
  {
    art: "link",
    x: 2.7,
    y: 4.75,
    b: 1.7,
    h: 0.44,
    tiefe: 2.1,
    farbe: NEON.blau,
    text: "Projekte",
    code: ['<Link href="#projekte">'],
  },
  { art: "link", x: 4.6, y: 4.75, b: 1.5, h: 0.44, tiefe: 1.7, farbe: NEON.blau, text: "Skills", code: ['<Link href="#skills">'] },
  {
    art: "link",
    x: 6.5,
    y: 4.75,
    b: 1.7,
    h: 0.44,
    tiefe: 2.4,
    farbe: NEON.blau,
    text: "Kontakt",
    code: ['<Link href="#kontakt">'],
  },
  {
    art: "titel",
    x: -4.3,
    y: 2.75,
    b: 7.8,
    h: 1.05,
    tiefe: 4.2,
    farbe: NEON.gelb,
    text: "Websites",
    code: ['<h1 className="text-7xl font-bold">'],
  },
  {
    art: "titel",
    x: -4.3,
    y: 1.62,
    b: 7.8,
    h: 1.05,
    tiefe: 3.4,
    farbe: NEON.pink,
    text: "zum Anfassen.",
    code: ['<span className="bg-gradient-to-r">'],
  },
  {
    art: "text",
    x: -4.3,
    y: 0.55,
    b: 7.8,
    h: 0.6,
    tiefe: 2.2,
    farbe: NEON.blau,
    text: "Schnelle, auffällige Websites aus Zürich.",
    code: ["<p>{profil.kurz}</p>"],
  },
  {
    art: "knopf",
    x: -6.65,
    y: -0.55,
    b: 3.1,
    h: 0.8,
    tiefe: 5,
    farbe: NEON.gelb,
    text: "Projekte ansehen",
    code: ["<Button onClick={zeigeProjekte}>"],
  },
  {
    art: "knopf",
    x: -3.2,
    y: -0.55,
    b: 2.3,
    h: 0.8,
    tiefe: 4.2,
    farbe: NEON.blau,
    text: "Kontakt",
    umriss: true,
    code: ['<Button variant="outline">'],
  },
  {
    art: "bild",
    x: 4.1,
    y: 1.15,
    b: 8.2,
    h: 4.4,
    tiefe: 2.8,
    farbe: NEON.lila,
    code: ['<Image src="/zuerich.webp" fill priority />'],
  },
  {
    art: "karte",
    x: -5.75,
    y: -3.15,
    b: 5.3,
    h: 2.9,
    tiefe: 3.6,
    farbe: NEON.pink,
    text: "Airbnb Klon",
    code: ["projekte.map((p) => (", "  <Karte key={p.slug} {...p} />"],
  },
  {
    art: "karte",
    x: 0,
    y: -3.15,
    b: 5.3,
    h: 2.9,
    tiefe: 4.6,
    farbe: NEON.blau,
    text: "Stack Overflow",
    code: ['<Karte titel="Stack Overflow" />'],
  },
  {
    art: "karte",
    x: 5.75,
    y: -3.15,
    b: 5.3,
    h: 2.9,
    tiefe: 3.2,
    farbe: NEON.gelb,
    text: "Snapgram",
    code: ['<Karte titel="Snapgram" />'],
  },
  {
    art: "fuss",
    x: 0,
    y: -5.05,
    b: 17.2,
    h: 0.5,
    tiefe: 1,
    farbe: NEON.gruen,
    text: "© 2026 Luka Stefanovic · Zürich",
    code: ["<footer>© {jahr} Luka</footer>"],
  },
];

/** Code, der frei im Raum schwebt: Zeilen aus dem Alltag beim Bauen einer Website */
export const SCHWEBENDER_CODE: string[] = [
  "const [offen, setOffen] = useState(false);",
  "useEffect(() => { lenis.start(); }, []);",
  "export function Hero() {",
  "return <Canvas camera={{ fov: 40 }}>",
  "const t = smoothstep(scroll, 0.2, 0.9);",
  "<motion.div style={{ opacity }} />",
  'const res = await fetch("/api/projekte");',
  "type Projekt = { titel: string; live?: string };",
  'className="grid gap-6 md:grid-cols-3"',
  "material.emissiveIntensity = 2.4;",
  'git commit -m "Neues Design"',
  "npm run build",
  "const box = new BoxGeometry(1, 1, 1);",
  "<Suspense fallback={<Lade />}>",
  'router.push("/kontakt");',
  'if (!res.ok) throw new Error("500");',
  "@media (prefers-reduced-motion: reduce)",
  "transform: translate3d(0, -50%, 0);",
  "const kamera = useThree((s) => s.camera);",
  "return projekte.filter((p) => p.live);",
  "display: grid; place-items: center;",
  '<html lang="de-CH">',
  "// erst schnell, dann schön",
  "aria-label={`Live-Demo: ${titel}`}",
];
