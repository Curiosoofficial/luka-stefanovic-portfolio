import { THEMA } from "@/components/welt/thema";

/**
 * Ein aufgenähter Knopf, nur mit CSS, aber plastisch:
 * - gewölbte Oberfläche mit Glanzlicht oben links (radialer Verlauf)
 * - Dicke: eine dunklere Kante unten und ein Schlagschatten auf den Stoff
 * - eingesenkte Mulde in der Mitte (Schatten innen oben, Licht innen unten)
 * - vier gebohrte Löcher mit Tiefe und ein Faden über Kreuz, der selbst einen kleinen Schatten wirft
 * Rein dekorativ, darum aria-hidden.
 * In der Code-Welt wird daraus ein leuchtender Knoten (Punkt mit Ring), wie ein Status-Licht.
 */
export function Knopf({
  farbe = "#FFC93C",
  groesse = 44,
  className = "",
}: {
  farbe?: string;
  groesse?: number;
  className?: string;
}) {
  const g = groesse;

  if (THEMA === "code") {
    return (
      <span
        aria-hidden
        className={`relative inline-grid shrink-0 place-items-center rounded-full ${className}`}
        style={{
          width: g,
          height: g,
          background: `radial-gradient(circle, color-mix(in oklab, ${farbe} 30%, transparent) 0%, transparent 70%)`,
        }}
      >
        <span
          className="absolute inset-[16%] rounded-full"
          style={{ border: `1px solid color-mix(in oklab, ${farbe} 65%, transparent)` }}
        />
        <span
          className="rounded-full"
          style={{
            width: g * 0.36,
            height: g * 0.36,
            background: farbe,
            boxShadow: `0 0 ${Math.max(4, g * 0.35)}px ${farbe}, inset 0 1px 0 rgb(255 255 255 / 0.6)`,
          }}
        />
      </span>
    );
  }

  const loch = g * 0.13;
  const abstand = g * 0.12;
  const px = (wert: number, minimum = 1) => `${Math.max(minimum, wert).toFixed(1)}px`;
  const hell = `color-mix(in oklab, ${farbe} 55%, white)`;
  const dunkel = `color-mix(in oklab, ${farbe} 70%, black)`;
  const kante = `color-mix(in oklab, ${farbe} 55%, black)`;

  return (
    <span
      aria-hidden
      className={`relative inline-block shrink-0 rounded-full ${className}`}
      style={{
        width: g,
        height: g,
        background: `radial-gradient(circle at 34% 28%, ${hell} 0%, ${farbe} 42%, ${dunkel} 100%)`,
        boxShadow: [
          `0 ${px(g * 0.07)} 0 ${kante}`,
          `0 ${px(g * 0.12)} ${px(g * 0.16)} rgb(50 28 12 / 0.45)`,
          `inset 0 ${px(g * 0.035)} 0 rgb(255 255 255 / 0.45)`,
          `inset 0 ${px(-g * 0.05, -999)} ${px(g * 0.06)} rgb(0 0 0 / 0.22)`,
        ].join(", "),
      }}
    >
      {/* Mulde: leicht eingesenkt */}
      <span
        className="absolute inset-[17%] rounded-full"
        style={{
          background: `radial-gradient(circle at 60% 70%, ${hell} 0%, ${farbe} 55%, ${dunkel} 100%)`,
          boxShadow: `inset 0 ${px(g * 0.045)} ${px(g * 0.06)} rgb(0 0 0 / 0.32), 0 ${px(g * 0.02)} 0 rgb(255 255 255 / 0.35)`,
        }}
      />
      {/* Löcher: dunkel mit Schatten am oberen Rand, wie gebohrt */}
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([x, y]) => (
        <span
          key={`${x}${y}`}
          className="absolute rounded-full"
          style={{
            width: loch,
            height: loch,
            left: g / 2 + x * abstand - loch / 2,
            top: g / 2 + y * abstand - loch / 2,
            background: "radial-gradient(circle at 50% 65%, rgb(20 10 4 / 0.55), rgb(20 10 4 / 0.85))",
            boxShadow: `0 ${px(g * 0.012, 0.5)} 0 rgb(255 255 255 / 0.4)`,
          }}
        />
      ))}
      {/* Faden über Kreuz: rund schattiert, wirft einen kleinen Schatten */}
      {[45, -45].map((winkel) => (
        <span
          key={winkel}
          className="absolute top-1/2 left-1/2 rounded-full"
          style={{
            width: abstand * 2.9,
            height: Math.max(2, g * 0.07),
            transform: `translate(-50%, -50%) rotate(${winkel}deg)`,
            background: "linear-gradient(to bottom, #fffdf8, #f1e6d2 55%, #d9c8aa)",
            boxShadow: `0 ${px(g * 0.02, 0.5)} ${px(g * 0.02, 0.5)} rgb(30 15 5 / 0.45)`,
          }}
        />
      ))}
    </span>
  );
}
