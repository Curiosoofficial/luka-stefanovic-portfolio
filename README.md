# Luka Stefanovic · Portfolio «Punkt für Punkt»

Portfolio von Luka Stefanovic, Webentwickler (React / Next.js) in Zürich.

24'000 leuchtende Partikel begleiten den Besucher durch die Seite und formen sich in jedem Abschnitt neu:
**LUKA → Warp-Tunnel → Porträt → Welle → React-Atom → Galaxie → @**. Im Hero fliegt man beim Scrollen durch den Tunnel, während sich vier knallige Karten stapeln. Ein Klick löst eine Schockwelle aus. Dazu kommt ein Sound-Modus, bei dem ein live im Browser erzeugter Beat die Partikel pulsieren lässt.

<!-- Screenshot folgt nach dem ersten Deployment: ![Screenshot](https://DEINE-DOMAIN/opengraph-image) -->

## Stack

- [Next.js 16](https://nextjs.org) (App Router, statisch vorgerendert) · TypeScript · Tailwind CSS 4
- [Three.js](https://threejs.org) über [React Three Fiber](https://r3f.docs.pmnd.rs) mit eigenem GLSL-Shader
- [Motion](https://motion.dev) für Animationen, [Lenis](https://lenis.darkroom.engineering) für weiches Scrollen
- Web Audio API für den Beat (keine Audiodatei)

## Lokal starten

```bash
npm install
npm run dev
```

Dann <http://localhost:3000> öffnen.

```bash
npm run build   # Produktions-Build
npm run lint    # ESLint
```

## Inhalte anpassen

Alles Persönliche steht in zwei Dateien:

| Datei | Inhalt |
| --- | --- |
| [`data/profil.ts`](data/profil.ts) | Name, E-Mail, Links, Über-mich-Text, Skills, Spielplatz, Porträtfoto, eigener Track |
| [`data/projects.ts`](data/projects.ts) | Alle Projekte mit Label, Beschreibung, Technik, Farbe, Links, Screenshot |

Platzhalter sind dort mit `PLATZHALTER` markiert:

- [ ] E-Mail-Adresse und LinkedIn-Link
- [ ] Porträtfoto als `public/portrait.jpg` (Kopf und Schultern, dunkler Hintergrund), dann `portrait: "/portrait.jpg"`
- [ ] Projekt-Screenshots in `public/projekte/`, dann `bild: "/projekte/name.jpg"`
- [ ] Spielplatz: Blender-Renders und Link zum Godot-Spiel
- [ ] Technik von Raumkonzepte Durisch
- [ ] Optional: eigener Track als `public/track.mp3`, dann `track: "/track.mp3"`

## Aufbau

```
app/
  layout.tsx              Schriften, Meta-Tags, Partikel-Bühne, Cursor
  page.tsx                Die Seite, Abschnitt für Abschnitt
  opengraph-image.tsx     Vorschaubild für LinkedIn & Co. (wird beim Build erzeugt)
components/
  partikel/
    formen.ts             Die sechs Formen: Text und Bilder werden auf ein Canvas gezeichnet und abgetastet
    shader.ts             Vertex- und Fragment-Shader (läuft auf der Grafikkarte)
    PartikelSzene.tsx     Verbindet Scroll, Maus, Sound und Layout mit dem Shader
    PartikelBuehne.tsx    Lädt die 3D-Szene erst, wenn der Text schon steht
  sound/beat.ts           Beat-Maschine mit der Web Audio API
  abschnitte/             Hero, Über mich, Projekte, Skills, Spielplatz, Kontakt
  ui/                     Magnet-Button, Tilt-Karte, Wort-Reveal, Cursor, Media-Query-Hooks
data/                     Alle Inhalte
docs/KONZEPT.md           Das Konzept hinter der Seite
```

## So funktioniert der Partikel-Morph

1. Jede Form ist eine Liste von Zielpositionen, eine pro Partikel. Name und @ werden mit der Titelschrift auf ein unsichtbares Canvas gezeichnet und Pixel für Pixel abgetastet. Beim Porträt bekommen helle Pixel öfter einen Punkt.
2. Alle Formen liegen gleichzeitig als Attribute auf der Grafikkarte. Welle, Atom und Galaxie speichern nur Parameter (Raster, Bahn, Radius), ihre Bewegung rechnet der Shader in jedem Frame.
3. Jeder Abschnitt hat ein `data-partikel`-Attribut. Aus der Scroll-Position wird eine Kommazahl: `2.4` heisst «40 % auf dem Weg von der Welle zum Atom».
4. Der Vertex-Shader mischt die zwei Formen, lässt die Punkte in der Mitte des Übergangs kurz explodieren und addiert Atmen, Beat-Puls, Intro und Maus-Abstossung.

## Barrierefreiheit und Performance

- Der Text wird serverseitig gerendert und ist sofort lesbar. Three.js lädt erst danach (`next/dynamic` mit `ssr: false` und `requestIdleCallback`).
- Handys bekommen weniger Partikel und ein ruhigeres Layout, Projekte stehen dort untereinander.
- Mit «Bewegung reduzieren» im System: kein Smooth Scroll, kein eigener Cursor, Hero, Über mich und Kontakt bleiben nicht stehen (Inhalte stehen einfach untereinander), Bänder und Karten bewegen sich nicht, und die Partikel springen ohne Animation zwischen den Formen.
- Skip-Link, sichtbare Fokus-Ringe, `aria-pressed` beim Sound-Knopf.

## Deployment

Auf [Vercel](https://vercel.com) importieren, fertig. `VERCEL_PROJECT_PRODUCTION_URL` setzt Vercel automatisch, damit stimmen die Open-Graph-Links.
Wichtig: Die **Produktions-Domain** teilen (z. B. `name.vercel.app`), nicht die Deployment-URL mit Hash, die ist durch Vercel Deployment Protection geschützt.
