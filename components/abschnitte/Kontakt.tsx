"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef, useState } from "react";
import { MagnetKnopf } from "@/components/ui/MagnetKnopf";
import { useBreit, useRuhig } from "@/components/ui/medien";
import { profil } from "@/data/profil";

const links = [
  { label: "GitHub", href: profil.github },
  { label: "LinkedIn", href: profil.linkedin },
  { label: profil.firma.name, href: profil.firma.url },
];

function KopierKnopf() {
  const [kopiert, setKopiert] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(profil.email);
          setKopiert(true);
          setTimeout(() => setKopiert(false), 2000);
        } catch {
          // Ohne Zwischenablage-Zugriff bleibt der mailto-Link daneben
        }
      }}
      className="rounded-full border-2 border-tinte px-6 py-3.5 text-lg font-semibold transition-colors hover:bg-tinte hover:text-pink"
    >
      <span aria-live="polite">{kopiert ? "Kopiert ✓" : "E-Mail kopieren"}</span>
    </button>
  );
}

/*
 * Finale: Der Abschnitt bleibt stehen. Erst siehst du das @ aus Punkten,
 * dann flutet aus dem @ heraus ein pinker Kreis den ganzen Bildschirm (clip-path: circle),
 * und «Schreib mir.» fährt von beiden Seiten rein.
 */
export function Kontakt() {
  const ref = useRef<HTMLElement>(null);
  const ruhig = useRuhig();
  const breit = useBreit();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });

  // Der Kreis wächst genau dort, wo das @ sitzt: rechts auf dem Desktop, oben mittig auf dem Handy
  const mitte = breit ? "75% 50%" : "50% 30%";
  const flut = useTransform(p, [0.28, 0.6], [`circle(0% at ${mitte})`, `circle(150% at ${mitte})`]);
  const hinweis = useTransform(p, [0.15, 0.3], [1, 0]);
  const schreibX = useTransform(p, [0.42, 0.7], ["-45vw", "0vw"]);
  const mirX = useTransform(p, [0.48, 0.76], ["45vw", "0vw"]);
  const untenY = useTransform(p, [0.62, 0.85], [60, 0]);
  const untenDeckkraft = useTransform(p, [0.62, 0.8], [0, 1]);

  return (
    <section id="kontakt" data-partikel="6" ref={ref} className={`relative ${ruhig ? "" : "h-[260svh]"}`}>
      <div className={ruhig ? "" : "sticky top-0 h-svh overflow-hidden"}>
        {/* Teil 1: dunkel, rechts das @ aus Punkten */}
        <div className="flex h-svh flex-col justify-center px-4 md:px-8">
          <div className="mx-auto grid w-full max-w-7xl gap-12 md:grid-cols-2">
            <div className="ohne-schein stoff-schatten relative -rotate-1 rounded-2xl bg-wolle p-6 md:p-10">
              <span aria-hidden className="klebeband -top-3 left-12 w-28 -rotate-6" />
              <p className="inline-block -rotate-2 font-hand text-3xl leading-none text-akzent">Nr. 05 · Kontakt</p>
              <h2 className="mt-3 font-display text-[clamp(3rem,7vw,6.5rem)] leading-[0.9] font-bold tracking-[-0.02em]">
                Lass uns was <span className="text-pink">bauen.</span>
              </h2>
              <p className="mt-5 max-w-md text-lg font-semibold text-schrift/85">
                Ich suche eine Stelle als Junior Frontend-Entwickler in Zürich und Umgebung.
              </p>
              <motion.p style={ruhig ? undefined : { opacity: hinweis }} className="mt-6 font-hand text-2xl text-leise">
                Weiterscrollen ↓
              </motion.p>
            </div>
          </div>
        </div>

        {/* Teil 2: pinke Farbflut */}
        <motion.div
          style={ruhig ? undefined : { clipPath: flut }}
          className={`filz ohne-schein flex flex-col justify-center overflow-hidden bg-pink px-4 text-tinte md:px-8 ${
            ruhig ? "relative min-h-svh py-24" : "absolute inset-0"
          }`}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -right-32 -bottom-40 size-[36rem] rounded-full border-[60px] border-tinte/10"
          />
          <div className="relative mx-auto w-full max-w-7xl">
            <p className="font-mono text-xs tracking-[0.25em] uppercase">Kontakt · {profil.ort}</p>
            <h2 className="mt-4 font-display text-[clamp(4.5rem,17vw,17rem)] leading-[0.82] font-extrabold tracking-[-0.045em]">
              <motion.span className="block" style={ruhig ? undefined : { x: schreibX }}>
                Schreib
              </motion.span>
              <motion.span className="block" style={ruhig ? undefined : { x: mirX }}>
                mir.
              </motion.span>
            </h2>
            <motion.div
              style={ruhig ? undefined : { y: untenY, opacity: untenDeckkraft }}
              className="mt-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex flex-wrap gap-3">
                <MagnetKnopf
                  href={`mailto:${profil.email}`}
                  staerke={0.2}
                  className="gap-3 rounded-full bg-tinte px-7 py-4 text-lg font-semibold text-hell"
                >
                  {profil.email}
                  <span aria-hidden>↗</span>
                </MagnetKnopf>
                <KopierKnopf />
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs tracking-[0.2em] uppercase">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline-offset-4 hover:underline"
                    >
                      {link.label} <span aria-hidden>↗</span>
                      <span className="sr-only">(öffnet in neuem Tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
