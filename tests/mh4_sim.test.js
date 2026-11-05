// Tes simulasi MH4: parse, jatuh, lompat, bintang, checkpoint, gerbang, kemenangan.
// Jalankan: node tests/mh4_sim.test.js
'use strict';
const assert = require('assert');
const L = require('../public/mh4/js/gen/levels.js');
const Sim = require('../public/mh4/js/sim.js');
const { T } = require('../public/mh4/js/physics.js');

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok ' + name); };
const mk = (id) => Sim.create(L.level(id || 1));
const find = (lv, ch) => {
  const out = [];
  lv.map.forEach((row, r) => { for (let c = 0; c < row.length; c++) if (row[c] === ch) out.push({ c, r }); });
  return out;
};

ok('parse memetakan semua benda penting', () => {
  const lv = L.level(1);
  const g = mk(1);
  assert.strictEqual(g.phase, 'play');
  assert.ok(g.L.start && g.L.goal, 'start dan goal');
  assert.strictEqual(g.L.gates.length, find(lv, 'G').length, 'semua sel G terbaca');
  assert.strictEqual(g.L.checkpoints.length, find(lv, 'C').length, 'semua checkpoint terbaca');
  assert.strictEqual(g.L.stars.length, find(lv, '*').length, 'semua bintang terbaca');
  assert.ok(g.L.chests.length >= 1, 'peti reward terbaca');
});

ok('hero jatuh lalu berdiri di tanah', () => {
  const g = mk(1);
  for (let i = 0; i < 120; i++) Sim.update(g, 1 / 60, {});
  assert.ok(g.p.onGround, 'setelah 2 detik hero harus di tanah');
  assert.strictEqual(Math.round(g.p.y + g.p.h), Math.round(g.L.start.y), 'kaki di lantai awal');
  assert.strictEqual(g.hp, Sim.MAX_HP, 'tidak kehilangan HP hanya karena berdiri');
});

ok('kontrol kanan menggerakkan hero', () => {
  const g = mk(1);
  const x0 = g.p.x;
  for (let i = 0; i < 30; i++) Sim.update(g, 1 / 60, { right: true });
  assert.ok(g.p.x > x0 + 20, 'hero harus bergerak ke kanan');
});

ok('lompat dan lompat ganda menaikkan hero', () => {
  const g = mk(1);
  for (let i = 0; i < 30; i++) Sim.update(g, 1 / 60, {});
  const y0 = g.p.y;
  Sim.update(g, 1 / 60, { jump: true });
  Sim.update(g, 1 / 60, { jump: true });
  for (let i = 0; i < 6; i++) Sim.update(g, 1 / 60, { jump: true });
  assert.ok(g.p.y < y0 - 10, 'hero harus naik saat melompat');
  const y1 = g.p.y;
  Sim.update(g, 1 / 60, { jump: false });
  Sim.update(g, 1 / 60, { jump: true });
  for (let i = 0; i < 4; i++) Sim.update(g, 1 / 60, { jump: true });
  assert.ok(g.p.y < y1 - 4, 'lompat kedua harus menambah tinggi');
});

ok('bintang diambil sekali dan dihitung', () => {
  const g = mk(1);
  const s = g.L.stars[0];
  Sim.teleport(g, s.c, s.r);
  Sim.takeEvents(g);
  Sim.update(g, 1 / 60, {});
  assert.ok(g.stars >= 1, 'bintang bertambah');
  assert.ok(s.got, 'bintang ditandai diambil');
  const before = g.stars;
  Sim.update(g, 1 / 60, {});
  assert.strictEqual(g.stars, before, 'bintang tidak dihitung dua kali');
});

ok('checkpoint memindahkan titik respawn', () => {
  const g = mk(1);
  const c = g.L.checkpoints[g.L.checkpoints.length - 1];
  const cp0 = g.cp.x;
  Sim.teleport(g, c.c, c.r);
  Sim.update(g, 1 / 60, {});
  assert.ok(c.got, 'checkpoint tersentuh');
  assert.ok(g.cp.x > cp0, 'titik respawn maju');
  const cpX = g.cp.x;
  g.p.y = g.L.rows * T + 400;
  const ev = Sim.takeEvents(g);
  Sim.update(g, 1 / 60, {});
  assert.ok(Sim.takeEvents(g).concat(ev).some((e) => e.type === 'respawn'), 'jatuh harus respawn');
  assert.ok(Math.abs(g.p.x + g.p.w / 2 - cpX) < 2, 'respawn di checkpoint terakhir');
});

ok('gerbang menutup jalan lalu terbuka', () => {
  const g = mk(1);
  const gateCol = g.L.gateCol;
  assert.ok(gateCol > 0, 'level punya gerbang');
  const solid = (c, r) => g.L.tiles[r * g.L.cols + c] === 1;
  assert.ok(solid(gateCol, 0), 'gerbang padat dari atas');
  Sim.teleport(g, gateCol - 2, g.L.gates[0].r - 1);
  Sim.takeEvents(g);
  Sim.update(g, 1 / 60, {});
  assert.ok(Sim.takeEvents(g).some((e) => e.type === 'gate'), 'mendekati gerbang memunculkan event gate');
  Sim.openGate(g);
  assert.ok(g.gateOpen, 'gerbang terbuka');
  for (const cell of g.L.gates) assert.strictEqual(g.L.tiles[cell.r * g.L.cols + cell.c], 0, 'sel G hilang setelah dibuka');
  const x0 = g.p.x;
  for (let i = 0; i < 120; i++) Sim.update(g, 1 / 60, { right: true });
  assert.ok(g.p.x > x0 + 20, 'setelah terbuka hero bisa lewat');
});

ok('menyentuh tujuan menang', () => {
  const g = mk(1);
  Sim.openGate(g);
  const e = g.L.goal;
  Sim.teleport(g, Math.floor((e.x + e.w / 2) / T), e.r);
  Sim.update(g, 1 / 60, {});
  assert.strictEqual(g.phase, 'win', 'fase menjadi win');
});

ok('tombol atas juga memicu lompat', () => {
  const g = mk(1);
  for (let i = 0; i < 30; i++) Sim.update(g, 1 / 60, {});
  const y0 = g.p.y;
  Sim.update(g, 1 / 60, { up: true });
  for (let i = 0; i < 7; i++) Sim.update(g, 1 / 60, { up: true });
  assert.ok(g.p.y < y0 - 10, 'input.up harus melompat seperti jump');
});

// Peta kecil: S berdiri di platform `=` setinggi 4 tile di atas lantai.
const DROP_MAP = [
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '..S.................',
  '.====...............',
  '....................',
  '....................',
  '..................E.',
  '####################',
  '....................',
];

ok('tombol bawah menembus platform tembus', () => {
  const stay = Sim.create({ map: DROP_MAP });
  for (let i = 0; i < 90; i++) Sim.update(stay, 1 / 60, {});
  assert.ok(Math.abs(stay.p.y + stay.p.h - 6 * T) < 1.5, 'tanpa bawah hero tetap di platform');

  const drop = Sim.create({ map: DROP_MAP });
  for (let i = 0; i < 90; i++) Sim.update(drop, 1 / 60, { down: true });
  assert.ok(drop.p.y + drop.p.h >= 10 * T - 1.5, 'dengan bawah hero jatuh ke lantai');
  assert.ok(drop.p.onGround, 'hero mendarat di lantai, bukan menembusnya');
});

ok('tombol bawah mempercepat jatuh di udara', () => {
  const normal = Sim.create({ map: DROP_MAP });
  const fast = Sim.create({ map: DROP_MAP });
  Sim.teleport(normal, 2, 0);
  Sim.teleport(fast, 2, 0);
  for (let i = 0; i < 10; i++) {
    Sim.update(normal, 1 / 60, {});
    Sim.update(fast, 1 / 60, { down: true });
  }
  assert.ok(fast.p.y > normal.p.y + 2, 'dengan bawah hero jatuh lebih cepat');
});

ok('simulasi deterministik untuk input sama', () => {
  const a = mk(2), b = mk(2);
  const input = { right: true };
  for (let i = 0; i < 180; i++) {
    input.jump = i % 37 === 0;
    Sim.update(a, 1 / 60, input);
    Sim.update(b, 1 / 60, input);
  }
  assert.strictEqual(JSON.stringify(a.p), JSON.stringify(b.p));
  assert.strictEqual(a.stars, b.stars);
});

ok('HP berkurang saat bahaya dan isi ulang setelah habis', () => {
  const g = mk(1);
  const spike = g.L.spikes[0];
  assert.ok(spike, 'level punya duri');
  Sim.teleport(g, spike.c, spike.r);
  Sim.takeEvents(g);
  Sim.update(g, 1 / 60, {});
  assert.ok(g.hp < Sim.MAX_HP, 'kena duri mengurangi HP');
  assert.ok(g.hp >= Sim.MAX_HP - 10, 'satu duri tidak menghabiskan semua HP');
  g.invuln = 0;
  g.hp = 10;
  Sim.hurt(g, 'duri', 10);
  assert.strictEqual(g.hp, Sim.MAX_HP, 'HP habis langsung diisi ulang');
  assert.ok(g.deaths >= 1, 'kematian dihitung');
  assert.ok(Sim.takeEvents(g).some((e) => e.type === 'respawn'), 'HP habis memicu respawn');
});

console.log(`\n${n} tes simulasi MH4 lulus.`);
