import { profil } from "@/data/profil";
import { THEMA } from "@/components/welt/thema";

/** In der dunklen Code-Welt ist der Fuss dunkel mit heller Schrift, in der Strickwelt hell wie Packpapier */
const STIL =
  THEMA === "code"
    ? { fuss: "border-white/10 bg-[#05060c]/85", schrift: "text-[#8d97bd]", link: "hover:text-gelb" }
    : { fuss: "border-schrift/10 bg-grund/60", schrift: "text-leise", link: "hover:text-akzent" };

export function Footer() {
  return (
    <footer className={`relative z-10 border-t px-4 py-8 backdrop-blur md:px-8 ${STIL.fuss}`}>
      <div
        className={`mx-auto flex max-w-7xl flex-col gap-3 font-mono text-[11px] tracking-[0.2em] uppercase md:flex-row md:items-center md:justify-between ${STIL.schrift}`}
      >
        <p>© 2026 {profil.name}</p>
        <p>Next.js · TypeScript · Tailwind CSS · Three.js · kein Template</p>
        <a href="#start" className={`transition-colors ${STIL.link}`}>
          Nach oben <span aria-hidden>↑</span>
        </a>
      </div>
    </footer>
  );
}
