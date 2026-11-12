import { profil } from "@/data/profil";

/**
 * Beat-Maschine mit der Web Audio API. Kein MP3: jeder Ton wird live im Browser erzeugt.
 *
 * - Oszillatoren erzeugen Töne (Kick, Bass, Arpeggio, Fläche), weisses Rauschen erzeugt Clap und Hi-Hat.
 * - Ein «Scheduler» plant alle 25 ms die Töne der nächsten 120 ms voraus. So bleibt der Takt exakt,
 *   auch wenn JavaScript kurz beschäftigt ist.
 * - Jede Kick merkt sich ihre Startzeit. Daraus rechnet puls() einen Wert von 0 bis 1 für die Partikel.
 * - Ist in data/profil.ts ein eigener Track eingetragen, wird stattdessen dieser abgespielt
 *   und die Bass-Energie per Frequenzanalyse gemessen.
 */

const BPM = 112;
const SCHRITT = 60 / BPM / 4; // Dauer einer Sechzehntelnote in Sekunden
const VORLAUF = 0.12;

// A-Moll-Kadenz: Am – F – C – G (MIDI-Notennummern)
const BASS = [33, 29, 36, 31];
const AKKORDE = [
  [69, 72, 76, 81],
  [65, 69, 72, 77],
  [64, 67, 72, 76],
  [67, 71, 74, 79],
];
const ARP_MUSTER = [0, 1, 2, 3, 2, 1, 0, 2, 0, 1, 2, 3, 1, 2, 3, 2];
const BASS_SCHRITTE = new Set([2, 3, 6, 10, 11, 14]);

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

class BeatMaschine {
  an = false;

  private ctx: AudioContext | null = null;
  private eingang!: DynamicsCompressorNode;
  private master!: GainNode;
  private musik!: GainNode;
  private echo!: DelayNode;
  private analyse!: AnalyserNode;
  private rauschen!: AudioBuffer;
  private timer: ReturnType<typeof setInterval> | null = null;
  private naechste = 0;
  private schritt = 0;
  private kicks: number[] = [];
  private track: HTMLAudioElement | null = null;
  private frequenzen: Uint8Array<ArrayBuffer> | null = null;
  private bassSchnitt = 0;
  private trackPuls = 0;
  private hoerer = new Set<() => void>();

  subscribe = (h: () => void) => {
    this.hoerer.add(h);
    return () => {
      this.hoerer.delete(h);
    };
  };

  istAn = () => this.an;

  private melden() {
    this.hoerer.forEach((h) => h());
  }

  private aufbauen() {
    const ctx = new AudioContext();

    this.eingang = ctx.createDynamicsCompressor();
    this.eingang.threshold.value = -16;
    this.eingang.ratio.value = 4;

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.analyse = ctx.createAnalyser();
    this.analyse.fftSize = 256;
    this.eingang.connect(this.master).connect(this.analyse).connect(ctx.destination);

    // Alles ausser den Drums läuft über «musik», damit es bei jeder Kick kurz leiser wird (Sidechain-Pumpen)
    this.musik = ctx.createGain();
    this.musik.connect(this.eingang);

    // Echo für das Arpeggio
    this.echo = ctx.createDelay(1);
    this.echo.delayTime.value = SCHRITT * 3;
    const rueckkopplung = ctx.createGain();
    rueckkopplung.gain.value = 0.35;
    const echoFilter = ctx.createBiquadFilter();
    echoFilter.type = "lowpass";
    echoFilter.frequency.value = 2400;
    this.echo.connect(echoFilter).connect(rueckkopplung).connect(this.echo);
    echoFilter.connect(this.musik);

    // Eine Sekunde weisses Rauschen, wiederverwendet für Clap und Hi-Hat
    this.rauschen = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const daten = this.rauschen.getChannelData(0);
    for (let i = 0; i < daten.length; i++) daten[i] = Math.random() * 2 - 1;

    if (profil.track) {
      this.track = new Audio(profil.track);
      this.track.loop = true;
      ctx.createMediaElementSource(this.track).connect(this.master);
      this.frequenzen = new Uint8Array(this.analyse.frequencyBinCount);
    }

    this.ctx = ctx;
  }

  async start() {
    if (!this.ctx) this.aufbauen();
    const ctx = this.ctx!;
    await ctx.resume();

    if (this.track) {
      await this.track.play().catch(() => undefined);
    } else if (!this.timer) {
      this.naechste = ctx.currentTime + 0.06;
      this.schritt = 0;
      this.kicks = [];
      this.timer = setInterval(() => this.planen(), 25);
    }

    const jetzt = ctx.currentTime;
    this.master.gain.cancelScheduledValues(jetzt);
    this.master.gain.setValueAtTime(this.master.gain.value, jetzt);
    this.master.gain.linearRampToValueAtTime(0.8, jetzt + 0.8);

    this.an = true;
    this.melden();
  }

  stop() {
    const ctx = this.ctx;
    if (!ctx) return;
    const jetzt = ctx.currentTime;
    this.master.gain.cancelScheduledValues(jetzt);
    this.master.gain.setValueAtTime(this.master.gain.value, jetzt);
    this.master.gain.linearRampToValueAtTime(0, jetzt + 0.35);

    this.an = false;
    this.melden();

    setTimeout(() => {
      if (this.an) return;
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      this.track?.pause();
      ctx.suspend();
    }, 450);
  }

  umschalten() {
    if (this.an) this.stop();
    else this.start();
  }

  /** 0 bis 1: wie stark die Partikel gerade nach aussen gedrückt werden */
  puls(): number {
    const ctx = this.ctx;
    if (!ctx || !this.an) return 0;

    if (this.track && this.frequenzen) {
      this.analyse.getByteFrequencyData(this.frequenzen);
      let bass = 0;
      for (let i = 0; i < 5; i++) bass += this.frequenzen[i];
      bass /= 5 * 255;
      this.bassSchnitt += (bass - this.bassSchnitt) * 0.05;
      const schlag = Math.max(0, bass - this.bassSchnitt * 1.1) * 4;
      this.trackPuls = Math.max(schlag, this.trackPuls * 0.9);
      return Math.min(1, this.trackPuls);
    }

    const jetzt = ctx.currentTime;
    while (this.kicks.length > 1 && this.kicks[1] <= jetzt) this.kicks.shift();
    if (!this.kicks.length || this.kicks[0] > jetzt) return 0;
    return Math.exp(-(jetzt - this.kicks[0]) * 9);
  }

  private planen() {
    const ctx = this.ctx!;
    while (this.naechste < ctx.currentTime + VORLAUF) {
      this.spiele(this.schritt, this.naechste);
      this.naechste += SCHRITT;
      this.schritt++;
    }
  }

  private spiele(schritt: number, t: number) {
    const s = schritt % 16;
    const takt = Math.floor(schritt / 16);
    const akkord = takt % 4;

    if (s % 4 === 0) this.kick(t);
    if (s === 4 || s === 12) this.clap(t);
    if (s % 4 === 2) this.hihat(t, 0.2);
    else if (s % 2 === 1) this.hihat(t, 0.06);
    if (BASS_SCHRITTE.has(s)) this.bass(hz(BASS[akkord] + (s === 3 || s === 11 ? 12 : 0)), t);
    if (s === 0) this.flaeche(akkord, t);
    // Das Arpeggio setzt erst ab dem dritten Takt ein: kleiner Spannungsaufbau
    if (takt >= 2) this.arpeggio(hz(AKKORDE[akkord][ARP_MUSTER[s]]), t, s % 4 === 0 ? 1 : 0.6);
  }

  private kick(t: number) {
    const ctx = this.ctx!;
    const osz = ctx.createOscillator();
    const lautst = ctx.createGain();
    osz.frequency.setValueAtTime(150, t);
    osz.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    lautst.gain.setValueAtTime(1, t);
    lautst.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osz.connect(lautst).connect(this.eingang);
    osz.start(t);
    osz.stop(t + 0.5);

    // Sidechain: Musik kurz wegdrücken
    this.musik.gain.setValueAtTime(0.3, t);
    this.musik.gain.linearRampToValueAtTime(1, t + 0.2);
    this.kicks.push(t);
  }

  private rauschQuelle(t: number, dauer: number) {
    const quelle = this.ctx!.createBufferSource();
    quelle.buffer = this.rauschen;
    quelle.start(t, Math.random() * 0.5, dauer);
    return quelle;
  }

  private clap(t: number) {
    const ctx = this.ctx!;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1500;
    filter.Q.value = 0.8;
    const lautst = ctx.createGain();
    lautst.gain.setValueAtTime(0, t);
    // drei schnelle Schläge hintereinander klingen wie Händeklatschen
    for (let k = 0; k < 3; k++) {
      lautst.gain.setValueAtTime(0.5, t + k * 0.012);
      lautst.gain.exponentialRampToValueAtTime(0.05, t + k * 0.012 + 0.01);
    }
    lautst.gain.setValueAtTime(0.45, t + 0.036);
    lautst.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    this.rauschQuelle(t, 0.3).connect(filter).connect(lautst).connect(this.eingang);
  }

  private hihat(t: number, staerke: number) {
    const ctx = this.ctx!;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 7500;
    const lautst = ctx.createGain();
    lautst.gain.setValueAtTime(staerke, t);
    lautst.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    this.rauschQuelle(t, 0.06).connect(filter).connect(lautst).connect(this.eingang);
  }

  private bass(frequenz: number, t: number) {
    const ctx = this.ctx!;
    const osz = ctx.createOscillator();
    osz.type = "sawtooth";
    osz.frequency.value = frequenz;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 8;
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.exponentialRampToValueAtTime(180, t + 0.18);
    const lautst = ctx.createGain();
    lautst.gain.setValueAtTime(0.3, t);
    lautst.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    osz.connect(filter).connect(lautst).connect(this.musik);
    osz.start(t);
    osz.stop(t + 0.26);
  }

  private arpeggio(frequenz: number, t: number, staerke: number) {
    const ctx = this.ctx!;
    const osz = ctx.createOscillator();
    osz.type = "square";
    osz.frequency.value = frequenz;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2600;
    const lautst = ctx.createGain();
    lautst.gain.setValueAtTime(0.045 * staerke, t);
    lautst.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osz.connect(filter).connect(lautst);
    lautst.connect(this.musik);
    lautst.connect(this.echo);
    osz.start(t);
    osz.stop(t + 0.18);
  }

  /** Weiche Akkordfläche über einen ganzen Takt */
  private flaeche(akkord: number, t: number) {
    const ctx = this.ctx!;
    const dauer = SCHRITT * 16;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    const lautst = ctx.createGain();
    lautst.gain.setValueAtTime(0, t);
    lautst.gain.linearRampToValueAtTime(0.035, t + 0.6);
    lautst.gain.setValueAtTime(0.035, t + dauer - 0.3);
    lautst.gain.linearRampToValueAtTime(0, t + dauer);
    filter.connect(lautst).connect(this.musik);
    for (const note of AKKORDE[akkord].slice(0, 3)) {
      for (const verstimmung of [-6, 6]) {
        const osz = ctx.createOscillator();
        osz.type = "sawtooth";
        osz.frequency.value = hz(note - 12);
        osz.detune.value = verstimmung;
        osz.connect(filter);
        osz.start(t);
        osz.stop(t + dauer);
      }
    }
  }
}

export const beat = new BeatMaschine();
