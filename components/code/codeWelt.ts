import * as THREE from "three";
import { projekte, type Projekt } from "@/data/projects";
import { BAUPLAN, NEON, SCHWEBENDER_CODE, SEITE, type Modul } from "./bauplan";
import { codeTextur, glutTextur, scanTextur, uiTextur, type Schriften } from "./texturen";

/**
 * Die Code-Welt als eigene three.js-Gruppe. Alles wird einmal gebaut und danach nur noch über update()
 * verändert: Positionen, Deckkraft, Leuchten. Kein React-Render pro Frame.
 *
 * Der Fortschritt t läuft von 0 bis 5, ein Schritt pro Abschnitt der Seite:
 *   0 Start      ein aufgeräumter Code-Editor oben rechts («Seite.tsx»)
 *   1 Über mich  die Zeilen fliegen aus dem Editor und werden zu leuchtenden Drahtgittern, dann zu Glas
 *   2 Projekte   die Seite steht fertig da und zeigt das Projekt, das links gerade offen ist
 *   3 Skills     die Seite geht «live»: Farben, Licht, ein Scan fährt darüber
 *   4 Spielplatz die Seite leuchtet weiter
 *   5 Kontakt    leuchtende Rahmen breiten sich wie Wellen um die fertige Seite aus
 */

const S = THREE.MathUtils.smoothstep;
const mix = THREE.MathUtils.lerp;

/** Massstab für Code-Texturen: so viele Pixel ergeben eine Welt-Einheit */
const EDITOR_PIXEL_PRO_EINHEIT = 120;
const SCHWEBE_PIXEL_PRO_EINHEIT = 95;

/** Der Editor im Hero: oben rechts, wo auf der Seite kein Text steht */
const EDITOR = { links: 3.4, oben: 6.1, z: -1, zeile: 44 / EDITOR_PIXEL_PRO_EINHEIT, einzug: 0.32, breite: 8.9 };

/**
 * Inhalt der Datei im Editor: Zeilen, die nur zum Bild gehören, und die Code-Zeilen der Bausteine (Index im BAUPLAN).
 * Daraus entsteht von oben nach unten eine glaubwürdige React-Komponente.
 */
const EDITOR_INHALT: ({ zeilen: string[]; einzug: number } | { modul: number; einzug: number })[] = [
  { zeilen: ['import { Button, Karte, Link } from "@/ui";', ""], einzug: 0 },
  { modul: 0, einzug: 0 },
  { modul: 1, einzug: 2 },
  { modul: 2, einzug: 3 },
  { modul: 3, einzug: 3 },
  { modul: 4, einzug: 3 },
  { modul: 5, einzug: 3 },
  { modul: 6, einzug: 2 },
  { modul: 7, einzug: 2 },
  { modul: 8, einzug: 2 },
  { modul: 9, einzug: 2 },
  { modul: 10, einzug: 2 },
  { modul: 11, einzug: 2 },
  { modul: 12, einzug: 2 },
  { modul: 13, einzug: 2 },
  { modul: 14, einzug: 2 },
  { modul: 15, einzug: 2 },
  { zeilen: ["  </main>;", "}"], einzug: 0 },
];

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

function adresse(p: Projekt) {
  if (p.live) return new URL(p.live).hostname.replace(/^www\./, "");
  if (p.github) return p.github.replace(/^https?:\/\//, "");
  return "";
}

/** Welche Rolle ein Baustein spielt, wenn die Seite ein Projekt zeigt */
type Rolle = "titel1" | "titel2" | "text" | "knopf1" | "knopf2" | "bild" | "karte0" | "karte1" | "karte2" | null;

/** Der Baustein, umgeschrieben auf ein Projekt: So wird die Seite im 3D zum Bildschirm für das Projekt */
function fuerProjekt(modul: Modul, rolle: Rolle, p: Projekt): Modul {
  switch (rolle) {
    case "titel1":
      return { ...modul, text: p.titel };
    case "titel2":
      return { ...modul, text: `${p.art}.` };
    case "text":
      return { ...modul, text: p.kurz };
    case "knopf1":
      return { ...modul, text: p.live ? "Live ansehen" : "Code ansehen" };
    case "knopf2":
      return { ...modul, text: p.github ? "GitHub" : "Details" };
    case "bild":
      return { ...modul, farbe: p.farbe, text: adresse(p), untertitel: p.titel };
    case "karte0":
    case "karte1":
    case "karte2":
      return { ...modul, text: p.technik[Number(rolle.slice(-1))] ?? "" };
    default:
      return modul;
  }
}

type Teil = {
  modul: Modul;
  rolle: Rolle;
  gruppe: THREE.Group;
  code: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  kanten: THREE.LineSegments<THREE.EdgesGeometry, THREE.LineBasicMaterial>;
  koerper: THREE.Mesh<THREE.ExtrudeGeometry, THREE.MeshStandardMaterial>;
  flaeche: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  start: THREE.Vector3;
  verzoegerung: number;
  phase: number;
  /** Titel, Texte, Logo und Links verschmelzen am Ende mit der Seite: nur ihr Inhalt bleibt */
  textartig: boolean;
};

type Schwebend = { mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>; tempo: number; grund: number };

export class CodeWelt extends THREE.Group {
  private schriften: Schriften;
  private teile: Teil[] = [];
  private schwebend: Schwebend[] = [];
  private editor = new THREE.Group();
  private editorMaterialien: (THREE.MeshBasicMaterial | THREE.LineBasicMaterial)[] = [];
  private punkte: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private glut: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private scan: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private tunnel: THREE.LineLoop<THREE.BufferGeometry, THREE.LineBasicMaterial>[] = [];
  private pinkLicht = new THREE.PointLight(NEON.pink, 0, 70, 1.4);
  private blauLicht = new THREE.PointLight(NEON.blau, 0, 70, 1.4);
  private aufraeumen: { dispose(): void }[] = [];
  /** -2: noch nie gezeichnet, -1: Standard-Inhalt, sonst Index des gezeigten Projekts */
  private gezeigtesProjekt = -2;
  private zeit = 0;
  private wechselZeit = -100;

  constructor(schriften: Schriften, sparsam: boolean) {
    super();
    this.schriften = schriften;
    const zufall = zufallsGenerator(11);

    // ---------------------------------------------------------------- Bausteine der Website
    const titelZaehler = { titel: 0, knopf: 0, karte: 0 };
    BAUPLAN.forEach((modul, i) => {
      let rolle: Rolle = null;
      if (modul.art === "titel") rolle = titelZaehler.titel++ === 0 ? "titel1" : "titel2";
      else if (modul.art === "knopf") rolle = titelZaehler.knopf++ === 0 ? "knopf1" : "knopf2";
      else if (modul.art === "karte") rolle = `karte${titelZaehler.karte++}` as Rolle;
      else if (modul.art === "text") rolle = "text";
      else if (modul.art === "bild") rolle = "bild";
      this.teile.push(this.baueTeil(modul, i, rolle, zufall));
    });

    // ---------------------------------------------------------------- Editor im Hero
    this.baueEditor();

    // ---------------------------------------------------------------- Ganz leiser Code weit hinten, nur als Stimmung
    const anzahl = sparsam ? 6 : 12;
    for (let i = 0; i < anzahl; i++) {
      const zeile = SCHWEBENDER_CODE[(i * 5) % SCHWEBENDER_CODE.length];
      const { textur, breite, hoehe } = codeTextur([zeile], schriften.mono);
      const geo = new THREE.PlaneGeometry(breite / SCHWEBE_PIXEL_PRO_EINHEIT, hoehe / SCHWEBE_PIXEL_PRO_EINHEIT);
      const mat = new THREE.MeshBasicMaterial({
        map: textur,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const seite = i % 2 === 0 ? -1 : 1;
      mesh.position.set(seite * (10 + zufall() * 18), (zufall() * 2 - 1) * 15, -20 - zufall() * 22);
      mesh.rotation.y = -seite * (0.1 + zufall() * 0.2);
      this.add(mesh);
      this.schwebend.push({ mesh, tempo: 0.1 + zufall() * 0.25, grund: 0.1 + zufall() * 0.12 });
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

  private baueTeil(modul: Modul, index: number, rolle: Rolle, zufall: () => number): Teil {
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

    // Code, aus dem der Baustein entsteht (steht am Anfang als Zeile im Editor)
    const ct = codeTextur(modul.code, this.schriften.mono);
    const codeGeo = new THREE.PlaneGeometry(ct.breite / EDITOR_PIXEL_PRO_EINHEIT, ct.hoehe / EDITOR_PIXEL_PRO_EINHEIT);
    const codeMat = new THREE.MeshBasicMaterial({
      map: ct.textur,
      color: new THREE.Color(1.5, 1.5, 1.5),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const code = new THREE.Mesh(codeGeo, codeMat);
    code.position.z = 0.05;

    // Fertige Oberfläche (die Textur wird in zeigeProjekt() gesetzt und bei Bedarf ausgetauscht)
    const flaecheGeo = new THREE.PlaneGeometry(modul.b, modul.h);
    const flaecheMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const flaeche = new THREE.Mesh(flaecheGeo, flaecheMat);
    flaeche.position.z = dicke / 2 + 0.035;

    const gruppe = new THREE.Group();
    gruppe.add(koerper, kanten, flaeche, code);
    gruppe.renderOrder = modul.art === "seite" ? 0 : 1;
    this.add(gruppe);

    this.aufraeumen.push(koerperGeo, koerperMat, kantenGeo, kantenMat, codeGeo, codeMat, ct.textur);
    this.aufraeumen.push(flaecheGeo, flaecheMat);

    return {
      modul,
      rolle,
      gruppe,
      code,
      kanten,
      koerper,
      flaeche,
      // Startplatz: die eigene Zeile im Editor (wird in baueEditor() gesetzt)
      start: new THREE.Vector3(),
      verzoegerung: (index / BAUPLAN.length) * 0.25 + zufall() * 0.04,
      phase: zufall() * Math.PI * 2,
      textartig: modul.art === "titel" || modul.art === "text" || modul.art === "logo" || modul.art === "link",
    };
  }

  /** Editor-Fenster mit Titelleiste und Dateiname; die Code-Zeilen der Bausteine stehen darin untereinander */
  private baueEditor() {
    const mono = this.schriften.mono;
    let y = EDITOR.oben;
    for (const eintrag of EDITOR_INHALT) {
      const x0 = EDITOR.links + eintrag.einzug * EDITOR.einzug;
      if ("modul" in eintrag) {
        const teil = this.teile[eintrag.modul];
        const zeilen = teil.modul.code.length;
        const breite = teil.code.geometry.parameters.width;
        teil.start.set(x0 + breite / 2, y - (zeilen * EDITOR.zeile) / 2, EDITOR.z);
        y -= zeilen * EDITOR.zeile;
      } else {
        const sichtbar = eintrag.zeilen.filter((z) => z.length > 0);
        if (sichtbar.length) {
          const ct = codeTextur(eintrag.zeilen.map((z) => z || " "), mono);
          const geo = new THREE.PlaneGeometry(ct.breite / EDITOR_PIXEL_PRO_EINHEIT, ct.hoehe / EDITOR_PIXEL_PRO_EINHEIT);
          const mat = new THREE.MeshBasicMaterial({
            map: ct.textur,
            color: new THREE.Color(1.3, 1.3, 1.3),
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(x0 + geo.parameters.width / 2, y - (eintrag.zeilen.length * EDITOR.zeile) / 2, EDITOR.z);
          this.editor.add(mesh);
          this.editorMaterialien.push(mat);
          this.aufraeumen.push(geo, mat, ct.textur);
        }
        y -= eintrag.zeilen.length * EDITOR.zeile;
      }
    }

    // Fenster: Rahmen, Titelleiste, drei Punkte, Dateiname
    const rand = 0.45;
    const oben = EDITOR.oben + 0.95;
    const unten = y - rand;
    const links = EDITOR.links - rand - 0.1;
    const rechts = links + EDITOR.breite;
    const fenster = rundRechteck(rechts - links, oben - unten, 0.35).getPoints(10);
    const fensterGeo = new THREE.BufferGeometry().setFromPoints(fenster);
    const fensterMat = new THREE.LineBasicMaterial({ color: new THREE.Color("#5a6aa8").multiplyScalar(1.4), transparent: true });
    const rahmen = new THREE.LineLoop(fensterGeo, fensterMat);
    rahmen.position.set((links + rechts) / 2, (oben + unten) / 2, EDITOR.z - 0.05);

    const flaecheGeo = new THREE.ShapeGeometry(rundRechteck(rechts - links, oben - unten, 0.35), 10);
    const flaecheMat = new THREE.MeshBasicMaterial({ color: "#070a16", transparent: true, opacity: 0.75, depthWrite: false });
    flaecheMat.userData.basis = 0.75;
    const flaeche = new THREE.Mesh(flaecheGeo, flaecheMat);
    flaeche.position.copy(rahmen.position).setZ(EDITOR.z - 0.08);

    const leisteGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(links, oben - 0.55, EDITOR.z - 0.05),
      new THREE.Vector3(rechts, oben - 0.55, EDITOR.z - 0.05),
    ]);
    const leiste = new THREE.Line(leisteGeo, fensterMat);

    const punktGeo = new THREE.CircleGeometry(0.075, 16);
    [NEON.pink, NEON.gelb, NEON.gruen].forEach((farbe, k) => {
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe).multiplyScalar(1.4), transparent: true });
      const punkt = new THREE.Mesh(punktGeo, mat);
      punkt.position.set(links + 0.35 + k * 0.26, oben - 0.28, EDITOR.z - 0.04);
      this.editor.add(punkt);
      this.editorMaterialien.push(mat);
      this.aufraeumen.push(mat);
    });

    const name = codeTextur(["Seite.tsx"], mono);
    const nameGeo = new THREE.PlaneGeometry(name.breite / 150, name.hoehe / 150);
    const nameMat = new THREE.MeshBasicMaterial({ map: name.textur, transparent: true, depthWrite: false });
    const nameMesh = new THREE.Mesh(nameGeo, nameMat);
    nameMesh.position.set(links + 1.25 + nameGeo.parameters.width / 2, oben - 0.28, EDITOR.z - 0.04);

    this.editor.add(flaeche, rahmen, leiste, nameMesh);
    this.editorMaterialien.push(fensterMat, flaecheMat, nameMat);
    this.aufraeumen.push(fensterGeo, fensterMat, flaecheGeo, flaecheMat, leisteGeo, punktGeo, nameGeo, nameMat, name.textur);
    this.add(this.editor);
  }

  /**
   * Zeigt auf der Seite ein Projekt (Index in data/projects.ts) oder den Standard-Inhalt (-1).
   * Nur die Texturen der betroffenen Bausteine werden neu gezeichnet, und die Seite «flackert» kurz beim Wechsel.
   */
  zeigeProjekt(index: number) {
    if (index === this.gezeigtesProjekt) return;
    const ersterAufruf = this.gezeigtesProjekt === -2;
    this.gezeigtesProjekt = index;
    const projekt = index >= 0 ? projekte[index] : null;
    for (const teil of this.teile) {
      if (!ersterAufruf && !teil.rolle) continue;
      const modul = projekt ? fuerProjekt(teil.modul, teil.rolle, projekt) : teil.modul;
      const alt = teil.flaeche.material.map;
      teil.flaeche.material.map = uiTextur(modul, this.schriften);
      teil.flaeche.material.needsUpdate = true;
      alt?.dispose();
    }
    if (!ersterAufruf) this.wechselZeit = this.zeit;
  }

  /**
   * @param t Fortschritt 0 bis 5 (siehe oben)
   * @param zeit Sekunden seit Start
   * @param dt Sekunden seit dem letzten Bild
   * @param puls 0 bis 1: kurz nach einem Klick springen die Bausteine nach vorne
   * @param ruhig reduzierte Bewegung: kein Schweben, kein Treiben
   */
  update(t: number, zeit: number, dt: number, puls: number, ruhig: boolean) {
    this.zeit = zeit;
    const beweg = ruhig ? 0 : 1;
    const auseinander = 1 - S(t, 1.5, 1.95);
    const live = S(t, 3.05, 3.8);
    const finale = S(t, 4.1, 4.85);
    // Kurzer Puls beim Projektwechsel: Kanten blitzen auf, die Bausteine zucken nach vorne
    const wechsel = ruhig ? 0 : Math.exp(-Math.max(0, zeit - this.wechselZeit) / 0.28);
    const reiz = Math.max(puls, wechsel * 0.7);

    // Editor: sichtbar im Hero, verschwindet, während die Zeilen herausfliegen
    const editorDeckkraft = 1 - S(t, 0.35, 0.85);
    this.editor.visible = editorDeckkraft > 0.003;
    for (const mat of this.editorMaterialien) mat.opacity = editorDeckkraft * (mat.userData.basis ?? 1);
    this.editor.position.y = Math.sin(zeit * 0.4) * 0.06 * beweg;

    for (const teil of this.teile) {
      const { modul, gruppe, start } = teil;
      const tt = t - teil.verzoegerung;
      const code = 1 - S(tt, 0.3, 0.85);
      const flug = S(tt, 0.25, 1.0);
      const draht = S(tt, 0.5, 0.9) * (1 - 0.6 * S(tt, 1.15, 1.6));
      const koerper = S(tt, 1.0, 1.45);
      const flaeche = S(tt, 1.2, 1.6);
      const verschmolzen = teil.textartig ? S(t, 1.7, 1.95) : 0;
      const sprung = reiz * (0.5 + Math.abs(modul.tiefe) * 0.22) * (0.6 + 0.4 * Math.sin(teil.phase * 3));

      // Auf dem Flug ein kleiner Bogen nach vorne, damit die Zeilen sichtbar aus dem Editor «springen»
      const bogen = Math.sin(Math.PI * flug) * 2.2;
      gruppe.position.set(
        mix(start.x, modul.x, flug),
        mix(start.y, modul.y, flug) + Math.sin(zeit * 0.6 + teil.phase) * 0.05 * flug * auseinander * beweg,
        mix(start.z, modul.tiefe * auseinander, flug) + bogen + sprung,
      );
      gruppe.rotation.set(0, Math.sin(Math.PI * flug) * 0.35 * (teil.phase > Math.PI ? 1 : -1), 0);

      teil.code.material.opacity = code;
      teil.code.visible = code > 0.003;

      const kantenDeckkraft = Math.min(1, draht * (1 - verschmolzen) + reiz * 0.8 * flug);
      teil.kanten.material.opacity = kantenDeckkraft;
      teil.kanten.visible = kantenDeckkraft > 0.003;

      const koerperDeckkraft = koerper * (1 - verschmolzen) * (modul.art === "seite" ? 0.96 : 0.9);
      teil.koerper.material.opacity = koerperDeckkraft;
      teil.koerper.material.depthWrite = koerperDeckkraft > 0.9;
      teil.koerper.material.emissiveIntensity = live * 0.16 + reiz * 0.35;
      teil.koerper.visible = koerperDeckkraft > 0.003;

      teil.flaeche.material.opacity = flaeche;
      teil.flaeche.material.color.setScalar(0.82 + live * 0.38);
      teil.flaeche.visible = flaeche > 0.003;
    }

    // Leiser Code weit hinten: steigt langsam auf
    for (const s of this.schwebend) {
      s.mesh.position.y += s.tempo * dt * beweg;
      if (s.mesh.position.y > 17) s.mesh.position.y = -17;
      s.mesh.material.opacity = s.grund * (1 - finale * 0.5);
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
      const welle = (((i / anzahlRahmen + zeit * 0.05 * beweg) % 1) + 1) % 1;
      linie.scale.setScalar(1.04 + welle * 0.85);
      linie.position.set(0, 0, -0.4 - welle * 3.5);
      linie.material.opacity = zeigen * Math.sin(Math.PI * welle) * 0.85;
      linie.visible = zeigen > 0.003;
    });
  }

  dispose() {
    for (const teil of this.teile) teil.flaeche.material.map?.dispose();
    for (const ding of this.aufraeumen) ding.dispose();
    this.aufraeumen = [];
  }
}
