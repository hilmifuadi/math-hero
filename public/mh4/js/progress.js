// Math Hero 4: progresi pemain (koin, bintang terbaik, item, equipment) sebagai data murni.
// Modul ini tidak menyentuh DOM. Penyimpanan lokal memakai localStorage dengan fallback
// memori; sinkronisasi cloud ada di cloud.js dan memakai bentuk data yang sama.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./shop.js'), require('./combat/weapons.js'), require('./base/farm.js'), require('./base/story.js'));
  } else {
    (root.MH4 = root.MH4 || {}).progress = factory(root.MH4.shop, root.MH4.weapons, root.MH4.farm, root.MH4.story);
  }
})(typeof self !== 'undefined' ? self : this, function (Shop, Weapons, Farm, Story) {
  const KEY = 'mathHero4.save.v1';
  const VERSION = 1;
  const MAX_COINS = 1000000;
  const UID_RE = /^[a-z0-9]{8,32}$/;

  // Upgrade point: satu poin tiap level baru selesai, dua untuk boss. Batas per atribut
  // lebih kecil dari total poin supaya pemain tetap memilih urutannya, dan semua bisa penuh.
  // Sekitar 41 poin bisa didapat (24 misi x 1, 7 boss x 2, mode acak 3), jadi tiap atribut 14 tingkat.
  // Kekuatan penuh tetap mirip versi lama: +28 HP, +42% damage, +17% kecepatan.
  const STATS = {
    hp: { nama: 'Health', desc: '+2 HP maksimal', max: 14, per: 2 },
    atk: { nama: 'Attack', desc: '+3% damage semua senjata', max: 14, per: 0.03 },
    spd: { nama: 'Speed', desc: '+1,2% kecepatan jalan', max: 14, per: 0.012 },
  };
  const STAT_SCALE = 2;
  const BASE_WEAPONS = ['pedang', 'blaster'];
  const BASE_GEAR = { melee: 'pedang', ranged: 'blaster' };
  const COINS = { star: 1, chest: 12, first: 10, bossFirst: 60, bossAgain: 10 };
  // Senjata baru ditemukan di peti level ini saat pertama kali dibuka.
  const CHEST_WEAPONS = { 2: 'tombak', 4: 'pelontar', 7: 'palu', 10: 'pantul' };

  function makeUid() {
    let s = '';
    for (let i = 0; i < 16; i++) s += '0123456789abcdef'[Math.floor(Math.random() * 16)];
    return s;
  }

  function newProfile(nama, opts) {
    opts = opts || {};
    return {
      v: VERSION,
      uid: opts.uid || makeUid(),
      nama: String(nama || 'PEMAIN').slice(0, 12),
      koin: 0,
      kelas: 0,
      owned: Shop.BASE_OWNED.slice(),
      equipped: Object.assign({}, Shop.BASE_EQUIPPED),
      best: {},
      totalStars: 0,
      points: 0,
      stats: { hp: 0, atk: 0, spd: 0, v: STAT_SCALE },
      weapons: BASE_WEAPONS.slice(),
      gear: Object.assign({}, BASE_GEAR),
      base: Farm.newBase(),
      updatedAt: opts.now || Date.now(),
    };
  }

  function clampCoins(n) {
    n = Math.floor(Number(n));
    if (!isFinite(n) || n < 0) return 0;
    return Math.min(MAX_COINS, n);
  }

  // Membersihkan data dari localStorage/Firestore: bentuk salah dibuang, bukan dipercaya.
  function normalize(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const p = newProfile(typeof raw.nama === 'string' && raw.nama.trim() ? raw.nama.trim() : 'PEMAIN');
    if (typeof raw.uid === 'string' && UID_RE.test(raw.uid)) p.uid = raw.uid;
    p.koin = clampCoins(raw.koin);
    if (typeof raw.playDay === 'string') { p.playDay = raw.playDay.slice(0, 12); p.playSec = Math.max(0, Number(raw.playSec) || 0); }
    p.kelas = Math.max(0, Math.min(6, Math.floor(Number(raw.kelas)) || 0));
    const owned = new Set(Shop.BASE_OWNED);
    if (Array.isArray(raw.owned)) {
      for (const id of raw.owned) if (Shop.get(id)) owned.add(id);
    }
    p.owned = [...owned];
    p.equipped = Object.assign({}, Shop.BASE_EQUIPPED);
    if (raw.equipped && typeof raw.equipped === 'object') {
      for (const slot of Shop.SLOTS) {
        const id = raw.equipped[slot];
        const item = Shop.get(id);
        if (item && item.slot === slot && owned.has(id)) p.equipped[slot] = id;
      }
    }
    p.best = {};
    if (raw.best && typeof raw.best === 'object') {
      for (const [k, v] of Object.entries(raw.best)) {
        const id = Number(k);
        if (!(id >= 1 && id <= 40) || !v || typeof v !== 'object') continue;
        const stars = Math.max(0, Math.min(99, Math.floor(Number(v.stars) || 0)));
        p.best[id] = {
          stars,
          chest: !!v.chest,
          boss: !!v.boss,
          done: !!v.done,
          score: Math.max(0, Math.min(99999, Math.floor(Number(v.score) || 0))),
          at: isFinite(Number(v.at)) ? Number(v.at) : 0,
        };
      }
    }
    p.totalStars = Object.values(p.best).reduce((n, b) => n + b.stars, 0);
    // Simpanan lama belum punya poin: hitung dari level yang sudah selesai agar tidak rugi.
    if (raw.points === undefined) {
      p.points = Object.entries(p.best).reduce((n, [, b]) => n + (b.done ? (b.boss ? 2 : 1) : 0), 0);
    } else {
      p.points = Math.max(0, Math.min(99, Math.floor(Number(raw.points)) || 0));
    }
    // Simpanan skala lama (6 tingkat) dinaikkan supaya kekuatan pemain tidak turun.
    const old = raw.stats && raw.stats.v !== STAT_SCALE;
    for (const id of Object.keys(STATS)) {
      let v = raw.stats && Math.floor(Number(raw.stats[id]));
      if (old && v > 0) v = Math.round(v * 14 / 6);
      p.stats[id] = v > 0 ? Math.min(STATS[id].max, v) : 0;
    }
    p.stats.v = STAT_SCALE;
    const weapons = new Set(BASE_WEAPONS);
    if (Array.isArray(raw.weapons)) {
      for (const id of raw.weapons) if (Weapons.WEAPONS[id]) weapons.add(id);
    }
    p.weapons = [...weapons];
    const gear = raw.gear || {};
    if (Weapons.MELEE.includes(gear.melee) && weapons.has(gear.melee)) p.gear.melee = gear.melee;
    if (Weapons.RANGED.includes(gear.ranged) && weapons.has(gear.ranged)) p.gear.ranged = gear.ranged;
    p.base = Farm.normalize(raw.base);
    p.updatedAt = isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : Date.now();
    return p;
  }

  function loadout(profile) {
    const out = Shop.baseLoadout();
    out.melee = BASE_GEAR.melee;
    out.ranged = BASE_GEAR.ranged;
    if (!profile) return out;
    const stats = profile.stats || {};
    out.maxHp += (stats.hp || 0) * STATS.hp.per;
    out.meleeMul *= 1 + (stats.atk || 0) * STATS.atk.per;
    out.rangedMul *= 1 + (stats.atk || 0) * STATS.atk.per;
    out.speedMul *= 1 + (stats.spd || 0) * STATS.spd.per;
    out.armor = (profile.equipped && profile.equipped.armor) || null;
    if (profile.gear) {
      out.melee = profile.gear.melee || out.melee;
      out.ranged = profile.gear.ranged || out.ranged;
    }
    for (const slot of Shop.SLOTS) {
      const item = Shop.get(profile.equipped && profile.equipped[slot]);
      if (!item) continue;
      for (const [k, v] of Object.entries(item.effects || {})) {
        if (k === 'maxHp') out.maxHp += v;
        else if (typeof out[k] === 'number') out[k] *= v;
      }
    }
    return out;
  }

  // Level memberi sedikit koin; pemasukan utama datang dari ladang dan ternak.
  // Main ulang hanya membayar bintang yang lebih banyak dari rekor, jadi tidak bisa ditimbun.
  function coinReward(profile, result, first, prev) {
    result = result || {};
    const best = prev ? prev.stars || 0 : 0;
    const stars = Math.max(0, Math.floor(Number(result.stars) || 0));
    let n = Math.max(0, stars - best) * COINS.star;
    if (result.chest && !(prev && prev.chest)) n += COINS.chest;
    if (result.boss) n += first ? COINS.bossFirst : COINS.bossAgain;
    if (first) n += COINS.first;
    return Math.round(n * loadout(profile).coinMul);
  }

  // Mencatat hasil level. Mengembalikan { first, coins }. Bintang memakai nilai terbaik.
  function gain(profile, result, now) {
    result = result || {};
    const id = Math.max(1, Math.min(40, Math.floor(Number(result.levelId) || 1)));
    const prev = profile.best[id];
    const first = !prev || !prev.done;
    const stars = Math.max(prev ? prev.stars : 0, Math.max(0, Math.min(99, Math.floor(Number(result.stars) || 0))));
    // Mengulang level tidak menambah skor: hanya skor terbaik per level yang dihitung.
    const score = Math.max(0, Math.floor(Number(result.score) || 0));
    const prevScore = prev ? prev.score || 0 : 0;
    profile.best[id] = {
      stars,
      score: Math.max(prevScore, score),
      chest: !!(result.chest || (prev && prev.chest)),
      boss: !!(result.boss || (prev && prev.boss)),
      done: true,
      at: now || Date.now(),
    };
    profile.totalStars = Object.values(profile.best).reduce((n, b) => n + b.stars, 0);
    const coins = coinReward(profile, { stars: result.stars || 0, chest: result.chest, boss: result.boss }, first, prev);
    profile.koin = clampCoins(profile.koin + coins);
    const points = first ? (result.boss ? 2 : 1) : 0;
    profile.points = (profile.points || 0) + points;
    profile.updatedAt = now || Date.now();
    return { first, coins, points, score, bestScore: Math.max(prevScore, score), newBest: score > prevScore, total: totalScore(profile) };
  }

  // Skor total hanya dari misi cerita, jadi nilainya punya batas. Level Acak dan Boss Acak tidak ikut.
  const totalScore = (profile) => Story.ROUTE.filter((id) => !Story.ACAK.includes(id))
    .reduce((n, id) => n + ((profile.best[id] && profile.best[id].score) || 0), 0);

  function spendPoint(profile, stat, now) {
    const def = STATS[stat];
    if (!def) return { ok: false, reason: 'atribut-tidak-ada' };
    if (!(profile.points > 0)) return { ok: false, reason: 'poin-kurang' };
    if ((profile.stats[stat] || 0) >= def.max) return { ok: false, reason: 'sudah-penuh' };
    profile.points--;
    profile.stats[stat] = (profile.stats[stat] || 0) + 1;
    profile.updatedAt = now || Date.now();
    return { ok: true };
  }

  // Mengembalikan id senjata baru bila peti level ini berisi senjata yang belum dimiliki.
  function openChest(profile, levelId, now) {
    const id = CHEST_WEAPONS[levelId];
    if (!id || profile.weapons.indexOf(id) >= 0) return null;
    profile.weapons.push(id);
    profile.updatedAt = now || Date.now();
    return id;
  }

  // Senjata pamungkas dibeli dengan koin setelah boss terakhir kalah.
  function buyWeapon(profile, id, now) {
    const w = Weapons.WEAPONS[id];
    if (!w || !w.ultimate) return { ok: false, reason: 'tidak-dijual' };
    if (profile.weapons.indexOf(id) >= 0) return { ok: false, reason: 'sudah-punya' };
    if (!(profile.best[Story.FINALE] && profile.best[Story.FINALE].done)) return { ok: false, reason: 'terkunci' };
    if (profile.koin < w.price) return { ok: false, reason: 'koin-kurang', kurang: w.price - profile.koin };
    profile.koin -= w.price;
    profile.weapons.push(id);
    profile.updatedAt = now || Date.now();
    return { ok: true };
  }

  function equipWeapon(profile, id, now) {
    if (profile.weapons.indexOf(id) < 0) return { ok: false, reason: 'belum-punya' };
    const slot = Weapons.MELEE.includes(id) ? 'melee' : Weapons.RANGED.includes(id) ? 'ranged' : null;
    if (!slot) return { ok: false, reason: 'senjata-tidak-ada' };
    profile.gear[slot] = id;
    profile.updatedAt = now || Date.now();
    return { ok: true };
  }

  function buy(profile, itemId, now) {
    const item = Shop.get(itemId);
    if (!item) return { ok: false, reason: 'item-tidak-ada' };
    if (profile.owned.indexOf(itemId) >= 0) return { ok: false, reason: 'sudah-punya' };
    if (profile.koin < item.price) return { ok: false, reason: 'koin-kurang', kurang: item.price - profile.koin };
    profile.koin -= item.price;
    profile.owned.push(itemId);
    profile.equipped[item.slot] = item.id;
    profile.updatedAt = now || Date.now();
    return { ok: true, item };
  }

  function equip(profile, itemId, now) {
    const item = Shop.get(itemId);
    if (!item) return { ok: false, reason: 'item-tidak-ada' };
    if (profile.owned.indexOf(itemId) < 0) return { ok: false, reason: 'belum-punya' };
    profile.equipped[item.slot] = item.id;
    profile.updatedAt = now || Date.now();
    return { ok: true, item };
  }

  // Progresi mengikuti urutan cerita (base/story.js): misi terbuka setelah misi sebelumnya
  // pada rute selesai, jadi Lendir Kabut menjadi puncak bab 1, bukan akhir daftar level.
  function unlocked(profile, id) {
    if (Story.ACAK.includes(id)) return !!(profile && profile.best[Story.ACAK_AFTER] && profile.best[Story.ACAK_AFTER].done);
    const i = Story.ROUTE.indexOf(id);
    if (i <= 0) return i === 0;
    const prev = profile && profile.best[Story.ROUTE[i - 1]];
    return !!(prev && prev.done);
  }

  function serialize(profile) { return JSON.stringify(profile); }

  function parse(raw) {
    if (!raw) return null;
    try {
      const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return normalize(obj);
    } catch (e) { return null; }
  }

  function storageOr(storage) {
    if (storage) return storage;
    try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
  }

  function loadLocal(storage) {
    const st = storageOr(storage);
    if (!st) return null;
    let raw = null;
    try { raw = st.getItem(KEY); } catch (e) { return null; }
    if (!raw) return null;
    const p = parse(raw);
    if (!p) {
      try { if (!st.getItem(KEY + '.rusak')) st.setItem(KEY + '.rusak', raw); } catch (e) { /* abaikan */ }
    }
    return p;
  }

  function saveLocal(profile, storage) {
    const st = storageOr(storage);
    if (!st) return false;
    try { st.setItem(KEY, serialize(profile)); return true; } catch (e) { return false; }
  }

  // Pilih data yang paling baru; seri dengan waktu sama memakai lokal agar stabil.
  function newer(local, cloud) {
    if (!local) return cloud;
    if (!cloud) return local;
    return cloud.updatedAt > local.updatedAt ? cloud : local;
  }

  // Bentuk dokumen Firestore: hanya bidang sederhana yang diizinkan aturan.
  function toCloud(profile) {
    return {
      uid: profile.uid,
      v: VERSION,
      nama: profile.nama,
      koin: profile.koin,
      owned: profile.owned.slice(),
      equipped: Object.assign({}, profile.equipped),
      best: JSON.parse(JSON.stringify(profile.best)),
      totalStars: profile.totalStars,
      points: profile.points,
      stats: Object.assign({}, profile.stats),
      weapons: profile.weapons.slice(),
      gear: Object.assign({}, profile.gear),
      base: JSON.parse(JSON.stringify(profile.base)),
      updatedAt: profile.updatedAt,
    };
  }

  return {
    buyWeapon, clampCoins, totalScore, KEY, VERSION, MAX_COINS, STATS, CHEST_WEAPONS, spendPoint, openChest, equipWeapon,
    newProfile, normalize, loadout, coinReward, gain,
    buy, equip, unlocked, serialize, parse, loadLocal, saveLocal, newer, toCloud,
  };
});
