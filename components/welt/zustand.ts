/**
 * Schneller, veränderbarer Zustand, den die 3D-Welt in jedem Frame liest.
 * Absichtlich kein React-State: 60-mal pro Sekunde neu rendern wäre viel zu teuer.
 */
export const weltStore = {
  /** Mausposition in Bildschirm-Koordinaten von -1 bis 1 */
  maus: { x: 0, y: 0, aktiv: false },
  /** Letzter Klick: Zeitpunkt (performance.now). Startwert liegt weit in der Vergangenheit. */
  klick: { zeit: -100000 },
};
