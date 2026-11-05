// Tes soal per kelas, tiga gerbang, mini boss, menara, dan mekanik peta.
const assert = require('assert');
const Soal = require('../public/mh4/js/soal.js');
const L = require('../public/mh4/js/gen/levels.js');
const Sim = require('../public/mh4/js/sim.js');
let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok', name); };

ok('kelas 1 sampai 6 punya soal dengan empat pilihan unik berisi jawaban', () => {
  for (let k = 1; k <= 6; k++) {
    for (let seed = 1; seed <= 300; seed++) {
      const q = Soal.buat(k, seed * 37 + k);
      assert.strictEqual(q.kelas, k);
      assert.strictEqual(q.pilihan.length, 4, `kelas ${k}: ${q.teks} -> ${q.pilihan}`);
      assert.strictEqual(new Set(q.pilihan.map(String)).size, 4, `kelas ${k}: pilihan kembar ${q.teks} -> ${q.pilihan}`);
      assert.ok(q.pilihan.some((v) => Soal.periksa(q, v)), 'jawaban ada di pilihan');
      assert.ok(q.langkah[0], 'punya petunjuk');
      assert.ok(q.teks.length <= 34, 'teks pendek: ' + q.teks);
    }
  }
});

ok('variasi kelas mengikuti aturan K-2, K-1, K', () => {
  const at = (k) => [0, 1, 2].map((i) => Soal.kelasSoal(k, i));
  assert.deepStrictEqual(at(3), [1, 2, 3]);
  assert.deepStrictEqual(at(5), [3, 4, 5]);
  assert.deepStrictEqual(at(1), [1, 1, 1]);
  assert.deepStrictEqual(at(2), [1, 1, 2]);
  assert.deepStrictEqual(at(6), [4, 5, 6]);
});

ok('semua level punya minimal tiga gerbang yang terbuka berurutan', () => {
  for (const lv of L.LEVELS) {
    const g = Sim.create(lv);
    assert.ok(g.L.gateGroups.length >= 3, `level ${lv.id}: gerbang ${g.L.gateGroups.length}`);
    while (!g.gateOpen) Sim.openGate(g);
    assert.strictEqual(g.gateIdx, g.L.gateGroups.length);
  }
});

ok('mini boss ada, dan kuncinya terbuka saat kalah', () => {
  const minis = L.LEVELS.filter((lv) => lv.mini);
  assert.ok(minis.length >= 6, 'mini boss di ' + minis.length + ' level');
  const g = Sim.create(minis[0]);
  const m = g.enemies.find((e) => e.kind === 'ogre' || e.kind === 'slimeking');
  assert.ok(m && g.L.locks.length, 'mini boss dan kunci ada');
  m.awake = true; m.hp = 1;
  for (let i = 0; i < 400 && m.alive; i++) {
    g.p.x = m.x - 12; g.p.y = m.y + m.h - g.p.h; g.invuln = 1; g.face = 1;
    Sim.update(g, 1 / 60, { attack: i % 40 === 0 });
  }
  assert.ok(!m.alive, 'mini boss kalah');
  assert.ok(g.L.locks.every((k) => g.L.tiles[k.r * g.L.cols + k.c] === 0), 'kunci terbuka');
});

// Graf pijakan: dari satu tempat berdiri bisa ke tempat lain dalam jangkauan lompat ganda.
function towerReach(lv) {
  const map = lv.map, H = map.length, W = map[0].length;
  const stands = [];
  let start = null, goal = null;
  for (let r = 1; r < H; r++) {
    for (let c = 1; c < W - 1; c++) {
      if (map[r][c] === 'S') start = [c, r + 1];
      if (map[r][c] === 'E') goal = [c, r + 1];
      if ('#=~-|G'.includes(map[r][c]) && !'#G'.includes(map[r - 1][c])) stands.push([c, r]);
    }
  }
  const key = (p) => p.join();
  const seen = new Set([key(start)]), q = [start];
  while (q.length) {
    const [c, r] = q.pop();
    for (const p of stands) {
      if (seen.has(key(p))) continue;
      const dy = r - p[1], dx = Math.abs(c - p[0]);
      if (dy <= 6 && dx <= (dy > 4 ? 4 : 6)) { seen.add(key(p)); q.push(p); }
    }
  }
  return seen.has(key(goal));
}

ok('menara lebih tinggi dari lebar, bisa didaki, dan punya papan runtuh', () => {
  const towers = L.LEVELS.filter((lv) => lv.tower);
  assert.ok(towers.length >= 4);
  for (const lv of towers) {
    assert.ok(lv.map.length > lv.map[0].length * 1.5, 'menara harus tinggi');
    assert.ok(lv.map[0].length >= 30, 'cukup lebar');
    assert.deepStrictEqual(L.validate(lv), []);
    assert.ok(lv.map.join('').includes('~'), 'ada papan runtuh');
    assert.ok(towerReach(lv), `menara ${lv.id} harus bisa didaki`);
  }
});

ok('papan runtuh hilang lalu kembali, per melontarkan hero', () => {
  const map = ['.........', '.........', '.........', '.........', '.S.....E.', '###~~~###', '.........', '####s####', '#########'];
  const g = Sim.create({ map });
  g.p.x = 3.5 * 16; g.p.y = 5 * 16 - g.p.h - 1; g.p.vy = 60;
  for (let i = 0; i < 4; i++) Sim.update(g, 1 / 60, {});
  const c = g.L.crumbles.find((x) => x.state === 'shake');
  assert.ok(c, 'papan bergetar saat diinjak');
  for (let i = 0; i < 35; i++) Sim.update(g, 1 / 60, {});
  assert.strictEqual(c.state, 'gone');
  assert.strictEqual(g.L.tiles[c.r * g.L.cols + c.c], 0);
  let launched = false;
  g.p.x = 4 * 16 + 2; g.p.y = 6 * 16;
  for (let i = 0; i < 120 && !launched; i++) { Sim.update(g, 1 / 60, {}); launched = g.p.vy < -300; }
  assert.ok(launched, 'per melontarkan hero');
  for (let i = 0; i < 170; i++) { g.p.y = 0; g.p.vy = 0; Sim.update(g, 1 / 60, {}); }
  assert.strictEqual(c.state, 'idle', 'papan kembali');
});

ok('terowongan memindahkan hero ke ujungnya', () => {
  const g = Sim.create({ map: ['..........', '..........', '.S(....)E.', '##########'] });
  const out = g.L.pipesOut[0];
  g.p.x = 2 * 16 + 4; g.p.y = 3 * 16 - g.p.h;
  const x0 = g.p.x;
  Sim.update(g, 1 / 60, {});
  assert.strictEqual(g.p.x, x0, 'berdiri di pintu tidak berpindah sendiri');
  Sim.update(g, 1 / 60, { down: true });
  assert.ok(Math.abs(g.p.x + g.p.w / 2 - out.cx) < 3, 'tekan bawah masuk pintu');
  for (let i = 0; i < 60; i++) Sim.update(g, 1 / 60, {});
  Sim.update(g, 1 / 60, { down: true });
  assert.ok(g.p.x < 4 * 16, 'pintu dua arah');
});

ok('peluru tidak memilih jawaban, skor berubah, dan bonus waktu turun', () => {
  const g = Sim.create(L.level(1));
  assert.strictEqual(g.score, 0);
  Sim.addScore(g, 100); Sim.addScore(g, -300);
  assert.strictEqual(g.score, 0, 'skor tidak negatif');
  const cepat = Sim.timeBonus(g);
  g.t = 100000;
  assert.ok(Sim.timeBonus(g) < cepat && Sim.timeBonus(g) >= 100);
});

ok('PR soal cerita ada untuk kelas 1 sampai 6', () => {
  for (let k = 1; k <= 6; k++) {
    for (let s = 1; s <= 200; s++) {
      const q = Soal.cerita(k, s * 41 + k);
      assert.ok(Number.isInteger(q.jawaban), 'jawaban bulat: ' + q.teks + ' = ' + q.jawaban);
      assert.ok(q.jawaban >= 0 && q.teks.length > 20 && q.langkah.length);
    }
  }
});

ok('tiap tema punya musuh khas', () => {
  const sets = {};
  for (const lv of L.LEVELS) {
    sets[lv.tema] = sets[lv.tema] || new Set();
    for (const ch of lv.map.join('').replace(/[^eagfrbjmwhup]/g, '')) sets[lv.tema].add(ch);
  }
  for (const [t, s] of Object.entries(sets)) assert.ok(s.size >= 3, t + ' hanya ' + [...s].join(''));
  assert.ok(new Set(Object.values(sets).map((s) => [...s].sort().join(''))).size >= 6, 'kumpulan musuh berbeda antar tema');
});

ok('pelontar samping lebih jauh dari lompat ganda, dan senjata pelontar tetap normal', () => {
  const row = '.'.repeat(70);
  const flat = (mark) => [row, row, row, row, row, row, row, row, mark, '#'.repeat(70)];
  const a = Sim.create({ map: flat('.S.>' + '.'.repeat(64) + 'E.') });
  a.p.x = 2 * 16; a.p.y = 9 * 16 - a.p.h;
  const start = a.L.dashes[0].x;
  let launched = false;
  for (let i = 0; i < 200; i++) {
    Sim.update(a, 1 / 60, {});
    if (i < 40 && !launched) { a.p.x += 2; }
    if (a.dashT > 0) launched = true;
    if (launched && a.dashT === 0) break;
  }
  assert.ok(launched, 'pelontar aktif');
  const far = (a.p.x - start) / 16;
  const b = Sim.create({ map: flat('.S' + '.'.repeat(66) + 'E.') });
  b.p.x = 2 * 16; b.p.y = 9 * 16 - b.p.h;
  for (let i = 0; i < 3; i++) Sim.update(b, 1 / 60, { right: true });
  const x0 = b.p.x;
  Sim.update(b, 1 / 60, { right: true, jump: true });
  for (let i = 0; i < 200; i++) {
    const press = b.p.vy >= -20 && !b.djumpUsed;
    Sim.update(b, 1 / 60, { right: true, jump: press });
    if (b.p.onGround) break;
  }
  const jump = (b.p.x - x0) / 16;
  assert.ok(jump < 11, 'lompat ganda ' + jump.toFixed(1) + ' petak');
  assert.ok(far > 13, 'pelontar samping ' + far.toFixed(1) + ' petak');
  assert.strictEqual(require('../public/mh4/js/combat/weapons.js').get('pelontar').lift, 170);
});

ok('platform gerak membawa hero', () => {
  const g = Sim.create({ map: ['............', '............', '.S........E.', '#..--------.', '############'] });
  const m = g.L.movers[0];
  g.p.x = m.x + 10; g.p.y = m.y - g.p.h;
  for (let i = 0; i < 5; i++) Sim.update(g, 1 / 60, {});
  const gap = g.p.x - m.x;
  for (let i = 0; i < 30; i++) Sim.update(g, 1 / 60, {});
  assert.ok(Math.abs(g.p.x - m.x - gap) < 2, 'jarak hero dan platform tetap');
  assert.ok(g.p.x > m.x0, 'hero ikut bergerak');
});

console.log(`\n${n} tes soal, menara, dan mekanik MH4 lulus.`);
