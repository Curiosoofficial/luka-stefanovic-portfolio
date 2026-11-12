import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";
import { profil } from "@/data/profil";
import { Providers } from "@/components/Providers";
import { PartikelBuehne } from "@/components/partikel/PartikelBuehne";
import { Cursor } from "@/components/ui/Cursor";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin", "latin-ext"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

// Auf Vercel setzt die Plattform VERCEL_PROJECT_PRODUCTION_URL automatisch.
const seitenUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const titel = `${profil.name} · ${profil.rolle} (${profil.stack}) in ${profil.ort}`;
const beschreibung =
  "Portfolio von Luka Stefanovic: Websites für Schweizer Betriebe, React und Next.js. Tausende Partikel formen sich beim Scrollen neu.";

export const metadata: Metadata = {
  metadataBase: new URL(seitenUrl),
  title: titel,
  description: beschreibung,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "de_CH",
    siteName: profil.name,
    title: titel,
    description: beschreibung,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: titel, description: beschreibung },
};

export const viewport: Viewport = {
  themeColor: "#0b0b14",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de-CH"
      className={`${bricolage.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-svh">
        <a
          href="#inhalt"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[70] focus:rounded-full focus:bg-limette focus:px-4 focus:py-2 focus:text-tinte"
        >
          Zum Inhalt springen
        </a>
        <PartikelBuehne />
        <Providers>{children}</Providers>
        <Cursor />
      </body>
    </html>
  );
}
