"use client";

import { useLenis } from "lenis/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Knopf } from "@/components/ui/Knopf";
import { kontaktEcht, profil, skills } from "@/data/profil";
import { oeffneFenster, schliesseFenster, useFenster } from "./fenster";
import { type Sprache, useSprache, waehleSprache } from "./sprache";
import { useTexte } from "./texte";

/**
 * Das Infofenster der Berg-Welt. Es geht auf, wenn man in der Welt etwas anklickt:
 * eine Gondel (Projekt), das Schild auf der Alp (Über mich) oder den Briefkasten am See (Kontakt).
 *
 * Bedienung: Schliessen mit dem Knopf, der Esc-Taste oder einem Klick daneben.
 * Bei Projekten blättern die Pfeiltasten und die Knöpfe unten durch alle Projekte.
 * Alle Texte kommen in der gewählten Sprache aus texte.ts, der Lebenslauf zum Herunterladen ebenfalls.
 */

// Platzhalter aus data/profil.ts werden nicht angezeigt: lieber kein Eintrag als eine falsche Adresse
const echteMail = kontaktEcht.email;
const echtesLinkedin = kontaktEcht.linkedin;

const knopf = "bastel-knopf filz inline-flex items-center gap-2 rounded-full bg-gelb px-5 py-2.5 text-sm font-extrabold text-tinte [--kante:#c9951a]";
const nebenLink = "text-sm font-bold underline decoration-2 underline-offset-4 hover:text-akzent";
// Zweiter Knopf neben der E-Mail (Telefon, Lebenslauf): gleiche Form, aber hell
const knopfHell = "inline-flex items-center gap-2 rounded-full bg-grund px-5 py-2.5 text-sm font-extrabold text-schrift ring-2 ring-schrift/15 hover:ring-schrift/40";

const SPRACHEN: Sprache[] = ["de", "en"];

/** Umschalter Deutsch / Englisch: zwei kleine Knöpfe, der aktive ist gefüllt */
function Sprachwahl({ className = "" }: { className?: string }) {
  const sprache = useSprache();
  const t = useTexte();
  return (
    <div role="group" aria-label={t.ui.sprachwahl} className={`flex items-center gap-0.5 rounded-full bg-wolle/90 p-1 ${className}`}>
      {SPRACHEN.map((s) => (
        <button
          key={s}
          type="button"
          lang={s}
          aria-pressed={sprache === s}
          onClick={() => waehleSprache(s)}
          className={`cursor-pointer rounded-full px-2.5 py-1 text-xs leading-none font-extrabold uppercase ${sprache === s ? "bg-tinte text-wolle" : "text-tinte hover:bg-tinte/10"}`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

/**
 * Mini-Navigation: «Luka», die Sprachwahl und «Kontakt». Sie ist nur ganz oben im Startbild zu sehen.
 * Sobald man hinunterscrollt, blendet sie aus und ist nicht mehr bedienbar: Die Welt gehört dann ganz dem Berg.
 */
export function BergNavigation() {
  const t = useTexte();
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
      <nav aria-label={t.ui.navigation} className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <a
          href="#gipfel"
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-wolle/85 py-1.5 pr-4 pl-2 font-display text-xl font-bold tracking-tight shadow-[0_10px_26px_-14px_rgba(46,31,21,0.5)] backdrop-blur"
        >
          <Knopf farbe="#EE4F86" groesse={26} />
          {profil.vorname}
        </a>
        <span className="flex items-center gap-2">
          <Sprachwahl className="pointer-events-auto shadow-[0_10px_26px_-14px_rgba(46,31,21,0.5)] backdrop-blur" />
          <button
            type="button"
            onClick={() => oeffneFenster({ art: "kontakt" })}
            className="bastel-knopf filz pointer-events-auto cursor-pointer rounded-full bg-gelb px-5 py-2 text-sm font-extrabold text-tinte [--kante:#c9951a]"
          >
            {t.ui.kontakt}
          </button>
        </span>
      </nav>
    </header>
  );
}

function Stichworte({ liste }: { liste: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {liste.map((s) => (
        <li key={s} className="rounded-full bg-grund px-3 py-1 text-xs font-extrabold text-schrift">
          {s}
        </li>
      ))}
    </ul>
  );
}

function Aussenlink({ href, children, className }: { href: string; children: ReactNode; className: string }) {
  const t = useTexte();
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children} <span aria-hidden>↗</span>
      <span className="sr-only">{t.ui.neuerTab}</span>
    </a>
  );
}

/** Knopf zum Herunterladen des Lebenslaufs in der gewählten Sprache */
function Lebenslauf({ className }: { className: string }) {
  const t = useTexte();
  return (
    <a href={t.cv} download className={className}>
      <span aria-hidden>↓</span> {t.ui.lebenslauf}
    </a>
  );
}

export function BergFenster() {
  const fenster = useFenster();
  const t = useTexte();
  const lenis = useLenis();
  const rahmen = useRef<HTMLDivElement>(null);
  const zu = useRef<HTMLButtonElement>(null);
  const offen = fenster !== null;
  const index = fenster?.art === "projekt" ? fenster.index : -1;
  const anzahl = t.projekte.length;

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
      if (index >= 0 && e.key === "ArrowRight") oeffneFenster({ art: "projekt", index: (index + 1) % anzahl });
      if (index >= 0 && e.key === "ArrowLeft") oeffneFenster({ art: "projekt", index: (index - 1 + anzahl) % anzahl });
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
  }, [offen, index, anzahl]);

  if (!fenster) return null;
  const projekt = index >= 0 ? t.projekte[index] : null;
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
            {projekt ? projekt.artText : fenster.art === "kontakt" ? t.ui.kontakt : t.ui.ueberMich}
          </span>
          <span className="flex items-center gap-2.5">
            {projekt && (
              <span className="rounded-full bg-tinte/15 px-2.5 py-1 text-xs font-extrabold text-tinte">
                {index + 1} / {anzahl}
              </span>
            )}
            <Sprachwahl />
            <button
              ref={zu}
              type="button"
              onClick={schliesseFenster}
              aria-label={t.ui.schliessen}
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
                    {t.ui.live}
                  </Aussenlink>
                )}
                {projekt.github && (
                  <Aussenlink href={projekt.github} className={nebenLink}>
                    {t.ui.code}
                  </Aussenlink>
                )}
              </div>
              <div className="flex items-center justify-between border-t-2 border-dashed border-schrift/15 pt-4">
                <button
                  type="button"
                  onClick={() => oeffneFenster({ art: "projekt", index: (index - 1 + anzahl) % anzahl })}
                  className="cursor-pointer rounded-full px-3 py-1.5 text-sm font-extrabold hover:bg-grund"
                >
                  {t.ui.vorheriges}
                </button>
                <button
                  type="button"
                  onClick={() => oeffneFenster({ art: "projekt", index: (index + 1) % anzahl })}
                  className="cursor-pointer rounded-full px-3 py-1.5 text-sm font-extrabold hover:bg-grund"
                >
                  {t.ui.naechstes}
                </button>
              </div>
            </>
          )}

          {fenster.art === "ueber" && (
            <>
              <h2 id="fenster-titel" className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                {t.ueberMich.titel}
              </h2>
              <p className="text-base leading-relaxed">{t.ueberMich.text}</p>
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
                {t.ueberMich.fakten.map((f) => (
                  <div key={f.label} className="contents">
                    <dt className="font-extrabold text-leise">{f.label}</dt>
                    <dd>{f.wert}</dd>
                  </div>
                ))}
              </dl>
              <div className="space-y-2">
                <h3 className="text-sm font-extrabold text-leise">{t.ui.womit}</h3>
                <Stichworte liste={[...skills.kern, ...skills.werkzeuge]} />
              </div>
              <div className="pt-1">
                <Lebenslauf className={knopf} />
              </div>
            </>
          )}

          {fenster.art === "kontakt" && (
            <>
              <div>
                <h2 id="fenster-titel" className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                  {t.ui.schreibMir}
                </h2>
                <p className="mt-1 text-sm font-bold text-akzent">{t.status}</p>
              </div>
              <p className="text-base leading-relaxed">{t.ui.kontaktText}</p>
              <div className="flex flex-wrap items-center gap-3">
                {echteMail && (
                  <a href={`mailto:${profil.email}`} className={knopf}>
                    {profil.email}
                  </a>
                )}
                <a href={`tel:${profil.telefon.replace(/\s/g, "")}`} className={knopfHell}>
                  <span className="sr-only">{t.ui.telefon}: </span>
                  {profil.telefon}
                </a>
                <Lebenslauf className={knopfHell} />
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
