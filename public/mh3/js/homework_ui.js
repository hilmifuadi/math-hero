// Math Hero 3: kartu PR bersama (dipakai Bertahan dan Kejar). Membekukan game, tanpa timer.
//   MH3.homework.open(opts, onDone)
//   opts: {problem} atau {id, seed, tier} atau {grade, tier, seed, recent}; opts.title (judul kartu, opsional)
//   onDone({status:'done'|'later', stars, hints, wrong, id, seed, tier, grade, steps})
// PR yang terbuka disimpan di localStorage dan bisa dilanjutkan lewat MH3.homework.resume(onDone).
(function () {
  const M = window.MH2;
  const H = window.MH3Homework;
  const MH3 = window.MH3 = window.MH3 || {};
  const KEY = 'mathHero3.homework.open.v1';
  const DEFAULT_WRONG = 'Belum tepat. Cek lagi langkahmu.';

  function store(v) { try { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY); } catch (e) { /* tetap jalan */ } }
  function stored() { try { const v = JSON.parse(localStorage.getItem(KEY)); return v && v.id ? v : null; } catch (e) { return null; } }

  // Kolom jawaban menurut bentuk soal.
  const FIELDS = {
    int: [{ key: 'v', label: 'Jawaban', max: 8 }],
    rem: [{ key: 'q', label: 'Hasil', max: 6 }, { key: 'r', label: 'Sisa', max: 4 }],
    frac: [{ key: 'n', label: 'Atas', max: 4 }, { key: 'd', label: 'Bawah', max: 4 }],
    time: [{ key: 'h', label: 'Jam', max: 2 }, { key: 'm', label: 'Menit', max: 2 }],
  };
  const SEP = { rem: 'sisa', frac: '/', time: '.' };

  const S = {
    active: false, mode: 'solve', // solve | hint | result
    p: null, opts: null, onDone: null,
    vals: {}, field: 0, wrong: 0, hints: 0, msg: '', msgT: 0, shake: 0, t: 0,
    result: null, count: 0,
  };

  function build(opts) {
    if (opts.problem) return opts.problem;
    if (opts.id) return H.generate(opts.id, opts.seed || 1, opts.tier || 0);
    return H.pick(opts.grade || 2, opts.tier || 0, opts.seed == null ? (Math.random() * 1e9) >>> 0 : opts.seed, opts.recent);
  }
  function open(opts, onDone, resumeState) {
    opts = opts || {};
    const p = build(opts);
    Object.assign(S, { active: true, mode: 'solve', p, opts: { id: p.id, seed: p.seed, tier: p.tier, title: opts.title }, onDone, vals: {}, field: 0,
      wrong: 0, hints: 0, msg: '', msgT: 0, shake: 0, t: 0, result: null, count: 0 });
    if (!resumeState) window.Scratchpad.clear(); // soal baru, kertas bersih
    if (resumeState) { S.wrong = resumeState.wrong | 0; S.hints = resumeState.hints | 0; if (S.hints) S.mode = 'solve'; }
    save();
    M.overlay = overlay;
    M.setControls(null);
    M.audio.setPaused(true);
    keyOn(true);
  }
  function save() { if (S.active && S.mode !== 'result') store(Object.assign({ wrong: S.wrong, hints: S.hints }, S.opts)); }
  function finish(status) {
    const r = S.result || { stars: 0 };
    const out = { status, stars: status === 'later' ? 0 : r.stars, hints: S.hints, wrong: S.wrong, id: S.p.id, seed: S.p.seed, tier: S.p.tier, grade: S.p.grade, steps: S.p.steps };
    const cb = S.onDone;
    S.active = false; M.overlay = null; store(null); keyOn(false);
    window.Scratchpad.setAvailable(false);
    M.audio.setPaused(false);
    if (cb) cb(out);
  }

  const form = () => S.p.form;
  const fields = () => FIELDS[form()];
  function curKey() { return fields()[S.field].key; }
  function press(d) {
    const f = fields()[S.field];
    const s = S.vals[f.key] || '';
    if (s.length < f.max) S.vals[f.key] = (s === '0' ? '' : s) + d;
  }
  function erase() {
    const f = fields()[S.field];
    const s = S.vals[f.key] || '';
    if (s) S.vals[f.key] = s.slice(0, -1);
    else if (S.field > 0) S.field--;
  }
  function say(text) { S.msg = text; S.msgT = S.t; }
  function submit() {
    const fs = fields();
    const cur = fs[S.field];
    if (!S.vals[cur.key]) { say('Isi dulu jawabannya, ya.'); return; }
    if (S.field < fs.length - 1) { S.field++; return; }
    if (fs.some((f) => !S.vals[f.key])) { say('Isi semua kotaknya, ya.'); return; }
    const n = (k) => Number(S.vals[k]);
    const f = form();
    const input = f === 'int' ? n('v') : f === 'rem' ? { q: n('q'), r: n('r') } : f === 'frac' ? { n: n('n'), d: n('d') } : { h: n('h'), m: n('m') };
    if (S.p.check(input)) {
      const stars = Math.max(1, 3 - Math.max(S.hints, Math.min(S.wrong, 2)));
      S.result = { stars };
      S.mode = 'result'; S.t = 0; S.count = 0;
      store(null);
      M.sfx('benar'); M.audio.setPaused(false);
      return;
    }
    S.wrong++;
    S.shake = 0.5;
    say(S.p.wrongMessage(input) || DEFAULT_WRONG);
    M.sfx('salah');
    save();
  }
  function useHint() {
    if (S.hints >= 3) { S.mode = 'hint'; return; }
    S.hints++; S.mode = 'hint'; save();
  }
  function hintLines() {
    const out = [];
    const p = S.p;
    if (S.hints >= 1) out.push(['Strategi', p.hints[0]]);
    if (S.hints >= 2) out.push(['Kerangka', p.hints[1]]);
    if (S.hints >= 3) { const s = p.similar(); out.push(['Contoh mirip', s.question + '\n' + s.steps.join('\n')]); }
    return out;
  }

  // ----- Gambar -----
  function dim(g) { g.fillStyle = 'rgba(13,9,32,0.97)'; g.fillRect(0, 0, M.VW, M.VH); }
  function drawFields(g, y) {
    const fs = fields(), VW = M.VW, f = form();
    const w = fs.length === 1 ? 200 : 110, gap = fs.length === 1 ? 0 : 44;
    const total = fs.length * w + (fs.length - 1) * gap;
    let x = (VW - total) / 2;
    fs.forEach((fl, i) => {
      const on = i === S.field;
      M.box(g, x, y, w, 50, '#ffffff', { line: on ? '#ff8fab' : '#2b1d52', border: on ? 4 : 3, shade: false });
      const v = S.vals[fl.key] || '';
      const pre = f === 'int' && S.p.unit === 'Rp' ? 'Rp' : '';
      if (v || pre) M.text(g, pre + (f === 'int' ? H.fmt(v || 0).replace(/^0$/, v ? '0' : '') : v), x + w / 2, y + 26, { size: 28, align: 'center', color: '#2b1d52', outline: false });
      else M.text(g, fl.label, x + w / 2, y + 26, { size: 15, align: 'center', color: '#b9a8d8', outline: false });
      if (on && Math.floor(S.t * 2) % 2 === 0) { const tw = v ? M.measure(g, pre + (f === 'int' ? H.fmt(v) : v), 28) : 0; g.fillStyle = '#ff5d73'; g.fillRect(x + w / 2 + tw / 2 + 3, y + 10, 3, 30); }
      M.hit('kolom' + i, x, y, w, 50, () => { S.field = i; });
      if (i < fs.length - 1) M.text(g, SEP[f], x + w + gap / 2, y + 26, { size: 18, align: 'center', color: '#2b1d52', outline: false });
      x += w + gap;
    });
  }
  // Layar pendek (laptop): tombol angka dipendekkan supaya kotak soal tetap lega.
  const keyH = () => (M.VH < 640 ? 40 : 50);
  const keysBlock = () => 4 * (keyH() + (M.VH < 640 ? 6 : 7));
  function drawKeypad(g, y) {
    const VW = M.VW, kw = 92, kh = keyH(), gx = 8, gy = M.VH < 640 ? 6 : 7;
    const x0 = (VW - (3 * kw + 2 * gx)) / 2;
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'hapus', '0', 'OK'];
    keys.forEach((k, i) => {
      const x = x0 + (i % 3) * (kw + gx), yy = y + Math.floor(i / 3) * (kh + gy);
      if (k === 'hapus') M.button(g, { id: 'k' + k, x, y: yy, w: kw, h: kh, color: 'orange', icon: 'left', onTap: erase });
      else if (k === 'OK') M.button(g, { id: 'k' + k, x, y: yy, w: kw, h: kh, color: 'green', label: 'OK', size: 26, onTap: submit });
      else M.button(g, { id: 'k' + k, x, y: yy, w: kw, h: kh, color: 'blue', label: k, size: 28, onTap: () => press(k) });
    });
    return y + 4 * (kh + gy);
  }
  function drawSolve(g) {
    const VW = M.VW, VH = M.VH;
    dim(g);
    const sh = S.shake > 0 ? M.motion(Math.sin(S.t * 60) * 6 * (S.shake / 0.5)) : 0;
    const px = 10 + sh, pw = VW - 20;
    // Banner jeda kertas.
    M.text(g, 'Ambil kertas dan pensil.\nTidak ada waktu, santai saja.', VW / 2, 36, { size: 18, align: 'center', color: '#ffd54a', lh: 24 });
    // Soal.
    const qh = Math.max(110, Math.min(230, VH - 246 - keysBlock()));
    M.panel(g, px, 84, pw, qh, { title: S.opts.title || 'PR', titleFill: '#7b4bd6' });
    // Ukuran huruf mengecil sampai teks muat di kotak, supaya soal panjang tidak menimpa judul atau keluar kotak.
    let qsize = 22, lines;
    for (; qsize > 12; qsize--) {
      g.font = `${qsize}px ${M.FONT}`;
      lines = String(S.p.question).split('\n').reduce((n, l) => n + M.wrap(g, l, pw - 28).length, 0);
      if (lines * (qsize + 5) <= qh - 36) break;
    }
    M.text(g, S.p.question, px + pw / 2, 84 + qh / 2 + 8, { size: qsize, align: 'center', color: '#2b1d52', outline: false, maxW: pw - 28, lh: qsize + 5 });
    // Kolom jawaban.
    const ay = 84 + qh + 14;
    drawFields(g, ay + sh * 0);
    // Pesan.
    const msgY = ay + 62;
    if (S.msg) {
      const col = S.msg === DEFAULT_WRONG || /^(Coba|Sisa|Hasil|Penyebut)/.test(S.msg) ? '#ffb3bd' : '#ffe9a8';
      M.text(g, S.msg, VW / 2, msgY + 10, { size: 16, align: 'center', color: col, maxW: VW - 24, lh: 20 });
    }
    // Papan angka.
    const ky = msgY + 36;
    const kb = drawKeypad(g, ky);
    // Tombol bawah: Petunjuk, Nanti. Kertas coret ada di pulau melayang (shared/js/scratchpad.js).
    const by = kb + 4, bw = 140, bh = 44, bx = (VW - (2 * bw + 8)) / 2;
    const pulse = S.wrong >= 2 && S.hints === 0 && Math.floor(S.t * 3) % 2 === 0;
    M.button(g, { id: 'petunjuk', x: bx, y: by, w: bw, h: bh, color: 'yellow', label: `Petunjuk ${S.hints}/3`, size: 15, selected: pulse, onTap: useHint });
    M.button(g, { id: 'nanti', x: bx + bw + 8, y: by, w: bw, h: bh, color: 'gray', label: 'Nanti', size: 17, onTap: () => finish('later') });
  }
  function drawHint(g) {
    const VW = M.VW, VH = M.VH;
    dim(g);
    const lines = hintLines();
    const h = VH - 190;
    M.panel(g, 12, 70, VW - 24, h, { title: `Petunjuk ${S.hints}/3`, titleFill: '#e0a21b' });
    let y = 98;
    for (const [head, body] of lines) {
      M.text(g, head, 28, y, { size: 16, color: '#b9531f', outline: false }); y += 20;
      y += M.text(g, body, 28, y, { size: 17, color: '#2b1d52', outline: false, maxW: VW - 64, lh: 22, base: 'top' }) + 10;
    }
    if (S.hints < 3) M.text(g, 'Petunjuk berikutnya menurunkan hadiah.', VW / 2, 70 + h - 14, { size: 13, align: 'center', color: '#8a7aa8', outline: false });
    M.button(g, { id: 'tutuphint', x: VW / 2 - 90, y: VH - 84, w: 180, h: 52, color: 'green', label: 'Mengerti', size: 22, onTap: () => { S.mode = 'solve'; } });
  }
  function drawResult(g) {
    const VW = M.VW, VH = M.VH;
    dim(g);
    const st = S.result.stars;
    const lines = S.p.steps.slice(-4);
    const h = Math.min(VH - 190, 120 + lines.length * 56);
    M.panel(g, 12, 60, VW - 24, h, { title: 'Benar!', titleFill: '#5fd068' });
    for (let i = 0; i < 3; i++) {
      const pop = M.ease((S.t - i * 0.25) / 0.3);
      M.drawStar(g, VW / 2 + (i - 1) * 56, 106, (i < st ? 22 : 16) * pop, i < st ? '#ffd54a' : '#cbbcff', true);
    }
    let y = 146;
    for (const l of lines) y += M.text(g, l, 28, y, { size: 16, color: '#2b1d52', outline: false, maxW: VW - 64, lh: 20, base: 'top' }) + 8;
    M.text(g, 'Cocokkan dengan coretanmu.', VW / 2, 60 + h - 14, { size: 13, align: 'center', color: '#8a7aa8', outline: false });
    const by = 60 + h + 20;
    if (S.count > 0) M.text(g, String(Math.ceil(S.count)), VW / 2, by + 26, { size: 48, align: 'center', color: '#ffd54a' });
    else M.button(g, { id: 'lanjut', x: VW / 2 - 100, y: by, w: 200, h: 56, color: 'green', label: 'Lanjut', size: 26, onTap: () => { S.count = 3; } });
  }

  const overlay = {
    update(dt) {
      S.t += dt;
      window.Scratchpad.setAvailable(S.active && S.mode === 'solve'); // hanya saat mengerjakan, bukan saat petunjuk/hasil
      if (S.shake > 0) S.shake = Math.max(0, S.shake - dt);
      if (S.mode === 'result' && S.count > 0) { S.count -= dt; if (S.count <= 0) finish('done'); }
    },
    draw(g) {
      M.clearHits();
      if (S.mode === 'solve') drawSolve(g);
      else if (S.mode === 'hint') drawHint(g);
      else drawResult(g);
    },
    blur() { save(); },
  };

  // Keyboard (untuk laptop): angka, Backspace, Enter, Tab pindah kolom.
  function onKey(e) {
    if (!S.active || S.mode !== 'solve') return;
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') erase();
    else if (e.key === 'Enter') submit();
    else if (e.key === 'Tab') S.field = (S.field + 1) % fields().length;
    else return;
    e.preventDefault();
  }
  let keyBound = false;
  function keyOn(on) { if (on && !keyBound) { window.addEventListener('keydown', onKey); keyBound = true; } else if (!on && keyBound) { window.removeEventListener('keydown', onKey); keyBound = false; } }

  MH3.homework = {
    open: (opts, onDone) => open(opts, onDone),
    pending: stored,
    // Lanjutkan PR yang terbuka saat HP dikunci atau tab ditutup. Mengembalikan false jika tidak ada.
    resume(onDone) {
      const v = stored();
      if (!v) return false;
      open({ id: v.id, seed: v.seed, tier: v.tier, title: v.title }, onDone, v);
      return true;
    },
    get active() { return S.active; },
    stars: (hints, wrong) => Math.max(1, 3 - Math.max(hints, Math.min(wrong, 2))),
  };
  // Simpan saat tab disembunyikan.
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
})();
