// Math Hero 4: data senjata. Tiap senjata punya identitas sendiri dari jangkauan, cooldown,
// knockback, dan fisika proyektil. Hanya damage yang naik mengikuti level (ide-mh4 2.9);
// sisanya tetap. Senjata jarak jauh selalu lebih lemah per serangan daripada jarak dekat.
// Semua nilai dalam satuan dunia (tile 16 px).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).weapons = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  const WEAPONS = {
    pedang: {
      id: 'pedang', nama: 'Pedang', type: 'melee', tierBase: 0.18,
      desc: 'Seimbang: cepat dan cukup jauh.', tag: 'Tebasan', bars: { kuat: 3, cepat: 4, jarak: 2 },
      damage: 16, cooldown: 0.42, windup: 0.05, active: 0.14, recovery: 0.16,
      range: 30, height: 34, reachY: 18, knockback: 95, color: '#ffe066',
      icon: [0, 0, 7, 19],
    },
    tombak: {
      id: 'tombak', nama: 'Tombak', type: 'melee', tierBase: 0.18,
      desc: 'Jangkauan paling jauh, tetapi tusukannya sempit.', tag: 'Tusukan jauh', bars: { kuat: 2, cepat: 3, jarak: 3 },
      damage: 13, cooldown: 0.5, windup: 0.05, active: 0.12, recovery: 0.16,
      range: 50, height: 14, reachY: 6, knockback: 70, color: '#9fe8ff',
      icon: [20, 0, 7, 23],
    },
    palu: {
      id: 'palu', nama: 'Palu', type: 'melee', tierBase: 0.18,
      desc: 'Lambat, sangat kuat, area tinggi, dan mendorong jauh.', tag: 'Hantaman', bars: { kuat: 5, cepat: 1, jarak: 2 },
      damage: 27, cooldown: 0.88, windup: 0.08, active: 0.16, recovery: 0.2,
      range: 26, height: 46, reachY: 28, knockback: 200, color: '#ffae5c',
      icon: [40, 0, 15, 20],
    },
    blaster: {
      id: 'blaster', nama: 'Blaster', type: 'ranged', tierBase: 0.12,
      desc: 'Tembakan lurus dan serbaguna.', tag: 'Tembakan lurus', bars: { kuat: 2, cepat: 3, jarak: 4 },
      damage: 9, cooldown: 0.58, windup: 0.08, active: 0.12, recovery: 0.2,
      speed: 225, gravity: 55, lift: 12, life: 1.3, knockback: 40, color: '#7be0ff',
      projectile: { w: 9, h: 5 }, icon: [60, 0, 18, 9],
    },
    pelontar: {
      id: 'pelontar', nama: 'Pelontar', type: 'ranged', tierBase: 0.12,
      desc: 'Bom melengkung yang meledak dan mengenai area.', tag: 'Bom melengkung', bars: { kuat: 3, cepat: 1, jarak: 3 },
      damage: 12, cooldown: 0.95, windup: 0.1, active: 0.12, recovery: 0.25,
      speed: 135, gravity: 430, lift: 170, life: 2.0, knockback: 110, color: '#ff9c6b',
      blast: 26, projectile: { w: 8, h: 8 }, icon: [80, 0, 17, 11],
    },
    pantul: {
      id: 'pantul', nama: 'Pemantul', type: 'ranged', tierBase: 0.12,
      desc: 'Peluru cepat yang memantul di dinding dua kali.', tag: 'Peluru pantul', bars: { kuat: 1, cepat: 5, jarak: 4 },
      damage: 7, cooldown: 0.4, windup: 0.06, active: 0.1, recovery: 0.14,
      speed: 245, gravity: 0, lift: 0, life: 2.2, knockback: 25, color: '#c9a2ff',
      bounce: 2, projectile: { w: 7, h: 5 }, icon: [100, 0, 9, 15],
    },
    // Senjata pamungkas: dibeli mahal setelah tamat. Damage biasa, keunggulannya ada di pola serang.
    'pedang-angin': {
      id: 'pedang-angin', nama: 'Pedang Angin', type: 'melee', tierBase: 0.18, ultimate: true, price: 2000, hue: 150,
      desc: 'Tebasan angin ke depan dan belakang sekaligus.', tag: 'Tebasan ganda', bars: { kuat: 3, cepat: 4, jarak: 3 },
      damage: 15, cooldown: 0.45, windup: 0.05, active: 0.16, recovery: 0.16,
      range: 32, height: 40, reachY: 20, knockback: 110, color: '#bff5ff', both: true,
      icon: [0, 0, 7, 19],
    },
    bumerang: {
      id: 'bumerang', nama: 'Bumerang', type: 'ranged', tierBase: 0.12, ultimate: true, price: 2000, hue: 40,
      desc: 'Terbang menembus musuh lalu kembali ke tangan, jadi bisa mengenai dua kali.', tag: 'Pergi pulang', bars: { kuat: 2, cepat: 3, jarak: 4 },
      damage: 9, cooldown: 0.75, windup: 0.06, active: 0.1, recovery: 0.2,
      speed: 190, gravity: 0, lift: 0, life: 1.4, knockback: 50, color: '#ffcf6b',
      pierce: true, boomerang: true, projectile: { w: 10, h: 10 }, icon: [80, 0, 17, 11],
    },
    'panah-cahaya': {
      id: 'panah-cahaya', nama: 'Panah Cahaya', type: 'ranged', tierBase: 0.12, ultimate: true, price: 2000, hue: 60,
      desc: 'Panah cahaya lurus yang menembus semua musuh di jalurnya.', tag: 'Tembus', bars: { kuat: 2, cepat: 3, jarak: 5 },
      damage: 10, cooldown: 0.62, windup: 0.06, active: 0.1, recovery: 0.2,
      speed: 300, gravity: 0, lift: 0, life: 1.3, knockback: 45, color: '#fff6a8',
      pierce: true, projectile: { w: 14, h: 4 }, icon: [60, 0, 18, 9],
    },
  };

  const ORDER = ['pedang', 'blaster'];
  const MELEE = ['pedang', 'tombak', 'palu', 'pedang-angin'];
  const RANGED = ['blaster', 'pelontar', 'pantul', 'bumerang', 'panah-cahaya'];
  const ULTIMATE = Object.keys(WEAPONS).filter((id) => WEAPONS[id].ultimate);

  // Kotak ayunan melee di depan hero. Sedikit condong ke bawah supaya musuh yang berdiri
  // satu pijakan lebih rendah ikut kena, sesuai lengkung tebasan yang digambar.
  function meleeBox(player, face, weapon) {
    const range = weapon.range;
    // Tebasan ganda: satu kotak lebar yang menutup depan dan belakang hero.
    if (weapon.both) return { x: player.x - range + 2, y: player.y + player.h / 2 - weapon.height / 2 + 4, w: player.w + range * 2 - 4, h: weapon.height };
    return {
      x: face > 0 ? player.x + player.w - 2 : player.x - range + 2,
      y: player.y + player.h / 2 - weapon.height / 2 + 4,
      w: range, h: weapon.height,
    };
  }

  function damageFor(weapon, tier) {
    return Math.round(weapon.damage * (1 + weapon.tierBase * (tier || 0)));
  }

  function get(id) { return WEAPONS[id] || WEAPONS.pedang; }

  return { WEAPONS, ORDER, MELEE, RANGED, ULTIMATE, get, meleeBox, damageFor };
});
