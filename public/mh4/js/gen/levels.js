// Math Hero 4: level vertical slice, seed tetap. Peta dihasilkan oleh inti generator
// bersama (public/shared/levelgen/core.js) memakai LevelRules MH4.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('../../../shared/levelgen/core.js'),
      require('./rules.js'),
      require('../boss/bosses/penjaga.js'),
      require('../boss/bosses/raja-bandit.js'),
      require('../boss/gen.js')
    );
  } else {
    (root.MH4 = root.MH4 || {}).levels = factory(
      root.MHKit.levelgenCore, root.MH4.levelgenRules,
      root.MH4.bosses.penjaga, root.MH4.bosses.raja, root.MH4.bossGen
    );
  }
})(typeof self !== 'undefined' ? self : this, function (Core, Rules, Penjaga, Raja, BossGen) {
  const Gen = Core.create(Rules);

  const PLAN = [
    { id: 1, nama: 'Langkah Pertama', tema: 'green', tier: 0, seed: 3901, sec: 45 },
    { id: 2, nama: 'Pipa Berkarat', tema: 'industrial', tier: 1, seed: 4120, sec: 50 },
    { id: 3, nama: 'Bukit Ceria', tema: 'simple', tier: 2, seed: 4155, sec: 55 },
    { id: 4, nama: 'Jurang Hijau', tema: 'green', tier: 2, seed: 4473, sec: 60 },
    { id: 5, nama: 'Gudang Tua', tema: 'industrial', tier: 3, seed: 4320, sec: 60 },
    { id: 6, nama: 'Gerbang Matematika', tema: 'simple', tier: 3, seed: 4423, sec: 65 },
    { id: 7, nama: 'Atap Neon', tema: 'night', tier: 3, seed: 7220, sec: 65 },
    { id: 8, nama: 'Jantung Gua', tema: 'crystal', tier: 3, seed: 29529, sec: 70 },
    { id: 9, nama: 'Sarang Purba', tema: 'hive', tier: 3, seed: 18325, sec: 70 },
    { id: 10, nama: 'Lorong Spora', tema: 'hive', tier: 3, seed: 1005, sec: 75 },
    { id: 11, nama: 'Distrik Bata', tema: 'day', tier: 3, seed: 13609, sec: 75 },
    { id: 12, nama: 'Atap Kota', tema: 'day', tier: 3, seed: 1000, sec: 75 },
    { id: 13, nama: 'Gerbang Benteng', tema: 'castle', tier: 3, seed: 201202, sec: 80 },
    { id: 14, nama: 'Aula Bawah', tema: 'castle', tier: 3, seed: 2402, sec: 80 },
  ];

  // Invariant minimal supaya level tidak mustahil diselesaikan.
  function validate(def) {
    const bad = [];
    const map = def.map;
    if (!Array.isArray(map) || !map.length) return ['peta kosong'];
    const W = map[0].length;
    map.forEach((row, r) => { if (row.length !== W) bad.push(`baris ${r} panjang ${row.length}, harus ${W}`); });
    const find = (ch) => {
      const out = [];
      map.forEach((row, r) => { for (let c = 0; c < row.length; c++) if (row[c] === ch) out.push({ c, r }); });
      return out;
    };
    const S = find('S'), E = find('E'), K = find('K'), G = find('G'), C = find('C'), H = find('^');
    if (S.length !== 1) bad.push(`S harus tepat 1, ada ${S.length}`);
    if (E.length !== 1) bad.push(`E harus tepat 1, ada ${E.length}`);
    if (!K.length) bad.push('K (peti reward) tidak ada');
    if (!G.length) bad.push('G (gerbang soal) tidak ada');
    if (!C.length) bad.push('C (checkpoint) tidak ada');
    if (S.length && E.length && S[0].c >= E[0].c) bad.push('S harus di kiri E');
    const gMin = G.length ? Math.min(...G.map((p) => p.c)) : Infinity;
    if (K.length && gMin >= Math.min(...K.map((p) => p.c))) bad.push('gerbang G harus sebelum peti K');
    if (E.length && gMin >= Math.min(...E.map((p) => p.c))) bad.push('gerbang G harus sebelum tujuan E');
    if (K.length && E.length && Math.min(...K.map((p) => p.c)) >= Math.min(...E.map((p) => p.c))) bad.push('peti K harus sebelum E');
    // Benda penting harus berdiri di atas tanah padat, bukan di jurang/duri.
    const solid = (c, r) => r >= 0 && r < map.length && c >= 0 && c < W && '#G'.includes(map[r][c]);
    for (const p of [...S, ...C, ...K, ...E]) {
      if (!solid(p.c, p.r + 1)) bad.push(`benda di kolom ${p.c} baris ${p.r} tidak punya tanah di bawahnya`);
      if (H.some((h) => h.c === p.c && h.r === p.r)) bad.push(`benda di kolom ${p.c} menempel duri`);
    }
    // Gerbang harus berupa dinding penuh sampai tanah, bukan satu sel yang bisa dilompati.
    for (const p of G) {
      let r = p.r;
      while (r < map.length && map[r][p.c] === 'G') r++;
      if (!solid(p.c, r)) bad.push(`gerbang kolom ${p.c} tidak mencapai tanah`);
    }
    return bad;
  }

  const LEVELS = PLAN.map((p) => {
    const def = Gen.generate({
      seed: p.seed, tier: p.tier, tema: p.tema, mech: [], intro: [], sec: p.sec,
    });
    const level = {
      id: p.id, nama: p.nama, tema: p.tema, tier: p.tier, seed: def.seed,
      // Kekuatan musuh dan senjata naik halus tiap level, sampai 3 di arena boss.
      power: Math.round((p.id - 1) * 3 / PLAN.length * 100) / 100,
      map: def.map, inside: def.inside, rooms: def.rooms, checkpoints: def.checkpoints,
    };
    return addEnemies(level, p.tier);
  });

  // Menaruh musuh jalan setelah peta jadi, bukan di dalam chunk, supaya generator
  // tetap bersih dan level tier 0 tetap ramah untuk tutorial. Penempatan deterministik
  // dari seed: kolom datar (tanah 3 tile) yang jauh dari S/E/K/G/C. Tipe musuh dibuka
  // bertahap: tier 1 jalan, tier 2 + pelompat, tier 3 + penembak.
  function addEnemies(def, tier) {
    if (tier < 1) return def;
    // Kepadatan mengikuti panjang peta: sekitar satu musuh tiap 40 kolom, di level awal lebih jarang.
    const target = Math.max(tier + 1, Math.min(10, Math.round(def.map[0].length / (tier >= 2 ? 40 : 70))));
    const pool = tier >= 3 ? ['e', 'a', 'g'] : tier >= 2 ? ['e', 'a'] : ['e'];
    const rows = def.map.map((r) => r.split(''));
    const H = rows.length, W = rows[0].length;
    const blocked = new Set();
    for (const ch of ['S', 'E', 'K', 'G', 'C']) {
      for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
          if (rows[r][c] !== ch) continue;
          for (let d = -2; d <= 2; d++) blocked.add(c + d);
        }
      }
    }
    const flat = (r, c) => r >= 0 && r + 1 < H && c > 0 && c + 1 < W &&
      rows[r][c] === '.' && rows[r][c - 1] === '.' && rows[r][c + 1] === '.' &&
      (r === 0 || rows[r - 1][c] === '.') &&
      rows[r + 1][c] === '#' && rows[r + 1][c - 1] === '#' && rows[r + 1][c + 1] === '#';
    const cands = [];
    for (let c = 8; c < W - 8; c++) {
      if (blocked.has(c)) continue;
      for (let r = 1; r < H - 1; r++) {
        if (flat(r, c)) { cands.push({ c, r }); break; }
      }
    }
    for (let i = 0; i < target && cands.length; i++) {
      const at = Math.floor((i + 0.5) * cands.length / target);
      const p = cands[at];
      if (!p) continue;
      const pick = pool[((p.c * 31 + def.seed * 7 + i * 13) >>> 0) % pool.length];
      rows[p.r][p.c] = pick;
    }
    return Object.assign({}, def, { map: rows.map((r) => r.join('')) });
  }

  // Arena boss: 27x15 tile supaya seluruhnya terlihat pada zoom 1.5 (scene.js). Lantai di
  // baris 10, jadi hero dan serangan selalu di atas tombol sentuh. Tanpa gerbang soal
  // (matematika hanya di platforming). `B` spawn boss; `E` aktif setelah boss kalah.
  const ARENA_W = 27, ARENA_H = 15, ARENA_FLOOR = 10;

  function makeArena(platforms) {
    const rows = Array.from({ length: ARENA_H }, () => Array(ARENA_W).fill('.'));
    for (let r = ARENA_FLOOR; r < ARENA_H; r++) for (let c = 0; c < ARENA_W; c++) rows[r][c] = '#';
    for (const [r, from, to] of platforms) for (let c = from; c <= to; c++) rows[r][c] = '=';
    rows[ARENA_FLOOR - 1][2] = 'S';
    rows[ARENA_FLOOR - 1][19] = 'B';
    rows[ARENA_FLOOR - 1][25] = 'E';
    return rows.map((r) => r.join(''));
  }

  // Dua platform lompat ganda sebagai tempat aman dari slam dan semburan lantai.
  const arenaBoss = () => makeArena([[6, 5, 9], [6, 17, 21]]);
  // Tengah dikosongkan supaya serudukan tampak jelas; platform dekat kedua dinding.
  const arenaBossRaja = () => makeArena([[6, 2, 6], [6, 20, 24]]);

  const BOSS = {
    id: 15, boss: true, nama: 'Hantu Kabut', tema: 'green', tier: 3, power: 1.2, seed: 9901,
    map: arenaBoss(), inside: [], rooms: [], checkpoints: 0,
    bossDef: Penjaga,
  };

  const BOSS2 = {
    id: 16, boss: true, nama: 'Raja Iblis', tema: 'castle', tier: 3, seed: 9902,
    map: arenaBossRaja(), inside: [], rooms: [], checkpoints: 0,
    bossDef: Raja,
  };

  const BOSSES = [BOSS, BOSS2];

  // Boss hasil generator: seed menentukan mekanisme, skin, tema arena, dan pola serangan.
  function genBoss(seed, difficulty) {
    const bossDef = BossGen.build({ seed, difficulty: difficulty || 2 });
    return {
      id: 17, boss: true, gen: true, nama: bossDef.nama, tema: bossDef.arenaTheme, tier: 3,
      seed: bossDef.seed, map: arenaBoss(), inside: [], rooms: [], checkpoints: 0, bossDef,
    };
  }

  const ALL = LEVELS.concat(BOSSES, [genBoss(9903)]);

  function validateBoss(def) {
    const bad = [];
    const map = def && def.map;
    if (!Array.isArray(map) || !map.length) return ['peta boss kosong'];
    const W = map[0].length;
    map.forEach((row, r) => { if (row.length !== W) bad.push(`baris boss ${r} panjang ${row.length}, harus ${W}`); });
    const count = (ch) => map.reduce((n, row) => n + row.split(ch).length - 1, 0);
    if (count('S') !== 1) bad.push('boss butuh tepat 1 S');
    if (count('E') !== 1) bad.push('boss butuh tepat 1 E');
    if (count('B') !== 1) bad.push('boss butuh tepat 1 B');
    if (!def.bossDef || !def.bossDef.id) bad.push('bossDef wajib');
    return bad;
  }

  return {
    PLAN, LEVELS, BOSS, BOSS2, BOSSES, ALL, genBoss,
    level: (id) => LEVELS.find((l) => l.id === id) || LEVELS[0],
    validate, validateBoss, generate: Gen.generate,
  };
});
