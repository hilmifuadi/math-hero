// Kit Math Hero: level generator platformer (spesifikasi: public/shared/LEVELGEN.md).
// Merangkai ruang tulisan tangan (levelgen.chunks.js) dan potongan datar acak menjadi satu peta teks Kejar MH3.
// Deterministik: seed yang sama selalu menghasilkan level yang sama.
//   MHKit.levelgen.generate({ seed, tier, tema, mech: ['tangga', ...], intro: ['per'], foes: ['e', 'f'], quiz: 1, sec: 110 })
//   Opsi tambahan: uji: true = ikutkan ruang kombinasi yang masih diuji; fixed: ['id', ...] = rangkai ruang itu saja (halaman uji).
//   -> { map: [...string], inside: [[c0, r0, c1, r1]], tema, tier, seed, rooms: [{ id, c, w, dy }], est }
// mech  = mekanik yang boleh muncul (tag ruang). intro = mekanik baru level ini: muncul dulu di ruang aman, lalu
// diulang. foes = jenis musuh di potongan datar (e a r f n, lihat sim.js). quiz = jumlah tuas/tombol macet
// (pemicu soal) di jalan utama. sec = perkiraan lama main (detik).
// Pemeriksaan bisa diselesaikan dilakukan di luar (shared/js/levelcheck.js); pickSeed() mencoba seed berurutan.
// Node: require('.../levelgen.js'); browser: window.MHKit.levelgen (muat levelgen.chunks.js lebih dulu).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./levelgen.chunks.js'));
  else ((root.MHKit = root.MHKit || {}).levelgen = factory(root.MHKit.levelChunks));
})(typeof self !== 'undefined' ? self : this, function (Lib) {
  const SOLID = '#=x123456';
  const GATE = '123', GATE_INV = '456', LEVER = 'tyu', PLATE = '_,;', LEVER_Q = 'TYU', PLATE_Q = 'jkl';
  const VERT = [0.15, 0.3, 0.45, 0.6];      // porsi ruang naik/turun per tier
  const UP = [0.6, 0.6, 0.6, 0.8];          // dari ruang vertikal, porsi yang naik
  const KOMBO = [0, 0.3, 0.5, 0.6];         // peluang memilih ruang kombinasi bila ada di kolam

  function rng(seed) {
    let a = (seed >>> 0) || 1;
    const f = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    return f;
  }

  const solid = (ch) => SOLID.includes(ch);
  // Lantai masuk/keluar sebuah ruang (lihat aturan di levelgen.chunks.js).
  function doors(ch) {
    const rows = ch.rows, w = rows[0].length;
    const cand = (c) => rows.map((r, i) => i).filter((i) => solid(rows[i][c]) && i >= 2 && !solid(rows[i - 1][c]) && !solid(rows[i - 2][c]));
    const a = cand(0), b = cand(w - 1);
    const pick = (list, which, side) => {
      if (!list.length) throw new Error(`ruang ${ch.id}: tidak ada lantai ${side}`);
      if (list.length === 1) return list[0];
      if (which === 'low') return Math.max(...list);
      if (which === 'high') return Math.min(...list);
      throw new Error(`ruang ${ch.id}: lantai ${side} ganda, tulis ${side === 'masuk' ? 'in' : 'out'}`);
    };
    const dir = ch.dir || 'R';
    const din = ch.in !== undefined ? ch.in : pick(a, dir === 'U' ? 'low' : dir === 'D' ? 'high' : null, 'masuk');
    const dout = ch.out !== undefined ? ch.out : pick(b, dir === 'U' ? 'high' : dir === 'D' ? 'low' : null, 'keluar');
    return { in: din, out: dout, w, h: rows.length, dy: dout - din };
  }

  // Potongan datar acak: 5 baris udara + 1 baris lantai. Rintangan sesuai tier, selalu bisa dilompati. Seperti MH1, ada
  // jurang lebar dengan platform gerak atau papan rapuh bila mekaniknya sudah dikenalkan (lebar 10: tidak terlompati).
  function run(R, w, tier, mech, opt) {
    const foes = opt.foes && opt.foes.length ? opt.foes : ['e'];
    const H = 6, F = H - 1;
    const g = Array.from({ length: H }, () => Array(w).fill('.'));
    for (let c = 0; c < w; c++) g[F][c] = '#';
    let c = opt.flat || 2;
    while (c < w - 4) {
      const kinds = ['gap', 'spike', 'enemy', 'hill', 'stars'];
      if (tier >= 1) kinds.push('bridge', 'gap');
      if (tier >= 2 && mech.includes('gergaji')) kinds.push('saw');
      if (foes.length > 1) kinds.push('enemy');
      if (mech.includes('gerak') && c + 13 < w) kinds.push('mover');
      if (mech.includes('rapuh') && c + 13 < w) kinds.push('crumble');
      const k = R.pick(kinds);
      if (k === 'gap') {
        const n = tier === 0 ? 2 : R.int(2, 3);
        for (let i = 0; i < n; i++) g[F][c + i] = '.';
        g[F - 3][c + Math.floor(n / 2)] = '*';
        c += n + R.int(2, 4);
      } else if (k === 'spike') {
        const n = R.int(1, 2);
        for (let i = 0; i < n; i++) g[F - 1][c + i] = '^';
        g[F - 3][c] = '*';
        c += n + R.int(2, 4);
      } else if (k === 'enemy') {
        const f = R.pick(foes);
        if (f === 'f') { g[tier ? F - 2 : F - 3][c + 2] = 'f'; c += 6; }
        else if (f === 'n') { g[F - 1][c + 3] = 'n'; c += R.int(5, 6); }
        else { g[F - 1][c + 1] = f; c += f === 'r' ? 6 : R.int(4, 5); }
      } else if (k === 'mover') {
        for (let i = 0; i < 10; i++) g[F][c + i] = '.';
        for (let i = 1; i < 9; i++) g[F - 1][c + i] = '-';
        g[F - 3][c + 3] = '*'; g[F - 3][c + 6] = '*';
        c += 10 + R.int(2, 3);
      } else if (k === 'crumble') {
        for (let i = 0; i < 10; i++) g[F][c + i] = '~';
        g[F - 2][c + 3] = '*'; g[F - 2][c + 6] = '*';
        c += 10 + R.int(2, 3);
      } else if (k === 'hill') {
        const n = R.int(2, 3), up = R.int(1, 2);
        for (let i = 0; i < n; i++) for (let r = F - up; r < F; r++) g[r][c + i] = '#';
        g[F - up - 2][c + 1] = '*';
        c += n + R.int(2, 3);
      } else if (k === 'bridge' && c + 6 < w) {
        for (let i = 0; i < 4; i++) { g[F][c + i] = '.'; g[F - 2][c + i] = '='; }
        g[F - 3][c + 1] = '*'; g[F - 3][c + 2] = '*';
        c += 4 + R.int(2, 3);
      } else if (k === 'saw') {
        g[F - 1][c] = 'o';
        c += R.int(3, 5);
      } else {
        for (let i = 0; i < 3 && c + i < w - 2; i++) g[F - 1 - (i === 1 ? 1 : 0)][c + i] = '*';
        c += 4;
      }
    }
    return { id: 'datar', rows: g.map((r) => r.join('')), gen: true };
  }

  // Pilih ruang berikutnya. Mekanik intro muncul lebih dulu (ruang aman), mekanik lain sesuai izin level.
  function chooseChunk(R, st, o) {
    const ok = (lim) => (ch) => o.tier >= ch.tier[0] && o.tier <= ch.tier[1] && ch.tags.every((t) => o.mech.includes(t)) && (!ch.uji || o.uji) &&
      (st.used[ch.id] || 0) < lim && ch.id !== st.last;
    // tiap ruang paling banyak dipakai 2 kali; level awal (sedikit mekanik) boleh mengulang sampai 4 kali
    let all = Lib.CHUNKS.filter(ok(2));
    if (all.length < 3) all = Lib.CHUNKS.filter(ok(4));
    if (st.introQ.length) {
      const t = st.introQ.shift();
      const safe = all.filter((ch) => ch.tags.includes(t) && ch.safe);
      const any = all.filter((ch) => ch.tags.includes(t));
      if (safe.length || any.length) return R.pick(safe.length ? safe : any);
    }
    let dir = 'R';
    // Porsi ruang vertikal dijaga mendekati VERT[tier] (bukan hanya peluang), jadi tiap level pasti punya naik/turun.
    const due = st.vert < Math.floor((st.n + 1) * VERT[o.tier] + 0.5);
    if (due || R() < VERT[o.tier] * 0.5) dir = st.y > 6 || R() < UP[o.tier] ? 'U' : 'D';
    if (dir === 'D' && st.y > 2) dir = 'U';
    // separuh akhir level: utamakan ruang dengan mekanik intro supaya mekanik baru dipakai lagi
    let pool = all.filter((ch) => (ch.dir || 'R') === dir);
    if (st.repeatQ.length) {
      const rep = pool.filter((ch) => ch.tags.includes(st.repeatQ[0]));
      if (rep.length) { st.repeatQ.shift(); pool = rep; }
    }
    if (!pool.length) pool = all.filter((ch) => (ch.dir || 'R') === 'R');
    if (!pool.length) pool = all.filter((ch) => ch.dir !== 'D' || st.y <= 2);
    // Teka-teki (ruang kombinasi) diutamakan di tier tinggi; ruang tunggal hanya mengenalkan satu mekanik.
    const combo = pool.filter((ch) => ch.kombo);
    if (combo.length && R() < KOMBO[o.tier]) return R.pick(combo);
    return pool.length ? R.pick(pool) : null;
  }

  function generate(o) {
    o = Object.assign({ seed: 1, tier: 0, tema: 'padang', mech: [], intro: [], quiz: 1, sec: 110 }, o);
    o.mech = [...new Set([...o.mech, ...o.intro])];
    const R = rng(o.seed * 7919 + o.tier * 104729);
    const st = { used: {}, last: null, y: 0, n: 0, vert: 0, introQ: [...o.intro], repeatQ: [...o.intro] };
    const blocks = [];
    let est = 0;
    const addRun = (w, opt) => { const b = run(R, w, o.tier, o.mech, Object.assign({ foes: o.foes }, opt)); blocks.push(b); est += w * 0.24; return b; };
    blocks.push({ id: 'awal', rows: ['......', '......', '......', '......', '......', '######'], gen: true });
    addRun(R.int(10, 14), { flat: 4 });
    let n = 0;
    // Ruang tuas/tombol untuk soal: pastikan ada cukup tempat menaruh benda macet.
    const quizHost = (ch) => ch.rows.some((r) => /[t_]/.test(r));
    let hosts = 0;
    // o.fixed = daftar id ruang berurutan (halaman uji): ruang itu dirangkai apa adanya, tanpa pemilihan acak.
    const fixed = o.fixed ? o.fixed.map((id) => Lib.CHUNKS.find((c) => c.id === id) || (() => { throw new Error('ruang tidak ada: ' + id); })()) : null;
    while (fixed ? n < fixed.length : est < o.sec && n < 40) {
      let ch = fixed ? fixed[n] : chooseChunk(R, st, o);
      // Sisa soal belum punya tempat dan level sudah lewat separuh: sisipkan tuas di jalan.
      if (!fixed && hosts < o.quiz && est > o.sec * (0.3 + 0.3 * hosts) && !(ch && quizHost(ch))) {
        const can = Lib.CHUNKS.filter((c) => quizHost(c) && o.tier >= c.tier[0] && o.tier <= c.tier[1] && c.id !== st.last && (!c.uji || o.uji) &&
          c.tags.every((t) => t === 'tuas' || o.mech.includes(t)));
        ch = R.pick(can);
      }
      if (!ch) break;
      const d = doors(ch);
      blocks.push(ch); st.used[ch.id] = (st.used[ch.id] || 0) + 1; st.last = ch.id; st.y += d.dy; n++; st.n = n; if (ch.dir) st.vert++;
      if (quizHost(ch)) hosts++;
      est += d.w * 0.3 + Math.abs(d.dy) * 0.35 + (ch.tags.length ? 3 : 0);
      addRun(R.int(8, 15));
    }
    blocks.push({ id: 'akhir', rows: ['..........', '..........', '..........', '..........', '..........', '##########'], gen: true });

    // --- rangkai ---
    let x = 0, y = 0, top = 0, bot = 0;
    const placed = blocks.map((b) => {
      const d = b.gen ? { in: b.rows.length - 1, out: b.rows.length - 1, w: b.rows[0].length, h: b.rows.length } : doors(b);
      const p = { b, d, c: x, r: y - d.in };
      top = Math.min(top, p.r); bot = Math.max(bot, p.r + d.h);
      x += d.w; y = p.r + d.out;
      return p;
    });
    const MARGIN_TOP = 5, MARGIN_BOT = 2, W = x, H = bot - top + MARGIN_TOP + MARGIN_BOT, off = MARGIN_TOP - top;
    const g = Array.from({ length: H }, () => Array(W).fill('.'));
    const inside = [];
    let chan = 0;
    const quizSlots = [];
    for (const p of placed) {
      const rows = remapChannel(p.b.rows, chan);
      if (rows !== p.b.rows) { p.k = chan; quizSlots.push(p); chan = (chan + (p.b.rows.some((r) => /[25y,]/.test(r)) ? 2 : 1)) % 3; }
      p.rows = rows;
      const r0 = p.r + off;
      for (let r = 0; r < p.d.h; r++) for (let c = 0; c < p.d.w; c++) g[r0 + r][p.c + c] = rows[r][c];
      for (let c = 0; c < p.d.w; c++) {
        if (solid(rows[0][c])) for (let r = 0; r < r0; r++) g[r][p.c + c] = '#';
        if (solid(rows[p.d.h - 1][c])) for (let r = r0 + p.d.h; r < H; r++) g[r][p.c + c] = '#';
      }
      for (const q of p.b.inside || []) inside.push([p.c + q[0], r0 + q[1], p.c + q[2], r0 + q[3]]);
      p.r0 = r0;
    }
    // --- benda macet (pemicu soal): tersebar, satu per ruang ---
    const spread = quizSlots.filter((p, i) => i % Math.max(1, Math.floor(quizSlots.length / Math.max(1, o.quiz))) === 0).slice(0, o.quiz);
    for (const p of spread) {
      for (let r = 0; r < p.d.h; r++) for (let c = 0; c < p.d.w; c++) {
        const ch = g[p.r0 + r][p.c + c];
        const iL = LEVER.indexOf(ch), iP = PLATE.indexOf(ch);
        if (iL >= 0 && iL !== p.k || iP >= 0 && iP !== p.k) continue;   // ruang kombinasi: hanya benda kanal pertama yang macet
        if (iL >= 0) g[p.r0 + r][p.c + c] = LEVER_Q[iL];
        else if (iP >= 0) g[p.r0 + r][p.c + c] = PLATE_Q[iP];
      }
    }
    // --- awal, tujuan, peti, checkpoint ---
    const floorAt = (c) => { for (let r = 1; r < H; r++) if (solid(g[r][c]) && g[r - 1][c] === '.') return r; return -1; };
    const putOn = (c, ch) => { const r = floorAt(c); if (r > 0) g[r - 1][c] = ch; };
    const first = placed[0], last = placed[placed.length - 1];
    putOn(first.c + 2, 'S');
    putOn(last.c + 7, 'E');
    putOn(last.c + 4, 'K');
    // Peti Kekuatan di potongan datar pertama sesudah sepertiga level; checkpoint di awal potongan datar berselang.
    const runs = placed.filter((p) => p.b.id === 'datar');
    const pRun = runs[Math.max(1, Math.floor(runs.length / 3))] || runs[0];
    let cp = 0;
    runs.forEach((p, i) => {
      if (p === pRun) putOn(p.c + 1, 'P');
      else if (i >= 2 && i % 2 === 0 && floorAt(p.c) === floorAt(p.c + 1)) { putOn(p.c + 1, 'c'); cp++; }
    });
    return {
      map: g.map((r) => r.join('')), inside, tema: o.tema, tier: o.tier, seed: o.seed, est: Math.round(est),
      rooms: placed.filter((p) => !p.b.gen).map((p) => ({ id: p.b.id, c: p.c, r: p.r0, w: p.d.w, dy: p.d.dy })), checkpoints: cp,
    };
  }

  // Ruang dengan gerbang/tuas/tombol memakai kanal 1 (blok saklar terbalik: 4); ganti ke kanal k (0..2).
  // Ruang kombinasi boleh memakai kanal kedua (2, 5, y, ','), diganti ke kanal berikutnya (k + 1).
  function remapChannel(rows, k) {
    if (!rows.some((r) => /[14t_]/.test(r))) return rows;
    const k2 = (k + 1) % 3;
    return rows.map((r) => r.replace(/[14t_25y,]/g, (ch) => ({ 1: GATE[k], 4: GATE_INV[k], t: LEVER[k], _: PLATE[k], 2: GATE[k2], 5: GATE_INV[k2], y: LEVER[k2], ',': PLATE[k2] })[ch]));
  }

  // Coba seed mulai dari o.seed sampai check(def) lulus. check menerima hasil generate dan mengembalikan true/false.
  function pickSeed(o, check, tries) {
    for (let i = 0; i < (tries || 50); i++) {
      const def = generate(Object.assign({}, o, { seed: o.seed + i }));
      if (check(def)) return def;
    }
    return null;
  }

  return { generate, pickSeed, doors, rng, CHUNKS: Lib.CHUNKS };
});
