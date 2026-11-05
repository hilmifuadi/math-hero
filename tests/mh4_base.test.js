// Tes markas MH4: ladang, peta, gerak, interaksi, cerita, dan rute misi.
// Jalankan: node tests/mh4_base.test.js
'use strict';
const assert = require('assert');
const Farm = require('../public/mh4/js/base/farm.js');
const World = require('../public/mh4/js/base/world.js');
const Base = require('../public/mh4/js/base/sim.js');
const Story = require('../public/mh4/js/base/story.js');
const Progress = require('../public/mh4/js/progress.js');
const Levels = require('../public/mh4/js/gen/levels.js');

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok ' + name); };
const dt = 1 / 60;

ok('siklus ladang: tanam, siram, tumbuh saat ganti hari, panen', () => {
  const b = Farm.newBase();
  assert.strictEqual(Farm.action(b, 0), 'tanam');
  assert.ok(Farm.plant(b, 0, 'wortel').ok);
  assert.strictEqual(b.seeds.wortel, 1, 'benih terpakai');
  assert.strictEqual(Farm.action(b, 0), 'siram');
  Farm.nextDay(b);
  assert.strictEqual(b.plots[0].stage, 0, 'tanpa disiram tidak tumbuh');
  for (let i = 0; i < Farm.RIPE; i++) {
    Farm.water(b, 0);
    assert.strictEqual(Farm.action(b, 0), 'tunggu');
    Farm.nextDay(b);
  }
  assert.strictEqual(Farm.action(b, 0), 'panen');
  const res = Farm.harvest(b, 0);
  assert.ok(res.ok && res.bekal === 1 && res.koin > 0);
  assert.strictEqual(b.plots[0].crop, null, 'petak kosong lagi');
  assert.strictEqual(Farm.useBekal(b), 10);
  assert.strictEqual(Farm.useBekal(b), 0, 'bekal habis');
});

ok('benih dan tidur dibatasi', () => {
  const b = Farm.newBase();
  b.seeds.gandum = 0;
  assert.strictEqual(Farm.plant(b, 1, 'gandum').reason, 'benih-habis');
  const p = { koin: 12, base: b };
  assert.ok(Farm.buySeed(p, 'wortel').ok);
  assert.strictEqual(p.koin, 2);
  assert.strictEqual(Farm.buySeed(p, 'gandum').reason, 'koin-kurang');
  assert.ok(Farm.sleep(b));
  assert.ok(!Farm.sleep(b), 'tidur sekali di antara misi');
  Farm.nextDay(b);
  assert.ok(Farm.sleep(b), 'pulang misi membuat bisa tidur lagi');
});

ok('profil lama mendapat markas baru, data aneh dibuang', () => {
  const old = Progress.normalize({ uid: 'abcdef0123456789' });
  assert.strictEqual(old.base.plots.length, Farm.PLOTS);
  const bad = Progress.normalize({ uid: 'abcdef0123456789', base: { bekal: 99, plots: [{ crop: 'racun', stage: 2 }, { crop: 'wortel', stage: 99 }] } });
  assert.strictEqual(bad.base.bekal, Farm.MAX_BEKAL);
  assert.strictEqual(bad.base.plots[0].crop, null);
  assert.strictEqual(bad.base.plots[1].stage, Farm.RIPE);
});

ok('semua tempat penting bisa didatangi dari titik mulai', () => {
  // Isi dari titik mulai memakai aturan tabrakan yang sama dengan hero (kisi 8 px).
  for (const id of ['kampung', 'rumah']) {
    const map = Base.MAPS[id];
    const seen = new Set();
    const key = (x, y) => `${x},${y}`;
    const start = [Math.round(map.spawn.x / 8) * 8, Math.round(map.spawn.y / 8) * 8];
    assert.ok(!Base.blocked(map, start[0], start[1]), id + ': titik mulai bebas');
    const stack = [start];
    seen.add(key(start[0], start[1]));
    while (stack.length) {
      const [x, y] = stack.pop();
      for (const [a, b] of [[x + 8, y], [x - 8, y], [x, y + 8], [x, y - 8]]) {
        if (seen.has(key(a, b)) || Base.blocked(map, a, b)) continue;
        seen.add(key(a, b)); stack.push([a, b]);
      }
    }
    for (const s of map.spots) {
      const reach = [...seen].some((k) => {
        const [x, y] = k.split(',').map(Number);
        const me = { x: x - 8, y: y - 8, w: 16, h: 16 };
        return me.x < s.x + s.w && me.x + me.w > s.x && me.y < s.y + s.h && me.y + me.h > s.y;
      });
      assert.ok(reach, `${id}: ${s.id} bisa didatangi`);
    }
  }
});

ok('hero berjalan, tertahan benda padat, dan memicu interaksi sekali', () => {
  const g = Base.create('kampung');
  const x0 = g.x;
  for (let i = 0; i < 30; i++) Base.update(g, dt, { right: true });
  assert.ok(g.x > x0, 'bergerak');
  assert.strictEqual(g.face, 'side');
  const r = Base.create('rumah');
  for (let i = 0; i < 300; i++) Base.update(r, dt, { up: true });
  assert.ok(r.y > 2 * World.T, 'tertahan dinding');
  const k = Base.create('kampung');
  const npc = k.map.npcs.find((x) => x.id === 'kakek');
  k.x = npc.x; k.y = npc.y + 10;
  Base.update(k, dt, { act: true });
  Base.update(k, dt, { act: true });
  const ev = Base.takeEvents(k);
  assert.strictEqual(ev.length, 1, 'tahan tombol tetap satu interaksi');
  assert.strictEqual(ev[0].id, 'kakek');
});

ok('rute cerita lengkap dan boss menjadi puncak bab', () => {
  const ids = Levels.ALL.map((d) => d.id).sort((a, b) => a - b);
  assert.deepStrictEqual(Story.ROUTE.slice().sort((a, b) => a - b), ids, 'semua misi ada di rute');
  const p = Progress.newProfile('A');
  assert.ok(Progress.unlocked(p, 1));
  for (const id of [1, 2, 3, 4]) p.best[id] = { done: true, stars: 0 };
  assert.ok(Progress.unlocked(p, 15), 'boss 1 terbuka setelah level 4');
  assert.ok(!Progress.unlocked(p, 5), 'bab 2 menunggu boss 1');
  p.best[15] = { done: true, stars: 0 };
  assert.ok(Progress.unlocked(p, 5));
});

ok('kabut kampung menipis dan dialog mengikuti kemajuan', () => {
  const p = Progress.newProfile('A');
  const a = Story.fogAlpha(p);
  const first = Story.linesFor('kakek', p);
  p.best[15] = { done: true, stars: 0 };
  const b = Story.fogAlpha(p);
  p.best[16] = { done: true, stars: 0 };
  assert.ok(a > b && b > Story.fogAlpha(p) && Story.fogAlpha(p) === 0);
  for (const id of Story.ROUTE) p.best[id] = { done: true, stars: 0 };
  assert.notStrictEqual(Story.linesFor('kakek', p), first, 'dialog berubah');
  for (const id of ['penjaga-mesin', 'raja-bandit']) assert.ok(Story.BOSS_LINES[id].before.length && Story.BOSS_LINES[id].after.length);
});

console.log(`\n${n} tes markas MH4 lulus.`);
