"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Three.js ist gross. Mit ssr: false landet es nicht im Server-HTML und blockiert den Text nicht.
const WeltSzene = dynamic(() => import("./WeltSzene"), { ssr: false });

/**
 * Fixe Bühne hinter der ganzen Seite.
 * Die 3D-Welt wird erst geladen, wenn der Browser nach dem ersten Bild Luft hat:
 * So ist der Text sofort lesbar und die Welt baut sich danach auf.
 */
export function WeltBuehne() {
  const [laden, setLaden] = useState(false);

  useEffect(() => {
    const start = () => setLaden(true);
    // Safari kennt requestIdleCallback nicht, dort reicht ein kurzer Timeout
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(start, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(start, 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      {laden && <WeltSzene />}
    </div>
  );
}
