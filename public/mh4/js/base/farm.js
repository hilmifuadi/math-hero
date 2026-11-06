// Math Hero 4: logika ladang, ternak, dan peti penyimpanan di markas. Data murni, tanpa DOM.
// Petak: kosong -> tanam -> siram -> tumbuh saat hari berganti -> panen masuk peti.
// Ternak tidak perlu dirawat: tiap beberapa hari ada hasil yang tinggal diambil.
// Bekal dipilih di peti dan dipakai saat berangkat misi.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).farm = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  const PLOTS = 8, RIPE = 3, MAX_STACK = 99;
  const CROPS = {
    wortel: { id: 'wortel', nama: 'Wortel', price: 10, desc: 'Bekal: +10 HP di misi berikutnya.' },
    gandum: { id: 'gandum', nama: 'Gandum', price: 15, desc: 'Dijual ke lumbung: 40 koin.' },
  };
  // hp = tambahan HP bila dibawa sebagai bekal, jual = harga di peti. icon = potongan Outdoor_Decor.
  const ITEMS = {
    wortel: { nama: 'Wortel', hp: 10, jual: 8, icon: [65, 48, 15, 16] },
    gandum: { nama: 'Gandum', hp: 0, jual: 40, icon: [97, 49, 15, 14] },
    telur: { nama: 'Telur', hp: 10, jual: 10, sheet: 'chicken', icon: [8, 8, 16, 16] },
    susu: { nama: 'Susu', hp: 20, jual: 18, sheet: 'cow', icon: [0, 0, 32, 32] },
    wol: { nama: 'Wol', hp: 0, jual: 30, sheet: 'sheep', icon: [0, 0, 32, 32] },
  };
  const ANIMALS = {
    chicken: { nama: 'Ayam', item: 'telur', every: 2 },
    cow: { nama: 'Sapi', item: 'susu', every: 3 },
    sheep: { nama: 'Domba', item: 'wol', every: 4 },
  };

  // Bangun kampung: tujuan koin jangka panjang. Hanya hiasan dan kenyamanan, tidak mengubah kekuatan Arka.
  // Urut dari murah ke mahal. Harga disusun dari pemasukan sekitar 80 sampai 100 koin per hari main, lalu diturunkan menjadi 4/10.
  const BUILDS = [
    { id: 'sungai', nama: 'Teratai dan Batu Sungai', price: 60, desc: 'Teratai mengapung dan batu di sungai.' },
    { id: 'titu', nama: 'Titu si Kucing', price: 60, desc: 'Kucing oranye yang mengikuti Arka ke mana pun di kampung.' },
    { id: 'bunga', nama: 'Kebun Bunga', price: 160, desc: 'Bunga warna-warni di tepi ladang dan jalan.' },
    { id: 'ternak', nama: 'Ternak Tambahan', price: 240, desc: 'Satu sapi, satu domba, dan dua ayam. Hasil kandang jadi dua kali.' },
    { id: 'taman', nama: 'Taman Alun-Alun', price: 320, desc: 'Bangku dan pot bunga di sekeliling air mancur.' },
    { id: 'unggun', nama: 'Api Unggun', price: 480, desc: 'Tempat warga berkumpul di tepi sungai.' },
    { id: 'dapur', nama: 'Dapur Umum', price: 720, desc: 'Dapur bersama di antara rumah warga.' },
    { id: 'bengkel', nama: 'Bengkel Ayah Hilmi', price: 1000, desc: 'Bengkel baru di selatan kampung, lengkap dengan landasan tempa.' },
    { id: 'ramuan', nama: 'Rumah Ramuan', price: 1280, desc: 'Rumah ungu dengan meja ramuan yang bergelembung.' },
    { id: 'perahu', nama: 'Perahu Sungai', price: 1400, desc: 'Perahu kecil yang berlayar pelan di sungai.' },
    { id: 'sekolah', nama: 'Sekolah Nadiya', price: 1800, desc: 'Sekolah kampung tempat Nadiya mengajar.' },
    { id: 'altar', nama: 'Altar Kristal Bilangan', price: 3200, desc: 'Tempat Kristal Bilangan bersinar menjaga kampung.' },
  ];
  const BUILD_IDS = BUILDS.map((b) => b.id);

  function emptyItems() {
    const out = {};
    for (const id of Object.keys(ITEMS)) out[id] = 0;
    return out;
  }

  function newBase() {
    return {
      story: 0, intro: false, day: 1, slept: false, seen: [], pack: null, built: [],
      items: emptyItems(), animalDay: {},
      seeds: { wortel: 2, gandum: 1 },
      plots: Array.from({ length: PLOTS }, () => ({ crop: null, stage: 0, watered: false })),
    };
  }

  function normalize(raw) {
    const b = newBase();
    if (!raw || typeof raw !== 'object') return b;
    const num = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v)) || 0));
    b.story = num(raw.story, 99);
    b.intro = !!raw.intro;
    b.day = Math.max(1, num(raw.day, 99999));
    b.slept = !!raw.slept;
    if (Array.isArray(raw.seen)) b.seen = raw.seen.filter((s) => typeof s === 'string').slice(0, 60);
    if (Array.isArray(raw.built)) b.built = BUILD_IDS.filter((id) => raw.built.includes(id));
    if (raw.seeds) for (const id of Object.keys(CROPS)) b.seeds[id] = num(raw.seeds[id], MAX_STACK);
    if (raw.items) for (const id of Object.keys(ITEMS)) b.items[id] = num(raw.items[id], MAX_STACK);
    // Simpanan lama menyimpan bekal sebagai angka wortel.
    if (raw.bekal) { b.items.wortel += num(raw.bekal, MAX_STACK); b.pack = 'wortel'; }
    if (raw.pack && ITEMS[raw.pack] && ITEMS[raw.pack].hp > 0) b.pack = raw.pack;
    if (raw.animalDay) for (const id of Object.keys(ANIMALS)) b.animalDay[id] = num(raw.animalDay[id], 99999);
    if (Array.isArray(raw.plots)) {
      b.plots.forEach((p, i) => {
        const r = raw.plots[i];
        if (r && CROPS[r.crop]) { p.crop = r.crop; p.stage = num(r.stage, RIPE); p.watered = !!r.watered; }
      });
    }
    return b;
  }

  // Apa yang bisa dilakukan pada petak ini sekarang.
  function action(base, i) {
    const p = base.plots[i];
    if (!p.crop) return 'tanam';
    if (p.stage >= RIPE) return 'panen';
    return p.watered ? 'tunggu' : 'siram';
  }

  function plant(base, i, crop) {
    const p = base.plots[i];
    if (p.crop) return { ok: false, reason: 'terisi' };
    if (!CROPS[crop]) return { ok: false, reason: 'tidak-ada' };
    if (!(base.seeds[crop] > 0)) return { ok: false, reason: 'benih-habis' };
    base.seeds[crop]--;
    p.crop = crop; p.stage = 0; p.watered = false;
    return { ok: true };
  }

  function water(base, i) {
    const p = base.plots[i];
    if (!p.crop || p.stage >= RIPE) return { ok: false };
    p.watered = true;
    return { ok: true };
  }

  function addItem(base, id) {
    base.items[id] = Math.min(MAX_STACK, (base.items[id] || 0) + 1);
    // Makanan pertama otomatis jadi bekal, supaya anak langsung merasakan manfaatnya.
    if (!base.pack && ITEMS[id].hp > 0) base.pack = id;
  }

  // Hasil panen masuk peti.
  function harvest(base, i) {
    const p = base.plots[i];
    if (!p.crop || p.stage < RIPE) return { ok: false };
    const id = p.crop;
    addItem(base, id);
    p.crop = null; p.stage = 0; p.watered = false;
    return { ok: true, item: id, nama: ITEMS[id].nama };
  }

  function animalReady(base, kind) {
    const a = ANIMALS[kind];
    return !!a && base.day - (base.animalDay[kind] || 0) >= a.every;
  }

  function collectAnimal(base, kind) {
    if (!animalReady(base, kind)) return { ok: false };
    const a = ANIMALS[kind];
    base.animalDay[kind] = base.day;
    const n = hasBuilt(base, 'ternak') ? 2 : 1;
    for (let i = 0; i < n; i++) addItem(base, a.item);
    return { ok: true, item: a.item, nama: ITEMS[a.item].nama, n };
  }

  const hasBuilt = (base, id) => !!(base && base.built && base.built.includes(id));

  function buyBuild(profile, id) {
    const b = BUILDS.find((x) => x.id === id), base = profile.base;
    if (!b) return { ok: false, reason: 'tidak-ada' };
    if (hasBuilt(base, id)) return { ok: false, reason: 'sudah' };
    if (profile.koin < b.price) return { ok: false, reason: 'koin-kurang', kurang: b.price - profile.koin };
    profile.koin -= b.price;
    base.built = BUILD_IDS.filter((x) => x === id || base.built.includes(x));
    return { ok: true, nama: b.nama };
  }

  function nextDay(base) {
    base.day++;
    base.slept = false;
    for (const p of base.plots) {
      if (p.crop && p.watered && p.stage < RIPE) p.stage++;
      p.watered = false;
    }
  }

  // Tidur hanya sekali di antara dua misi, supaya pemain tetap keluar bertualang.
  function sleep(base) {
    if (base.slept) return false;
    nextDay(base);
    base.slept = true;
    return true;
  }

  function buySeed(profile, crop) {
    const c = CROPS[crop];
    if (!c) return { ok: false, reason: 'tidak-ada' };
    if (profile.koin < c.price) return { ok: false, reason: 'koin-kurang', kurang: c.price - profile.koin };
    profile.koin -= c.price;
    profile.base.seeds[crop]++;
    return { ok: true };
  }

  function setPack(base, id) {
    if (id !== null && !(ITEMS[id] && ITEMS[id].hp > 0 && base.items[id] > 0)) return false;
    base.pack = id;
    return true;
  }

  function sell(profile, id) {
    const it = ITEMS[id], base = profile.base;
    if (!it || !(base.items[id] > 0)) return { ok: false };
    base.items[id]--;
    profile.koin += it.jual;
    if (base.pack === id && !base.items[id]) base.pack = null;
    return { ok: true, koin: it.jual };
  }

  // Bekal terpilih dipakai saat berangkat misi. Mengembalikan tambahan HP.
  function useBekal(base) {
    const id = base.pack;
    if (!id || !(base.items[id] > 0)) { base.pack = null; return 0; }
    base.items[id]--;
    if (!base.items[id]) base.pack = null;
    return ITEMS[id].hp;
  }

  return {
    BUILDS, BUILD_IDS, hasBuilt, buyBuild, PLOTS, RIPE, CROPS, ITEMS, ANIMALS, newBase, normalize, action, plant, water, harvest,
    animalReady, collectAnimal, nextDay, sleep, buySeed, setPack, sell, useBekal,
  };
});
