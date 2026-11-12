import { MagnetKnopf } from "@/components/ui/MagnetKnopf";
import { profil } from "@/data/profil";

const links = [
  { label: "GitHub", href: profil.github },
  { label: "LinkedIn", href: profil.linkedin },
  { label: profil.firma.name, href: profil.firma.url },
];

export function Kontakt() {
  return (
    <section
      id="kontakt"
      data-partikel="5"
      className="relative flex min-h-svh flex-col justify-center px-4 py-28 md:px-8"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-12 md:grid-cols-2">
        <div>
          <p className="font-mono text-xs tracking-[0.25em] text-nebel uppercase">
            <span className="text-limette">05</span> / Kontakt
          </p>
          <h2 className="mt-4 font-display text-[clamp(3.2rem,8vw,7.5rem)] leading-[0.88] font-extrabold tracking-[-0.03em]">
            Lass uns was <span className="text-pink">bauen.</span>
          </h2>
          <p className="mt-6 max-w-md text-lg text-papier/80">
            Ich suche eine Stelle als Junior Frontend-Entwickler in Zürich und Umgebung. Schreib mir, ich melde mich
            schnell.
          </p>
          <MagnetKnopf
            href={`mailto:${profil.email}`}
            staerke={0.2}
            className="mt-10 gap-3 rounded-full bg-limette px-7 py-4 text-lg font-semibold text-tinte"
          >
            {profil.email}
            <span aria-hidden>↗</span>
          </MagnetKnopf>
          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3 font-mono text-xs tracking-[0.2em] uppercase">
            {links.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-nebel transition-colors hover:text-limette"
                >
                  {link.label} <span aria-hidden>↗</span>
                  <span className="sr-only">(öffnet in neuem Tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
