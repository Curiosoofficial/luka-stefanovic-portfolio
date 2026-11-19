import * as THREE from "three";
import { BAUPLAN, NEON, SCHWEBENDER_CODE, SEITE, type Modul } from "./bauplan";
import { codeTextur, glutTextur, scanTextur, uiTextur, type Schriften } from "./texturen";

/**
 * Die Code-Welt als eigene three.js-Gruppe. Alles wird einmal gebaut und danach nur noch über update()
 * verändert: Positionen, Deckkraft, Leuchten. Kein React-Render pro Frame.
 *
 * Der Fortschritt t läuft von 0 bis 5, ein Schritt pro Abschnitt der Seite:
 *   0 Start      Code-Zeilen schweben im Raum
 *   1 Über mich  aus jeder Zeile wird ein leuchtendes Drahtgitter
 *   2 Projekte   die Gitter bekommen Glas-Körper und Inhalt (Explosionszeichnung)
 *   3 Skills     alle Bausteine fahren zusammen: eine fertige Seite
 *   4 Spielplatz die Seite geht «live»: Farben, Licht, ein Scan fährt darüber
 *   5 Kontakt    die Kamera fährt zurück, leuchtende Rahmen breiten sich wie Wellen um die fertige Seite aus
 */

const S = THREE.MathUtils.smoothstep;
const mix = THREE.MathUtils.lerp;

/** Massstab für Code-Texturen: so viele Pixel ergeben eine Welt-Einheit */
const CODE_PIXEL_PRO_EINHEIT = 95;

/** Wiederholbarer Zufall: Die Welt sieht bei jedem Besuch gleich aus */
function zufallsGenerator(saat: number) {
  let s = saat;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function rundRechteck(b: number, h: number, r: number) {
  const rr = Math.max(0.01, Math.min(r, b / 2, h / 2));
  const x = -b / 2;
  const y = -h / 2;
  const form = new THREE.Shape();
  form.moveTo(x + rr, y);
  form.lineTo(x + b - rr, y);
  form.absarc(x + b - rr, y + rr, rr, -Math.PI / 2, 0, false);
  form.lineTo(x + b, y + h - rr);
  form.absarc(x + b - rr, y + h - rr, rr, 0, Math.PI / 2, false);
  form.lineTo(x + rr, y + h);
  form.absarc(x + rr, y + h - rr, rr, Math.PI / 2, Math.PI, false);
  form.lineTo(x, y + rr);
  form.absarc(x + rr, y + rr, rr, Math.PI, Math.PI * 1.5, false);
  return form;
}

type Teil = {
  modul: Modul;
  gruppe: THREE.Group;
  code: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  kanten: THREE.LineSegments<THREE.EdgesGeometry, THREE.LineBasicMaterial>;
  koerper: THREE.Mesh<THREE.ExtrudeGeometry, THREE.MeshStandardMaterial>;
  flaeche: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  start: THREE.Vector3;
  startDreh: THREE.Euler;
  verzoegerung: number;
  phase: number;
  /** Titel, Texte, Logo und Links verschmelzen am Ende mit der Seite: nur ihr Inhalt bleibt */
  textartig: boolean;
};

type Schwebend = { mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>; tempo: number; grund: number };

export class CodeWelt extends THREE.Group {
  private teile: Teil[] = [];
  private schwebend: Schwebend[] = [];
  private punkte: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private glut: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private scan: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private tunnel: THREE.LineLoop<THREE.BufferGeometry, THREE.LineBasicMaterial>[] = [];
  private pinkLicht = new THREE.PointLight(NEON.pink, 0, 70, 1.4);
  private blauLicht = new THREE.PointLight(NEON.blau, 0, 70, 1.4);
  private aufraeumen: { dispose(): void }[] = [];

  constructor(schriften: Schriften, sparsam: boolean) {
    super();
    const zufall = zufallsGenerator(11);

    // ---------------------------------------------------------------- Bausteine der Website
    BAUPLAN.forEach((modul, i) => this.teile.push(this.baueTeil(modul, i, zufall, schriften)));

    // ---------------------------------------------------------------- Schwebender Code im Hintergrund
    const anzahl = sparsam ? 14 : SCHWEBENDER_CODE.length;
    for (let i = 0; i < anzahl; i++) {
      const zeile = SCHWEBENDER_CODE[i % SCHWEBENDER_CODE.length];
      const { textur, breite, hoehe } = codeTextur([zeile], schriften.mono);
      const geo = new THREE.PlaneGeometry(breite / CODE_PIXEL_PRO_EINHEIT, hoehe / CODE_PIXEL_PRO_EINHEIT);
      const mat = new THREE.MeshBasicMaterial({
        map: textur,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      // Links und rechts mehr Code als in der Mitte, wo der Text der Seite steht
      const seite = i % 2 === 0 ? -1 : 1;
      mesh.position.set(seite * (6 + zufall() * 18), (zufall() * 2 - 1) * 14, -6 - zufall() * 26);
      mesh.rotation.y = -seite * (0.15 + zufall() * 0.25);
      this.add(mesh);
      this.schwebend.push({ mesh, tempo: 0.15 + zufall() * 0.35, grund: 0.35 + zufall() * 0.35 });
      this.aufraeumen.push(geo, mat, textur);
    }

    // ---------------------------------------------------------------- Lichtpunkte (Daten im Raum)
    const punkteAnzahl = sparsam ? 500 : 1300;
    const positionen = new Float32Array(punkteAnzahl * 3);
    const farben = new Float32Array(punkteAnzahl * 3);
    const palette = [NEON.pink, NEON.blau, NEON.lila, NEON.gelb, "#ffffff"].map((f) => new THREE.Color(f));
    for (let i = 0; i < punkteAnzahl; i++) {
      positionen.set([(zufall() * 2 - 1) * 40, (zufall() * 2 - 1) * 30, -45 + zufall() * 55], i * 3);
      const f = palette[Math.floor(zufall() * palette.length)];
      farben.set([f.r, f.g, f.b], i * 3);
    }
    const punkteGeo = new THREE.BufferGeometry();
    punkteGeo.setAttribute("position", new THREE.BufferAttribute(positionen, 3));
    punkteGeo.setAttribute("color", new THREE.BufferAttribute(farben, 3));
    const punkteMat = new THREE.PointsMaterial({
      size: 0.07,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.punkte = new THREE.Points(punkteGeo, punkteMat);
    this.add(this.punkte);
    this.aufraeumen.push(punkteGeo, punkteMat);

    // ---------------------------------------------------------------- Glut hinter der Seite
    const glutTex = glutTextur();
    const glutGeo = new THREE.PlaneGeometry(60, 40);
    const glutMat = new THREE.MeshBasicMaterial({
      map: glutTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    this.glut = new THREE.Mesh(glutGeo, glutMat);
    this.glut.position.set(0, 0, -14);
    this.add(this.glut);
    this.aufraeumen.push(glutTex, glutGeo, glutMat);

    // ---------------------------------------------------------------- Scan-Streifen
    const scanTex = scanTextur();
    const scanGeo = new THREE.PlaneGeometry(SEITE.b + 1.5, 0.45);
    const scanMat = new THREE.MeshBasicMaterial({
      map: scanTex,
      color: new THREE.Color("#8fc0ff").multiplyScalar(1.6),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.scan = new THREE.Mesh(scanGeo, scanMat);
    this.scan.position.z = 0.6;
    this.add(this.scan);
    this.aufraeumen.push(scanTex, scanGeo, scanMat);

    // ---------------------------------------------------------------- Leuchtende Rahmen um die fertige Seite (Finale)
    const umriss = rundRechteck(SEITE.b, SEITE.h, 0.9).getPoints(12);
    const tunnelGeo = new THREE.BufferGeometry().setFromPoints(umriss);
    this.aufraeumen.push(tunnelGeo);
    const tunnelFarben = [NEON.pink, NEON.blau, NEON.lila, NEON.gelb, NEON.blau, NEON.pink, NEON.lila];
    tunnelFarben.forEach((farbe) => {
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color(farbe).multiplyScalar(2),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const linie = new THREE.LineLoop(tunnelGeo, mat);
      this.add(linie);
      this.tunnel.push(linie);
      this.aufraeumen.push(mat);
    });

    // ---------------------------------------------------------------- Licht
    this.add(new THREE.AmbientLight("#8090c0", 0.35));
    const haupt = new THREE.DirectionalLight("#dfe8ff", 1.3);
    haupt.position.set(6, 10, 14);
    this.add(haupt);
    this.add(this.pinkLicht, this.blauLicht);
  }

  private baueTeil(modul: Modul, index: number, zufall: () => number, schriften: Schriften): Teil {
    const dicke = modul.art === "seite" ? 0.08 : 0.16;
    const pille = modul.art === "knopf" || modul.art === "link";
    const radius = pille ? modul.h / 2 : Math.min(modul.b, modul.h) * (modul.art === "seite" ? 0.08 : 0.14);
    const form = rundRechteck(modul.b, modul.h, radius);
    const akzent = new THREE.Color(modul.farbe);

    // Glas-Körper
    const koerperGeo = new THREE.ExtrudeGeometry(form, {
      depth: dicke,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.025,
      bevelSegments: 2,
      curveSegments: 8,
    });
    koerperGeo.translate(0, 0, -dicke / 2);
    const koerperMat = new THREE.MeshStandardMaterial({
      color: "#0d1326",
      metalness: 0.55,
      roughness: 0.28,
      emissive: akzent,
      emissiveIntensity: 0,
      transparent: true,
      opacity: 0,
      envMapIntensity: 0.9,
    });
    const koerper = new THREE.Mesh(koerperGeo, koerperMat);

    // Drahtgitter: Umriss vorne und hinten, ohne Fase, damit die Linien sauber sind
    const roh = new THREE.ExtrudeGeometry(form, { depth: dicke, bevelEnabled: false, curveSegments: 8 });
    roh.translate(0, 0, -dicke / 2);
    const kantenGeo = new THREE.EdgesGeometry(roh, 30);
    roh.dispose();
    const kantenMat = new THREE.LineBasicMaterial({
      color: akzent.clone().multiplyScalar(2.4),
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const kanten = new THREE.LineSegments(kantenGeo, kantenMat);

    // Code, aus dem der Baustein entsteht
    const ct = codeTextur(modul.code, schriften.mono);
    const codeGeo = new THREE.PlaneGeometry(ct.breite / CODE_PIXEL_PRO_EINHEIT, ct.hoehe / CODE_PIXEL_PRO_EINHEIT);
    const codeMat = new THREE.MeshBasicMaterial({
      map: ct.textur,
      color: new THREE.Color(1.6, 1.6, 1.6),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const code = new THREE.Mesh(codeGeo, codeMat);
    code.position.z = 0.05;

    // Fertige Oberfläche
    const flaecheTex = uiTextur(modul, schriften);
    const flaecheGeo = new THREE.PlaneGeometry(modul.b, modul.h);
    const flaecheMat = new THREE.MeshBasicMaterial({ map: flaecheTex, transparent: true, opacity: 0, depthWrite: false });
    const flaeche = new THREE.Mesh(flaecheGeo, flaecheMat);
    flaeche.position.z = dicke / 2 + 0.035;

    const gruppe = new THREE.Group();
    gruppe.add(koerper, kanten, flaeche, code);
    // Die Seite selbst liegt hinten, alles andere davor
    gruppe.renderOrder = modul.art === "seite" ? 0 : 1;
    this.add(gruppe);

    this.aufraeumen.push(koerperGeo, koerperMat, kantenGeo, kantenMat, codeGeo, codeMat, ct.textur);
    this.aufraeumen.push(flaecheGeo, flaecheMat, flaecheTex);

    const seite = index % 2 === 0 ? -1 : 1;
    return {
      modul,
      gruppe,
      code,
      kanten,
      koerper,
      flaeche,
      start: new THREE.Vector3(seite * (2 + zufall() * 11), (zufall() * 2 - 1) * 7.5, -3 - zufall() * 10),
      startDreh: new THREE.Euler((zufall() - 0.5) * 0.5, (zufall() - 0.5) * 0.9, (zufall() - 0.5) * 0.25),
      verzoegerung: (index / BAUPLAN.length) * 0.22 + zufall() * 0.05,
      phase: zufall() * Math.PI * 2,
      textartig: modul.art === "titel" || modul.art === "text" || modul.art === "logo" || modul.art === "link",
    };
  }

  /**
   * @param t Fortschritt 0 bis 5 (siehe oben)
   * @param zeit Sekunden seit Start
   * @param dt Sekunden seit dem letzten Bild
   * @param puls 0 bis 1: kurz nach einem Klick springen die Bausteine nach vorne
   * @param ruhig reduzierte Bewegung: kein Schweben, kein Treiben
   */
  update(t: number, zeit: number, dt: number, puls: number, ruhig: boolean) {
    const beweg = ruhig ? 0 : 1;
    const auseinander = 1 - S(t, 2.15, 2.95);
    const live = S(t, 3.05, 3.8);
    const finale = S(t, 4.1, 4.85);

    for (const teil of this.teile) {
      const { modul, gruppe, start, startDreh } = teil;
      const tt = t - teil.verzoegerung;
      const code = 1 - S(tt, 0.3, 0.9);
      const flug = S(tt, 0.25, 1.05);
      const draht = S(tt, 0.5, 0.95) * (1 - 0.6 * S(tt, 1.5, 2.1));
      const koerper = S(tt, 1.1, 1.8);
      const flaeche = S(tt, 1.4, 2.0);
      const verschmolzen = teil.textartig ? S(t, 2.55, 3.0) : 0;
      const sprung = puls * (0.5 + Math.abs(modul.tiefe) * 0.22) * (0.6 + 0.4 * Math.sin(teil.phase * 3));

      gruppe.position.set(
        mix(start.x, modul.x, flug),
        mix(start.y, modul.y, flug) + Math.sin(zeit * 0.7 + teil.phase) * 0.14 * (1 - flug * 0.7) * beweg,
        mix(start.z, modul.tiefe * auseinander, flug) +
          Math.sin(zeit * 0.5 + teil.phase) * 0.18 * auseinander * flug * beweg +
          sprung,
      );
      gruppe.rotation.set(startDreh.x * (1 - flug), startDreh.y * (1 - flug), startDreh.z * (1 - flug));

      teil.code.material.opacity = code;
      teil.code.visible = code > 0.003;

      const kantenDeckkraft = Math.min(1, draht * (1 - verschmolzen) + puls * 0.8 * flug);
      teil.kanten.material.opacity = kantenDeckkraft;
      teil.kanten.visible = kantenDeckkraft > 0.003;

      const koerperDeckkraft = koerper * (1 - verschmolzen) * (modul.art === "seite" ? 0.96 : 0.9);
      teil.koerper.material.opacity = koerperDeckkraft;
      teil.koerper.material.depthWrite = koerperDeckkraft > 0.9;
      teil.koerper.material.emissiveIntensity = live * 0.16 + puls * 0.35;
      teil.koerper.visible = koerperDeckkraft > 0.003;

      teil.flaeche.material.opacity = flaeche;
      teil.flaeche.material.color.setScalar(0.82 + live * 0.38);
      teil.flaeche.visible = flaeche > 0.003;
    }

    // Schwebender Code: steigt langsam auf, wird nach dem Start leiser, bleibt aber als Stimmung
    const codeStimmung = 1 - S(t, 0.4, 1.4);
    for (const s of this.schwebend) {
      s.mesh.position.y += s.tempo * dt * beweg;
      if (s.mesh.position.y > 16) s.mesh.position.y = -16;
      s.mesh.material.opacity = s.grund * (0.25 + codeStimmung * 0.75) * (1 - finale * 0.5);
    }

    // Lichtpunkte: Reise nach oben beim Scrollen, langsames Drehen
    this.punkte.position.y = t * 2.4;
    this.punkte.rotation.y = zeit * 0.012 * beweg;
    this.punkte.material.opacity = 0.55 + finale * 0.35;

    this.glut.material.opacity = 0.45 + live * 0.35 + finale * 0.2;
    this.glut.scale.setScalar(1 + t * 0.08);

    // Scan: fährt einmal von oben nach unten über die Seite, während sie «live» geht
    const scanWeg = S(t, 3.0, 3.85);
    this.scan.position.y = mix(SEITE.h / 2 + 0.8, -SEITE.h / 2 - 0.8, scanWeg);
    this.scan.material.opacity = Math.sin(Math.PI * scanWeg) * 0.75;
    this.scan.visible = scanWeg > 0.001 && scanWeg < 0.999;

    // Farbige Lichter kreisen um die Seite und werden mit «live» heller
    this.pinkLicht.intensity = 30 + live * 70;
    this.blauLicht.intensity = 30 + live * 70;
    const kreis = zeit * 0.25 * beweg;
    this.pinkLicht.position.set(-11 * Math.cos(kreis), 6, 7 + 3 * Math.sin(kreis));
    this.blauLicht.position.set(11 * Math.cos(kreis), -5, 7 - 3 * Math.sin(kreis));

    // Finale: Rahmen breiten sich wie Wellen um die fertige Seite aus und laufen langsam weiter nach aussen
    const anzahlRahmen = this.tunnel.length;
    this.tunnel.forEach((linie, i) => {
      const zeigen = S(finale, i * 0.06, i * 0.06 + 0.4);
      // Jeder Rahmen wandert von 0 bis 1 nach aussen und beginnt dann wieder innen
      const welle = ((i / anzahlRahmen + zeit * 0.05 * beweg) % 1 + 1) % 1;
      linie.scale.setScalar(1.04 + welle * 0.85);
      linie.position.set(0, 0, -0.4 - welle * 3.5);
      linie.material.opacity = zeigen * Math.sin(Math.PI * welle) * 0.85;
      linie.visible = zeigen > 0.003;
    });
  }

  dispose() {
    for (const ding of this.aufraeumen) ding.dispose();
    this.aufraeumen = [];
  }
}
