import type { Metadata, Viewport } from "next";
import { Caveat, Fredoka, Instrument_Serif, Inter, JetBrains_Mono, Nunito, Space_Grotesk } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";
import { profil } from "@/data/profil";
import { Providers } from "@/components/Providers";
import { WeltBuehne } from "@/components/welt/WeltBuehne";
import { THEMA } from "@/components/welt/thema";
import { Cursor } from "@/components/ui/Cursor";

// Titel: rund und dick, wie aus Filz ausgeschnitten
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin", "latin-ext"],
});

// Fliesstext und Etiketten: rund, aber gut lesbar
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext"],
});

// Handschrift für Notizen und Labels
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin", "latin-ext"],
});

// Schriften der Code-Welt: technisch, klar, erwachsen (Titel, Fliesstext, Labels).
// next/font verlangt feste Werte, darum kein bedingtes Vorladen: Beim Wechsel zur Strickwelt hier preload: false setzen.
const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin", "latin-ext"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin", "latin-ext"] });

// Glas-Welt: elegante Serifenschrift für grosse Titel, dazu Inter für Text
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  weight: "400",
  style: ["normal", "italic"],
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
  THEMA === "berg"
    ? "Portfolio von Luka Stefanovic: Websites für Schweizer Betriebe, React und Next.js. Ein gestrickter Schweizer Berg in 3D, vom Gipfel bis ins Tal."
    : THEMA === "glas"
    ? "Portfolio von Luka Stefanovic: Websites für Schweizer Betriebe, React und Next.js. Klar gestaltet, mit einer Glasskulptur live in 3D."
    : THEMA === "code"
    ? "Portfolio von Luka Stefanovic: Websites für Schweizer Betriebe, React und Next.js. Beim Scrollen wird aus Code eine fertige Website, live in 3D."
    : "Portfolio von Luka Stefanovic: Websites für Schweizer Betriebe, React und Next.js. Eine gestrickte 3D-Welt aus Wolle und Filz, durch die man beim Scrollen reist.";

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
  themeColor: THEMA === "code" ? "#05060c" : THEMA === "glas" ? "#e6e0d4" : THEMA === "berg" ? "#cfe2f1" : "#f4e8d4",
  colorScheme: THEMA === "code" ? "dark" : "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de-CH"
      data-thema={THEMA}
      className={`${fredoka.variable} ${nunito.variable} ${caveat.variable} ${grotesk.variable} ${inter.variable} ${jetbrains.variable} ${instrument.variable} antialiased`}
    >
      <body className="min-h-svh">
        <a
          href="#inhalt"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[70] focus:rounded-full focus:bg-gelb focus:px-4 focus:py-2 focus:text-tinte"
        >
          Zum Inhalt springen
        </a>
        <WeltBuehne />
        <Providers>{children}</Providers>
        <Cursor />
      </body>
    </html>
  );
}
