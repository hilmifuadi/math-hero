// Math Hero 4: logika ladang di markas. Data murni, tanpa DOM.
// Satu petak: kosong -> tanam -> siram -> tumbuh saat hari berganti -> panen.
// Hari berganti setiap pulang dari misi atau tidur sekali di rumah.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).farm = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  const PLOTS = 8, RIPE = 3, MAX_BEKAL = 5;
  const CROPS = {
    wortel: { id: 'wortel', nama: 'Wortel', price: 10, reward: { koin: 5, bekal: 1 }, desc: 'Jadi bekal: +10 HP di misi berikutnya.' },
    gandum: { id: 'gandum', nama: 'Gandum', price: 15, reward: { koin: 40, bekal: 0 }, desc: 'Dijual ke lumbung: +40 koin.' },
  };

  function newBase() {
    return {
      story: 0, intro: false, day: 1, slept: false, bekal: 0, seen: [],
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
    b.bekal = num(raw.bekal, MAX_BEKAL);
    if (Array.isArray(raw.seen)) b.seen = raw.seen.filter((s) => typeof s === 'string').slice(0, 60);
    if (raw.seeds) for (const id of Object.keys(CROPS)) b.seeds[id] = num(raw.seeds[id], 99);
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

  function harvest(base, i) {
    const p = base.plots[i];
    if (!p.crop || p.stage < RIPE) return { ok: false };
    const crop = CROPS[p.crop];
    const bekal = Math.min(crop.reward.bekal, MAX_BEKAL - base.bekal);
    base.bekal += bekal;
    p.crop = null; p.stage = 0; p.watered = false;
    return { ok: true, crop: crop.id, nama: crop.nama, koin: crop.reward.koin, bekal };
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

  // Bekal dipakai otomatis saat berangkat misi. Mengembalikan tambahan HP.
  function useBekal(base) {
    if (!(base.bekal > 0)) return 0;
    base.bekal--;
    return 10;
  }

  return { PLOTS, RIPE, MAX_BEKAL, CROPS, newBase, normalize, action, plant, water, harvest, nextDay, sleep, buySeed, useBekal };
});
