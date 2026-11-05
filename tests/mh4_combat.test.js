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
  assert.ok(g.cooldownMax > 0 && g.cooldown <= g.cooldownMax, 'indikator punya patokan penuh');
});

const withGear = (map, gear) => Sim.create({ map }, { loadout: gear });

ok('tiap senjata punya identitas dan hanya damage yang ikut level', () => {
  for (const id of [...Weapons.MELEE, ...Weapons.RANGED]) assert.ok(Weapons.get(id).desc, id + ' punya deskripsi');
  const meleeMin = Math.min(...Weapons.MELEE.map((id) => Weapons.get(id).damage));
  const rangedMax = Math.max(...Weapons.RANGED.map((id) => Weapons.get(id).damage));
  assert.ok(rangedMax < meleeMin, 'jarak jauh selalu lebih lemah per serangan');
  const sig = (id) => { const w = Weapons.get(id); return [w.range, w.height, w.cooldown, w.knockback, w.gravity, w.bounce, w.blast].join(); };
  assert.strictEqual(new Set([...Weapons.MELEE, ...Weapons.RANGED].map(sig)).size, Weapons.MELEE.length + Weapons.RANGED.length, 'semua berbeda');
  assert.ok(Weapons.damageFor(Weapons.get('palu'), 3) > Weapons.get('palu').damage);
});

ok('tombak mengenai musuh jauh yang tidak terjangkau pedang', () => {
  const FAR3 = ['....................', '....................', '....................', '....................', 'S..e..............E.', '####################'];
  const g1 = withGear(FAR3, { melee: 'pedang' });
  const g2 = withGear(FAR3, { melee: 'tombak' });
  for (const g of [g1, g2]) { g.enemies[0].x = g.p.x + g.p.w + 40; }
  tap(g1, 'attack'); tap(g2, 'attack');
  assert.strictEqual(g1.enemies[0].hp, g1.enemies[0].maxHp, 'pedang tidak sampai');
  assert.ok(g2.enemies[0].hp < g2.enemies[0].maxHp, 'tombak sampai');
});

ok('palu mendorong lebih jauh dan cooldown lebih lama', () => {
  const g1 = withGear(NEAR, { melee: 'pedang' });
  const g2 = withGear(NEAR, { melee: 'palu' });
  for (const g of [g1, g2]) g.enemies[0].hp = g.enemies[0].maxHp = 500;
  tap(g1, 'attack'); tap(g2, 'attack');
  assert.ok(Math.abs(g2.enemies[0].kx) > Math.abs(g1.enemies[0].kx), 'knockback lebih besar');
  assert.ok(g2.cooldown > g1.cooldown, 'cooldown lebih lama');
});

ok('pelontar melengkung dan meledak mengenai area', () => {
  const WIDE = ['....................', '....................', '....................', '....................', 'S..................E', '####################'];
  const g = withGear(WIDE, { ranged: 'pelontar' });
  tap(g, 'switch');
  assert.strictEqual(g.weapon, 'pelontar');
  tap(g, 'attack');
  assert.ok(g.shots[0].vy < -100, 'dilempar ke atas');
  frames(g, 150);
  assert.strictEqual(g.shots.length, 0, 'bom habis');
  assert.ok(Sim.takeEvents(g).some((e) => e.type === 'blast'), 'meledak saat menyentuh tanah');
});

ok('pemantul berbalik di dinding sesuai jumlah pantulan', () => {
  const g = withGear(['........#', 'S......E#', '#########'], { ranged: 'pantul' });
  tap(g, 'switch');
  tap(g, 'attack');
  const s = g.shots[0];
  assert.strictEqual(s.bounce, 2);
  let flipped = false;
  for (let i = 0; i < 60 && g.shots.length; i++) { tick(g); if (s.vx < 0) flipped = true; }
  assert.ok(flipped && s.bounce < 2, 'peluru memantul');
});

ok('tebasan mengenai musuh yang berdiri sedikit lebih rendah', () => {
  const w = Weapons.get('pedang');
  const p = { x: 100, y: 50, w: 12, h: 20 };
  const box = Weapons.meleeBox(p, 1, w);
  assert.ok(box.y + box.h >= p.y + p.h + 8, 'kotak sampai di bawah kaki hero');
});

ok('Pendingin hanya mempercepat senjata jauh', () => {
  const lo = { rangedCooldownMul: 0.5 };
  const g = withGear(NEAR, lo);
  tap(g, 'attack');
  assert.ok(Math.abs(g.cooldown - Weapons.get('pedang').cooldown) < 0.03, 'pedang tetap');
  const g2 = withGear(NEAR, lo);
  tap(g2, 'switch');
  tap(g2, 'attack');
  assert.ok(g2.cooldown < Weapons.get('blaster').cooldown * 0.6, 'blaster lebih cepat');
});

ok('kekuatan musuh dan senjata naik halus per level dan tetap seimbang', () => {
  const L = require('../public/mh4/js/gen/levels.js');
  const Enemies = require('../public/mh4/js/combat/enemies.js');
  const powers = L.LEVELS.map((l) => l.power).sort((x, y) => x - y);
  for (let i = 1; i < powers.length; i++) assert.ok(powers[i] > powers[i - 1], 'naik tiap level');
  assert.ok(powers[powers.length - 1] <= 3, 'tidak melewati arena boss');
  const pedang = Weapons.get('pedang');
  for (const lv of L.LEVELS) {
    const hits = Damage.scale(Enemies.get('walker').hp, lv.power) / Weapons.damageFor(pedang, lv.power);
    assert.ok(hits <= 2, `L${lv.id}: bandit maksimal dua tebasan tanpa upgrade`);
    const g = Sim.create(lv);
    for (const e of g.enemies) assert.ok(e.damage < g.maxHp / 2, `L${lv.id}: tidak mati dua kali kena`);
  }
});

ok('HP dan serangan boss ikut sebagian kekuatan hero', () => {
  const L = require('../public/mh4/js/gen/levels.js');
  const base = Sim.create(L.BOSS);
  const strong = Sim.create(L.BOSS, { loadout: { meleeMul: 2, maxHp: 30 } });
  assert.strictEqual(base.boss.maxHp, L.BOSS.bossDef.maxHp);
  assert.strictEqual(strong.boss.maxHp, Math.round(L.BOSS.bossDef.maxHp * 1.5));
  assert.strictEqual(strong.boss.hp, strong.boss.maxHp);
  strong.invuln = 0;
  Sim.hurt(strong, 'boss', 10); while (strong.dying > 0) Sim.update(strong, 1 / 60, {});
  assert.strictEqual(strong.hp, 60 - 15, 'hero 2x HP: serangan 1,5x');
  strong.boss.hp = 1;
  strong.hp = 1; strong.invuln = 0;
  strong.boss.phaseIndex = 0;
  Sim.hurt(strong, 'boss', 10); while (strong.dying > 0) Sim.update(strong, 1 / 60, {});
  assert.strictEqual(strong.boss.hp, strong.boss.maxHp, 'reset memakai HP maksimal boss ini');
});

ok('senjata pamungkas: tebasan ganda, panah tembus, bumerang pulang', () => {
  const BOTH = [
    '....................',
    '....................',
    '....................',
    '....................',
    'e......S......e...E.',
    '####################',
  ];
  // Pedang Angin mengenai musuh di depan dan di belakang sekaligus.
  const g = withGear(BOTH, { melee: 'pedang-angin' });
  g.weapons = ['pedang-angin', 'blaster']; g.weapon = 'pedang-angin';
  frames(g, 20);
  const s = g.p.x;
  for (const e of g.enemies) { e.x = e.x < s ? s - 18 : s + g.p.w + 6; e.awake = false; }
  const hp = g.enemies.map((e) => e.hp);
  tap(g, 'attack');
  g.enemies.forEach((e, i) => assert.ok(e.hp < hp[i], 'musuh ' + i + ' kena'));
  // Panah Cahaya menembus dua musuh dalam satu tembakan.
  const LINE = [
    '....................',
    '....................',
    '....................',
    '....................',
    'S....e..e.........E.',
    '####################',
  ];
  const p = Sim.create({ map: LINE });
  p.weapons = ['pedang', 'panah-cahaya']; p.weapon = 'panah-cahaya';
  frames(p, 20);
  for (const e of p.enemies) e.awake = false;
  const hp2 = p.enemies.map((e) => e.hp);
  tap(p, 'attack');
  frames(p, 40);
  p.enemies.forEach((e, i) => assert.ok(e.hp < hp2[i], 'panah tembus ' + i));
  // Bumerang berbalik dan hilang di tangan Arka.
  const b = Sim.create({ map: LINE.map((r) => r.replace(/e/g, '.')) });
  b.weapons = ['pedang', 'bumerang']; b.weapon = 'bumerang';
  frames(b, 20);
  tap(b, 'attack');
  const shot = b.shots[0];
  assert.ok(shot && shot.vx > 0, 'bumerang berangkat ke depan');
  let back = false;
  for (let i = 0; i < 240 && b.shots.length; i++) { tick(b); if (b.shots[0] && b.shots[0].vx < 0) back = true; }
  assert.ok(back, 'bumerang berbalik');
  assert.strictEqual(b.shots.length, 0, 'bumerang kembali ke tangan');
});

console.log(`\n${n} tes combat MH4 lulus.`);
