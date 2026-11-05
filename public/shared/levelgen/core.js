// Kit Math Hero: inti level generator platformer. Tidak tahu arti karakter tile atau mekanik game;
// semua itu disediakan oleh LevelRules (lihat public/mh3/js/gen/rules.js untuk adapter MH3).
// Tugas inti: RNG deterministik, jalur makro naik/turun, pemilihan ruang, penyambungan pintu, dan perakitan peta.
// Dipakai lewat Core.create(rules) -> { generate, pickSeed, doors, rng, CHUNKS }.
// Node: require('./core.js'); browser: window.MHKit.levelgenCore (muat sebelum levelgen.js).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MHKit = root.MHKit || {}).levelgenCore = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  // Porsi ruang naik/turun, porsi naik dari ruang vertikal, dan peluang ruang kombinasi per tier.
  // Nilai bawaan ini dipakai bila LevelRules tidak menyediakan tuning sendiri.
  const VERT_DEFAULT = [0.15, 0.3, 0.45, 0.6];
  const UP_DEFAULT = [0.6, 0.6, 0.6, 0.8];
  const KOMBO_DEFAULT = [0, 0.3, 0.5, 0.6];

  function rng(seed) {
    let a = (seed >>> 0) || 1;
    const f = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    return f;
  }

  function create(rules) {
    if (!rules || typeof rules.isSolid !== 'function') throw new Error('LevelRules.isSolid wajib ada');
    if (!Array.isArray(rules.chunks)) throw new Error('LevelRules.chunks wajib berupa array');
    const CHUNKS = rules.chunks;
    const solid = rules.isSolid;
    const VERT = rules.vertical || VERT_DEFAULT;
    const UP = rules.up || UP_DEFAULT;
    const KOMBO = rules.kombo || KOMBO_DEFAULT;

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

    // Pilih ruang berikutnya. Mekanik intro muncul lebih dulu (ruang aman), mekanik lain sesuai izin level.
    function chooseChunk(R, st, o) {
      const ok = (lim) => (ch) => o.tier >= ch.tier[0] && o.tier <= ch.tier[1] && ch.tags.every((t) => o.mech.includes(t)) && (!ch.uji || o.uji) &&
        (st.used[ch.id] || 0) < lim && ch.id !== st.last;
      // tiap ruang paling banyak dipakai 2 kali; level awal (sedikit mekanik) boleh mengulang sampai 4 kali
      let all = CHUNKS.filter(ok(2));
      if (all.length < 3) all = CHUNKS.filter(ok(4));
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
      o = Object.assign({}, rules.defaults || {}, o);
      o.mech = [...new Set([...(o.mech || []), ...(o.intro || [])])];
      const R = rng(o.seed * 7919 + o.tier * 104729);
      const st = { used: {}, last: null, y: 0, n: 0, vert: 0, introQ: [...(o.intro || [])], repeatQ: [...(o.intro || [])] };
      const blocks = [];
      let est = 0;
      const runChunk = (w, opt) => rules.run({ rng: R, w, tier: o.tier, mech: o.mech, foes: o.foes, flat: opt && opt.flat });
      const estimateRun = (w) => (rules.estimateRun ? rules.estimateRun(w, o) : w * 0.24);
      const estimateChunk = (d, ch) => (rules.estimateChunk ? rules.estimateChunk(d, ch, o) : d.w * 0.3 + Math.abs(d.dy) * 0.35 + (ch.tags.length ? 3 : 0));
      const addRun = (w, opt) => { const b = runChunk(w, opt); blocks.push(b); est += estimateRun(w); return b; };
      blocks.push(rules.startBlock());
      addRun(R.int(10, 14), { flat: 4 });
      let n = 0;
      // Ruang tuas/tombol untuk soal: pastikan ada cukup tempat menaruh benda macet.
      const quizHost = rules.quizHost || (() => false);
      let hosts = 0;
      // o.fixed = daftar id ruang berurutan (halaman uji): ruang itu dirangkai apa adanya, tanpa pemilihan acak.
      const fixed = o.fixed ? o.fixed.map((id) => CHUNKS.find((c) => c.id === id) || (() => { throw new Error('ruang tidak ada: ' + id); })()) : null;
      while (fixed ? n < fixed.length : est < o.sec && n < 40) {
        let ch = fixed ? fixed[n] : chooseChunk(R, st, o);
        // Sisa soal belum punya tempat dan level sudah lewat separuh: sisipkan tuas di jalan.
        if (!fixed && hosts < o.quiz && est > o.sec * (0.3 + 0.3 * hosts) && !(ch && quizHost(ch))) {
          const can = rules.pickQuizHost ? rules.pickQuizHost(CHUNKS, o, st) : [];
          ch = R.pick(can);
        }
        if (!ch) break;
        const d = doors(ch);
        blocks.push(ch); st.used[ch.id] = (st.used[ch.id] || 0) + 1; st.last = ch.id; st.y += d.dy; n++; st.n = n; if (ch.dir) st.vert++;
        if (quizHost(ch)) hosts++;
        est += estimateChunk(d, ch);
        addRun(R.int(8, 15));
      }
      blocks.push(rules.endBlock());

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
        const rows = rules.remapChannels ? rules.remapChannels(p.b.rows, chan) : p.b.rows;
        if (rows !== p.b.rows) {
          p.k = chan;
          quizSlots.push(p);
          const step = rules.channelStep ? rules.channelStep(p.b.rows) : 1;
          chan = (chan + step) % 3;
        }
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
      // --- benda macet (pemicu soal) dan placement khas game ---
      if (rules.applyQuiz) rules.applyQuiz({ g, placed, quizSlots, o, solid, width: W, height: H });
      const floorAt = (c) => { for (let r = 1; r < H; r++) if (solid(g[r][c]) && g[r - 1][c] === '.') return r; return -1; };
      const putOn = (c, ch) => { const r = floorAt(c); if (r > 0) g[r - 1][c] = ch; };
      let cp = 0;
      if (rules.place) cp = rules.place({ g, placed, solid, width: W, height: H, floorAt, putOn }) || 0;
      return {
        map: g.map((r) => r.join('')), inside, tema: o.tema, tier: o.tier, seed: o.seed, est: Math.round(est),
        rooms: placed.filter((p) => !p.b.gen).map((p) => ({ id: p.b.id, c: p.c, r: p.r0, w: p.d.w, dy: p.d.dy })), checkpoints: cp,
      };
    }

    // Coba seed mulai dari o.seed sampai check(def) lulus. check menerima hasil generate dan mengembalikan true/false.
    function pickSeed(o, check, tries) {
      for (let i = 0; i < (tries || 50); i++) {
        const def = generate(Object.assign({}, o, { seed: o.seed + i }));
        if (check(def)) return def;
      }
      return null;
    }

    return { generate, pickSeed, doors, rng, CHUNKS };
  }

  return { create, rng };
});
