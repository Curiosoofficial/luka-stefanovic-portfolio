import { SoundKnopf } from "@/components/sound/SoundKnopf";
import { profil } from "@/data/profil";

const links = [
  { href: "#ueber-mich", label: "Über mich" },
  { href: "#projekte", label: "Projekte" },
  { href: "#skills", label: "Skills" },
  { href: "#spielplatz", label: "Spielplatz" },
];

export function Navigation() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-papier/5 bg-tinte/70 backdrop-blur-md">
      <nav
        aria-label="Hauptnavigation"
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8"
      >
        <a href="#start" className="font-display text-xl font-extrabold tracking-tight">
          {profil.vorname}
          <span className="text-pink">.</span>
        </a>
        <ul className="hidden items-center gap-7 font-mono text-xs tracking-[0.2em] text-nebel uppercase lg:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="transition-colors hover:text-papier">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <SoundKnopf />
          <a
            href="#kontakt"
            className="rounded-full bg-limette px-4 py-2 text-sm font-semibold text-tinte transition-transform hover:scale-105"
          >
            Kontakt
          </a>
        </div>
      </nav>
    </header>
  );
}
