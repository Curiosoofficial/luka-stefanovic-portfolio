import * as THREE from "three";

/** Gemeinsame Masse der Bastelwelt (in Welt-Einheiten) */

export const ZONE = 16; // Höhe einer Welt
export const BODEN_Y = -5; // Oberkante des Bodens, relativ zur Mitte der Welt

/**
 * Höhe des gestrickten Bodens über BODEN_Y: sanfte Buckel wie eine gepolsterte Decke,
 * dazu ein grosser Strickhügel in der Mitte, über den der Kordel-Weg läuft.
 * Nie unter 0, damit die flache Bodenplatte darunter nirgends durchschaut.
 * Zur Vorderkante hin wird der Boden flach, damit die Kante beim Vorbeifahren sauber aussieht.
 */
export function bodenWelle(x: number, z: number) {
  const vorne = 1 - THREE.MathUtils.smoothstep(z, 5.8, 7.4);
  const gross = 0.14 * (1 + Math.sin(x * 0.42 + 1.3) * Math.cos(z * 0.47 - 0.4));
  const klein = 0.06 * (1 + Math.sin(x * 1.05 + z * 0.8 + 2));
  const huegel = 1.05 * Math.exp(-((x + 0.8) ** 2) / (2 * 3.2 * 3.2) - ((z + 2.2) ** 2) / (2 * 2.2 * 2.2));
  return 0.02 + (gross + klein + huegel) * vorne;
}
