# Konzept: «Punkt für Punkt»

Portfolio von Luka Stefanovic, Webentwickler (React / Next.js) in Zürich.
Ziel: Bewerbungen als Junior Frontend-Entwickler bei Schweizer Webagenturen und KMU.

Festgelegt am 12.11.2026.

## Die Idee in einem Satz

Tausende leuchtende Partikel begleiten den Besucher durch die Seite und formen sich in jedem Abschnitt zu etwas Neuem: erst zu deinem Namen, dann zu deinem Gesicht, zu einer Welle hinter den Projekten, zum React-Atom und am Schluss zum @ für den Kontakt.

## Farbwelt «Acid Pop»

| Rolle | Farbe | Hex |
| --- | --- | --- |
| Hintergrund | Tiefes Tintenblau | `#0B0B14` |
| Text | Fast-Weiss | `#F5F3FF` |
| Akzent 1 | Pink | `#FF2E93` |
| Akzent 2 | Elektroblau | `#3D2BFF` |
| Akzent 3 | Säuregrün | `#D4FF3A` |
| Akzent 4 | Orange | `#FF7A1A` |

Partikel leuchten auf dem dunklen Grund (additive Überblendung: wo sich Punkte überlagern, wird es heller).
Die Farbe eines Punkts hängt von seiner Position in der Form ab. So entstehen Farbbänder (Orange → Limette → Pink → Blau), die langsam durch die Formen wandern.

## Schrift

- Titel: **Bricolage Grotesque** (charakterstark, gross, fett)
- Fliesstext: **Geist**
- Labels und Zahlen: **Geist Mono**

## Die Partikel-Reise (Scroll)

| # | Abschnitt | Partikel formen … | Was sonst passiert |
| --- | --- | --- | --- |
| 0 | Intro | fliegen von überall zusammen | Zähler im Hero zählt auf «24’000 Punkte» hoch. Blockiert nichts: der Text ist sofort lesbar |
| 1 | Hero (bleibt 4,4 Bildschirmhöhen stehen) | **«LUKA»** über die ganze Breite, dann **Warp-Tunnel** | Maus = Welle, Klick = Knall mit Schockwellen-Ring. Beim Scrollen fahren Vor- und Nachname auseinander, die Punkte reissen zum Tunnel auf (Lichtstreifen, je schneller gescrollt, desto schneller der Flug). Dann kippen vier knallige Karten rein und stapeln sich: «Websites, die knallen.» · «Seit 2023 für echte Kunden.» · «React. Next.js. TypeScript.» · «Offen für dein Team.» |
| 2 | Über mich (bleibt stehen) | **Porträt** (vorerst Platzhalter-Silhouette) | Text färbt sich beim Scrollen Wort für Wort ein, dann springen vier knallige Zahlen-Kacheln rein und zählen hoch (2023 · 4 Kunden-Websites · 2 Ausbildungen · 4 Sprachen) |
| 3 | Projekte | **fliessende Welle** in der Farbe des aktiven Projekts | Abschnitt bleibt stehen, Projekte fahren horizontal vorbei. Karten mit 3D-Tilt und Spotlight. Ehrliche Labels |
| 4 | Skills | **React-Atom** | Drei schräge, knallige Absperrbänder mit den Skills, die sich beim Scrollen gegenläufig über den Bildschirm schieben |
| 5 | Spielplatz | **Galaxie** | «Wenn ich nicht code»: Blender, Godot, Musik (vorerst Platzhalter) |
| 6 | Kontakt (bleibt stehen) | **@** | Aus dem @ heraus flutet ein pinker Kreis den Bildschirm, «Schreib mir.» fährt von beiden Seiten rein. Mail-Button, «E-Mail kopieren», Links (E-Mail vorerst Platzhalter) |

## Sound-Modus

- Knopf «Sound an» in der Navigation, standardmässig aus.
- Der Beat wird **live im Browser erzeugt** (Web Audio API: Kick, Hi-Hat, Bass). Keine Audiodatei, keine Lizenzfragen.
- Bei jeder Kick springen die Partikel kurz nach aussen.
- Später: eigener Track als MP3 in `public/` ablegen, dann analysiert die Seite diesen statt des Synth-Beats.

## Durchgehende Effekte

- Smooth Scroll (Lenis)
- Eigener Cursor (nur Desktop)
- Text-Reveals und Übergänge mit Motion
- Aceternity-UI-Komponenten als Vorlage, angepasst und verstanden, nicht blind kopiert

## Leitplanken

1. **Inhalt zuerst.** Text ist sofort sichtbar und serverseitig gerendert. Die Partikel laden im Hintergrund nach. Kein langer Loader.
2. **Handy.** Deutlich weniger Partikel (ca. 8'000 statt 30'000), kein eigener Cursor, Projekte vertikal statt horizontal.
3. **«Bewegung reduzieren».** Wer das im System eingestellt hat, bekommt ruhige, stehende Formen ohne Scroll-Animationen.
4. **Erklärbar.** Jeder Effekt wird so gebaut, dass Luka ihn im Bewerbungsgespräch erklären kann.
5. **Ehrlich.** Kundenprojekte mit Lovable als «React, KI-gestützt mit Lovable», Bootcamp- und Tutorial-Projekte klar gekennzeichnet.

## Technik

- Next.js (aktuelle Version, App Router) · TypeScript · Tailwind CSS
- Three.js über React Three Fiber, eigener Partikel-Shader
- Motion (früher Framer Motion), Lenis
- Alle Projektdaten in **einer** Datei: `data/projects.ts`
- Alle persönlichen Texte und Links in **einer** Datei: `data/profil.ts`
- Deployment: Vercel mit öffentlicher Produktions-URL

### So funktioniert der Partikel-Morph (für das Bewerbungsgespräch)

1. Jede Form (Name, Porträt, Welle, Atom, Galaxie, @) ist eine Liste von Zielpositionen, eine pro Partikel.
2. Text und Bilder werden dafür auf ein unsichtbares Canvas gezeichnet und Pixel für Pixel abgetastet.
3. Alle Formen liegen gleichzeitig auf der Grafikkarte. Der Scroll-Fortschritt entscheidet, zwischen welchen zwei Formen gemischt wird und wie stark.
4. Der Vertex-Shader rechnet für jedes Partikel die Position aus: Mischung der beiden Formen, dazu etwas Rauschen, Mausabstossung und Sound-Puls.

## Inhalte

| Projekt | Label | Status |
| --- | --- | --- |
| Mampfi Dübendorf | Kundenprojekt · React, KI-gestützt mit Lovable | live: restaurantmampfi.ch |
| BIRAC Plattenleger | Kundenprojekt · React, KI-gestützt mit Lovable | live: birac.ch |
| HLS Consulting & Planung | Kundenprojekt · React, KI-gestützt mit Lovable | live: hls-cp.com |
| Raumkonzepte Durisch | Kundenprojekt · Technik noch klären | live: raumkonzeptedurisch.ch |
| Join | Bootcamp (Developer Akademie) | reparieren und deployen |
| El Pollo Loco | Bootcamp (Developer Akademie) | reparieren und deployen |
| Eigenes Next.js-Projekt | Eigenes Projekt | Platzhalter |

Platzhalter, die Luka später ersetzt: E-Mail, LinkedIn, Porträtfoto, Spielplatz-Inhalte, Projekt-Screenshots, eigener Track.
