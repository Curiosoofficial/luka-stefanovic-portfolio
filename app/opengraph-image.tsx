import { ImageResponse } from "next/og";
import { profil } from "@/data/profil";

// Vorschaubild für LinkedIn, WhatsApp, Slack usw. Wird beim Build einmal als PNG erzeugt.
export const alt = `${profil.name}, ${profil.rolle} (${profil.stack}) in ${profil.ort}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FARBEN = ["#EE4F86", "#3A86D8", "#FFC93C", "#F48A35"];

/** Galaxie aus Punkten, mit festem Zufall, damit das Bild immer gleich aussieht */
function punkte() {
  let s = 7;
  const zufall = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  return Array.from({ length: 320 }, (_, i) => {
    const r = 20 + Math.pow(zufall(), 1.2) * 260;
    const winkel = (i % 3) * ((Math.PI * 2) / 3) + r * 0.018 + (zufall() - 0.5) * 0.7;
    return {
      x: 900 + Math.cos(winkel) * r,
      y: 315 + Math.sin(winkel) * r * 0.55,
      g: 3 + zufall() * 7,
      farbe: FARBEN[i % 4],
      a: 0.5 + zufall() * 0.5,
    };
  });
}

export default function Bild() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#2E1F15",
          color: "#FFF8EE",
          fontFamily: "sans-serif",
        }}
      >
        {punkte().map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y,
              width: p.g,
              height: p.g,
              borderRadius: 999,
              background: p.farbe,
              opacity: p.a,
            }}
          />
        ))}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 72 }}>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: "#FFC93C", textTransform: "uppercase" }}>
            {profil.status}
          </div>
          <div style={{ display: "flex", fontSize: 104, fontWeight: 800, lineHeight: 1, marginTop: 20 }}>
            {profil.name}
          </div>
          <div style={{ display: "flex", fontSize: 32, marginTop: 24, color: "#a3a1bf" }}>
            {profil.rolle} · {profil.stack} · {profil.ort}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
