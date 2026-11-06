// Tes progresi, toko, equipment, dan bentuk data cloud MH4.
// Jalankan: node tests/mh4_progress.test.js
'use strict';
const assert = require('assert');
const Sim = require('../public/mh4/js/sim.js');
const Shop = require('../public/mh4/js/shop.js');
const Progress = require('../public/mh4/js/progress.js');

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok ' + name); };
const tick = (g, input) => Sim.update(g, 1 / 60, input || {});

const LEVEL = {
  tier: 0,
  map: [
    '....................',
    '....................',
    '....................',
    '....................',
    'S.e..............E..',
    '####################',
  ],
};

function memStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
  };
}

ok('katalog toko punya empat slot dan item awal gratis', () => {
  assert.deepStrictEqual(Shop.SLOTS, ['pedang', 'blaster', 'armor', 'jimat']);
  for (const slot of Shop.SLOTS) assert.ok(Shop.bySlot(slot).length >= 1, 'slot ' + slot + ' kosong');
  for (const id of Shop.BASE_OWNED) assert.strictEqual(Shop.get(id).price, 0);
  assert.strictEqual(new Set(Shop.ITEMS.map((it) => it.id)).size, Shop.ITEMS.length, 'id item unik');
});

ok('profil baru bersih dan loadout awal netral', () => {
  const p = Progress.newProfile('OPDI', { uid: 'abcdef0123456789', now: 1000 });
  assert.strictEqual(p.nama, 'OPDI');
  assert.strictEqual(p.koin, 0);
  assert.deepStrictEqual(p.owned.sort(), Shop.BASE_OWNED.slice().sort());
  const lo = Progress.loadout(p);
  assert.strictEqual(lo.meleeMul, 1);
  assert.strictEqual(lo.rangedMul, 1);
  assert.strictEqual(lo.maxHp, 0);
  assert.strictEqual(lo.cooldownMul, 1);
  assert.strictEqual(lo.speedMul, 1);
});

ok('membeli item memotong koin, menandai dimiliki, dan langsung memasang', () => {
  const p = Progress.newProfile('OPDI', { uid: 'abcdef0123456789', now: 1 });
  p.koin = 500;
  const no = Progress.buy(p, 'mata-baja', 2);
  assert.ok(no.ok);
  assert.strictEqual(p.koin, 410);
  assert.ok(p.owned.includes('mata-baja'));
  assert.strictEqual(p.equipped.pedang, 'mata-baja');
  const again = Progress.buy(p, 'mata-baja');
  assert.strictEqual(again.reason, 'sudah-punya');
  p.koin = 10;
  const poor = Progress.buy(p, 'pedang-kristal');
  assert.strictEqual(poor.reason, 'koin-kurang');
  assert.ok(poor.kurang > 0);
});

ok('equip hanya boleh untuk item yang dimiliki dan slotnya cocok', () => {
  const p = Progress.newProfile('OPDI', { uid: 'abcdef0123456789' });
  p.koin = 1000;
  Progress.buy(p, 'rompi-kulit');
  Progress.buy(p, 'sepatu-angin');
  const res = Progress.equip(p, 'sepatu-angin');
  assert.ok(res.ok);
  assert.strictEqual(p.equipped.jimat, 'sepatu-angin');
  assert.strictEqual(Progress.equip(p, 'pedang-kristal').reason, 'belum-punya');
  // Item yang belum dibeli tidak bisa dipasang lewat data mentah.
  const clean = Progress.normalize({ uid: 'abcdef0123456789', equipped: { pedang: 'pedang-kristal', jimat: 'sepatu-angin' } });
  assert.strictEqual(clean.equipped.pedang, 'pedang-biasa');
  assert.strictEqual(clean.equipped.jimat, null);
});

ok('loadout menjumlahkan efek equipment', () => {
  const p = Progress.newProfile('OPDI', { uid: 'abcdef0123456789' });
  p.owned.push('mata-baja', 'pendingin', 'zirah-besi', 'magnet-koin');
  p.equipped = { pedang: 'mata-baja', blaster: 'pendingin', armor: 'zirah-besi', jimat: 'magnet-koin' };
  const lo = Progress.loadout(p);
  assert.strictEqual(lo.meleeMul, 1.2);
  assert.strictEqual(lo.rangedCooldownMul, 0.8);
  assert.strictEqual(lo.cooldownMul, 1, 'Pendingin tidak mempercepat senjata dekat');
  assert.strictEqual(lo.maxHp, 20);
  assert.strictEqual(lo.coinMul, 1.25);
});

ok('sim memakai loadout: HP, damage, cooldown, dan kecepatan', () => {
  const base = Sim.create(LEVEL);
  const buff = Sim.create(LEVEL, { loadout: { maxHp: 20, speedMul: 1.5, meleeMul: 2, cooldownMul: 0.5 } });
  assert.strictEqual(base.maxHp, 30);
  assert.strictEqual(buff.maxHp, 50);
  assert.strictEqual(buff.hp, 50);

  const a = Sim.create(LEVEL), b = Sim.create(LEVEL, { loadout: { meleeMul: 2 } });
  const e1 = a.enemies[0], e2 = b.enemies[0];
  a.p.x = e1.x - 8; a.p.y = e1.y; a.face = 1;
  b.p.x = e2.x - 8; b.p.y = e2.y; b.face = 1;
  tick(a, { attack: true }); tick(b, { attack: true });
  const dealtA = e1.maxHp - e1.hp, dealtB = e2.maxHp - e2.hp;
  assert.ok(dealtB > dealtA, `damage buff (${dealtB}) harus lebih dari dasar (${dealtA})`);

  const c = Sim.create(LEVEL), d = Sim.create(LEVEL, { loadout: { speedMul: 1.5 } });
  for (let i = 0; i < 10; i++) { tick(c, { right: true }); tick(d, { right: true }); }
  assert.ok(d.p.x > c.p.x, 'speedMul harus menambah jarak tempuh');
});

ok('ganti equipment langsung berlaku pada game yang sedang berjalan', () => {
  const p = Progress.newProfile('OPDI', { uid: 'abcdef0123456789' });
  p.owned.push('mata-baja', 'zirah-besi');
  const g = Sim.create(LEVEL, { loadout: Progress.loadout(p) });
  assert.strictEqual(g.maxHp, 30);
  assert.strictEqual(g.loadout.meleeMul, 1);

  p.equipped.pedang = 'mata-baja';
  p.equipped.armor = 'zirah-besi';
  Sim.applyLoadout(g, Progress.loadout(p));

  assert.strictEqual(g.maxHp, 50, 'max HP baru harus langsung terpasang');
  assert.strictEqual(g.hp, 50, 'HP penuh ikut naik saat max HP bertambah');
  assert.strictEqual(g.loadout.meleeMul, 1.2, 'damage pedang baru harus langsung terpasang');

  // HP yang sedang terisi sebagian tetap proporsional, tidak reset gratis.
  g.hp = 20; // 40% dari 50
  p.equipped.armor = null;
  Sim.applyLoadout(g, Progress.loadout(p));
  assert.strictEqual(g.maxHp, 30);
  assert.strictEqual(g.hp, 12, 'rasio HP dipertahankan saat max HP turun');
});

ok('hasil level memberi koin, menyimpan bintang terbaik, dan membuka level', () => {
  const p = Progress.newProfile('OPDI', { uid: 'abcdef0123456789', now: 10 });
  assert.ok(Progress.unlocked(p, 1));
  assert.ok(!Progress.unlocked(p, 2));
  const first = Progress.gain(p, { levelId: 1, stars: 3, chest: true, boss: false }, 20);
  assert.ok(first.first);
  assert.strictEqual(first.coins, 3 * 1 + 12 + 10);
  assert.strictEqual(p.koin, first.coins);
  assert.strictEqual(p.best[1].stars, 3);
  assert.strictEqual(p.totalStars, 3);
  assert.ok(Progress.unlocked(p, 2), 'level 2 terbuka setelah level 1 selesai');
  assert.ok(!Progress.unlocked(p, 3));

  const repeat = Progress.gain(p, { levelId: 1, stars: 1, chest: false }, 30);
  assert.ok(!repeat.first);
  assert.strictEqual(p.best[1].stars, 3, 'bintang tidak turun saat diulang');
  assert.strictEqual(repeat.coins, 0, 'ulangan tanpa rekor baru tidak memberi koin');
  assert.ok(p.best[1].chest, 'peti yang pernah dibuka tetap tercatat');
});

ok('koin dari hasil level ikut pengali Magnet Koin', () => {
  const p = Progress.newProfile('OPDI', { uid: 'abcdef0123456789' });
  p.owned.push('magnet-koin');
  p.equipped.jimat = 'magnet-koin';
  const res = Progress.gain(p, { levelId: 1, stars: 2, chest: false, boss: false }, 5);
  assert.strictEqual(res.coins, Math.round((2 + 10) * 1.25));
});

ok('penyimpanan lokal bolak-balik dan data rusak tidak menjatuhkan game', () => {
  const st = memStorage();
  const p = Progress.newProfile('OPDI', { uid: 'abcdef0123456789', now: 5 });
  p.koin = 123;
  assert.ok(Progress.saveLocal(p, st));
  const back = Progress.loadLocal(st);
  assert.strictEqual(back.koin, 123);
  assert.strictEqual(back.uid, 'abcdef0123456789');
  st.setItem(Progress.KEY, '{rusak');
  assert.strictEqual(Progress.loadLocal(st), null);
  assert.strictEqual(st.getItem(Progress.KEY + '.rusak'), '{rusak');
});

ok('normalize membuang data asing dan klaim berlebih', () => {
  const p = Progress.normalize({
    uid: 'ABCDEF!!', nama: '  ', koin: -50, owned: ['mata-baja', 'tidak-ada', 3],
    equipped: { pedang: 'mata-baja', armor: 'pedang-kristal' },
    best: { 1: { stars: 999, chest: 1, done: 1 }, 99: { stars: 4 }, x: {} },
    totalStars: 999,
  });
  assert.match(p.uid, /^[a-z0-9]{8,32}$/);
  assert.strictEqual(p.koin, 0);
  assert.ok(p.owned.includes('mata-baja'));
  assert.ok(!p.owned.includes('tidak-ada'));
  assert.strictEqual(p.equipped.pedang, 'mata-baja');
  assert.strictEqual(p.equipped.armor, null);
  assert.strictEqual(p.best[1].stars, 99);
  assert.ok(!p.best[99]);
  assert.strictEqual(p.totalStars, 99);
});

ok('dokumen cloud hanya berisi bidang yang diizinkan dan pilih data terbaru', () => {
  const a = Progress.newProfile('A', { uid: 'aaaaaaaaaaaaaaaa', now: 10 });
  const b = Progress.newProfile('B', { uid: 'bbbbbbbbbbbbbbbb', now: 20 });
  assert.strictEqual(Progress.newer(a, b), b);
  assert.strictEqual(Progress.newer(b, a), b);
  assert.strictEqual(Progress.newer(a, null), a);
  const doc = Progress.toCloud(a);
  assert.deepStrictEqual(Object.keys(doc).sort(), [
    'base', 'best', 'equipped', 'gear', 'koin', 'nama', 'owned', 'points', 'stats', 'totalStars', 'uid', 'updatedAt', 'v', 'weapons',
  ].sort());
  assert.strictEqual(doc.uid, a.uid);
  assert.strictEqual(JSON.parse(JSON.stringify(doc)).v, Progress.VERSION);
});

ok('level baru memberi poin upgrade, ulangan tidak, boss dua poin', () => {
  const p = Progress.newProfile('A');
  assert.strictEqual(Progress.gain(p, { levelId: 1, stars: 1 }).points, 1);
  assert.strictEqual(Progress.gain(p, { levelId: 1, stars: 1 }).points, 0, 'main ulang tanpa poin');
  assert.strictEqual(Progress.gain(p, { levelId: 15, boss: true }).points, 2);
  assert.strictEqual(p.points, 3);
});

ok('poin dibelanjakan ke atribut, ada batasnya, dan efeknya nyata', () => {
  const p = Progress.newProfile('A');
  assert.strictEqual(Progress.spendPoint(p, 'hp').reason, 'poin-kurang');
  p.points = 20;
  for (let i = 0; i < Progress.STATS.hp.max; i++) assert.ok(Progress.spendPoint(p, 'hp').ok);
  assert.strictEqual(Progress.spendPoint(p, 'hp').reason, 'sudah-penuh');
  assert.ok(Progress.spendPoint(p, 'atk').ok);
  assert.ok(Progress.spendPoint(p, 'spd').ok);
  const lo = Progress.loadout(p);
  assert.strictEqual(lo.maxHp, 28, '14 x 2 HP');
  assert.ok(Math.abs(lo.meleeMul - 1.03) < 1e-9 && Math.abs(lo.rangedMul - 1.03) < 1e-9);
  assert.ok(Math.abs(lo.speedMul - 1.012) < 1e-9);
  const g = Sim.create(LEVEL, { loadout: lo });
  assert.strictEqual(g.maxHp, 58);
});

ok('peti memberi senjata sekali, bisa dipakai, dan masuk simulasi', () => {
  const p = Progress.newProfile('A');
  assert.strictEqual(Progress.openChest(p, 1), null, 'peti level 1 tanpa senjata');
  assert.strictEqual(Progress.openChest(p, 2), 'tombak');
  assert.strictEqual(Progress.openChest(p, 2), null, 'tidak dobel');
  assert.strictEqual(Progress.equipWeapon(p, 'palu').reason, 'belum-punya');
  assert.ok(Progress.equipWeapon(p, 'tombak').ok);
  assert.strictEqual(p.gear.melee, 'tombak');
  assert.strictEqual(p.gear.ranged, 'blaster', 'slot jauh tidak berubah');
  const g = Sim.create(LEVEL, { loadout: Progress.loadout(p) });
  assert.strictEqual(g.weapon, 'tombak');
  assert.strictEqual(g.weaponName, 'Tombak');
  p.gear.melee = 'pedang';
  Sim.applyLoadout(g, Progress.loadout(p));
  assert.strictEqual(g.weapon, 'pedang', 'ganti di menu langsung berlaku');
});

ok('simpanan lama dimigrasi: poin dihitung dari level selesai, data palsu dibuang', () => {
  const old = Progress.normalize({
    uid: 'abcdef0123456789',
    best: { 1: { stars: 3, done: true }, 2: { stars: 2, done: true }, 15: { done: true, boss: true } },
  });
  assert.strictEqual(old.points, 4, 'dua level + satu boss');
  assert.deepStrictEqual(old.gear, { melee: 'pedang', ranged: 'blaster' });
  const bad = Progress.normalize({
    uid: 'abcdef0123456789', points: 5, stats: { hp: 99, atk: -3 },
    weapons: ['palu', 'senapan-ajaib'], gear: { melee: 'tombak', ranged: 'palu' },
  });
  assert.strictEqual(bad.stats.hp, Progress.STATS.hp.max, 'atribut dibatasi');
  assert.strictEqual(bad.stats.atk, 0);
  assert.ok(bad.weapons.includes('palu') && !bad.weapons.includes('senapan-ajaib'));
  assert.strictEqual(bad.gear.melee, 'pedang', 'tombak belum dimiliki');
  assert.strictEqual(bad.gear.ranged, 'blaster', 'palu bukan senjata jauh');
});

ok('pemasukan level lebih kecil dari ladang dan tidak bisa ditimbun', () => {
  const Levels = require('../public/mh4/js/gen/levels.js');
  const Farm = require('../public/mh4/js/base/farm.js');
  const p = Progress.newProfile('A');
  const stars = Levels.LEVELS[0].map.join('').split('*').length - 1;
  const res = Progress.gain(p, { levelId: 1, stars, chest: true, boss: false });
  const net = Farm.ITEMS.gandum.jual - Farm.CROPS.gandum.price;
  assert.ok(res.coins <= net * 3, `satu level penuh (${res.coins}) setara paling banyak tiga petak gandum (${net} per petak)`);
  const again = Progress.gain(p, { levelId: 1, stars, chest: true, boss: false });
  assert.strictEqual(again.coins, 0, 'main ulang tanpa rekor baru tidak memberi koin');
});

ok('poin upgrade: alokasi sebanding dengan poin yang bisa didapat, simpanan lama naik skala', () => {
  const Story = require('../public/mh4/js/base/story.js');
  const L = require('../public/mh4/js/gen/levels.js');
  const all = L.ALL;
  const total = Story.ROUTE.reduce((n, id) => n + ((all.find((d) => d.id === id) || {}).boss ? 2 : 1), 0);
  const cap = Object.values(Progress.STATS).reduce((n, s) => n + s.max, 0);
  assert.ok(cap >= total - 3 && cap <= total + 6, `batas ${cap} sebanding dengan ${total} poin`);
  const lama = Progress.normalize({ uid: 'abcdef0123456789', stats: { hp: 6, atk: 3, spd: 0 }, points: 0 });
  assert.deepStrictEqual([lama.stats.hp, lama.stats.atk, lama.stats.spd], [14, 7, 0], 'skala lama dinaikkan');
  const baru = Progress.normalize(JSON.parse(JSON.stringify(lama)));
  assert.strictEqual(baru.stats.hp, 14, 'tidak dinaikkan dua kali');
  // Nomor misi yang tampil berurutan 1, 2, 3, ... mengikuti cerita.
  const nos = Story.ROUTE.map((id) => all.find((d) => d.id === id)).filter((d) => d && !d.boss && !d.acak).map((d) => d.no);
  assert.deepStrictEqual(nos, nos.map((_, i) => i + 1));
});

ok('skor total hanya dari misi cerita, mode acak tidak ikut', () => {
  const p = Progress.newProfile('A');
  Progress.gain(p, { levelId: 1, score: 500 });
  Progress.gain(p, { levelId: 15, score: 900, boss: true });
  Progress.gain(p, { levelId: 35, score: 4000 });
  Progress.gain(p, { levelId: 17, score: 7000, boss: true });
  assert.strictEqual(Progress.totalScore(p), 1400);
});

console.log(`\n${n} tes progresi MH4 lulus.`);
