// Math Hero 4: musik chiptune dan efek suara, disintesis langsung dengan Web Audio.
// Tidak memakai file audio dan tidak menambah dependensi. Modul ini sengaja mandiri
// (tidak memakai shared/js/audio.js) karena modul lama terikat ke global MH2 dan
// kunci penyimpanan Math Hero 2.
//
// Musik ditulis sebagai deret not per ketukan 1/8: 'C5', 'F#4', 'Bb3',
// '.' = diam, '-' = nada sebelumnya ditahan.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).audio = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  const KEY = 'mathHero4.audio';

  function storage() {
    try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
  }

  let ac = null, master = null, musicBus = null, sfxBus = null, noiseBuf = null;
  let prefs = { music: true, sfx: true };
  try {
    const raw = storage() && storage().getItem(KEY);
    if (raw) Object.assign(prefs, JSON.parse(raw));
  } catch (e) { /* simpanan rusak diabaikan */ }

  function ensure() {
    if (ac) return ac;
    const AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0.55;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.2;
    master.connect(comp); comp.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = prefs.music ? 0.5 : 0; musicBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = prefs.sfx ? 0.9 : 0; sfxBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ac;
  }

  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freq(note) {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(note);
    if (!m) return 0;
    const n = SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12;
    return 440 * Math.pow(2, (n - 69) / 12);
  }

  function tone(f, at, dur, type, vol, bus, slide) {
    if (!ac || !f) return;
    const o = ac.createOscillator(), gn = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, at);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, at + dur);
    gn.gain.setValueAtTime(0.0001, at);
    gn.gain.exponentialRampToValueAtTime(vol, at + 0.008);
    gn.gain.setValueAtTime(vol, at + dur * 0.6);
    gn.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(gn); gn.connect(bus);
    o.start(at); o.stop(at + dur + 0.02);
  }
  function noise(at, dur, vol, bus, hp) {
    if (!ac) return;
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp || 1000;
    const gn = ac.createGain();
    gn.gain.setValueAtTime(vol, at); gn.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(f); f.connect(gn); gn.connect(bus);
    s.start(at); s.stop(at + dur + 0.02);
  }

  // ---------- Lagu ----------
  const D8 = 'k . h . s . h . ';
  const MOTIF = 'C5 E5 G5 - E5 D5 C5';
  const TRACKS = {
    // Kampung: C mayor, 116 bpm, 16 birama (~33 detik), berulang mulus. Motif MOTIF (birama 1)
    // dimainkan ulang di birama 15; lagu lain bisa memakainya sebagai tanda pengenal.
    kampung: { bpm: 116, leadType: 'square', harmType: 'square',
      lead: 'C5 E5 G5 - E5 D5 C5 . A4 C5 E5 - D5 C5 A4 . A4 C5 F5 - E5 D5 C5 A4 B4 D5 G5 - F5 E5 D5 . C5 E5 G5 - C6 B5 G5 E5 A5 - E5 C5 D5 E5 C5 . F5 - A5 G5 F5 E5 D5 C5 D5 . G5 - F5 E5 D5 . F5 - A5 - C6 - A5 F5 G5 - B5 - D6 - B5 G5 E5 - G5 - B5 - G5 E5 A5 - C6 - B5 A5 G5 E5 A4 C5 F5 - E5 D5 C5 A4 B4 D5 G5 - F5 E5 D5 B4 C5 E5 G5 - E5 D5 C5 . E5 - D5 - G4 B4 D5 .',
      harm: 'E4 G4 C5 G4 E4 G4 C5 G4 E4 A4 C5 A4 E4 A4 C5 A4 F4 A4 C5 A4 F4 A4 C5 A4 D4 G4 B4 G4 D4 G4 B4 G4 E4 G4 C5 G4 E4 G4 C5 G4 E4 A4 C5 A4 E4 A4 C5 A4 F4 A4 C5 A4 F4 A4 C5 A4 D4 G4 B4 G4 D4 G4 B4 G4 F4 A4 C5 A4 F4 A4 C5 A4 D4 G4 B4 G4 D4 G4 B4 G4 E4 G4 B4 G4 E4 G4 B4 G4 E4 A4 C5 A4 E4 A4 C5 A4 F4 A4 C5 A4 F4 A4 C5 A4 D4 G4 B4 G4 D4 G4 B4 G4 E4 G4 C5 G4 E4 G4 C5 G4 E4 G4 C5 G4 E4 G4 C5 G4',
      bass: 'C3 . G3 . C3 . G3 . A2 . E3 . A2 . E3 . F2 . C3 . F2 . C3 . G2 . D3 . G2 . D3 . C3 . G3 . C3 . G3 . A2 . E3 . A2 . E3 . F2 . C3 . F2 . C3 . G2 . D3 . G2 . D3 . F2 . C3 . F2 . C3 . G2 . D3 . G2 . D3 . E2 . B2 . E2 . B2 . A2 . E3 . A2 . E3 . F2 . C3 . F2 . C3 . G2 . D3 . G2 . D3 . C3 . G3 . C3 . G3 . C3 . G3 . C3 . G3 .',
      drums: 'k . h . s . h . k . h . s . h . k . h . s . h . k . h . s . h h k . h . s . h . k . h . s . h . k . h . s . h . k . h . s . h h k . h . s . h . k . h . s . h . k . h . s . h . k . h . s . h h k . h . s . h . k . h . s . h . k . h . s . h . k . s . k s k s' },
    padang: { bpm: 120, lead: 'F5 . A5 C6 A5 . G5 F5 G5 . A5 . F5 . . . F5 . A5 C6 D6 . C6 A5 G5 . E5 . F5 . . .',
      bass: 'F3 . C3 . F3 . C3 . C3 . G3 . F3 . C3 . F3 . C3 . Bb2 . F3 . C3 . G3 . F3 . . .', drums: D8.repeat(4), leadType: 'square' },
    kota: { bpm: 128, lead: 'D5 F#5 A5 . F#5 . D5 E5 . G5 . E5 C#5 . D5 . B4 D5 F#5 . A5 . G5 F#5 E5 . C#5 . D5 . . .',
      bass: 'D3 . D3 A2 D3 . F#3 . G2 . G2 D3 G2 . A2 . B2 . B2 F#3 B2 . G2 . A2 . A2 E3 D3 . . .', drums: 'k . h k s . h . '.repeat(4), leadType: 'square' },
    kebun: { bpm: 116, lead: 'E5 . D5 C5 D5 . E5 . G5 . E5 . D5 . . . E5 . D5 C5 D5 . E5 . C5 . D5 . C5 . . .',
      bass: 'C3 . G3 . C3 . G3 . F3 . C4 . G3 . D3 . C3 . G3 . A2 . E3 . F3 . G3 . C3 . . .', drums: D8.repeat(4), leadType: 'square' },
    gua: { bpm: 100, lead: 'A4 . C5 . E5 . D5 . C5 . B4 . A4 . . . F4 . A4 . C5 . B4 . G4 . B4 . E5 . . .',
      bass: 'A2 . . . E3 . . . A2 . . . E3 . . . F2 . . . C3 . . . E2 . . . B2 . . .', drums: 'k . . h . . s . '.repeat(4), leadType: 'sine' },
    pantai: { bpm: 126, lead: 'G5 . B5 . D6 B5 . G5 A5 . C6 . B5 A5 G5 . E5 . G5 . B5 A5 . G5 F#5 . A5 . G5 . . .',
      bass: 'G2 . D3 G3 . D3 G2 . D3 . A3 D3 . F#3 G3 . C3 . G3 C3 . E3 G3 . D3 . A2 D3 G2 . . .', drums: 'k . h s . h k . '.repeat(4), leadType: 'triangle' },
    benteng: { bpm: 112, lead: 'D5 . F5 . A5 . G5 F5 E5 . G5 . F5 E5 D5 . Bb4 . D5 . F5 . E5 D5 C#5 . E5 . D5 . . .',
      bass: 'D3 . A2 . D3 . A2 . A2 . E3 . A2 . E3 . Bb2 . F3 . Bb2 . F3 . A2 . E3 . D3 . . .', drums: D8.repeat(4), leadType: 'square' },
    bos: { bpm: 150, lead: 'E5 E5 G5 E5 A5 G5 F#5 D5 E5 E5 G5 E5 B5 A5 G5 F#5 C5 C5 E5 C5 G5 F#5 E5 D5 B4 D#5 F#5 A5 B5 . . .',
      bass: 'E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 E2 E3 C2 C3 C2 C3 C2 C3 C2 C3 B1 B2 B1 B2 B1 B2 B1 B2', drums: 'k h s h k k s h '.repeat(4), leadType: 'sawtooth' },
    final: { bpm: 156, lead: 'C5 Eb5 G5 C6 Bb5 G5 Ab5 G5 F5 Ab5 C6 F6 Eb6 C6 D6 B5 C5 Eb5 G5 C6 Bb5 G5 Ab5 Bb5 B5 D6 F6 G6 F6 D6 B5 G5',
      bass: 'C2 C3 C2 C3 C2 C3 C2 C3 F2 F3 F2 F3 F2 F3 G2 G3 C2 C3 C2 C3 Ab2 Ab3 Ab2 Ab3 G2 G3 G2 G3 G2 G3 G2 G3', drums: 'k h s h k k s s '.repeat(4), leadType: 'sawtooth' },
  };
  const JINGLES = {
    menang: { bpm: 220, lead: 'C5 E5 G5 C6 . G5 C6 - - .', bass: 'C3 . . . . G2 C3 - - .' },
    kalah: { bpm: 140, lead: 'G4 F4 E4 D4 C4 - - .', bass: 'C3 B2 Bb2 A2 Ab2 - - .' },
    mulai: { bpm: 240, lead: 'G4 C5 E5 G5 C6 - .', bass: 'C3 . G3 . C3 - .' },
  };
  const parse = (s) => s.trim().split(/\s+/);
  for (const t of Object.values(TRACKS)) { t.L = parse(t.lead); t.B = parse(t.bass); t.D = parse(t.drums || ''); t.H = t.harm ? parse(t.harm) : []; }
  for (const t of Object.values(JINGLES)) { t.L = parse(t.lead); t.B = parse(t.bass); }

  // Tema level -> lagu. Tema tak dikenal memakai 'padang'.
  const THEME_TRACK = {
    green: 'padang', industrial: 'kota', simple: 'kebun', night: 'kota',
    crystal: 'gua', hive: 'gua', day: 'pantai', castle: 'benteng',
  };
  function trackForTheme(tema) { return THEME_TRACK[tema] || 'padang'; }

  let cur = null, curName = null, step = 0, nextAt = 0, timer = null, paused = false;
  function len(arr, i) { let n = 1; while (arr[i + n] === '-') n++; return n; }
  function schedule() {
    if (!ac || !cur || paused) return;
    const stepDur = 60 / cur.bpm / 2;
    while (nextAt < ac.currentTime + 0.12) {
      const i = step % cur.L.length;
      const ln = cur.L[i], bn = cur.B[i % cur.B.length], dn = cur.D.length ? cur.D[i % cur.D.length] : '.';
      if (ln !== '.' && ln !== '-') tone(freq(ln), nextAt, stepDur * len(cur.L, i) * 0.92, cur.leadType || 'square', cur.leadType === 'sawtooth' ? 0.05 : cur.leadType === 'sine' ? 0.13 : 0.075, musicBus);
      const hn = cur.H.length ? cur.H[i % cur.H.length] : '.';
      if (hn !== '.' && hn !== '-') tone(freq(hn), nextAt, stepDur * 0.8, cur.harmType || 'square', 0.04, musicBus);
      if (bn && bn !== '.' && bn !== '-') tone(freq(bn), nextAt, stepDur * len(cur.B, i % cur.B.length) * 0.9, 'triangle', 0.16, musicBus);
      if (dn === 'k') tone(150, nextAt, 0.12, 'sine', 0.35, musicBus, 45);
      else if (dn === 's') noise(nextAt, 0.1, 0.18, musicBus, 1800);
      else if (dn === 'h') noise(nextAt, 0.03, 0.08, musicBus, 7000);
      nextAt += stepDur; step++;
    }
  }
  // Lagu yang diminta sebelum sentuhan pertama disimpan, lalu mulai saat unlock().
  function music(name) {
    if (name === curName) return;
    curName = name; cur = TRACKS[name] || null; step = 0;
    if (!ac || !cur) return;
    nextAt = ac.currentTime + 0.06;
    if (!timer) timer = setInterval(schedule, 25);
  }
  function jingle(name) {
    const j = JINGLES[name];
    if (!ac || !j) return;
    music(null);
    const sd = 60 / j.bpm / 2;
    let at = ac.currentTime + 0.05;
    j.L.forEach((n, i) => {
      if (n !== '.' && n !== '-') tone(freq(n), at + i * sd, sd * len(j.L, i), 'square', 0.09, musicBus);
      const b = j.B[i];
      if (b && b !== '.' && b !== '-') tone(freq(b), at + i * sd, sd * len(j.B, i), 'triangle', 0.16, musicBus);
    });
  }

  // ---------- Efek suara ----------
  const SFX = {
    klik: (t) => tone(880, t, 0.05, 'square', 0.08, sfxBus),
    lompat: (t) => tone(300, t, 0.16, 'square', 0.1, sfxBus, 620),
    hop: (t) => tone(500, t, 0.09, 'triangle', 0.16, sfxBus, 900),
    ambil: (t) => { tone(988, t, 0.06, 'square', 0.09, sfxBus); tone(1319, t + 0.06, 0.12, 'square', 0.09, sfxBus); },
    koin: (t) => { tone(1568, t, 0.05, 'square', 0.07, sfxBus); tone(2093, t + 0.05, 0.1, 'square', 0.07, sfxBus); },
    benar: (t) => { [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.07, 0.14, 'square', 0.09, sfxBus)); },
    salah: (t) => { tone(330, t, 0.14, 'triangle', 0.2, sfxBus, 280); tone(262, t + 0.14, 0.22, 'triangle', 0.2, sfxBus, 220); },
    hit: (t) => { tone(200, t, 0.25, 'sawtooth', 0.12, sfxBus, 60); noise(t, 0.12, 0.15, sfxBus, 600); },
    tembak: (t) => tone(1200, t, 0.08, 'square', 0.05, sfxBus, 500),
    ledak: (t) => { noise(t, 0.35, 0.3, sfxBus, 200); tone(120, t, 0.3, 'sine', 0.3, sfxBus, 40); },
    potong: (t) => noise(t, 0.08, 0.2, sfxBus, 4000),
    pop: (t) => tone(700, t, 0.07, 'sine', 0.25, sfxBus, 1400),
    bintang: (t) => { tone(1047, t, 0.1, 'square', 0.08, sfxBus); tone(1568, t + 0.08, 0.2, 'triangle', 0.15, sfxBus); },
    naik: (t) => { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.06, 0.1, 'square', 0.08, sfxBus)); },
    bos: (t) => { tone(110, t, 0.5, 'sawtooth', 0.1, sfxBus, 70); tone(116, t, 0.5, 'sawtooth', 0.1, sfxBus, 72); },
    awas: (t) => { tone(880, t, 0.08, 'square', 0.08, sfxBus); tone(880, t + 0.14, 0.08, 'square', 0.08, sfxBus); },
  };
  const SFX_NAMES = Object.keys(SFX);
  function sfx(name) {
    if (!prefs.sfx || !ac) return;
    const f = SFX[name];
    if (f) f(ac.currentTime + 0.005);
  }

  function unlock() {
    const fresh = !ac;
    if (!ensure()) return;
    if (ac.state === 'suspended') ac.resume();
    if (fresh && cur) { nextAt = ac.currentTime + 0.06; if (!timer) timer = setInterval(schedule, 25); }
  }
  function setPaused(p) {
    paused = p;
    if (!p && ac && cur) { nextAt = ac.currentTime + 0.06; }
  }
  function save() {
    const s = storage();
    if (!s) return;
    try { s.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* abaikan */ }
  }
  function setMusicOn(on) { prefs.music = on; save(); if (musicBus) musicBus.gain.value = on ? 0.5 : 0; }
  function setSfxOn(on) { prefs.sfx = on; save(); if (sfxBus) sfxBus.gain.value = on ? 0.9 : 0; }

  return {
    unlock, music, jingle, sfx, setPaused, setMusicOn, setSfxOn, trackForTheme,
    TRACKS, JINGLES, SFX_NAMES, THEME_TRACK, MOTIF,
    get prefs() { return prefs; },
    get track() { return curName; },
  };
});
