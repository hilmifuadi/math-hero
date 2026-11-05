// Math Hero 4: progresi pemain (koin, bintang terbaik, item, equipment) sebagai data murni.
// Modul ini tidak menyentuh DOM. Penyimpanan lokal memakai localStorage dengan fallback
// memori; sinkronisasi cloud ada di cloud.js dan memakai bentuk data yang sama.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./shop.js'));
  } else {
    (root.MH4 = root.MH4 || {}).progress = factory(root.MH4.shop);
  }
})(typeof self !== 'undefined' ? self : this, function (Shop) {
  const KEY = 'mathHero4.save.v1';
  const VERSION = 1;
  const MAX_COINS = 1000000;
  const UID_RE = /^[a-z0-9]{8,32}$/;

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
      owned: Shop.BASE_OWNED.slice(),
      equipped: Object.assign({}, Shop.BASE_EQUIPPED),
      best: {},
      totalStars: 0,
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
        if (!(id >= 1 && id <= 30) || !v || typeof v !== 'object') continue;
        const stars = Math.max(0, Math.min(99, Math.floor(Number(v.stars) || 0)));
        p.best[id] = {
          stars,
          chest: !!v.chest,
          boss: !!v.boss,
          done: !!v.done,
          at: isFinite(Number(v.at)) ? Number(v.at) : 0,
        };
      }
    }
    p.totalStars = Object.values(p.best).reduce((n, b) => n + b.stars, 0);
    p.updatedAt = isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : Date.now();
    return p;
  }

  function loadout(profile) {
    const out = Shop.baseLoadout();
    if (!profile) return out;
    for (const slot of Shop.SLOTS) {
      const item = Shop.get(profile.equipped && profile.equipped[slot]);
      if (!item) continue;
      for (const [k, v] of Object.entries(item.effects || {})) {
        if (k === 'maxHp') out.maxHp += v;
        else if (k in out) out[k] *= v;
      }
    }
    return out;
  }

  function coinReward(profile, result, first) {
    result = result || {};
    let n = Math.max(0, Math.floor(Number(result.stars) || 0)) * 5;
    if (result.chest) n += 30;
    if (result.boss) n += first ? 120 : 60;
    if (first) n += 20;
    return Math.round(n * loadout(profile).coinMul);
  }

  // Mencatat hasil level. Mengembalikan { first, coins }. Bintang memakai nilai terbaik.
  function gain(profile, result, now) {
    result = result || {};
    const id = Math.max(1, Math.min(30, Math.floor(Number(result.levelId) || 1)));
    const prev = profile.best[id];
    const first = !prev || !prev.done;
    const stars = Math.max(prev ? prev.stars : 0, Math.max(0, Math.min(99, Math.floor(Number(result.stars) || 0))));
    profile.best[id] = {
      stars,
      chest: !!(result.chest || (prev && prev.chest)),
      boss: !!(result.boss || (prev && prev.boss)),
      done: true,
      at: now || Date.now(),
    };
    profile.totalStars = Object.values(profile.best).reduce((n, b) => n + b.stars, 0);
    const coins = coinReward(profile, { stars: result.stars || 0, chest: result.chest, boss: result.boss }, first);
    profile.koin = clampCoins(profile.koin + coins);
    profile.updatedAt = now || Date.now();
    return { first, coins };
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

  // Progresi linier: level 1 selalu terbuka; level/boss berikutnya terbuka setelah
  // level sebelumnya selesai. Boss kelima belas terbuka setelah level 14 selesai.
  function unlocked(profile, id) {
    if (id <= 1) return true;
    const prev = profile && profile.best[id - 1];
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
      updatedAt: profile.updatedAt,
    };
  }

  return {
    KEY, VERSION, MAX_COINS, newProfile, normalize, loadout, coinReward, gain,
    buy, equip, unlocked, serialize, parse, loadLocal, saveLocal, newer, toCloud,
  };
});
