/**
 * Der Partikel-Shader läuft auf der Grafikkarte, einmal pro Partikel und Frame.
 *
 * Vertex-Shader (Position und Grösse jedes Punkts):
 *   1. Form A und Form B berechnen und mischen (uMix kommt vom Scroll).
 *   2. Mitten im Übergang fliegen die Punkte kurz auseinander (Explosion).
 *   3. Drehen, skalieren und an die richtige Stelle im Layout schieben.
 *   4. Atmen, Beat-Puls, Intro-Einflug und Maus-Abstossung obendrauf.
 *
 * Fragment-Shader (Aussehen jedes Punkts): ein weicher, runder Leuchtpunkt.
 */

export const vertexShader = /* glsl */ `
uniform float uZeit;
uniform float uFormA;
uniform float uFormB;
uniform float uMix;
uniform vec3 uVersatz;
uniform float uSkala;
uniform float uDrehung;
uniform vec2 uMaus;
uniform float uMausKraft;
uniform float uPuls;
uniform float uIntro;
uniform float uGroesse;
uniform float uPixel;
uniform vec3 uTint;
uniform float uTintStaerke;
uniform float uAlpha;
uniform vec3 uFarbe0;
uniform vec3 uFarbe1;
uniform vec3 uFarbe2;
uniform vec3 uFarbe3;

attribute vec3 aName;
attribute vec3 aPortrait;
attribute vec3 aWelle;
attribute vec3 aAtom;
attribute vec3 aGalaxie;
attribute vec3 aAt;
attribute vec4 aZufall;

varying vec3 vFarbe;
varying float vAlpha;

vec3 kippeX(vec3 p, float w) {
  float c = cos(w);
  float s = sin(w);
  return vec3(p.x, p.y * c - p.z * s, p.y * s + p.z * c);
}

// Welle: Raster (u, v), die Höhe ist eine Summe aus Sinuswellen, die über die Zeit wandern
vec3 welle(vec3 w, float t) {
  float y = sin(w.x * 3.2 + t * 0.9) * 0.55
          + cos(w.y * 4.0 + t * 0.7) * 0.35
          + sin((w.x + w.y) * 6.0 + t * 1.4) * 0.12;
  return kippeX(vec3(w.x * 10.0, y, w.y * 3.5), 0.55);
}

// React-Atom: Punkte kreisen auf drei um je 60 Grad gedrehten Ellipsen, dazu ein Kern
vec3 atom(vec3 a, vec4 z, float t) {
  if (a.x > 2.5) {
    vec3 r = normalize(z.xyz - 0.5 + 0.0001);
    return r * sqrt(z.w) * 0.6;
  }
  float phi = a.y + t * 0.9;
  vec3 p = vec3(cos(phi) * 3.4, sin(phi) * 1.25, 0.0);
  p += vec3(0.0, a.z * 0.16, (z.y - 0.5) * 0.16);
  float w = a.x * 1.0471976;
  p = vec3(p.x * cos(w) - p.y * sin(w), p.x * sin(w) + p.y * cos(w), p.z);
  return kippeX(p, 0.35);
}

// Galaxie: innen dreht es schneller als aussen, so entstehen die Spiralarme
vec3 galaxie(vec3 g, float t) {
  float th = g.y + t * 0.35 / (0.35 + g.x * 0.3);
  return kippeX(vec3(cos(th) * g.x, g.z, sin(th) * g.x), 1.0);
}

vec3 form(float i, float t) {
  if (i < 0.5) return aName;
  if (i < 1.5) return aPortrait;
  if (i < 2.5) return welle(aWelle, t);
  if (i < 3.5) return atom(aAtom, aZufall, t);
  if (i < 4.5) return galaxie(aGalaxie, t);
  return aAt;
}

vec3 farbeNr(float i) {
  if (i < 0.5) return uFarbe0;
  if (i < 1.5) return uFarbe1;
  if (i < 2.5) return uFarbe2;
  return uFarbe3;
}

// Farbbänder: meist reine Palettenfarbe, nur kurze weiche Übergänge dazwischen
vec3 palette(float x) {
  x = fract(x) * 4.0;
  float i = floor(x);
  float f = smoothstep(0.6, 1.0, fract(x));
  return mix(farbeNr(i), farbeNr(mod(i + 1.0, 4.0)), f);
}

void main() {
  float t = uZeit;

  // 1. Mischen, pro Partikel leicht versetzt, damit nicht alle gleichzeitig losfliegen
  float m = clamp((uMix - aZufall.z * 0.35) / 0.65, 0.0, 1.0);
  m = m * m * (3.0 - 2.0 * m);
  vec3 p = mix(form(uFormA, t), form(uFormB, t), m);

  // Farbe hängt von der Position in der Form ab, so entstehen Farbbänder, die langsam wandern
  float farbWert = aZufall.x * 0.18 + p.x * 0.07 + p.y * 0.035 + t * 0.03;

  // 2. Explosion in der Mitte des Übergangs
  float explosion = sin(m * 3.14159);
  vec3 richtung = normalize(vec3(aZufall.x, aZufall.y, aZufall.w) - 0.5 + 0.0001);
  p += richtung * explosion * (0.4 + aZufall.w * 0.9);

  // 3. Drehen um die Y-Achse, skalieren, platzieren
  float c = cos(uDrehung);
  float s = sin(uDrehung);
  p = vec3(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);
  p = p * uSkala + uVersatz;

  // 4a. Atmen: jeder Punkt wackelt minimal
  p += 0.035 * vec3(
    sin(t * 1.3 + aZufall.x * 40.0),
    cos(t * 1.1 + aZufall.y * 40.0),
    sin(t * 0.9 + aZufall.z * 40.0)
  );

  // 4b. Beat-Puls: bei jeder Kick vom Zentrum der Form weg
  p += normalize(p - uVersatz + 0.0001) * uPuls * (0.15 + aZufall.y * 0.45) * uSkala;

  // 4c. Intro: Punkte fliegen von weit draussen ein
  float ii = clamp((uIntro - aZufall.w * 0.45) / 0.55, 0.0, 1.0);
  ii = 1.0 - pow(1.0 - ii, 3.0);
  p = mix(richtung * (12.0 + aZufall.x * 10.0), p, ii);

  // 4d. Maus stösst Punkte weg
  vec2 d = p.xy - uMaus;
  float kraft = (1.0 - smoothstep(0.0, 1.5, length(d))) * uMausKraft;
  p.xy += normalize(d + 0.0001) * kraft * 0.8;
  p.z += kraft * 0.8;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  // Punktgrösse in Pixeln: Weltgrösse mal Pixel pro Welteinheit, geteilt durch Entfernung
  float g = uGroesse * (0.5 + aZufall.y) * (1.0 + uPuls * 0.5) * mix(1.0, uSkala, 0.5);
  gl_PointSize = max(1.0, g * uPixel / -mv.z);

  vFarbe = mix(palette(farbWert), uTint, uTintStaerke * (0.45 + aZufall.z * 0.4));
  // Während des Übergangs kurz abdimmen, damit Text darüber lesbar bleibt
  vAlpha = uAlpha * (0.4 + aZufall.w * 0.45) * ii * (1.0 - 0.4 * explosion);
}
`;

export const fragmentShader = /* glsl */ `
varying vec3 vFarbe;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = 1.0 - smoothstep(0.1, 0.5, d);
  gl_FragColor = vec4(vFarbe, a * vAlpha);
}
`;
