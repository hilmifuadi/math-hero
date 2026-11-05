// Tes roster musuh MH4: data tipe, scaling tier, perilaku jalan/lompat/tembak,
// dan tembakan musuh yang mengenai hero.
// Jalankan: node tests/mh4_enemies.test.js
'use strict';
const assert = require('assert');
const Sim = require('../public/mh4/js/sim.js');
const Enemies = require('../public/mh4/js/combat/enemies.js');
const Damage = require('../public/mh4/js/combat/damage.js');

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok ' + name); };
const tick = (g, input) => Sim.update(g, 1 / 60, input || {});
const frames = (g, count, input) => { for (let i = 0; i < count; i++) tick(g, input); };

const level = (row, tier) => ({
  tier: tier === undefined ? 3 : tier,
  map: [
    '....................',
    '....................',
    '....................',
    '....................',
    'S' + row + 'E',
    '####################',
  ],
});

ok('lima tipe musuh terdaftar dengan perilaku unik', () => {
  assert.strictEqual(Enemies.ORDER.length, 5);
  const behaviors = Enemies.ORDER.map((id) => Enemies.get(id).behavior).sort();
  assert.deepStrictEqual(behaviors, ['charge', 'fly', 'jump', 'shoot', 'walk']);
  assert.strictEqual(Enemies.byChar('e').id, 'walker');
  assert.strictEqual(Enemies.byChar('a').id, 'jumper');
  assert.strictEqual(Enemies.byChar('g').id, 'shooter');
  for (const id of Enemies.ORDER) {
    const d = Enemies.get(id);
    assert.ok(d.hp > 0 && d.damage > 0 && d.speed >= 0, id + ' butuh stat dasar');
    assert.ok(d.sprite && d.sprite.frame > 0, id + ' butuh data sprite');
  }
});

ok('HP dan damage musuh naik mengikuti tier', () => {
  const low = Sim.create(level('.g................', 1));
  const high = Sim.create(level('.g................', 3));
  const a = low.enemies[0], b = high.enemies[0];
  assert.ok(b.maxHp > a.maxHp, `HP tier 3 (${b.maxHp}) harus lebih dari tier 1 (${a.maxHp})`);
  assert.ok(b.damage > a.damage, `damage tier 3 (${b.damage}) harus lebih dari tier 1 (${a.damage})`);
  assert.strictEqual(a.maxHp, Damage.scale(Enemies.get('shooter').hp, 1));
});

ok('walker berjalan dan berbalik saat menabrak dinding', () => {
  const def = {
    tier: 1,
    map: [
      '....................',
      '....................',
      '....................',
      '....................',
      'S...#e.............E',
      '####################',
    ],
  };
  const g = Sim.create(def);
  const e = g.enemies[0];
  const x0 = e.x;
  frames(g, 40);
  assert.ok(e.x > x0, 'walker harus memantul ke kanan setelah menabrak dinding');
  assert.strictEqual(e.dir, 1);
});

ok('jumper meninggalkan tanah secara berkala', () => {
  const g = Sim.create(level('.a................', 3));
  const e = g.enemies[0];
  let leftGround = false;
  for (let i = 0; i < 180; i++) {
    tick(g);
    if (!e.onGround || e.y < 60) leftGround = true;
  }
  assert.ok(leftGround, 'jumper harus melompat dalam 3 detik');
});

ok('penembak membidik lalu menembak saat hero sejajar', () => {
  const g = Sim.create(level('.g................'));
  frames(g, 60);
  const shot = g.events.find((e) => e.type === 'enemyShoot');
  assert.ok(shot, 'penembak harus menembakkan proyektil');
  assert.ok(shot.x > 0 && shot.y > 0);
});

ok('tembakan musuh mengurangi HP hero', () => {
  const g = Sim.create(level('.g................'));
  const hp0 = g.hp;
  frames(g, 150);
  assert.ok(g.hp < hp0, `HP hero harus berkurang (${hp0} -> ${g.hp})`);
});

ok('kontak musuh mengurangi HP dan bisa diinjak', () => {
  const g = Sim.create(level('.e................', 1));
  const e = g.enemies[0];
  // Jatuhkan hero tepat di atas musuh.
  g.p.x = e.x; g.p.y = e.y - g.p.h + 6; g.p.vy = 120;
  g.invuln = 0;
  tick(g, {});
  assert.ok(!e.alive || e.dead, 'musuh harus kalah saat diinjak');
});

ok('lendir tebal: lebih lambat, HP tertinggi, dan tidak kalah sekali injak', () => {
  const slime = Enemies.get('jumper');
  assert.ok(slime.hp > Enemies.get('walker').hp * 2, 'HP lendir jauh lebih banyak');
  assert.ok(slime.speed < Enemies.get('walker').speed, 'lendir lebih lambat');
  const g = Sim.create(level('.a................', 1));
  const e = g.enemies[0];
  g.p.x = e.x; g.p.y = e.y - g.p.h + 6; g.p.vy = 120; g.invuln = 0;
  tick(g, {});
  assert.ok(e.alive && e.hp < e.maxHp, 'injakan melukai, tidak mengalahkan');
});

ok('kelelawar terbang, menukik ke hero, dan tidak bisa diinjak', () => {
  const g = Sim.create(level('....f.............', 3));
  const e = g.enemies[0];
  frames(g, 2);
  const y0 = g.enemies[0].homeY;
  assert.ok(y0 < g.p.y + g.p.h, 'melayang di atas tanah');
  let dived = false;
  for (let i = 0; i < 400; i++) { g.invuln = 5; tick(g); if (e.state === 'dive') dived = true; }
  assert.ok(dived, 'kelelawar menukik saat hero dekat');
  g.invuln = 0;
  g.p.x = e.x; g.p.y = e.y - g.p.h + 6; g.p.vy = 120;
  const hp = g.hp;
  tick(g, {});
  assert.ok(e.alive && g.hp < hp, 'injakan melukai hero, bukan kelelawar');
});

ok('orc menyeruduk setelah ancang-ancang, pusing, lalu baru bisa diinjak', () => {
  const g = Sim.create(level('......r...........', 3));
  const e = g.enemies[0];
  g.p.x = e.x - 60;
  const states = new Set();
  for (let i = 0; i < 300; i++) {
    g.invuln = 5; g.p.x = 30; g.p.y = e.y + e.h - g.p.h;
    tick(g);
    states.add(e.state);
    if (e.state === 'stun') break;
  }
  assert.ok(states.has('wind') && states.has('dash') && states.has('stun'), 'ancang-ancang, seruduk, pusing: ' + [...states]);
  g.invuln = 0;
  g.p.x = e.x; g.p.y = e.y - g.p.h + 6; g.p.vy = 120;
  tick(g, {});
  assert.ok(!e.alive, 'kalah saat diinjak ketika pusing');
});

ok('musuh tidak jatuh ke jurang sebelum hero datang', () => {
  const g = Sim.create({
    tier: 1,
    map: ['........................................', '........................................', 'S..................................e....E'.padEnd(40, '.'), '#############################...........'.padEnd(29, '#').padEnd(40, '#')],
  });
  const y0 = g.enemies[0].y, x0 = g.enemies[0].x;
  frames(g, 120);
  assert.strictEqual(g.enemies[0].x, x0, 'belum aktif saat hero jauh');
  assert.strictEqual(g.enemies[0].y, y0);
});

console.log(n + ' tes musuh MH4 lulus.');
