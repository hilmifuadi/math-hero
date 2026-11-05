// Tes boss MH4: validasi BossSchema, siklus telegraph/attack/recovery, fase,
// proyektil/hazard, damage saat recovery, defeat, dan gating tujuan arena.
// Jalankan: node tests/mh4_boss.test.js
'use strict';
const assert = require('assert');
const L = require('../public/mh4/js/gen/levels.js');
const Sim = require('../public/mh4/js/sim.js');
const Weapons = require('../public/mh4/js/combat/weapons.js');
const Schema = require('../public/mh4/js/boss/schema.js');
const Machine = require('../public/mh4/js/boss/machine.js');
// Data lama dipakai untuk menguji primitif mesin yang tetap ada.
const Penjaga = require('./fixtures/mh4_boss_penjaga.js');
const Raja = require('./fixtures/mh4_boss_raja-bandit.js');
const BOSS = Object.assign({}, L.BOSS, { bossDef: Penjaga });
const BOSS2 = Object.assign({}, L.BOSS2, { bossDef: Raja });

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

  ev = ev.concat(run(s, 200));
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
  const s = Machine.create(Raja, { seed: 4, x: 100, y: 130 });
  s.mode = 'telegraph';
  s.current = { id: 'charge', def: Raja.attacks.charge };
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

ok('di luar celah damage kecil, saat celah besar, invuln mengabaikan', () => {
  const s = Machine.create(Raja, { seed: 5 });
  const before = s.hp;
  let ev = Machine.damage(s, 20);
  assert.strictEqual(ev[0].amount, 5, 'damage tertahan 0.25x');
  assert.ok(ev[0].guarded, 'ditandai tertahan');
  assert.strictEqual(s.hp, before - 5);

  s.vulnerable = true;
  ev = Machine.damage(s, 10);
  assert.strictEqual(ev[0].amount, 16, 'celah 1.6x');
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
  const g = Sim.create(BOSS);
  assert.ok(g.boss, 'arena boss membuat BossMachine');
  assert.strictEqual(g.boss.hp, Penjaga.maxHp);
  assert.ok(Math.abs(g.boss.x - (g.L.bossSpawn.c * 16 + 8 - g.boss.w / 2)) < 1, 'boss di kolom B');

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
  const g = Sim.create(BOSS);
  Sim.teleport(g, g.L.bossSpawn.c - 3, g.L.bossSpawn.r);
  const hp0 = g.boss.hp;
  Sim.update(g, dt, { attack: true });
  assert.ok(g.boss.hp < hp0, 'pedang mengenai boss');
  assert.ok(g.numbers.some((x) => x.target === 'guard'), 'angka damage tertahan muncul');
});

const floorOf = (g) => g.L.bossSpawn.y;
const standAt = (g, x) => { g.p.x = x; g.p.y = floorOf(g) - g.p.h; g.p.vy = 0; g.p.onGround = true; };
const startAttack = (g, id) => {
  const b = g.boss;
  b.mode = 'idle'; b.timer = 0;
  b.schema = Object.assign({}, b.schema, {
    phases: b.schema.phases.map((ph) => Object.assign({}, ph, { pool: [{ id, weight: 1 }] })),
  });
  Sim.update(g, dt, {});
  assert.strictEqual(b.mode, 'telegraph');
  assert.strictEqual(b.current.id, id);
};
const runSim = (g, frames) => { for (let i = 0; i < frames; i++) Sim.update(g, dt, {}); };

ok('kalah di arena mengulang encounter dari awal fase dan membersihkan semuanya', () => {
  const g = Sim.create(BOSS);
  const b = g.boss;
  b.phaseIndex = 1;
  b.hp = 40;
  b.projectiles.push({ x: 300, y: 100, w: 8, h: 8, vx: 0, vy: 0, gravity: 0, life: 9, damage: 8 });
  b.hazards.push({ x: 300, y: 10, w: 18, h: 18, vy: 10, damage: 5, targetY: 140 });
  b.zones.push({ x: 300, y: 100, w: 20, h: 40, damage: 5 });
  g.hp = 1; g.invuln = 0;
  Sim.hurt(g, 'boss', 5); while (g.dying > 0) Sim.update(g, 1 / 60, {});
  assert.strictEqual(b.hp, Math.round(b.maxHp * b.schema.phases[1].hpFrom), 'HP kembali ke awal fase');
  assert.strictEqual(b.phaseIndex, 1, 'fase yang sudah lewat tidak hilang');
  assert.strictEqual(b.x, b.spawnX, 'boss kembali ke tempat');
  assert.strictEqual(b.projectiles.length + b.hazards.length + b.zones.length, 0, 'serangan bersih');
  assert.strictEqual(g.hp, g.maxHp, 'HP hero penuh');
  assert.ok(Sim.takeEvents(g).some((e) => e.type === 'bossRetry'), 'event bossRetry');
});

ok('setelah dua kali kalah ada bantuan ringan', () => {
  const g = Sim.create(BOSS);
  for (let i = 0; i < 2; i++) { g.hp = 1; g.invuln = 0; Sim.hurt(g, 'boss', 5); while (g.dying > 0) Sim.update(g, 1 / 60, {}); }
  assert.strictEqual(g.assist, 0.75);
  g.invuln = 0;
  const hp = g.hp;
  Sim.hurt(g, 'boss', 12); while (g.dying > 0) Sim.update(g, 1 / 60, {});
  assert.strictEqual(g.hp, hp - 9, 'damage 12 menjadi 9');
});

ok('slam tidak mengenai hero di platform, hanya di lantai', () => {
  const g = Sim.create(BOSS);
  const b = g.boss;
  startAttack(g, 'slam');
  const cx = b.x + b.w / 2;
  g.invuln = 0;
  g.p.x = cx - 40; g.p.y = 96 - g.p.h; g.p.vy = 0; g.p.onGround = true;
  const hp = g.hp;
  b.timer = dt / 2;
  Sim.update(g, dt, {});
  assert.strictEqual(g.hp, hp, 'aman di platform');
  const g2 = Sim.create(BOSS);
  startAttack(g2, 'slam');
  standAt(g2, g2.boss.x + g2.boss.w / 2 - 40 - 14);
  g2.invuln = 0;
  const hp2 = g2.hp;
  g2.boss.timer = dt / 2;
  Sim.update(g2, dt, {});
  assert.ok(g2.hp < hp2, 'kena di lantai');
});

ok('garis peringatan charge sama dengan jarak dan damage sebenarnya', () => {
  const g = Sim.create(BOSS2);
  standAt(g, 30);
  startAttack(g, 'charge');
  const b = g.boss, plan = b.current.plan;
  assert.strictEqual(plan.targetX, 0, 'sasaran dinding kiri');
  // Hero keluar dari jalur agar tidak mengubah apa pun, lalu boss menempuh seluruh garis.
  g.p.y = 0; g.invuln = 99;
  runSim(g, 200);
  assert.ok(Math.abs(b.x - plan.targetX) < 0.01, 'berhenti tepat di ujung garis');
  assert.ok(b.vulnerable && b.stunned, 'menabrak dinding membuat pusing dan terbuka');
  const g2 = Sim.create(BOSS2);
  standAt(g2, g2.boss.x - 40);
  startAttack(g2, 'charge');
  g2.invuln = 0;
  const hp = g2.hp;
  runSim(g2, 95);
  assert.strictEqual(hp - g2.hp, g2.boss.schema.attacks.charge.damage, 'damage dari data');
});

ok('sasaran batu dan zona dikunci saat telegraph dan sama dengan hitbox', () => {
  const g = Sim.create(BOSS);
  standAt(g, 100);
  startAttack(g, 'rocks');
  const targets = g.boss.current.plan.targets.slice();
  g.invuln = 99;
  standAt(g, 300);
  g.boss.timer = dt / 2;
  Sim.update(g, dt, {});
  assert.deepStrictEqual(g.boss.hazards.map((h) => h.x), targets, 'batu jatuh di tanda');
  const g2 = Sim.create(BOSS);
  standAt(g2, 100);
  startAttack(g2, 'burst');
  const zones = JSON.stringify(g2.boss.current.plan.zones);
  g2.invuln = 99;
  g2.boss.timer = dt / 2;
  Sim.update(g2, dt, {});
  assert.strictEqual(JSON.stringify(g2.boss.zones), zones, 'zona aktif sama dengan tanda');
  assert.ok(g2.boss.zones.every((z) => z.y + z.h === floorOf(g2)), 'zona menempel lantai');
  assert.ok(g2.boss.zones.every((z) => z.y > 96), 'platform aman dari semburan');
});

ok('weak point Penjaga hanya kena saat terbuka dan harus dilompati', () => {
  const g = Sim.create(BOSS);
  const b = g.boss;
  const wb = Machine.weakBox(b);
  const groundBox = { x: b.x - 10, y: floorOf(g) - 27, w: 30, h: 28 };
  const jumpBox = { x: b.x - 10, y: wb.y, w: 30, h: 28 };
  b.vulnerable = true;
  assert.ok(Machine.damage(b, 20, { box: groundBox })[0].guarded, 'dari lantai tertahan');
  const hit = Machine.damage(b, 20, { box: jumpBox })[0];
  assert.ok(hit.weak && hit.amount === 40, 'lompat mengenai kristal 2x');
  b.vulnerable = false;
  assert.ok(Machine.damage(b, 20, { box: jumpBox })[0].guarded, 'tertutup tetap tertahan');
});

ok('summon Raja dibatasi, anak buah menjatuhkan HP, dan hilang saat boss kalah', () => {
  const g = Sim.create(BOSS2);
  standAt(g, 60);
  g.invuln = 99;
  startAttack(g, 'summon');
  g.boss.timer = dt / 2;
  Sim.update(g, dt, {});
  const minions = () => g.enemies.filter((e) => e.minion && e.alive);
  assert.strictEqual(minions().length, 2, 'dua anak buah');
  assert.ok(minions().every((m) => Math.abs(m.y + m.h - floorOf(g)) < 1), 'di lantai');
  Sim.takeEvents(g);
  g.boss.current = { id: 'summon', def: g.boss.schema.attacks.summon, plan: { dir: 1, spots: [200, 240, 280], groundY: floorOf(g) } };
  g.boss.mode = 'telegraph'; g.boss.timer = dt / 2;
  Sim.update(g, dt, {});
  assert.strictEqual(minions().length, 2, 'tidak melewati maxSummons');
  g.hp = 10;
  const m = minions()[0];
  m.hp = 1;
  g.face = m.x > g.p.x ? 1 : -1;
  g.p.x = m.x + (g.face > 0 ? -16 : 16); g.p.y = m.y + m.h - g.p.h;
  g.cooldown = 0;
  Sim.update(g, dt, { attack: true });
  assert.strictEqual(g.hp, 14, 'pulih 4 HP');
  g.boss.hp = 1; g.boss.vulnerable = false; g.boss.invuln = 0;
  Machine.damage(g.boss, 100, { multiplier: 1 }).length;
  g.boss.defeated = false; g.boss.hp = 1; g.boss.mode = 'idle';
  g.cooldown = 0;
  g.p.x = g.boss.x - 16; g.p.y = g.boss.y + g.boss.h - g.p.h; g.face = 1; g.prevAttack = false;
  Sim.update(g, dt, { attack: true });
  assert.ok(g.boss.defeated, 'boss kalah');
  assert.strictEqual(g.enemies.filter((e) => e.minion).length, 0, 'anak buah hilang');
});

ok('Raja Bandit valid, punya gelombang tanah, dan dua fase', () => {
  assert.deepStrictEqual(Schema.validate(Raja), []);
  assert.strictEqual(Raja.attacks.wave.kind, 'ground_wave');
  assert.ok(Raja.phases.length >= 2, 'Raja Bandit butuh dua fase');
  assert.ok(Raja.maxHp > Penjaga.maxHp, 'boss kedua harus lebih tangguh');
  assert.ok(Raja.sprite && Raja.sprite.indexOf('goblin') >= 0);
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
  assert.strictEqual(L.BOSSES.length, 7);
  assert.strictEqual(L.ALL.length, L.LEVELS.length + L.BOSSES.length + 2, 'plus boss acak dan level acak');
  const g = Sim.create(BOSS2);
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

const Gen = require('../public/mh4/js/boss/gen.js');

ok('BossGen deterministik, selalu valid, dan bisa dimainkan tanpa macet', () => {
  assert.strictEqual(JSON.stringify(Gen.build({ seed: 42 })), JSON.stringify(Gen.build({ seed: 42 })));
  const sets = new Set();
  for (let seed = 1; seed <= 200; seed++) {
    for (const difficulty of [1, 2, 3]) {
      const s = Gen.build({ seed, difficulty });
      assert.deepStrictEqual(Schema.validate(s), [], `seed ${seed} d${difficulty}`);
      assert.strictEqual(s.mechanics.length, difficulty + 1, 'kesulitan menambah mekanisme');
      sets.add(s.mechanics.slice().sort().join('+'));
    }
  }
  assert.ok(sets.size >= 15, `kombinasi mekanisme beragam (${sets.size})`);
  for (let seed = 1; seed <= 12; seed++) {
    const def = L.genBoss(seed, 3);
    const g = Sim.create(def);
    g.invuln = 1e9;
    const seen = new Set();
    for (let i = 0; i < 60 * 40; i++) {
      Sim.update(g, dt, {});
      if (g.boss.current) seen.add(g.boss.current.id);
    }
    assert.ok(seen.size >= 2, `seed ${seed} memakai beberapa serangan`);
    assert.ok(g.boss.projectiles.length <= 20, 'proyektil tidak menumpuk');
  }
});

ok('kesulitan naik lewat kompleksitas, bukan hanya HP', () => {
  const low = Gen.build({ seed: 7, difficulty: 1 }), high = Gen.build({ seed: 7, difficulty: 3 });
  assert.ok(high.phases.length > low.phases.length, 'lebih banyak fase');
  assert.ok(high.mechanics.length > low.mechanics.length, 'lebih banyak mekanisme');
  assert.ok(high.maxHp / low.maxHp < 1.3, 'HP tidak melonjak');
});

ok('arena muat di layar dan semua arena valid', () => {
  for (const def of [...L.BOSSES, L.genBoss(5)]) {
    assert.deepStrictEqual(L.validateBoss(def), []);
    assert.ok(def.map[0].length * 16 <= 640 / 1.5 + 16, 'lebar arena sebingkai');
    assert.ok(def.map.length * 16 <= 360 / 1.5, 'tinggi arena sebingkai');
  }
});

// ===== Boss baru =====
const Roster = require('../public/mh4/js/boss/bosses/roster.js');
const arenaFor = (id) => L.BOSSES.find((x) => x.bossDef.id === id);
const start = (id, atk) => {
  const g = Sim.create(arenaFor(id));
  g.invuln = 99;
  if (atk) startAttack(g, atk);
  return g;
};
const swing = (g) => { g.cooldown = 0; g.prevAttack = false; g.weapon = 'pedang'; Sim.update(g, dt, { attack: true }); };

ok('semua boss cerita valid, punya watak, dan senjata dekat jauh lebih kuat saat celah', () => {
  for (const b of Object.values(Roster)) {
    assert.deepStrictEqual(Schema.validate(b), [], b.nama);
    assert.ok(b.barks && b.barks.intro.length && b.barks.stun.length && b.barks.taunt.length, b.nama + ' punya celetukan');
    assert.ok(b.hint && b.roam, b.nama + ' punya petunjuk dan gaya jalan');
    assert.ok(b.meleeOpen / b.rangedOpen >= 3, b.nama + ' insentif senjata dekat');
    const open = Object.values(b.attacks).filter((a) => a.signature || a.wallStun);
    assert.ok(open.length, b.nama + ' punya mekanik khas');
    for (const a of open) assert.ok((a.stun || a.wallStun || a.recovery) >= 2.4, b.nama + ' celah cukup lama');
  }
  const kinds = Object.values(Roster).map((b) => Object.values(b.attacks).filter((a) => a.signature || a.wallStun).map((a) => a.kind + (a.reflect ? 'R' : '') + (a.grab ? 'G' : '') + (a.crown ? 'C' : '')).sort().join());
  assert.strictEqual(new Set(kinds).size, kinds.length, 'tiap boss punya gabungan mekanik sendiri');
});

ok('melee saat tumbang jauh lebih kuat dari jauh, dan badan tumbang terjangkau dari tanah', () => {
  const g = start('penjaga-mesin');
  const b = g.boss;
  Machine.stagger(b, 3, []);
  const hp = b.hp;
  assert.strictEqual(b.y + b.h, floorOf(g), 'tumbang di tanah');
  standAt(g, b.x - 16); g.face = 1;
  swing(g);
  const melee = hp - b.hp;
  const hp2 = b.hp;
  Machine.damage(b, 16, { melee: false });
  assert.ok(melee >= (hp2 - b.hp) * 3, 'senjata dekat lebih kuat: ' + melee + ' lawan ' + (hp2 - b.hp));
});

ok('Lendir Kabut: melompat ke arah hero, mendarat, lalu gepeng lama', () => {
  const g = start('penjaga-mesin', 'hop');
  const b = g.boss;
  standAt(g, 100);
  let top = b.y, stun = 0;
  for (let i = 0; i < 60 * 8 && !b.stunned; i++) { Sim.update(g, dt, {}); top = Math.min(top, b.y); }
  assert.ok(top < floorOf(g) - b.h - 30, 'benar-benar melompat');
  assert.ok(b.stunned && b.vulnerable, 'gepeng dan terbuka');
  while (b.stunned) { Sim.update(g, dt, {}); stun += dt; if (stun > 9) break; }
  assert.ok(stun >= 2.4, 'celah ' + stun.toFixed(2) + ' detik');
});

ok('Bola bisa dipukul balik hanya dengan senjata dekat, dan membuat boss tumbang', () => {
  const g = start('penjaga-mesin', 'spit');
  const b = g.boss;
  standAt(g, 60);
  b.timer = dt / 2;
  Sim.update(g, dt, {});
  const p = b.projectiles[0];
  assert.ok(p && p.reflectable, 'bola bisa dipantulkan');
  // Peluru hero tidak memantulkan.
  g.p.x = p.x - 10; g.p.y = p.y - 6; g.face = 1;
  swing(g);
  assert.ok(p.reflected, 'dipukul balik');
  for (let i = 0; i < 120 && !b.stunned; i++) Sim.update(g, dt, {});
  assert.ok(b.stunned, 'kena bola sendiri dan tumbang');
});

ok('Dukun: perisai menahan, totem hanya pecah oleh senjata dekat, lalu tumbang', () => {
  const g = start('dukun', 'shield');
  const b = g.boss;
  b.timer = dt / 2;
  Sim.update(g, dt, {});
  assert.ok(b.shield);
  const hp = b.hp;
  Machine.damage(b, 100, { melee: true });
  assert.strictEqual(b.hp, hp, 'perisai menahan semua');
  const totems = b.props.filter((p) => p.kind === 'totem');
  assert.strictEqual(totems.length, 2);
  assert.strictEqual(Machine.hitProps(b, totems[0], { melee: false }).length, 0, 'peluru tidak memecah totem');
  Machine.hitProps(b, totems[0], { melee: true });
  assert.ok(b.shield && !b.stunned, 'satu totem belum cukup');
  const ev = Machine.hitProps(b, totems[1], { melee: true });
  assert.ok(!b.shield && b.stunned && ev.some((e) => e.type === 'bossStun'), 'perisai pecah dan tumbang');
});

ok('Ayam: terbang menjatuhkan telur, telur ditendang atau ditembak menjatuhkannya', () => {
  const g = start('ayam', 'fly');
  const b = g.boss;
  b.timer = dt / 2;
  Sim.update(g, dt, {});
  for (let i = 0; i < 90; i++) Sim.update(g, dt, {});
  assert.ok(b.y < floorOf(g) - b.h - 40, 'terbang');
  assert.ok(b.props.some((p) => p.kind === 'egg'), 'telur jatuh');
  const egg = b.props.find((p) => p.kind === 'egg');
  Machine.hitProps(b, egg, { melee: true });
  for (let i = 0; i < 120 && !b.stunned; i++) Sim.update(g, dt, {});
  assert.ok(b.stunned && b.y + b.h === floorOf(g), 'telur membuatnya jatuh');
  const g2 = start('ayam', 'fly');
  g2.boss.timer = dt / 2;
  Sim.update(g2, dt, {});
  for (let i = 0; i < 60; i++) Sim.update(g2, dt, {});
  for (let i = 0; i < g2.boss.schema.attacks.fly.shotsToDrop; i++) Machine.damage(g2.boss, 5, { melee: false });
  assert.ok(g2.boss.stunned, 'tembakan menjatuhkan yang terbang: senjata jauh tetap berguna');
  // Telur yang dibiarkan menetas menjadi anak ayam.
  const g3 = start('ayam');
  g3.boss.props.push({ kind: 'egg', x: 100, y: floorOf(g3) - 14, w: 12, h: 14, vy: 0, groundY: floorOf(g3) - 14, hatch: 0.05, damage: 5 });
  for (let i = 0; i < 8; i++) Sim.update(g3, dt, {});
  assert.ok(g3.enemies.some((e) => e.minion && e.kind === 'chick'), 'menetas');
});

ok('Lendir Spora: tiruan pecah sekali pukul, yang asli membuatnya tumbang', () => {
  const g = start('spora', 'split');
  const b = g.boss;
  b.timer = dt / 2;
  Sim.update(g, dt, {});
  assert.strictEqual(b.clones.length, 2);
  const c = b.clones[0];
  Machine.hitProps(b, c, { melee: false });
  assert.strictEqual(b.clones.length, 1, 'tiruan pecah');
  assert.ok(!b.stunned);
  Machine.damage(b, 20, { melee: true });
  assert.ok(b.stunned && !b.clones.length, 'yang asli kena: tumbang dan tiruan hilang');
});

ok('Goblin Merah: tertangkap mencuri senjata, kantong mengembalikan, dilompati dia terpeleset', () => {
  const g = start('goblin-merah', 'grab');
  const b = g.boss;
  g.invuln = 0;
  assert.strictEqual(g.weapons.length, 2);
  b.timer = dt / 2;
  standAt(g, b.x - 30);
  for (let i = 0; i < 40 && !g.stolen; i++) Sim.update(g, dt, {});
  assert.ok(g.stolen, 'senjata jauh dicuri');
  assert.strictEqual(g.weapons.length, 1);
  assert.strictEqual(Weapons.get(g.weapon).type, 'melee', 'tinggal senjata dekat');
  const bag = b.props.find((p) => p.kind === 'bag');
  assert.ok(bag);
  g.invuln = 99; g.p.x = bag.x; g.p.y = bag.y - 4;
  Sim.update(g, dt, {});
  assert.strictEqual(g.weapons.length, 2, 'kantong mengembalikan');
  const g2 = start('goblin-merah', 'grab');
  const b2 = g2.boss;
  g2.p.y = 0; g2.p.x = 10;
  for (let i = 0; i < 60 * 6 && !b2.stunned; i++) { g2.p.y = 0; g2.p.vy = 0; Sim.update(g2, dt, {}); }
  assert.ok(b2.stunned, 'luput: menabrak dan pusing');
  assert.ok(b2.props.some((p) => p.kind === 'coin'), 'koin berjatuhan');
});

ok('Lendir Malam: lentera menyala di dekatnya membuat tumbang, jauh tidak', () => {
  const g = start('lendir-malam', 'lights');
  const b = g.boss;
  b.timer = dt / 2;
  Sim.update(g, dt, {});
  assert.ok(b.dark);
  const lamps = b.props.filter((p) => p.kind === 'lantern');
  assert.strictEqual(lamps.length, 3);
  b.x = lamps[2].x + 300;
  Machine.hitProps(b, lamps[0], { melee: true });
  assert.ok(lamps[0].lit > 0 && !b.stunned, 'jauh: lampu menyala saja');
  b.x = lamps[1].x - 20;
  Machine.hitProps(b, lamps[1], { melee: true });
  assert.ok(b.stunned, 'dekat: silau dan tumbang');
});

ok('lentera tidak menghalangi pukulan ke boss, dan hero tumbang dulu sebelum bangkit', () => {
  const g = start('lendir-malam', 'lights');
  const b = g.boss;
  b.timer = dt / 2;
  Sim.update(g, dt, {});
  const lamp = b.props.find((p) => p.kind === 'lantern');
  b.mode = 'idle'; b.timer = 9;
  b.x = lamp.x - 10;
  standAt(g, lamp.x - 18); g.face = 1;
  g.p.y = b.y + b.h - g.p.h;
  const hp = b.hp;
  swing(g);
  assert.ok(lamp.lit > 0, 'lentera menyala');
  assert.ok(b.hp < hp, 'boss ikut kena pukulan yang sama');
  const h = start('penjaga-mesin');
  h.invuln = 0; h.hp = 1;
  Sim.hurt(h, 'boss', 5);
  // Pengait di atas sudah menyelesaikan transisi; periksa langsung tanpa pengait.
  const j = start('penjaga-mesin');
  j.invuln = 0; j.hp = 1;
  j.p.x = 10; j.p.y = 100;
  Sim.hurt(j, 'duri', 5);
  assert.ok(j.dying > 0 && j.hp === 0, 'tumbang dulu, belum hidup');
});

ok('Raja Goblin: menabrak dinding menjatuhkan mahkota, merebutnya menambah celah', () => {
  const g = start('raja-bandit', 'charge');
  const b = g.boss;
  standAt(g, 30);
  g.p.y = 0;
  for (let i = 0; i < 60 * 6 && !b.stunned; i++) { g.p.y = 0; g.p.vy = 0; Sim.update(g, dt, {}); }
  assert.ok(b.stunned);
  const crown = b.props.find((p) => p.kind === 'crown');
  assert.ok(crown, 'mahkota jatuh');
  const t = b.timer;
  g.p.x = crown.x; g.p.y = crown.y;
  Sim.update(g, dt, {});
  assert.ok(b.timer > t + 2, 'celah bertambah');
  assert.ok(Roster.rajaGoblin.phases.length === 3, 'penutup punya tiga fase');
});

ok('semua boss berjalan lama tanpa macet dan selalu memberi celah', () => {
  for (const def of L.BOSSES) {
    const g = Sim.create(def);
    g.invuln = 1e9;
    const seen = new Set();
    let opened = 0;
    for (let i = 0; i < 60 * 60; i++) {
      g.invuln = 1e9;
      // Hero berkeliling sedikit supaya sasaran berubah.
      g.p.x = 40 + (Math.sin(i / 90) + 1) * 170;
      Sim.update(g, dt, {});
      if (g.boss.current) seen.add(g.boss.current.id);
      if (g.boss.vulnerable) opened++;
      assert.ok(Number.isFinite(g.boss.x) && Number.isFinite(g.boss.y), def.nama + ' posisi valid');
      assert.ok(g.boss.x >= -1 && g.boss.x + g.boss.w <= 27 * 16 + 1, def.nama + ' di dalam arena');
    }
    assert.ok(seen.size >= 2, def.nama + ' memakai beberapa serangan');
    assert.ok(g.boss.projectiles.length <= 20 && g.boss.props.length <= 30, def.nama + ' benda tidak menumpuk');
  }
});

ok('mengulang setelah kalah membersihkan semua benda, dan senjata curian kembali', () => {
  const g = start('goblin-merah');
  g.invuln = 0;
  g.stolen = g.weapons[1]; g.weapons = [g.weapons[0]];
  g.boss.props.push({ kind: 'bag', x: 10, y: 10, w: 10, h: 10 });
  g.boss.dark = true; g.boss.shield = true; g.boss.clones.push({ x: 1, y: 1, w: 1, h: 1, dir: 1, t: 0 });
  g.hp = 1;
  Sim.hurt(g, 'boss', 5); while (g.dying > 0) Sim.update(g, 1 / 60, {});
  const b = g.boss;
  assert.strictEqual(b.props.length + b.clones.length, 0);
  assert.ok(!b.dark && !b.shield);
  assert.strictEqual(g.weapons.length, 2);
});

console.log(`\n${n} tes boss MH4 lulus.`);
