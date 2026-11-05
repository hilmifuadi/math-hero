// Math Hero 4: data senjata. Satu melee dan satu ranged untuk vertical slice.
// Semua nilai dalam satuan dunia (tile 16 px). Damage dasar naik mengikuti tier,
// sedangkan range/cooldown/proyektil tetap menjadi identitas senjata.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).weapons = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  const WEAPONS = {
    pedang: {
      id: 'pedang', nama: 'Pedang', type: 'melee', tierBase: 0.18,
      damage: 16, cooldown: 0.42, windup: 0.05, active: 0.14, recovery: 0.16,
      range: 30, height: 24, reachY: 18, knockback: 95, color: '#ffe066',
    },
    blaster: {
      id: 'blaster', nama: 'Blaster', type: 'ranged', tierBase: 0.12,
      damage: 9, cooldown: 0.58, windup: 0.08, active: 0.12, recovery: 0.2,
      speed: 225, gravity: 55, life: 1.3, knockback: 40, color: '#7be0ff',
      projectile: { w: 9, h: 5 },
    },
  };

  const ORDER = ['pedang', 'blaster'];

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

  return { WEAPONS, ORDER, get, meleeBox, damageFor };
});
