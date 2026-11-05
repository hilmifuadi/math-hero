// Tes generator MH4: determinisme, invariant level, dan kosakata tile.
// Jalankan: node tests/mh4_levelgen.test.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const L = require('../public/mh4/js/gen/levels.js');
const Rules = require('../public/mh4/js/gen/rules.js');
const Chunks = require('../public/mh4/js/gen/chunks.js');
const Themes = require('../public/mh4/js/theme.js');

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok ' + name); };

ok('pustaka ruang 20x10 dan pintu unik', () => {
  assert.ok(Chunks.length >= 20, 'butuh minimal 20 ruang, ada ' + Chunks.length);
  assert.ok(Rules.chunks === Chunks, 'rules harus memakai chunk pack MH4');
  assert.strictEqual(new Set(Chunks.map((c) => c.id)).size, Chunks.length, 'id ruang harus unik');
  for (const ch of Chunks) {
    assert.ok(ch.rows.length === 10, ch.id + ': harus 10 baris');
    for (const row of ch.rows) assert.ok(row.length === 20, ch.id + ': tiap baris harus 20 kolom');
    assert.ok(Array.isArray(ch.tier) && ch.tier.length === 2, ch.id + ': tier wajib');
    if (ch.in !== undefined) assert.ok(ch.in >= 0 && ch.in < 10, ch.id + ': in di luar peta');
    if (ch.out !== undefined) assert.ok(ch.out >= 0 && ch.out < 10, ch.id + ': out di luar peta');
  }
});

ok('empat belas level tetap dan deterministik', () => {
  assert.ok(L.LEVELS.length >= 14, 'butuh 14 level');
  const plan = L.PLAN[0];
  const a = L.generate({ seed: plan.seed, tier: plan.tier, tema: 'green', mech: [], intro: [], sec: plan.sec });
  const b = L.generate({ seed: plan.seed, tier: plan.tier, tema: 'green', mech: [], intro: [], sec: plan.sec });
  assert.strictEqual(JSON.stringify(a.map), JSON.stringify(b.map), 'seed sama harus menghasilkan peta sama');
  assert.strictEqual(a.seed, b.seed);
  const c = L.generate({ seed: plan.seed + 1, tier: plan.tier, tema: 'green', mech: [], intro: [], sec: plan.sec });
  assert.notStrictEqual(JSON.stringify(a.map), JSON.stringify(c.map), 'seed berbeda harus menghasilkan peta berbeda');
});

ok('semua level lulus invariant', () => {
  for (const lv of L.LEVELS.filter((x) => !x.tower)) {
    const bad = L.validate(lv);
    assert.deepStrictEqual(bad, [], `level ${lv.id}: ` + bad.join('; '));
    assert.ok(lv.rooms.length >= 4, `level ${lv.id}: minimal 4 ruang tulis tangan, ada ${lv.rooms.length}`);
    assert.ok(new Set(lv.rooms.map((r) => r.id)).size >= 3, `level ${lv.id}: minimal 3 jenis ruang`);
  }
});

ok('arena boss lolos validasi dan memakai tema terdaftar', () => {
  assert.deepStrictEqual(L.validateBoss(L.BOSS), []);
  assert.strictEqual(L.BOSS.map.length, 15);
  for (const row of L.BOSS.map) assert.strictEqual(row.length, 27);
  assert.ok(L.BOSS.bossDef && L.BOSS.bossDef.id, 'bossDef terpasang');
  assert.strictEqual(L.BOSS.bossDef.id, 'penjaga-mesin');
  assert.ok(Themes.THEMES[L.BOSS.tema], 'tema boss terdaftar');
  assert.ok(L.BOSS.bossDef.phases.length >= 2, 'boss minimal dua fase');

  assert.strictEqual(L.BOSSES.length, 7, 'satu boss untuk tiap bab');
  assert.strictEqual(L.BOSSES[1].id, 16);
  assert.deepStrictEqual(L.validateBoss(L.BOSS2), []);
  assert.strictEqual(L.BOSS2.bossDef.id, 'raja-bandit');
  assert.ok(Themes.THEMES[L.BOSS2.tema], 'tema boss kedua terdaftar');
  assert.ok(L.BOSS2.bossDef.phases.length >= 2, 'boss kedua minimal dua fase');
});

ok('delapan tema terdaftar, asetnya ada, dan semuanya dipakai level', () => {
  const ids = Object.keys(Themes.THEMES);
  assert.ok(ids.length >= 8, 'butuh minimal 8 tema, ada ' + ids.length);
  for (const id of ids) {
    const th = Themes.THEMES[id];
    assert.strictEqual(th.id, id, 'id tema harus cocok');
    const paths = [th.bg];
    Object.values(th.tiles).forEach((p) => paths.push(p));
    Object.values(th.decor).forEach((p) => paths.push(p));
    Object.values(th.hero).forEach((p) => { if (typeof p === 'string') paths.push(p); });
    for (const p of paths) {
      const file = path.join(__dirname, '..', 'public', 'mh4', p);
      assert.ok(fs.existsSync(file), `aset tema ${id} tidak ada: ${p}`);
    }
  }
  const used = new Set(L.LEVELS.map((lv) => lv.tema));
  assert.ok(used.size >= 8, 'tiap tema harus dipakai minimal satu level');
  for (const id of ids) assert.ok(used.has(id), `tema ${id} belum dipakai level mana pun`);
  for (const lv of L.LEVELS) {
    assert.ok(Themes.THEMES[lv.tema], `level ${lv.id}: tema ${lv.tema} tidak terdaftar`);
    if (!lv.tower) assert.strictEqual(lv.tema, L.PLAN.find((x) => x.id === lv.id).tema, `level ${lv.id}: tema harus sama dengan PLAN`);
  }
});

ok('seluruh variasi ruang terpakai di empat belas level', () => {
  const used = new Set();
  for (const lv of L.LEVELS) lv.rooms.forEach((r) => used.add(r.id));
  const missing = Chunks.map((c) => c.id).filter((id) => !used.has(id));
  assert.deepStrictEqual(missing, [], 'ruang belum terpakai: ' + missing.join(', '));
  assert.ok(used.size >= 60, 'minimal 60 jenis ruang terpakai, ada ' + used.size);
});

ok('duri menempel tanah dan bintang tidak bertumpuk duri', () => {
  const scan = (label, rows) => {
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        const ch = rows[r][c];
        if (ch === '^') {
          const below = r + 1 < rows.length ? rows[r + 1][c] : '';
          assert.ok(below === '#' || below === '^', `${label}: duri melayang di ${c},${r}`);
        }
        if (ch !== '*') continue;
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const rr = r + dr, cc = c + dc;
          if (rows[rr] && rows[rr][cc] === '^') {
            assert.fail(`${label}: bintang ${c},${r} menempel duri ${cc},${rr}`);
          }
        }
      }
    }
  };
  for (const ch of Chunks) scan('ruang ' + ch.id, ch.rows);
  for (const lv of L.ALL) scan('level ' + lv.id, lv.map);
});

ok('hanya karakter tile MH4 yang dipakai', () => {
  const legal = new Set(['#', '=', '^', '*', 'S', 'E', 'C', 'K', 'G', '.', 'e', 'a', 'g', 'f', 'r', 's', '~', '-', '|', '(', ')', '>', '<', 'o', 'L', 'Q', 'Z', 'b', 'j', 'm', 'w', 'h', 'u', 'p']);
  for (const lv of L.LEVELS.filter((x) => !x.tower)) {
    for (const row of lv.map) for (const ch of row) assert.ok(legal.has(ch), `level ${lv.id}: karakter tak dikenal "${ch}"`);
  }
});

ok('musuh hanya muncul di level tier >= 1 dan berdiri di tanah datar', () => {
  const chars = new Set(['e', 'a', 'g', 'b', 'j', 'm', 'w', 'h', 'u', 'p']);
  for (const lv of L.LEVELS.filter((x) => !x.tower)) {
    let count = 0;
    lv.map.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        if (!chars.has(row[c])) continue;
        count++;
        assert.ok(r + 1 < lv.map.length && lv.map[r + 1][c] === '#', `level ${lv.id}: musuh tanpa tanah di ${c},${r}`);
        assert.ok(lv.map[r][c - 1] === '.' && lv.map[r][c + 1] === '.', `level ${lv.id}: musuh terjepit di ${c},${r}`);
      }
    });
    if (lv.tier === 0) assert.strictEqual(count, 0, `level ${lv.id}: tutorial tanpa musuh`);
    else assert.ok(count >= 1, `level ${lv.id}: level tier ${lv.tier} butuh musuh`);
  }
});

ok('tipe musuh bertambah sesuai tier', () => {
  const seen = new Set();
  for (const lv of L.LEVELS.filter((x) => !x.tower)) {
    for (const row of lv.map) for (const ch of row) if ('eag'.includes(ch)) seen.add(ch);
  }
  for (const ch of ['e', 'a', 'g']) assert.ok(seen.has(ch), `tipe musuh "${ch}" belum dipakai level mana pun`);
});

ok('gerbang, peti, tujuan berurutan dan ada checkpoint', () => {
  for (const lv of L.LEVELS.filter((x) => !x.tower)) {
    const cols = (ch) => {
      const out = [];
      lv.map.forEach((row, r) => { for (let c = 0; c < row.length; c++) if (row[c] === ch) out.push(c); });
      return out;
    };
    const s = cols('S'), e = cols('E'), k = cols('K'), g = cols('G'), cp = cols('C');
    assert.strictEqual(s.length, 1, `level ${lv.id}: satu S`);
    assert.strictEqual(e.length, 1, `level ${lv.id}: satu E`);
    assert.ok(g.length > 0, `level ${lv.id}: ada G`);
    assert.ok(Math.max(...g) < Math.min(...k), `level ${lv.id}: G sebelum K`);
    assert.ok(Math.min(...k) < Math.min(...e), `level ${lv.id}: K sebelum E`);
    assert.ok(cp.length >= 1, `level ${lv.id}: minimal satu checkpoint`);
  }
});

ok('tinggi lompat T=16 tetap 4 tile', () => {
  const P = require('../public/mh4/js/physics.js');
  const h = (P.C.JUMP * P.C.JUMP) / (2 * P.C.GRAVITY);
  assert.ok(h >= 60 && h <= 68, 'tinggi lompat ' + h.toFixed(1) + ' px, harus sekitar 64 px');
  assert.ok(P.C.MAXFALL > 0 && P.C.MOVE > 0 && P.C.PW < P.C.T && P.C.PH > P.C.T);
});

ok('jalur UMD browser menghasilkan peta yang sama', () => {
  const vm = require('vm');
  const root = path.join(__dirname, '..');
  const ctx = { console };
  ctx.self = ctx; ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of [
    'public/shared/levelgen/core.js',
    'public/mh4/js/boss/schema.js',
    'public/mh4/js/boss/machine.js',
    'public/mh4/js/boss/bosses/roster.js',
    'public/mh4/js/boss/gen.js',
    'public/mh4/js/gen/chunks.js',
    'public/mh4/js/gen/rules.js',
    'public/mh4/js/gen/levels.js',
    'public/mh4/js/theme.js',
  ]) {
    vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
  }
  assert.ok(ctx.MH4 && ctx.MH4.levels, 'MH4.levels harus terpasang di global browser');
  assert.strictEqual(
    JSON.stringify(ctx.MH4.levels.LEVELS[0].map),
    JSON.stringify(L.LEVELS[0].map),
    'hasil jalur browser harus sama dengan Node'
  );
  assert.strictEqual(
    Object.keys(ctx.MH4.themes.THEMES).sort().join(','),
    Object.keys(Themes.THEMES).sort().join(','),
    'tema lewat jalur browser harus sama dengan Node'
  );
  assert.strictEqual(
    JSON.stringify(ctx.MH4.levels.BOSS.map),
    JSON.stringify(L.BOSS.map),
    'arena boss lewat jalur browser harus sama dengan Node'
  );
  assert.strictEqual(JSON.stringify(ctx.MH4.levels.validateBoss(ctx.MH4.levels.BOSS)), '[]', 'boss browser valid');
});

{
  const assert2 = require('assert');
  const LV = require('../public/mh4/js/gen/levels.js');
  // Pemeriksa jalur harus menerima semua level kampanye, dan menolak jurang yang mustahil.
  for (const def of LV.LEVELS) assert2.ok(LV.reachable(def), `kampanye ${def.id} ${def.nama} terjangkau`);
  const gap = def0 => ({ map: def0 });
  assert2.ok(LV.reachable(gap(['......', 'S....E', '######'])), 'peta lurus terjangkau');
  assert2.ok(!LV.reachable(gap(['.'.repeat(30), 'S' + '.'.repeat(28) + 'E', '###' + '.'.repeat(24) + '###'])), 'jurang lebar ditolak');
  assert2.ok(!LV.reachable(gap([...Array(12).fill('...#...'), 'S..#..E', '#######'])), 'tembok penuh ditolak');
  // Level acak: deterministik, lolos pemeriksaan, dan beragam.
  assert2.strictEqual(JSON.stringify(LV.genLevel(77, { tier: 2 }).map), JSON.stringify(LV.genLevel(77, { tier: 2 }).map), 'seed sama, peta sama');
  const temas = new Set(), bentuk = new Set();
  let towers = 0;
  for (const tier of [1, 2, 3]) {
    for (let seed = 1; seed <= 60; seed++) {
      const def = LV.genLevel(seed * 137, { tier });
      assert2.deepStrictEqual(LV.validate(def), [], `seed ${seed * 137} tier ${tier}`);
      assert2.ok(LV.reachable(def), `seed ${seed * 137} tier ${tier} terjangkau`);
      assert2.strictEqual(def.id, 35); assert2.strictEqual(def.seed, seed * 137);
      temas.add(def.tema); bentuk.add(def.map.join('').length);
      if (def.tower) towers++;
    }
  }
  assert2.strictEqual(temas.size, 8, 'semua tema muncul');
  assert2.ok(bentuk.size > 30, 'bentuk peta beragam');
  assert2.ok(towers >= 10 && towers <= 90, `menara sekali-sekali (${towers})`);
  console.log('ok level acak terjangkau, deterministik, dan beragam');
}
console.log(`\n${n} tes generator MH4 lulus.`);
