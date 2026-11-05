// Uji logika level Kejar MH3 di Node:  node tests/mh3_plat.test.js
// Level dibuat level generator (seed tetap). Tiap level harus lulus pemeriksa level (jalur ada) dan
// punya isi wajib (chest). Penamatan level dilakukan manual; tidak ada bot yang menggating `npm test`.
const assert = require('assert');
const Sim = require('../public/mh3/js/plat/sim.js');
const Lv = require('../public/mh3/js/plat/levels.js');
const Gen = require('../public/shared/js/levelgen.js');
const { check, fromKejar } = require('../public/shared/js/levelcheck.js');
const { T } = require('../public/shared/js/physics.js');

for (const lv of Lv.LEVELS) {
  const plan = Lv.PLAN.find((p) => p.id === lv.id);
  // generator deterministik: seed yang sama = peta yang sama
  assert.deepStrictEqual(Gen.generate(Object.assign({ tema: plan.tema }, plan.gen)).map, lv.map, `level ${lv.id} deterministik`);
  const r = check(fromKejar(lv, Sim.parse(lv), Sim.K));
  assert.ok(r.ok, `level ${lv.id} lulus pemeriksa level: ${(r.msg || []).join('; ')}`);
  assert.ok(lv.rooms.some((x) => x.dy), `level ${lv.id} punya ruang naik/turun`);
  const g = Sim.create(lv);
  assert.strictEqual(g.L.chests.length, 2, 'tiap level punya Peti Kekuatan dan Peti Kristal');
  assert.ok(g.L.stars.length > 0, `level ${lv.id} punya bintang`);
  console.log(`ok: level ${lv.id} "${lv.nama}" ${lv.map[0].length}x${lv.map.length}, ruang ${lv.rooms.length}, bintang ${g.L.stars.length}`);
}
// Checkpoint: jatuh ke dasar peta mengembalikan ke checkpoint terakhir tanpa macet.
{
  const lv = Lv.LEVELS[0], g = Sim.create(lv);
  g.p.y = lv.map.length * T + 10;
  for (let i = 0; i < 120; i++) Sim.update(g, 1 / 60, { dir: 0 });
  assert.strictEqual(g.phase, 'play');
  assert.ok(g.hearts >= 1, 'masih punya hati setelah jatuh');
  assert.ok(Math.abs(g.p.x + g.p.w / 2 - g.cp.x) < 2, 'kembali ke checkpoint');
}
// Habis hati: ulang dari checkpoint dengan hati penuh.
{
  const g = Sim.create(Lv.LEVELS[0]);
  g.cp = { x: 30 * T, y: 11 * T };
  for (let i = 0; i < 3; i++) { g.invuln = 0; Sim.hurt(g, 'duri'); }
  assert.strictEqual(g.hearts, Sim.HEARTS); assert.strictEqual(g.deaths, 1);
  assert.ok(Math.abs(g.p.x + g.p.w / 2 - 30 * T) < 2, 'kembali ke checkpoint');
}
// Perisai menahan pukulan lalu mengisi ulang (tetap jadi kekuatan aktif).
{
  const g = Sim.create(Lv.LEVELS[0]);
  Sim.grantPower(g, 'shield'); Sim.hurt(g, 'musuh');
  assert.strictEqual(g.hearts, Sim.HEARTS); assert.strictEqual(g.power, 'shield'); assert.strictEqual(g.shield.ready, false);
}
// Generator: banyak seed acak di tiap tier lulus pemeriksa level, dan tier tinggi lebih banyak naik/turun.
{
  const all = ['tangga', 'per', 'kotak', 'tuas', 'pipa', 'lift', 'gerak', 'rapuh', 'samping', 'saklar', 'gergaji', 'gergaji_gerak'];
  const vert = [0, 0, 0, 0];
  for (let tier = 0; tier < 4; tier++) {
    for (let s = 1; s <= 6; s++) {
      const d = Gen.generate({ seed: 900 + s, tier, tema: 'padang', mech: tier ? all : ['tangga', 'per', 'tuas'], quiz: 2, sec: 120 });
      assert.ok(d.map.every((row) => row.length === d.map[0].length), 'peta persegi');
      const r = check(fromKejar(Object.assign({ id: 's' + s, nama: 'acak' }, d), Sim.parse(d), Sim.K));
      assert.ok(r.ok, `seed ${900 + s} tier ${tier} lulus: ${(r.msg || []).join('; ')}`);
      vert[tier] += d.rooms.filter((x) => x.dy).length / d.rooms.length;
    }
  }
  assert.ok(vert[3] > vert[0], `tier 3 lebih vertikal dari tier 0 (${vert.map((v) => (v / 6).toFixed(2)).join(' ')})`);
  console.log('ok: 24 seed acak lulus pemeriksa level, porsi ruang vertikal per tier', vert.map((v) => (v / 6).toFixed(2)).join(' '));
}
console.log('semua uji Kejar lulus');
