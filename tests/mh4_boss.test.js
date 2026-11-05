// Tes boss MH4: validasi BossSchema, siklus telegraph/attack/recovery, fase,
// proyektil/hazard, damage saat recovery, defeat, dan gating tujuan arena.
// Jalankan: node tests/mh4_boss.test.js
'use strict';
const assert = require('assert');
const L = require('../public/mh4/js/gen/levels.js');
const Sim = require('../public/mh4/js/sim.js');
const Schema = require('../public/mh4/js/boss/schema.js');
const Machine = require('../public/mh4/js/boss/machine.js');
const Penjaga = require('../public/mh4/js/boss/bosses/penjaga.js');
const Raja = require('../public/mh4/js/boss/bosses/raja-bandit.js');

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok ' + name); };
const dt = 1 / 60;
const arena = { left: 0, right: 36 * 16, top: 0, groundY: 13 * 16 };
const player = { x: 200, y: 160, w: 14, h: 26 };
const run = (state, count, ctx) => {
  const ev = [];
  for (let i = 0; i < count; i++) ev.push(...Machine.update(state, dt, ctx || { player, arena }));
  return ev;
};

ok('BossSchema Penjaga Mesin valid dan adil', () => {
  assert.deepStrictEqual(Schema.validate(Penjaga), []);
  assert.deepStrictEqual(Machine.validate(Penjaga), []);
  assert.ok(Penjaga.phases.length >= 2, 'minimal dua fase');
  const ph1 = Penjaga.phases[0], ph2 = Penjaga.phases[1];
  assert.ok(ph2.hpFrom < ph1.hpFrom, 'fase kedua mulai di HP lebih rendah');
  for (const a of Object.values(Penjaga.attacks)) {
    assert.ok(a.telegraph >= Penjaga.fairness.minTelegraph, 'telegraph cukup');
    assert.ok(a.recovery >= Penjaga.fairness.minRecovery, 'recovery cukup');
  }
});

ok('schema cacat ditolak validator', () => {
  const bad = JSON.parse(JSON.stringify(Penjaga));
  bad.attacks.slam.telegraph = 0.01;
  bad.phases[0].pool.push({ id: 'tidak-ada', weight: 1 });
  const errs = Schema.validate(bad);
  assert.ok(errs.some((e) => e.includes('telegraph')), 'telegraph terlalu pendek ditolak');
  assert.ok(errs.some((e) => e.includes('tidak-ada')), 'serangan di luar katalog ditolak');
});

ok('create deterministik dan memakai body schema', () => {
  const a = Machine.create(Penjaga, { seed: 7, x: 100, y: 20 });
  const b = Machine.create(Penjaga, { seed: 7, x: 100, y: 20 });
  assert.strictEqual(a.hp, Penjaga.maxHp);
  assert.strictEqual(a.w, Penjaga.body.w);
  assert.strictEqual(a.h, Penjaga.body.h);
  assert.strictEqual(a.mode, 'idle');
  const seqA = run(a, 240), seqB = run(b, 240);
  assert.strictEqual(JSON.stringify(seqA), JSON.stringify(seqB), 'seed sama harus sama');
  assert.strictEqual(a.x, b.x);
});

ok('siklus idle -> telegraph -> attack -> recovery -> idle', () => {
  const s = Machine.create(Penjaga, { seed: 3, intro: 0.1 });
  let ev = run(s, 10);
  assert.strictEqual(s.mode, 'telegraph', 'intro habis memulai telegraph');
  assert.ok(ev.some((e) => e.type === 'bossTelegraph'), 'event telegraph muncul');
  assert.ok(s.current && Penjaga.attacks[s.current.id], 'serangan dipilih dari katalog');

  ev = run(s, 80);
  assert.ok(['attack', 'recovery', 'idle'].includes(s.mode), 'telegraph selesai');
  assert.ok(ev.some((e) => e.type === 'bossAttack'), 'event attack muncul');

  ev = run(s, 200);
  assert.ok(ev.some((e) => e.type === 'bossRecovery'), 'event recovery muncul');
  assert.ok(s.attackCount >= 1, 'serangan dihitung');
});

ok('fan menembakkan proyektil sesuai data', () => {
  const s = Machine.create(Penjaga, { seed: 1 });
  s.mode = 'telegraph';
  s.current = { id: 'fan', def: Penjaga.attacks.fan };
  s.timer = dt;
  const ev = run(s, 1);
  assert.ok(ev.some((e) => e.type === 'bossFan'), 'event fan muncul');
  assert.strictEqual(s.projectiles.length, Penjaga.attacks.fan.count, 'jumlah proyektil cocok');
  assert.strictEqual(s.mode, 'attack');
  const before = s.projectiles.map((p) => p.x);
  run(s, 30);
  assert.notStrictEqual(JSON.stringify(s.projectiles.map((p) => p.x)), JSON.stringify(before), 'proyektil bergerak');
});

ok('rocks menjatuhkan hazard dan menghapusnya setelah impact', () => {
  const s = Machine.create(Penjaga, { seed: 2 });
  s.mode = 'telegraph';
  s.current = { id: 'rocks', def: Penjaga.attacks.rocks };
  s.timer = dt;
  let ev = run(s, 1);
  assert.strictEqual(s.hazards.length, Penjaga.attacks.rocks.count, 'hazard dibuat');
  assert.ok(ev.some((e) => e.type === 'bossHazardSpawn'));
  ev = run(s, 300, { player, arena: { left: 0, right: 576, top: 0, groundY: 208 } });
  assert.ok(ev.some((e) => e.type === 'bossHazardImpact'), 'hazard impact muncul');
  assert.strictEqual(s.hazards.length, 0, 'hazard dibersihkan setelah impact');
});

ok('charge bergerak ke arah pemain lalu berhenti di batas arena', () => {
  const s = Machine.create(Penjaga, { seed: 4, x: 100, y: 130 });
  s.mode = 'telegraph';
  s.current = { id: 'charge', def: Penjaga.attacks.charge };
  s.timer = dt;
  s.lastPlayerX = 400;
  run(s, 1, { player: { x: 400, y: 160, w: 14, h: 26 }, arena });
  assert.strictEqual(s.facing, 1, 'menghadap pemain');
  assert.strictEqual(s.mode, 'attack');
  const x0 = s.x;
  run(s, 20, { player: { x: 400, y: 160, w: 14, h: 26 }, arena });
  assert.ok(s.x > x0, 'charge menggeser boss');
  assert.ok(s.x + s.w <= arena.right + 0.01, 'boss tidak keluar arena');
});

ok('damage biasa 0.8x, saat recovery 1.6x, invuln mengabaikan', () => {
  const s = Machine.create(Penjaga, { seed: 5 });
  const before = s.hp;
  let ev = Machine.damage(s, 10);
  assert.strictEqual(ev[0].amount, 8, 'damage normal 0.8x');
  assert.strictEqual(s.hp, before - 8);

  s.vulnerable = true;
  ev = Machine.damage(s, 10);
  assert.strictEqual(ev[0].amount, 16, 'recovery 1.6x');
  assert.ok(ev[0].vulnerable);

  s.invuln = 1;
  const hp = s.hp;
  ev = Machine.damage(s, 10);
  assert.deepStrictEqual(ev, [], 'invuln menolak damage');
  assert.strictEqual(s.hp, hp);
});

ok('HP melewati 50% memicu fase 2 dan membersihkan proyektil', () => {
  const s = Machine.create(Penjaga, { seed: 6 });
  s.projectiles.push({ x: 0, y: 0, w: 1, h: 1, life: 1 });
  s.hazards.push({ x: 0, y: 0, w: 1, h: 1, vy: 1 });
  s.hp = Math.floor(s.maxHp * 0.51);
  const ev = Machine.damage(s, 100, { multiplier: 1 });
  assert.strictEqual(s.phaseIndex, 1, 'fase naik');
  assert.strictEqual(s.mode, 'transition');
  assert.ok(s.invuln > 0, 'invuln selama transisi');
  assert.strictEqual(s.projectiles.length, 0);
  assert.strictEqual(s.hazards.length, 0);
  assert.ok(ev.some((e) => e.type === 'bossPhase' && e.id === 2), 'event fase baru');
  const ev2 = Machine.damage(s, 10, { multiplier: 1 });
  assert.deepStrictEqual(ev2, [], 'tidak bisa dilukai saat transisi');
  run(s, 120);
  assert.notStrictEqual(s.mode, 'transition', 'transisi selesai');
});

ok('HP 0 menandai defeated dan membersihkan bahaya', () => {
  const s = Machine.create(Penjaga, { seed: 8 });
  s.projectiles.push({ x: 0, y: 0, w: 1, h: 1, life: 1 });
  s.hazards.push({ x: 0, y: 0, w: 1, h: 1, vy: 1 });
  s.hp = 5;
  const ev = Machine.damage(s, 100, { multiplier: 1 });
  assert.ok(s.defeated, 'boss kalah');
  assert.strictEqual(s.hp, 0);
  assert.strictEqual(s.mode, 'defeated');
  assert.strictEqual(s.projectiles.length, 0);
  assert.strictEqual(s.hazards.length, 0);
  assert.ok(ev.some((e) => e.type === 'bossDefeated'));
  assert.deepStrictEqual(Machine.update(s, dt, { player, arena }), [], 'boss mati tidak update serangan');
});

ok('arena boss menaruh boss di spawn dan tujuan terkunci sampai kalah', () => {
  const g = Sim.create(L.BOSS);
  assert.ok(g.boss, 'arena boss membuat BossMachine');
  assert.strictEqual(g.boss.hp, Penjaga.maxHp);
  assert.ok(Math.abs(g.boss.x - (L.BOSS.map[12].indexOf('B') * 16 + 8 - g.boss.w / 2)) < 1, 'boss di kolom B');

  const goal = g.L.goal;
  Sim.teleport(g, goal.c, goal.r);
  Sim.update(g, dt, {});
  assert.strictEqual(g.phase, 'play', 'tujuan belum menang saat boss hidup');
  assert.ok(Sim.takeEvents(g).some((e) => e.type === 'goalBlocked'), 'event goalBlocked');

  Sim.teleport(g, goal.c, goal.r);
  g.boss.defeated = true; g.boss.hp = 0;
  Sim.update(g, dt, {});
  assert.strictEqual(g.phase, 'win', 'setelah boss kalah tujuan aktif');
});

ok('serangan hero mengurangi HP boss di arena', () => {
  const g = Sim.create(L.BOSS);
  const col = L.BOSS.map[12].indexOf('B');
  Sim.teleport(g, col - 1, 12);
  const hp0 = g.boss.hp;
  Sim.update(g, dt, { attack: true });
  assert.ok(g.boss.hp < hp0, 'pedang mengenai boss');
  assert.ok(g.numbers.some((x) => x.target === 'boss'), 'angka damage boss muncul');
});

ok('Raja Bandit valid, punya gelombang tanah, dan dua fase', () => {
  assert.deepStrictEqual(Schema.validate(Raja), []);
  assert.strictEqual(Raja.attacks.wave.kind, 'ground_wave');
  assert.ok(Raja.phases.length >= 2, 'Raja Bandit butuh dua fase');
  assert.ok(Raja.maxHp > Penjaga.maxHp, 'boss kedua harus lebih tangguh');
  assert.ok(Raja.sprite && Raja.sprite.indexOf('raja') >= 0);
});

ok('gelombang tanah menyusur lantai dan bergerak ke arah pemain', () => {
  const s = Machine.create(Raja, { seed: 11 });
  s.mode = 'telegraph';
  s.current = { id: 'wave', def: Raja.attacks.wave };
  s.timer = dt;
  const ev = run(s, 1, { player: { x: 400, y: 160, w: 14, h: 26 }, arena });
  assert.ok(ev.some((e) => e.type === 'bossWave'), 'event bossWave muncul');
  const wave = s.projectiles.find((p) => p.kind === 'wave');
  assert.ok(wave, 'proyektil gelombang dibuat');
  assert.strictEqual(wave.y + wave.h, arena.groundY, 'gelombang menempel lantai');
  assert.ok(wave.vx > 0, 'gelombang menuju pemain di kanan');
  const x0 = wave.x;
  run(s, 20, { player: { x: 400, y: 160, w: 14, h: 26 }, arena });
  assert.ok(wave.x > x0, 'gelombang bergerak');
});

ok('boss kedua punya arena sendiri dan gating tujuan bekerja', () => {
  assert.deepStrictEqual(L.validateBoss(L.BOSS2), []);
  assert.strictEqual(L.BOSSES.length, 2);
  assert.strictEqual(L.ALL.length, L.LEVELS.length + L.BOSSES.length);
  const g = Sim.create(L.BOSS2);
  assert.strictEqual(g.boss.hp, Raja.maxHp);
  assert.strictEqual(g.boss.schema.id, 'raja-bandit');
  const goal = g.L.goal;
  Sim.teleport(g, goal.c, goal.r);
  Sim.update(g, dt, {});
  assert.strictEqual(g.phase, 'play', 'tujuan terkunci saat Raja hidup');
  g.boss.defeated = true; g.boss.hp = 0;
  Sim.teleport(g, goal.c, goal.r);
  Sim.update(g, dt, {});
  assert.strictEqual(g.phase, 'win', 'tujuan terbuka setelah Raja kalah');
});

console.log(`\n${n} tes boss MH4 lulus.`);
