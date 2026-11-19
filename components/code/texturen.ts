import * as THREE from "three";
import { NEON, type Modul } from "./bauplan";

/**
 * Texturen der Code-Welt, zur Laufzeit auf ein <canvas> gezeichnet: Code mit Syntax-Farben
 * und die Oberflächen der fertigen Bausteine (Knopf, Karte, Bild ...). Keine Bilddateien nötig.
 */

export type Schriften = { display: string; sans: string; mono: string };

/** Liest die Schriften der Seite (next/font legt sie als CSS-Variablen auf <html>) */
export function schriftenLesen(): Schriften {
  const stil = getComputedStyle(document.documentElement);
  const lesen = (name: string, ersatz: string) => stil.getPropertyValue(name).trim() || ersatz;
  // Dieselben Schriften wie das Overlay der Code-Welt: Space Grotesk, Inter, JetBrains Mono
  return {
    display: lesen("--font-grotesk", "system-ui, sans-serif"),
    sans: lesen("--font-inter", "system-ui, sans-serif"),
    mono: `${lesen("--font-jetbrains", "ui-monospace")}, ui-monospace, Consolas, monospace`,
  };
}

function leinwand(breite: number, hoehe: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(2, Math.round(breite));
  c.height = Math.max(2, Math.round(hoehe));
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D nicht verfügbar");
  return { c, ctx };
}

function alsTextur(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ------------------------------------------------------------------ Code mit Syntax-Farben

const CODE_FARBE = {
  schluessel: "#ff6ea8",
  text: "#ffd25a",
  tag: "#74b6ff",
  attribut: "#7ee08a",
  zahl: "#ffa45c",
  zeichen: "#7d87ad",
  name: "#dfe5ff",
  kommentar: "#7a84a8",
};

const SCHLUESSELWOERTER = new Set([
  "const",
  "let",
  "return",
  "export",
  "default",
  "function",
  "import",
  "from",
  "await",
  "async",
  "if",
  "throw",
  "new",
  "type",
  "true",
  "false",
]);

const TOKEN = /(\s+|\/\/.*$|"[^"]*"|'[^']*'|`[^`]*`|<\/?[A-Za-z][\w.]*|\/?>|\d+(?:\.\d+)?|[A-Za-z_$@][\w$-]*|.)/g;

/** Zerlegt eine Code-Zeile in farbige Stücke, ähnlich wie ein Editor */
function faerben(zeile: string) {
  const stuecke = zeile.match(TOKEN) ?? [];
  return stuecke.map((stueck, i) => {
    let farbe = CODE_FARBE.zeichen;
    if (/^\s+$/.test(stueck)) farbe = CODE_FARBE.name;
    else if (stueck.startsWith("//")) farbe = CODE_FARBE.kommentar;
    else if (/^["'`]/.test(stueck)) farbe = CODE_FARBE.text;
    else if (/^<\/?[A-Za-z]/.test(stueck) || /^\/?>$/.test(stueck)) farbe = CODE_FARBE.tag;
    else if (/^\d/.test(stueck)) farbe = CODE_FARBE.zahl;
    else if (SCHLUESSELWOERTER.has(stueck)) farbe = CODE_FARBE.schluessel;
    else if (/^[A-Za-z_$@]/.test(stueck) && stuecke[i + 1] === "=") farbe = CODE_FARBE.attribut;
    else if (/^[A-Za-z_$@]/.test(stueck)) farbe = CODE_FARBE.name;
    return { text: stueck, farbe };
  });
}

/** Code-Zeilen als Textur. Gibt auch die Grösse in Pixeln zurück, daraus ergibt sich die Grösse im Raum. */
export function codeTextur(zeilen: string[], mono: string) {
  const groesse = 30;
  const zeilenHoehe = 44;
  const rand = 14;
  const schrift = `500 ${groesse}px ${mono}`;

  const mess = leinwand(4, 4).ctx;
  mess.font = schrift;
  const breite = Math.min(2048, Math.ceil(Math.max(...zeilen.map((z) => mess.measureText(z).width)) + rand * 2));
  const { c, ctx } = leinwand(breite, rand * 2 + zeilen.length * zeilenHoehe);

  ctx.font = schrift;
  ctx.textBaseline = "middle";
  zeilen.forEach((zeile, zi) => {
    let x = rand;
    const y = rand + zeilenHoehe * (zi + 0.5);
    for (const stueck of faerben(zeile)) {
      ctx.fillStyle = stueck.farbe;
      ctx.fillText(stueck.text, x, y);
      x += ctx.measureText(stueck.text).width;
    }
  });
  return { textur: alsTextur(c), breite: c.width, hoehe: c.height };
}

// ------------------------------------------------------------------ Oberflächen der Bausteine

function rundePfad(ctx: CanvasRenderingContext2D, x: number, y: number, b: number, h: number, r: number) {
  const rr = Math.min(r, b / 2, h / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, b, h, rr);
}

/** Pixel pro Welt-Einheit: genug für scharfen Text, höchstens 2048 Pixel breit */
const DICHTE = 110;

/**
 * Die sichtbare Oberfläche eines fertigen Bausteins, so wie er in einer echten Website aussehen würde.
 * Bewusst dunkel mit Neon-Akzenten: Die Farben der Seite (Pink, Gelb, Blau) leuchten auf Schwarz.
 */
export function uiTextur(modul: Modul, schriften: Schriften) {
  const faktor = Math.min(1, 2048 / (modul.b * DICHTE));
  const B = modul.b * DICHTE * faktor;
  const H = modul.h * DICHTE * faktor;
  const { c, ctx } = leinwand(B, H);
  const e = DICHTE * faktor; // eine Welt-Einheit in Pixeln
  const radius = modul.art === "knopf" || modul.art === "link" ? H / 2 : Math.min(H, B) * 0.12;

  ctx.textBaseline = "middle";

  switch (modul.art) {
    case "seite": {
      rundePfad(ctx, 0, 0, B, H, radius);
      ctx.fillStyle = "#090d1c";
      ctx.fill();
      // feines Punktraster wie ein Design-Raster
      ctx.fillStyle = "rgba(120, 140, 220, 0.16)";
      const abstand = e * 0.42;
      for (let x = abstand; x < B; x += abstand) {
        for (let y = abstand; y < H; y += abstand) {
          ctx.beginPath();
          ctx.arc(x, y, Math.max(1, e * 0.018), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.lineWidth = Math.max(2, e * 0.03);
      ctx.strokeStyle = "rgba(155, 107, 255, 0.55)";
      rundePfad(ctx, ctx.lineWidth / 2, ctx.lineWidth / 2, B - ctx.lineWidth, H - ctx.lineWidth, radius);
      ctx.stroke();
      break;
    }
    case "leiste": {
      rundePfad(ctx, 0, 0, B, H, H * 0.35);
      ctx.fillStyle = "#111833";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#2a3666";
      ctx.stroke();
      break;
    }
    case "logo": {
      ctx.fillStyle = modul.farbe;
      ctx.beginPath();
      ctx.arc(H * 0.42, H / 2, H * 0.26, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `700 ${H * 0.78}px ${schriften.display}`;
      ctx.fillStyle = "#f5f7ff";
      ctx.fillText(modul.text ?? "", H * 0.85, H * 0.54);
      break;
    }
    case "link": {
      ctx.font = `700 ${H * 0.52}px ${schriften.sans}`;
      ctx.fillStyle = "#c9d3f5";
      ctx.textAlign = "center";
      ctx.fillText(modul.text ?? "", B / 2, H * 0.46);
      ctx.fillStyle = modul.farbe;
      ctx.fillRect(B * 0.3, H * 0.86, B * 0.4, Math.max(2, H * 0.06));
      break;
    }
    case "titel": {
      ctx.font = `700 ${H * 0.86}px ${schriften.display}`;
      const text = modul.text ?? "";
      if (modul.farbe === NEON.gelb) {
        ctx.fillStyle = "#f5f7ff";
      } else {
        const breite = ctx.measureText(text).width;
        const verlauf = ctx.createLinearGradient(0, 0, breite, 0);
        verlauf.addColorStop(0, NEON.pink);
        verlauf.addColorStop(0.5, NEON.gelb);
        verlauf.addColorStop(1, NEON.blau);
        ctx.fillStyle = verlauf;
      }
      ctx.fillText(text, 0, H * 0.54);
      break;
    }
    case "text": {
      ctx.font = `600 ${H * 0.5}px ${schriften.sans}`;
      ctx.fillStyle = "#9aa6cc";
      ctx.fillText(modul.text ?? "", 0, H * 0.5);
      break;
    }
    case "knopf": {
      rundePfad(ctx, 2, 2, B - 4, H - 4, radius);
      if (modul.umriss) {
        ctx.lineWidth = Math.max(3, H * 0.06);
        ctx.strokeStyle = modul.farbe;
        ctx.stroke();
        ctx.fillStyle = "#dce6ff";
      } else {
        ctx.fillStyle = modul.farbe;
        ctx.fill();
        ctx.fillStyle = "#1a1405";
      }
      ctx.font = `700 ${H * 0.4}px ${schriften.sans}`;
      ctx.textAlign = "center";
      ctx.fillText(modul.text ?? "", B / 2, H * 0.52);
      break;
    }
    case "bild": {
      // «Hero-Bild»: Abendhimmel über Bergen, abstrahiert
      rundePfad(ctx, 0, 0, B, H, radius);
      ctx.save();
      ctx.clip();
      const himmel = ctx.createLinearGradient(0, 0, B, H);
      himmel.addColorStop(0, "#1b1046");
      himmel.addColorStop(0.55, "#7a2a9c");
      himmel.addColorStop(1, "#ff6a5c");
      ctx.fillStyle = himmel;
      ctx.fillRect(0, 0, B, H);
      ctx.fillStyle = "rgba(255, 204, 61, 0.92)";
      ctx.beginPath();
      ctx.arc(B * 0.68, H * 0.5, H * 0.2, 0, Math.PI * 2);
      ctx.fill();
      const berge = [
        { farbe: "rgba(40, 18, 90, 0.85)", hoehe: 0.55, zacken: [0, 0.18, 0.32, 0.5, 0.62, 0.8, 1] },
        { farbe: "rgba(14, 10, 40, 0.95)", hoehe: 0.72, zacken: [0, 0.12, 0.3, 0.45, 0.66, 0.84, 1] },
      ];
      berge.forEach((berg, bi) => {
        ctx.fillStyle = berg.farbe;
        ctx.beginPath();
        ctx.moveTo(0, H);
        berg.zacken.forEach((x, i) => {
          const y = H * berg.hoehe - (i % 2 === 1 ? H * (0.2 + bi * 0.05) : 0);
          ctx.lineTo(B * x, y);
        });
        ctx.lineTo(B, H);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();
      break;
    }
    case "karte": {
      rundePfad(ctx, 0, 0, B, H, radius);
      ctx.fillStyle = "#0f1530";
      ctx.fill();
      ctx.save();
      ctx.clip();
      const bild = ctx.createLinearGradient(0, 0, B, H * 0.56);
      bild.addColorStop(0, modul.farbe);
      bild.addColorStop(1, "#1b1f4a");
      ctx.fillStyle = bild;
      ctx.fillRect(0, 0, B, H * 0.56);
      ctx.restore();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#26305c";
      rundePfad(ctx, 1.5, 1.5, B - 3, H - 3, radius);
      ctx.stroke();
      ctx.font = `700 ${H * 0.14}px ${schriften.display}`;
      ctx.fillStyle = "#f5f7ff";
      ctx.fillText(modul.text ?? "", B * 0.07, H * 0.7);
      ctx.fillStyle = "#3a4677";
      rundePfad(ctx, B * 0.07, H * 0.82, B * 0.55, H * 0.045, H * 0.02);
      ctx.fill();
      ctx.fillStyle = modul.farbe;
      rundePfad(ctx, B * 0.72, H * 0.78, B * 0.21, H * 0.11, H * 0.055);
      ctx.fill();
      break;
    }
    case "fuss": {
      ctx.font = `600 ${H * 0.5}px ${schriften.sans}`;
      ctx.fillStyle = "#6f7aa3";
      ctx.textAlign = "center";
      ctx.fillText(modul.text ?? "", B / 2, H * 0.52);
      break;
    }
  }
  return alsTextur(c);
}

// ------------------------------------------------------------------ Licht-Effekte

/** Weicher Lichtfleck hinter der Seite: gibt dem schwarzen Raum Tiefe */
export function glutTextur() {
  const { c, ctx } = leinwand(512, 512);
  const verlauf = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  verlauf.addColorStop(0, "rgba(130, 90, 255, 0.55)");
  verlauf.addColorStop(0.35, "rgba(60, 80, 200, 0.22)");
  verlauf.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = verlauf;
  ctx.fillRect(0, 0, 512, 512);
  return alsTextur(c);
}

/** Leuchtender Streifen, der beim «Rendern» über die Seite fährt */
export function scanTextur() {
  const { c, ctx } = leinwand(8, 256);
  const verlauf = ctx.createLinearGradient(0, 0, 0, 256);
  verlauf.addColorStop(0, "rgba(255, 255, 255, 0)");
  verlauf.addColorStop(0.5, "rgba(255, 255, 255, 1)");
  verlauf.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = verlauf;
  ctx.fillRect(0, 0, 8, 256);
  return alsTextur(c);
}
