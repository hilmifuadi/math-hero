// Math Hero 4: data musuh level biasa. Lima perilaku berbeda supaya tiap jenis menuntut cara
// lawan sendiri: tengkorak patroli, lendir tebal yang melompat, penyihir penembak, kelelawar
// yang menukik (tidak bisa diinjak), dan orc yang menyeruduk lalu pusing saat menabrak.
// Semua angka dalam satuan dunia (tile 16 px). HP/damage diskalakan per level oleh sim.
// stomp: 'kill' kalah sekali injak, 'hit' hanya terluka, 'stun' hanya bila sedang pusing, false tidak bisa.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).enemies = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  const TYPES = {
    walker: {
      id: 'walker', nama: 'Tengkorak', char: 'e', behavior: 'walk', stomp: 'kill',
      hp: 20, damage: 10, speed: 28, w: 12, h: 16,
      sprite: { frame: 32, draw: 32, foot: 23 },
    },
    jumper: {
      id: 'jumper', nama: 'Lendir', char: 'a', behavior: 'jump', stomp: 'hit', stompDamage: 24,
      hp: 60, damage: 9, speed: 14, w: 15, h: 12,
      jump: 230, jumpEvery: 1.8, hopRange: 70,
      sprite: { frame: 64, draw: 64, foot: 40 },
    },
    shooter: {
      id: 'shooter', nama: 'Penyihir Tulang', char: 'g', behavior: 'shoot', stomp: 'kill',
      hp: 24, damage: 8, speed: 14, w: 12, h: 16,
      sight: 112, fireEvery: 2.0, telegraph: 0.35,
      bullet: { w: 8, h: 4, speed: 105, life: 2.4 },
      sprite: { frame: 32, draw: 32, foot: 23 },
    },
    flyer: {
      id: 'flyer', nama: 'Kelelawar', char: 'f', behavior: 'fly', stomp: false,
      hp: 14, damage: 8, speed: 30, w: 14, h: 12,
      hover: 42, sight: 90, wind: 0.55, dive: 115, diveTime: 0.7, rest: 1.6,
      sprite: { frame: 32, draw: 32, foot: 24 },
    },
    charger: {
      id: 'charger', nama: 'Orc Penyeruduk', char: 'r', behavior: 'charge', stomp: 'stun',
      hp: 34, damage: 11, speed: 16, w: 16, h: 20,
      sight: 130, wind: 0.6, dash: 120, dashTime: 1.6, stun: 1.3,
      sprite: { frame: 64, draw: 64, foot: 62 },
    },
  };

  // Musuh per tema. Tiap jenis menuntut cara lawan sendiri.
  const HUMAN = { frame: 64, draw: 48, foot: 62 };
  Object.assign(TYPES, {
    goblin: { id: 'goblin', nama: 'Goblin Pelari', char: 'b', behavior: 'walk', stomp: 'kill', hp: 18, damage: 9, speed: 52, w: 12, h: 16, sprite: HUMAN },
    rogue: { id: 'rogue', nama: 'Goblin Pengejar', char: 'j', behavior: 'chase', stomp: 'kill', hp: 22, damage: 10, speed: 44, jump: 300, sight: 150, w: 12, h: 16, sprite: HUMAN },
    mage: {
      id: 'mage', nama: 'Tulang Penyihir', char: 'm', behavior: 'shoot', stomp: 'kill', hp: 24, damage: 9, speed: 10, w: 12, h: 16,
      sight: 150, fireEvery: 2.2, telegraph: 0.4, bullet: { w: 8, h: 8, speed: 85, life: 2.4, lob: 170, g: 300, color: '#b48cff' }, sprite: HUMAN,
    },
    shaman: {
      id: 'shaman', nama: 'Dukun Orc', char: 'w', behavior: 'shoot', stomp: 'kill', hp: 30, damage: 8, speed: 12, w: 12, h: 16,
      sight: 130, fireEvery: 2.6, telegraph: 0.5, bullet: { w: 9, h: 9, speed: 50, life: 3.5, home: 70, color: '#7dff9e' }, sprite: HUMAN,
    },
    guard: { id: 'guard', nama: 'Tulang Bertameng', char: 'h', behavior: 'guard', guard: true, stomp: 'hit', stompDamage: 30, hp: 40, damage: 11, speed: 18, w: 13, h: 17, sprite: HUMAN },
    ambusher: {
      id: 'ambusher', nama: 'Tulang Penyergap', char: 'u', behavior: 'charge', stomp: 'stun', hp: 20, damage: 10, speed: 8, w: 12, h: 16,
      sight: 120, wind: 0.35, dash: 150, dashTime: 0.9, stun: 1.0, sprite: HUMAN,
    },
    plant: {
      id: 'plant', nama: 'Bunga Peludah', char: 'p', behavior: 'shoot', stomp: 'hit', stompDamage: 20, hp: 26, damage: 8, speed: 0, w: 14, h: 20,
      sight: 120, fireEvery: 1.9, telegraph: 0.4, bullet: { w: 7, h: 7, speed: 90, life: 2, lob: 90, g: 220, color: '#ffb0d0' }, sprite: HUMAN,
    },
  });

  // Anak ayam: menetas dari telur Ayam Kabut. Kecil dan mudah diinjak.
  TYPES.chick = { id: 'chick', nama: 'Anak Ayam', behavior: 'walk', stomp: 'kill', hp: 8, damage: 5, speed: 40, w: 10, h: 10, sprite: { frame: 32, draw: 24, foot: 23 } };

  // Mini boss di tengah level: HP besar, tidak terpental, dan membuka kunci jalan saat kalah.
  TYPES.ogre = {
    id: 'ogre', nama: 'Orc Raksasa', char: 'Q', behavior: 'charge', stomp: 'hit', stompDamage: 26, boss: true,
    hp: 170, damage: 11, speed: 20, w: 24, h: 30,
    sight: 170, wind: 0.65, dash: 135, dashTime: 1.3, stun: 1.7,
    sprite: { frame: 64, draw: 96, foot: 62 },
  };
  TYPES.slimeking = {
    id: 'slimeking', nama: 'Raja Lendir', char: 'Z', behavior: 'jump', stomp: 'hit', stompDamage: 22, boss: true,
    hp: 150, damage: 10, speed: 24, w: 28, h: 22,
    jump: 310, jumpEvery: 1.5, hopRange: 130,
    sprite: { frame: 64, draw: 112, foot: 40 },
  };

  const ORDER = ['walker', 'jumper', 'shooter', 'flyer', 'charger'];

  function byChar(ch) {
    for (const id of Object.keys(TYPES)) if (TYPES[id].char === ch) return TYPES[id];
    return null;
  }

  function get(id) { return TYPES[id] || TYPES.walker; }

  // Pilih tipe musuh secara deterministik: tier rendah sedikit jenis, tier tinggi semua jenis.
  function pickFor(tier, seed) {
    const pool = tier >= 3 ? ORDER : tier >= 2 ? ['walker', 'jumper', 'flyer'] : ['walker', 'jumper'];
    const x = ((seed || 0) >>> 0) % pool.length;
    return TYPES[pool[x]];
  }

  return { TYPES, ORDER, byChar, get, pickFor };
});
