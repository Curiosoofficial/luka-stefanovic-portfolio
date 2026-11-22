"use client";

import { useLenis } from "lenis/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Knopf } from "@/components/ui/Knopf";
import { kontaktEcht, profil, skills, ueberMich } from "@/data/profil";
import { projekte } from "@/data/projects";
import { oeffneFenster, schliesseFenster, useFenster } from "./fenster";

/**
 * Das Infofenster der Berg-Welt. Es geht auf, wenn man in der Welt etwas anklickt:
 * eine Gondel (Projekt), das Schild auf der Alp (Über mich) oder den Briefkasten am See (Kontakt).
 *
 * Bedienung: Schliessen mit dem Knopf, der Esc-Taste oder einem Klick daneben.
 * Bei Projekten blättern die Pfeiltasten und die Knöpfe unten durch alle Projekte.
 */

// Platzhalter aus data/profil.ts werden nicht angezeigt: lieber kein Eintrag als eine falsche Adresse
const echteMail = kontaktEcht.email;
const echtesLinkedin = kontaktEcht.linkedin;

const knopf = "bastel-knopf filz inline-flex items-center gap-2 rounded-full bg-gelb px-5 py-2.5 text-sm font-extrabold text-tinte [--kante:#c9951a]";
const nebenLink = "text-sm font-bold underline decoration-2 underline-offset-4 hover:text-akzent";
// Zweiter Knopf neben der E-Mail (Telefon): gleiche Form, aber hell
const knopfHell = "inline-flex items-center gap-2 rounded-full bg-grund px-5 py-2.5 text-sm font-extrabold text-schrift ring-2 ring-schrift/15 hover:ring-schrift/40";

/**
 * Mini-Navigation: «Luka» und «Kontakt». Sie ist nur ganz oben im Startbild zu sehen.
 * Sobald man hinunterscrollt, blendet sie aus und ist nicht mehr bedienbar: Die Welt gehört dann ganz dem Berg.
 */
export function BergNavigation() {
  const [oben, setOben] = useState(true);
  useEffect(() => {
    const pruefen = () => setOben(window.scrollY < 60);
    // Beim Laden kann die Seite schon weiter unten stehen: nach dem ersten Bild einmal nachsehen
    const id = requestAnimationFrame(pruefen);
    window.addEventListener("scroll", pruefen, { passive: true });
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("scroll", pruefen);
    };
  }, []);
  return (
    <header
      data-ui
      inert={!oben}
      className={`pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-4 transition-opacity duration-500 md:px-6 ${oben ? "opacity-100" : "opacity-0"}`}
    >
      <nav aria-label="Hauptnavigation" className="mx-auto flex max-w-7xl items-center justify-between">
        <a
          href="#gipfel"
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-wolle/85 py-1.5 pr-4 pl-2 font-display text-xl font-bold tracking-tight shadow-[0_10px_26px_-14px_rgba(46,31,21,0.5)] backdrop-blur"
        >
          <Knopf farbe="#EE4F86" groesse={26} />
          {profil.vorname}
        </a>
        <button
          type="button"
          onClick={() => oeffneFenster({ art: "kontakt" })}
          className="bastel-knopf filz pointer-events-auto cursor-pointer rounded-full bg-gelb px-5 py-2 text-sm font-extrabold text-tinte [--kante:#c9951a]"
        >
          Kontakt
        </button>
      </nav>
    </header>
  );
}

function Stichworte({ liste }: { liste: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {liste.map((t) => (
        <li key={t} className="rounded-full bg-grund px-3 py-1 text-xs font-extrabold text-schrift">
          {t}
        </li>
      ))}
    </ul>
  );
}

function Aussenlink({ href, children, className }: { href: string; children: ReactNode; className: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children} <span aria-hidden>↗</span>
      <span className="sr-only">(öffnet in neuem Tab)</span>
    </a>
  );
}

export function BergFenster() {
  const fenster = useFenster();
  const lenis = useLenis();
  const rahmen = useRef<HTMLDivElement>(null);
  const zu = useRef<HTMLButtonElement>(null);
  const offen = fenster !== null;
  const index = fenster?.art === "projekt" ? fenster.index : -1;

  // Solange das Fenster offen ist: Seite nicht scrollen, Fokus ins Fenster, danach zurück
  useEffect(() => {
    if (!offen) return;
    const vorher = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const html = document.documentElement;
    const alt = html.style.overflow;
    html.style.overflow = "hidden";
    lenis?.stop();
    zu.current?.focus();
    return () => {
      html.style.overflow = alt;
      lenis?.start();
      vorher?.focus();
    };
  }, [offen, lenis]);

  // Tastatur: Esc schliesst, Pfeile blättern durch die Projekte, Tab bleibt im Fenster
  useEffect(() => {
    if (!offen) return;
    const taste = (e: KeyboardEvent) => {
      if (e.key === "Escape") schliesseFenster();
      if (index >= 0 && e.key === "ArrowRight") oeffneFenster({ art: "projekt", index: (index + 1) % projekte.length });
      if (index >= 0 && e.key === "ArrowLeft") oeffneFenster({ art: "projekt", index: (index - 1 + projekte.length) % projekte.length });
      if (e.key === "Tab" && rahmen.current) {
        const ziele = [...rahmen.current.querySelectorAll<HTMLElement>("a[href], button")];
        if (ziele.length === 0) return;
        const [erstes, letztes] = [ziele[0], ziele[ziele.length - 1]];
        if (e.shiftKey && document.activeElement === erstes) {
          e.preventDefault();
          letztes.focus();
        } else if (!e.shiftKey && document.activeElement === letztes) {
          e.preventDefault();
          erstes.focus();
        }
      }
    };
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [offen, index]);

  if (!fenster) return null;
  const projekt = index >= 0 ? projekte[index] : null;
  const farbe = projekt?.farbe ?? (fenster.art === "kontakt" ? "#FFC93C" : "#F56FA1");

  return (
    <div data-ui data-lenis-prevent className="fixed inset-0 z-[70] grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="fenster-titel">
      {/* Klick neben das Fenster schliesst es */}
      <div aria-hidden className="absolute inset-0 bg-tinte/40 backdrop-blur-[3px]" onClick={schliesseFenster} />

      <div
        ref={rahmen}
        className="relative max-h-[88svh] w-full max-w-xl overflow-y-auto rounded-[28px] bg-wolle text-schrift shadow-[0_40px_90px_-30px_rgba(46,31,21,0.75)] ring-1 ring-schrift/10"
      >
        {/* Farbiges Band wie ein gestrickter Streifen */}
        <div
          className="flex h-16 items-center justify-between gap-3 px-6"
          style={{
            backgroundColor: farbe,
            backgroundImage: "repeating-linear-gradient(135deg, rgb(255 255 255 / 0.16) 0 6px, transparent 6px 12px)",
          }}
        >
          <span className="rounded-full bg-wolle/90 px-3 py-1 text-xs font-extrabold tracking-wide text-tinte uppercase">
            {projekt ? projekt.art : fenster.art === "kontakt" ? "Kontakt" : "Über mich"}
          </span>
          <span className="flex items-center gap-3">
            {projekt && (
              <span className="rounded-full bg-tinte/15 px-2.5 py-1 text-xs font-extrabold text-tinte">
                {index + 1} / {projekte.length}
              </span>
            )}
            <button
              ref={zu}
              type="button"
              onClick={schliesseFenster}
              aria-label="Fenster schliessen"
              className="grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-wolle text-xl leading-none font-extrabold text-tinte shadow-[0_3px_0_rgb(46_31_21/0.3)]"
            >
              ×
            </button>
          </span>
        </div>

        <div className="space-y-5 border-t-2 border-dashed border-schrift/15 p-6 md:p-8">
          {projekt && (
            <>
              <div>
                <h2 id="fenster-titel" className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                  {projekt.titel}
                </h2>
                {projekt.hinweis && <p className="mt-1 text-sm font-bold text-akzent">{projekt.hinweis}</p>}
              </div>
              <p className="text-base leading-relaxed">{projekt.kurz}</p>
              <Stichworte liste={projekt.technik} />
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
                {projekt.live && (
                  <Aussenlink href={projekt.live} className={knopf}>
                    Live ansehen
                  </Aussenlink>
                )}
                {projekt.github && (
                  <Aussenlink href={projekt.github} className={nebenLink}>
                    Code auf GitHub
                  </Aussenlink>
                )}
              </div>
              <div className="flex items-center justify-between border-t-2 border-dashed border-schrift/15 pt-4">
                <button
                  type="button"
                  onClick={() => oeffneFenster({ art: "projekt", index: (index - 1 + projekte.length) % projekte.length })}
                  className="cursor-pointer rounded-full px-3 py-1.5 text-sm font-extrabold hover:bg-grund"
                >
                  ‹ Vorheriges
                </button>
                <button
                  type="button"
                  onClick={() => oeffneFenster({ art: "projekt", index: (index + 1) % projekte.length })}
                  className="cursor-pointer rounded-full px-3 py-1.5 text-sm font-extrabold hover:bg-grund"
                >
                  Nächstes ›
                </button>
              </div>
            </>
          )}

          {fenster.art === "ueber" && (
            <>
              <h2 id="fenster-titel" className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                {ueberMich.titel}
              </h2>
              <p className="text-base leading-relaxed">{ueberMich.text}</p>
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
                {ueberMich.fakten.map((f) => (
                  <div key={f.label} className="contents">
                    <dt className="font-extrabold text-leise">{f.label}</dt>
                    <dd>{f.wert}</dd>
                  </div>
                ))}
              </dl>
              <div className="space-y-2">
                <h3 className="text-sm font-extrabold text-leise">Womit ich arbeite</h3>
                <Stichworte liste={[...skills.kern, ...skills.werkzeuge]} />
              </div>
            </>
          )}

          {fenster.art === "kontakt" && (
            <>
              <div>
                <h2 id="fenster-titel" className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                  Schreib mir.
                </h2>
                <p className="mt-1 text-sm font-bold text-akzent">{profil.status}</p>
              </div>
              <p className="text-base leading-relaxed">
                Ich bin {profil.name}, {profil.rolle} ({profil.stack}) in {profil.ort}. Ich freue mich über deine Nachricht.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {echteMail && (
                  <a href={`mailto:${profil.email}`} className={knopf}>
                    {profil.email}
                  </a>
                )}
                <a href={`tel:${profil.telefon.replace(/\s/g, "")}`} className={knopfHell}>
                  <span className="sr-only">Telefon: </span>
                  {profil.telefon}
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                {echtesLinkedin && (
                  <Aussenlink href={profil.linkedin} className={nebenLink}>
                    LinkedIn
                  </Aussenlink>
                )}
                <Aussenlink href={profil.github} className={nebenLink}>
                  GitHub
                </Aussenlink>
                <Aussenlink href={profil.firma.url} className={nebenLink}>
                  {profil.firma.name}
                </Aussenlink>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
