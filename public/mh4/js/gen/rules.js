// Math Hero 4: LevelRules untuk inti generator public/shared/levelgen/core.js.
// Kosakata tile MH4 sengaja berbeda dari MH3:
//   #  solid / tanah          =  platform tembus dari bawah
//   ^  duri / hazard          *  bintang
//   S  mulai                  E  tujuan
//   C  checkpoint             K  peti reward akhir
//   G  gerbang soal (solid sampai soal dijawab)
// Inti generator tidak tahu arti karakter ini; semua ada di sini.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./chunks.js'));
  else ((root.MH4 = root.MH4 || {}).levelgenRules = factory(root.MH4.genChunks));
})(typeof self !== 'undefined' ? self : this, function (chunks) {
  const SOLID = '#G';
  const isSolid = (ch) => SOLID.includes(ch);

  // Potongan datar prosedural: 7 baris udara + 1 baris tanah.
  // Semua rintangan harus bisa dilewati dengan lompat tunggal/ganda T=16.
  function run(ctx) {
    const R = ctx.rng, w = ctx.w, tier = ctx.tier;
    const H = 8, F = H - 1;
    const g = Array.from({ length: H }, () => Array(w).fill('.'));
    for (let c = 0; c < w; c++) g[F][c] = '#';
    let c = Math.max(2, ctx.flat || 2);
    while (c < w - 5) {
      const kinds = ['gap', 'spike', 'platform', 'hill', 'stars'];
      if (tier >= 1) kinds.push('platform', 'gap');
      if (tier >= 2) kinds.push('spike', 'gap_platform');
      if (tier >= 3) kinds.push('spike', 'gap_platform', 'gap');
      const k = R.pick(kinds);
      if (k === 'gap') {
        const n = tier === 0 ? 2 : R.int(2, 3);
        for (let i = 0; i < n; i++) g[F][c + i] = '.';
        g[F - 3][c + Math.floor(n / 2)] = '*';
        c += n + R.int(2, 4);
      } else if (k === 'gap_platform') {
        const n = 4;
        for (let i = 0; i < n; i++) g[F][c + i] = '.';
        for (let i = 1; i < 3; i++) g[F - 2][c + i] = '=';
        g[F - 4][c + 2] = '*';
        c += n + R.int(2, 4);
      } else if (k === 'spike') {
        const n = R.int(1, 2);
        for (let i = 0; i < n; i++) g[F - 1][c + i] = '^';
        g[F - 3][c] = '*';
        c += n + R.int(2, 4);
      } else if (k === 'platform') {
        const n = R.int(3, 5);
        for (let i = 0; i < n; i++) g[F - 3][c + i] = '=';
        g[F - 5][c + 1] = '*';
        g[F - 5][c + Math.max(2, n - 2)] = '*';
        c += n + R.int(2, 3);
      } else if (k === 'hill') {
        const n = R.int(2, 3), up = R.int(1, 2);
        for (let i = 0; i < n; i++) for (let r = F - up; r < F; r++) g[r][c + i] = '#';
        g[F - up - 2][c + 1] = '*';
        c += n + R.int(2, 3);
      } else {
        for (let i = 0; i < 3 && c + i < w - 4; i++) g[F - 1 - (i === 1 ? 1 : 0)][c + i] = '*';
        c += 4;
      }
    }
    // Mulut potongan harus rata dan aman: tidak ada jurang/duri di 3 kolom pertama
    // dan 4 kolom terakhir, supaya sambungan antar-ruang selalu bisa dilalui.
    for (let c2 = 0; c2 < 3 && c2 < w; c2++) { g[F][c2] = '#'; if (g[F - 1][c2] === '^') g[F - 1][c2] = '.'; }
    for (let c2 = Math.max(0, w - 4); c2 < w; c2++) { g[F][c2] = '#'; if (g[F - 1][c2] === '^') g[F - 1][c2] = '.'; }
    return { id: 'datar', rows: g.map((r) => r.join('')), gen: true };
  }

  const estimateRun = (w) => w * 0.18;
  const estimateChunk = (d, ch) => d.w * 0.22 + Math.abs(d.dy) * 0.3 + (ch.tags.length ? 2 : 0);

  const startBlock = () => ({
    id: 'awal',
    rows: ['..........', '..........', '..........', '..........', '..........',
      '..........', '..........', '..........', '..........', '##########'],
    gen: true,
  });
  const endBlock = () => ({
    id: 'akhir',
    rows: ['..........', '..........', '..........', '..........', '..........',
      '..........', '..........', '..........', '..........', '##########'],
    gen: true,
  });

  // Cari kolom tanah datar yang aman untuk benda penting. Hanya dipakai pada potongan
  // datar (tanpa langit-langit), jadi floorAt selalu menunjuk lantai berjalan.
  function safeCol(ctx, from, to, occupied) {
    const { g, floorAt } = ctx;
    from = Math.max(1, from);
    to = Math.min(ctx.width - 2, to);
    for (let c = from; c <= to; c++) {
      if (occupied.has(c)) continue;
      const r = floorAt(c);
      if (r < 3) continue;
      if (g[r - 1][c] !== '.' || g[r][c] !== '#') continue;
      if (g[r - 2] && g[r - 2][c] === 'G') continue;
      return c;
    }
    return -1;
  }

  // Awal, tujuan, peti, checkpoint, dan gerbang soal.
  // Urutan penting: gerbang dihitung lebih dulu, lalu checkpoint hanya diletakkan
  // sebelum gerbang. Peti K dan tujuan E selalu di blok akhir sesudah gerbang.
  function place(ctx) {
    const { g, placed, floorAt, putOn, width } = ctx;
    const first = placed[0], last = placed[placed.length - 1];
    const occupied = new Set();
    const mark = (c, pad) => { for (let i = -pad; i <= pad; i++) occupied.add(c + i); };
    const runs = placed.filter((p) => p.b.id === 'datar');

    // --- gerbang soal: potongan datar sekitar 65-75% lebar peta ---
    let gateCol = -1;
    if (runs.length) {
      let gateRun = null, best = 1e9;
      for (const p of runs) {
        const mid = p.c + p.d.w / 2;
        const d = Math.abs(mid - width * 0.7);
        if (d < best) { best = d; gateRun = p; }
      }
      if (gateRun) {
        const lo = gateRun.c + 3, hi = gateRun.c + gateRun.d.w - 4;
        const mid = Math.floor((lo + hi) / 2);
        for (let step = 0; step <= hi - lo && gateCol < 0; step++) {
          for (const c of [mid + step, mid - step]) {
            if (c < lo || c > hi || occupied.has(c)) continue;
            const r = floorAt(c);
            if (r > 3 && g[r - 1][c] === '.' && g[r][c] === '#') { gateCol = c; break; }
          }
        }
        if (gateCol >= 0) {
          const r = floorAt(gateCol);
          for (let rr = 0; rr < r; rr++) g[rr][gateCol] = 'G';
          mark(gateCol, 1);
        }
      }
    }

    // --- mulai di blok awal ---
    let c0 = safeCol(ctx, first.c + 1, first.c + first.d.w - 2, occupied);
    if (c0 < 0) c0 = first.c + 2;
    putOn(c0, 'S'); mark(c0, 0);

    // --- checkpoint di potongan datar, tersebar di 25%, 50%, dan 80% lebar peta ---
    let cp = 0;
    for (const frac of [0.25, 0.5, 0.8]) {
      let best = null, bestD = 1e9;
      for (const p of runs) {
        const d = Math.abs(p.c + p.d.w / 2 - width * frac);
        if (d < bestD) { bestD = d; best = p; }
      }
      if (!best) continue;
      const lo = best.c + 2, hi = best.c + best.d.w - 3;
      let c = safeCol(ctx, lo, hi, occupied);
      if (c < 0) continue;
      putOn(c, 'C'); mark(c, 2); cp++;
    }

    // --- peti reward lalu tujuan di blok akhir ---
    const wEnd = last.d.w;
    let cK = safeCol(ctx, last.c + 2, last.c + wEnd - 5, occupied);
    if (cK < 0) cK = last.c + 2;
    putOn(cK, 'K'); mark(cK, 1);
    let cE = safeCol(ctx, Math.max(cK + 2, last.c + wEnd - 4), last.c + wEnd - 2, occupied);
    if (cE < 0) cE = Math.max(cK + 2, last.c + wEnd - 2);
    putOn(cE, 'E');
    return cp;
  }

  return {
    id: 'mh4-platformer',
    chunks,
    defaults: { seed: 1, tier: 0, tema: 'green', mech: [], intro: [], quiz: 0, sec: 80 },
    vertical: [0.2, 0.3, 0.4, 0.45],
    up: [0.5, 0.5, 0.6, 0.6],
    kombo: [0, 0, 0, 0],
    isSolid,
    run,
    estimateRun,
    estimateChunk,
    startBlock,
    endBlock,
    place,
  };
});
