// Math Hero 3: LevelRules untuk inti generator (public/shared/levelgen/core.js).
// Di sini satu-satunya tempat yang tahu arti karakter tile Kejar MH3, katalog rintangan potongan datar,
// pemicu soal (benda macet), kanal gerbang/tuas, dan penempatan awal/tujuan/peti/checkpoint.
// Dengan begini inti generator bisa dipakai MH4 tanpa membawa kosakata MH3.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MHKit = root.MHKit || {}).mh3LevelRules = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  const SOLID = '#=x123456';
  const GATE = '123', GATE_INV = '456', LEVER = 'tyu', PLATE = '_,;', LEVER_Q = 'TYU', PLATE_Q = 'jkl';

  const isSolid = (ch) => SOLID.includes(ch);

  // Potongan datar acak: 5 baris udara + 1 baris lantai. Rintangan sesuai tier, selalu bisa dilompati.
  function run(ctx) {
    const R = ctx.rng, w = ctx.w, tier = ctx.tier, mech = ctx.mech;
    const foes = ctx.foes && ctx.foes.length ? ctx.foes : ['e'];
    const H = 6, F = H - 1;
    const g = Array.from({ length: H }, () => Array(w).fill('.'));
    for (let c = 0; c < w; c++) g[F][c] = '#';
    let c = ctx.flat || 2;
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

  const estimateRun = (w) => w * 0.24;
  const estimateChunk = (d, ch) => d.w * 0.3 + Math.abs(d.dy) * 0.35 + (ch.tags.length ? 3 : 0);

  // Ruang yang punya tuas/tombol: kandidat tempat benda macet (pemicu soal).
  const quizHost = (ch) => ch.rows.some((r) => /[t_]/.test(r));
  function pickQuizHost(chunks, o, st) {
    return chunks.filter((c) => quizHost(c) && o.tier >= c.tier[0] && o.tier <= c.tier[1] && c.id !== st.last && (!c.uji || o.uji) &&
      c.tags.every((t) => t === 'tuas' || o.mech.includes(t)));
  }

  // Ruang dengan gerbang/tuas/tombol memakai kanal 1 (blok saklar terbalik: 4); ganti ke kanal k (0..2).
  // Ruang kombinasi boleh memakai kanal kedua (2, 5, y, ','), diganti ke kanal berikutnya (k + 1).
  function remapChannels(rows, k) {
    if (!rows.some((r) => /[14t_]/.test(r))) return rows;
    const k2 = (k + 1) % 3;
    return rows.map((r) => r.replace(/[14t_25y,]/g, (ch) => ({ 1: GATE[k], 4: GATE_INV[k], t: LEVER[k], _: PLATE[k], 2: GATE[k2], 5: GATE_INV[k2], y: LEVER[k2], ',': PLATE[k2] })[ch]));
  }
  const channelStep = (rows) => (rows.some((r) => /[25y,]/.test(r)) ? 2 : 1);

  // Benda macet (pemicu soal): tersebar, satu per ruang.
  function applyQuiz(ctx) {
    const g = ctx.g, quizSlots = ctx.quizSlots, quiz = ctx.o.quiz;
    const spread = quizSlots.filter((p, i) => i % Math.max(1, Math.floor(quizSlots.length / Math.max(1, quiz))) === 0).slice(0, quiz);
    for (const p of spread) {
      for (let r = 0; r < p.d.h; r++) for (let c = 0; c < p.d.w; c++) {
        const ch = g[p.r0 + r][p.c + c];
        const iL = LEVER.indexOf(ch), iP = PLATE.indexOf(ch);
        if (iL >= 0 && iL !== p.k || iP >= 0 && iP !== p.k) continue;   // ruang kombinasi: hanya benda kanal pertama yang macet
        if (iL >= 0) g[p.r0 + r][p.c + c] = LEVER_Q[iL];
        else if (iP >= 0) g[p.r0 + r][p.c + c] = PLATE_Q[iP];
      }
    }
  }

  // Awal, tujuan, peti, checkpoint.
  function place(ctx) {
    const placed = ctx.placed, putOn = ctx.putOn, floorAt = ctx.floorAt;
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
    return cp;
  }

  const startBlock = () => ({ id: 'awal', rows: ['......', '......', '......', '......', '......', '######'], gen: true });
  const endBlock = () => ({ id: 'akhir', rows: ['..........', '..........', '..........', '..........', '..........', '##########'], gen: true });

  return {
    id: 'mh3-kejar',
    defaults: { seed: 1, tier: 0, tema: 'padang', mech: [], intro: [], quiz: 1, sec: 110 },
    vertical: [0.15, 0.3, 0.45, 0.6],
    up: [0.6, 0.6, 0.6, 0.8],
    kombo: [0, 0.3, 0.5, 0.6],
    isSolid,
    run,
    estimateRun,
    estimateChunk,
    quizHost,
    pickQuizHost,
    remapChannels,
    channelStep,
    applyQuiz,
    place,
    startBlock,
    endBlock,
  };
});
