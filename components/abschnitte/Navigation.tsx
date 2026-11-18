import { SoundKnopf } from "@/components/sound/SoundKnopf";
import { Knopf } from "@/components/ui/Knopf";
import { profil } from "@/data/profil";
import { NavLeiste } from "./NavLeiste";

const links = [
  { href: "#ueber-mich", label: "Über mich" },
  { href: "#projekte", label: "Projekte" },
  { href: "#skills", label: "Skills" },
  { href: "#spielplatz", label: "Spielplatz" },
];

/**
 * Navigation als schwebende, halbdurchsichtige Pille mit Naht-Rand.
 * Beim Runterscrollen gleitet sie weg, beim Hochscrollen kommt sie zurück (siehe NavLeiste).
 */
export function Navigation() {
  return (
    <NavLeiste>
      <nav
        aria-label="Hauptnavigation"
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-full border-2 border-dashed border-schrift/15 bg-grund/75 px-3 py-2 shadow-[0_10px_30px_-14px_rgba(46,31,21,0.45)] backdrop-blur-md md:px-4"
      >
        <a href="#start" className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
          <Knopf farbe="#EE4F86" groesse={28} />
          {profil.vorname}
        </a>
        <ul className="hidden items-center gap-7 text-sm font-extrabold tracking-[0.12em] text-schrift/75 uppercase lg:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="transition-colors hover:text-akzent">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3">
          <SoundKnopf />
          <a
            href="#kontakt"
            className="bastel-knopf filz rounded-full bg-gelb px-5 py-2 text-sm font-extrabold text-schrift [--kante:#c9951a]"
          >
            Kontakt
          </a>
        </div>
      </nav>
    </NavLeiste>
  );
}
