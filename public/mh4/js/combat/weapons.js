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
      desc: 'Seimbang: cepat dan cukup jauh.',
      damage: 16, cooldown: 0.42, windup: 0.05, active: 0.14, recovery: 0.16,
      range: 30, height: 24, reachY: 18, knockback: 95, color: '#ffe066',
    },
    tombak: {
      id: 'tombak', nama: 'Tombak', type: 'melee', tierBase: 0.18,
      desc: 'Jangkauan paling jauh, tetapi tusukannya sempit.',
      damage: 13, cooldown: 0.5, windup: 0.05, active: 0.12, recovery: 0.16,
      range: 50, height: 10, reachY: 6, knockback: 70, color: '#9fe8ff',
    },
    palu: {
      id: 'palu', nama: 'Palu', type: 'melee', tierBase: 0.18,
      desc: 'Lambat, sangat kuat, area tinggi, dan mendorong jauh.',
      damage: 27, cooldown: 0.88, windup: 0.08, active: 0.16, recovery: 0.2,
      range: 26, height: 42, reachY: 28, knockback: 200, color: '#ffae5c',
    },
    blaster: {
      id: 'blaster', nama: 'Blaster', type: 'ranged', tierBase: 0.12,
      desc: 'Tembakan lurus dan serbaguna.',
      damage: 9, cooldown: 0.58, windup: 0.08, active: 0.12, recovery: 0.2,
      speed: 225, gravity: 55, lift: 12, life: 1.3, knockback: 40, color: '#7be0ff',
      projectile: { w: 9, h: 5 },
    },
    pelontar: {
      id: 'pelontar', nama: 'Pelontar', type: 'ranged', tierBase: 0.12,
      desc: 'Bom melengkung yang meledak dan mengenai area.',
      damage: 12, cooldown: 0.95, windup: 0.1, active: 0.12, recovery: 0.25,
      speed: 135, gravity: 430, lift: 170, life: 2.0, knockback: 110, color: '#ff9c6b',
      blast: 26, projectile: { w: 8, h: 8 },
    },
    pantul: {
      id: 'pantul', nama: 'Pemantul', type: 'ranged', tierBase: 0.12,
      desc: 'Peluru cepat yang memantul di dinding dua kali.',
      damage: 7, cooldown: 0.4, windup: 0.06, active: 0.1, recovery: 0.14,
      speed: 245, gravity: 0, lift: 0, life: 2.2, knockback: 25, color: '#c9a2ff',
      bounce: 2, projectile: { w: 7, h: 5 },
    },
  };

  const ORDER = ['pedang', 'blaster'];
  const MELEE = ['pedang', 'tombak', 'palu'];
  const RANGED = ['blaster', 'pelontar', 'pantul'];

  // Kotak ayunan melee di depan hero.
  function meleeBox(player, face, weapon) {
    const range = weapon.range;
    return {
      x: face > 0 ? player.x + player.w - 2 : player.x - range + 2,
      y: player.y + (player.h - weapon.height) / 2 - 2,
      w: range, h: weapon.height + 4,
    };
  }

  function damageFor(weapon, tier) {
    return Math.round(weapon.damage * (1 + weapon.tierBase * (tier || 0)));
  }

  function get(id) { return WEAPONS[id] || WEAPONS.pedang; }

  return { WEAPONS, ORDER, MELEE, RANGED, get, meleeBox, damageFor };
});
