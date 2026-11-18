import { profil } from "@/data/profil";

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-schrift/10 bg-grund/60 px-4 py-8 backdrop-blur md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 font-mono text-[11px] tracking-[0.2em] text-leise uppercase md:flex-row md:items-center md:justify-between">
        <p>© 2026 {profil.name}</p>
        <p>Next.js · TypeScript · Tailwind CSS · Three.js · kein Template</p>
        <a href="#start" className="transition-colors hover:text-akzent">
          Nach oben <span aria-hidden>↑</span>
        </a>
      </div>
    </footer>
  );
}
