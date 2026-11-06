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
  assert.ok(res.ok && res.item === 'wortel');
  assert.strictEqual(b.items.wortel, 1, 'hasil masuk peti');
  assert.strictEqual(b.pack, 'wortel', 'makanan pertama jadi bekal');
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
  const bad = Progress.normalize({ uid: 'abcdef0123456789', base: { bekal: 3, items: { racun: 9 }, pack: 'gandum', plots: [{ crop: 'racun', stage: 2 }, { crop: 'wortel', stage: 99 }] } });
  assert.strictEqual(bad.base.items.wortel, 3, 'bekal lama pindah ke peti');
  assert.strictEqual(bad.base.pack, 'wortel', 'gandum bukan bekal');
  assert.strictEqual(bad.base.items.racun, undefined);
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
  for (const id of [1, 2, 3, 18]) p.best[id] = { done: true, stars: 0 };
  assert.ok(Progress.unlocked(p, 15), 'boss 1 terbuka setelah bab 1 selesai');
  assert.ok(!Progress.unlocked(p, 4), 'bab 2 menunggu boss 1');
  p.best[15] = { done: true, stars: 0 };
  assert.ok(Progress.unlocked(p, 4));
  for (const ch of Story.CHAPTERS.slice(0, -1)) assert.ok(Levels.ALL.find((l) => l.id === ch.misi[ch.misi.length - 1]).boss, ch.nama + ' ditutup boss');
  for (const ch of Story.CHAPTERS) assert.ok(ch.misi.length <= 5, ch.nama + ' tidak terlalu panjang');
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

ok('ternak memberi hasil berkala tanpa perawatan', () => {
  const b = Farm.newBase();
  assert.ok(!Farm.animalReady(b, 'cow'), 'sapi belum siap di hari 1');
  while (!Farm.animalReady(b, 'cow')) Farm.nextDay(b);
  assert.strictEqual(b.day, 3, 'sapi siap tiap tiga hari');
  const res = Farm.collectAnimal(b, 'cow');
  assert.ok(res.ok && b.items.susu === 1);
  assert.ok(!Farm.animalReady(b, 'cow'), 'harus menunggu lagi');
  assert.ok(!Farm.collectAnimal(b, 'cow').ok);
});

ok('peti: pilih bekal dan jual hasil', () => {
  const b = Farm.newBase();
  const p = { koin: 0, base: b };
  b.items.susu = 1; b.items.wol = 1;
  assert.ok(!Farm.setPack(b, 'wol'), 'wol bukan makanan');
  assert.ok(Farm.setPack(b, 'susu'));
  assert.ok(Farm.sell(p, 'wol').ok);
  assert.strictEqual(p.koin, Farm.ITEMS.wol.jual);
  assert.strictEqual(Farm.useBekal(b), 20, 'susu menambah 20 HP');
  assert.strictEqual(b.pack, null);
});

ok('hewan yang siap bisa diambil lewat tombol aksi', () => {
  const g = Base.create('kampung');
  g.animalReady = (k) => k === 'cow';
  const cow = g.animals.find((a) => a.sprite === 'cow');
  g.x = cow.x; g.y = cow.y;
  Base.update(g, dt, { act: true });
  const ev = Base.takeEvents(g);
  assert.ok(ev.length === 1 && ev[0].id === 'ternak' && ev[0].kind === 'cow');
});

ok('animasi hewan tidak mundur: arah gambar mengikuti arah jalan', () => {
  const g = Base.create('kampung');
  for (let i = 0; i < 300; i++) Base.update(g, dt, {});
  for (const a of g.animals) {
    if (a.wait <= 0) assert.strictEqual(a.flip, a.dir > 0, a.sprite);
  }
});

ok('bangun kampung: beli, peta berubah, semua tempat tetap bisa didatangi', () => {
  const p = Progress.newProfile('A');
  p.koin = 10;
  assert.strictEqual(Farm.buyBuild(p, 'sungai').reason, 'koin-kurang');
  p.koin = 99999;
  for (const b of Farm.BUILDS) assert.ok(Farm.buyBuild(p, b.id).ok, b.id);
  assert.strictEqual(Farm.buyBuild(p, 'titu').reason, 'sudah');
  assert.strictEqual(p.koin, 99999 - Farm.BUILDS.reduce((s, b) => s + b.price, 0));
  assert.deepStrictEqual(Farm.normalize(JSON.parse(JSON.stringify(p.base))).built, Farm.BUILD_IDS, 'tersimpan');
  assert.deepStrictEqual(Farm.normalize({ built: ['altar', 'palsu'] }).built, ['altar']);
  // Ternak tambahan menggandakan hasil kandang.
  p.base.day = 10;
  assert.strictEqual(Farm.collectAnimal(p.base, 'cow').n, 2);
  const full = World.kampung(Farm.BUILD_IDS);
  assert.ok(full.animals.length === 8, 'ternak bertambah');
  assert.ok(full.objects.length > World.kampung([]).objects.length + 20, 'objek bertambah');
  // Peta penuh: titik mulai, pulang misi, papan bangun, altar, dan semua warga tetap terjangkau.
  const seen = new Set(), key = (x, y) => x + ',' + y;
  for (const at of [full.spawn, full.fromMission]) {
    const start = [Math.round(at.x / 8) * 8, Math.round(at.y / 8) * 8];
    assert.ok(!Base.blocked(full, start[0], start[1]), 'titik bebas');
    const st = [start]; seen.add(key(...start));
    while (st.length) {
      const [x, y] = st.pop();
      for (const [a, b] of [[x + 8, y], [x - 8, y], [x, y + 8], [x, y - 8]]) {
        if (seen.has(key(a, b)) || Base.blocked(full, a, b)) continue;
        seen.add(key(a, b)); st.push([a, b]);
      }
    }
  }
  for (const s of full.spots) {
    const reach = [...seen].some((k) => { const [x, y] = k.split(',').map(Number); return x - 8 < s.x + s.w && x + 8 > s.x && y - 8 < s.y + s.h && y + 8 > s.y; });
    assert.ok(reach, s.id + ' terjangkau di kampung penuh');
  }
});

ok('Titu mengikuti Arka, tertidur saat Arka diam, dan bisa dielus', () => {
  const g = Base.create('kampung', null, ['titu']);
  assert.ok(g.pet, 'Titu ada');
  for (let i = 0; i < 120; i++) Base.update(g, dt, { right: true });
  assert.ok(Math.hypot(g.x - g.pet.x, g.y - g.pet.y) < 50, 'mengikuti');
  g.x = 22 * World.T; g.y = 21 * World.T;
  for (let i = 0; i < 60 * 8; i++) Base.update(g, dt, {});
  assert.ok(g.pet.sleep, 'tertidur');
  assert.strictEqual(Base.nearest(g).id, 'titu', 'bisa dielus');
  assert.strictEqual(Base.create('kampung').pet, null, 'tanpa beli tidak ada');
  const Talk = require('../public/mh4/js/base/talk.js');
  const prof = Progress.newProfile('A');
  prof.base.built = ['titu'];
  let heard = false;
  const memo = {};
  for (let i = 0; i < 8; i++) if (Talk.compose('sari', { hour: 10, profile: prof }, memo).some((l) => /Titu/.test(l[1]))) heard = true;
  assert.ok(heard, 'warga menyebut Titu');
});

ok('senjata pamungkas hanya bisa dibeli setelah tamat', () => {
  const p = Progress.newProfile('A');
  p.koin = 20000;
  assert.strictEqual(Progress.buyWeapon(p, 'bumerang').reason, 'terkunci');
  p.best[Story.FINALE] = { done: true, stars: 0 };
  assert.ok(Progress.buyWeapon(p, 'bumerang').ok);
  assert.strictEqual(p.koin, 18000);
  assert.ok(Progress.equipWeapon(p, 'bumerang').ok);
  assert.strictEqual(Progress.buyWeapon(p, 'pedang').reason, 'tidak-dijual');
  assert.ok(Progress.normalize(JSON.parse(JSON.stringify(p))).weapons.includes('bumerang'), 'tersimpan');
});

console.log(`\n${n} tes markas MH4 lulus.`);
