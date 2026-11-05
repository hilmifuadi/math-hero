// Math Hero 4: data musuh level biasa. Tiga perilaku berbeda supaya level tier tinggi
// tidak hanya berisi satu jenis musuh: jalan, melompat, dan menembak.
// Semua angka dalam satuan dunia (tile 16 px). HP/damage diskalakan per tier oleh sim.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).enemies = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  const TYPES = {
    walker: {
      id: 'walker', nama: 'Bandit', char: 'e', behavior: 'walk',
      hp: 20, damage: 10, speed: 26, w: 14, h: 15,
      sprite: { w: 28, h: 28, frame: 48 },
    },
    jumper: {
      id: 'jumper', nama: 'Ninja', char: 'a', behavior: 'jump',
      hp: 16, damage: 10, speed: 22, w: 14, h: 15,
      jump: 235, jumpEvery: 1.35, hopRange: 70,
      sprite: { w: 28, h: 28, frame: 48 },
    },
    shooter: {
      id: 'shooter', nama: 'Penembak', char: 'g', behavior: 'shoot',
      hp: 24, damage: 8, speed: 14, w: 14, h: 15,
      sight: 112, fireEvery: 2.0, telegraph: 0.35,
      bullet: { w: 8, h: 4, speed: 105, life: 2.4 },
      sprite: { w: 28, h: 28, frame: 48 },
    },
  };

  const ORDER = ['walker', 'jumper', 'shooter'];

  function byChar(ch) {
    for (const id of ORDER) if (TYPES[id].char === ch) return TYPES[id];
    return null;
  }

  function get(id) { return TYPES[id] || TYPES.walker; }

  // Pilih tipe musuh secara deterministik: tier rendah hanya jalan, tier tinggi
  // membuka pelompat dan penembak. Tidak memakai Math.random supaya peta stabil.
  function pickFor(tier, seed) {
    const pool = tier >= 3 ? ORDER : tier >= 2 ? ['walker', 'jumper'] : ['walker'];
    const x = ((seed || 0) >>> 0) % pool.length;
    return TYPES[pool[x]];
  }

  return { TYPES, ORDER, byChar, get, pickFor };
});
