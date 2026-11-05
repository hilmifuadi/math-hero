// Tes combat MH4: data senjata, aturan damage, ayunan melee, proyektil ranged,
// ganti senjata, HP musuh, knockback, dan angka damage.
// Jalankan: node tests/mh4_combat.test.js
'use strict';
const assert = require('assert');
const Sim = require('../public/mh4/js/sim.js');
const Damage = require('../public/mh4/js/combat/damage.js');
const Weapons = require('../public/mh4/js/combat/weapons.js');

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok ' + name); };
const tick = (g, input) => Sim.update(g, 1 / 60, input || {});
const tap = (g, key) => { tick(g, { [key]: true }); tick(g, {}); };
const frames = (g, count, input) => { for (let i = 0; i < count; i++) tick(g, input); };

const NEAR = [
  '....................',
  '....................',
  '....................',
  '....................',
  'S.e..............E..',
  '####################',
];
const FAR = [
  '....................',
  '....................',
  '....................',
  '....................',
  'S.........e.......E.',
  '####################',
];

ok('satu melee dan satu ranged terdaftar', () => {
  const types = Weapons.ORDER.map((id) => Weapons.get(id).type).sort();
  assert.deepStrictEqual(types, ['melee', 'ranged']);
  assert.strictEqual(Weapons.get('pedang').type, 'melee');
  assert.strictEqual(Weapons.get('blaster').type, 'ranged');
  assert.strictEqual(Weapons.get('tidak-ada').id, 'pedang', 'id tak dikenal jatuh ke pedang');
});

ok('damage dasar naik mengikuti tier', () => {
  const w = Weapons.get('pedang');
  assert.strictEqual(Weapons.damageFor(w, 0), w.damage);
  assert.ok(Weapons.damageFor(w, 3) > w.damage, 'tier menambah damage');
  assert.strictEqual(Damage.scale(10, 0), 10);
  assert.ok(Damage.scale(10, 3) > 10);
});

ok('Damage.hit menghormati HP, invuln, dan kematian', () => {
  const t = { hp: 10 };
  assert.strictEqual(Damage.hit(t, 4), 4);
  assert.strictEqual(t.hp, 6);
  t.invuln = 1;
  assert.strictEqual(Damage.hit(t, 4), 0, 'invuln mengabaikan damage');
  t.invuln = 0;
  assert.strictEqual(Damage.hit(t, 40), 40, 'damage boleh melebihi HP');
  assert.strictEqual(t.hp, 0);
  assert.ok(t.dead, 'target mati saat HP 0');
  assert.strictEqual(Damage.hit(t, 4), 0, 'target mati tidak bisa dilukai lagi');
  const small = { hp: 5 };
  assert.strictEqual(Damage.hit(small, 0.1), Damage.MIN_DAMAGE, 'damage minimal 1');
});

ok('kotak melee berada di depan hero sesuai arah', () => {
  const w = Weapons.get('pedang');
  const p = { x: 100, y: 50, w: 14, h: 26 };
  const right = Weapons.meleeBox(p, 1, w);
  const left = Weapons.meleeBox(p, -1, w);
  assert.ok(right.x > p.x, 'menghadap kanan: kotak di kanan');
  assert.ok(left.x < p.x, 'menghadap kiri: kotak di kiri');
  assert.ok(right.w >= w.range && right.h >= w.height);
});

ok('serangan melee mengurangi HP musuh dan memunculkan angka', () => {
  const g = Sim.create({ map: NEAR });
  const e = g.enemies[0];
  assert.strictEqual(g.weapon, 'pedang');
  tap(g, 'attack');
  assert.ok(g.swing, 'ayunan melee aktif');
  assert.strictEqual(g.shots.length, 0, 'melee tidak membuat proyektil');
  assert.ok(e.hp < e.maxHp, 'HP musuh berkurang');
  assert.ok(e.knock > 0, 'musuh terdorong');
  assert.ok(g.numbers.some((x) => x.target === 'enemy' && x.amount > 0), 'angka damage musuh muncul');
  frames(g, 30);
  tap(g, 'attack');
  assert.ok(e.dead || !e.alive, 'dua tebasan mengalahkan musuh level awal');
});

ok('serangan ranged membuat proyektil dan mengenai musuh', () => {
  const g = Sim.create({ map: FAR });
  const e = g.enemies[0];
  tap(g, 'switch');
  assert.strictEqual(g.weapon, 'blaster');
  tap(g, 'attack');
  assert.ok(g.shots.length >= 1, 'blaster membuat proyektil');
  const p0 = g.shots[0].x;
  frames(g, 10);
  assert.ok(g.shots.length === 0 || g.shots[0].x > p0, 'proyektil bergerak ke kanan');
  frames(g, 80);
  assert.ok(e.hp < e.maxHp || e.dead, 'proyektil mengenai musuh');
});

ok('ganti senjata bolak-balik dan memicu event', () => {
  const g = Sim.create({ map: NEAR });
  Sim.takeEvents(g);
  tap(g, 'switch');
  assert.strictEqual(g.weapon, 'blaster');
  tap(g, 'switch');
  assert.strictEqual(g.weapon, 'pedang');
  const ev = Sim.takeEvents(g).filter((e) => e.type === 'weapon');
  assert.strictEqual(ev.length, 2, 'dua event ganti senjata');
  assert.strictEqual(ev[0].id, 'blaster');
});

ok('cooldown mencegah spam serangan', () => {
  const g = Sim.create({ map: NEAR });
  tap(g, 'attack');
  const hp1 = g.enemies[0].hp;
  tap(g, 'attack');
  assert.strictEqual(g.enemies[0].hp, hp1, 'serangan kedua diabaikan saat cooldown');
  frames(g, 30);
  tap(g, 'attack');
  assert.ok(g.enemies[0].hp < hp1, 'setelah cooldown serangan jalan lagi');
});

console.log(`\n${n} tes combat MH4 lulus.`);
