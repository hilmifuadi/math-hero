// Penjaga Mesin: boss vertical slice. Dua fase, serangan dapat dibaca, dan
// semua parameter serangan ada di data supaya boss lain tinggal menambah file.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    (root.MH4 = root.MH4 || {}).bosses = root.MH4.bosses || {};
    root.MH4.bosses.penjaga = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    id: 'penjaga-mesin',
    nama: 'Penjaga Mesin',
    maxHp: 210,
    spriteFrame: 96,
    sprite: '../assets/mh4/boss/penjaga',
    arenaTheme: 'industrial',
    body: { w: 62, h: 78 },
    phases: [
      {
        id: 1, hpFrom: 1.0, transitionTime: 1.15, recoveryMul: 1.0,
        pool: [{ id: 'slam', weight: 3 }, { id: 'fan', weight: 2 }],
      },
      {
        id: 2, hpFrom: 0.5, transitionTime: 1.0, recoveryMul: 0.85,
        pool: [
          { id: 'slam', weight: 2 }, { id: 'fan', weight: 2 },
          { id: 'rocks', weight: 2 }, { id: 'charge', weight: 2 },
        ],
      },
    ],
    attacks: {
      slam: {
        kind: 'slam', telegraph: 0.78, active: 0.28, recovery: 0.95, damage: 12,
        radius: 92, tags: ['ground', 'dodge-jump'],
      },
      fan: {
        kind: 'projectile_fan', telegraph: 0.66, active: 0.22, recovery: 0.9, damage: 8,
        count: 3, spread: 0.34, speed: 150, gravity: 35, life: 2.2, tags: ['dodge'],
      },
      rocks: {
        kind: 'falling_hazard', telegraph: 0.92, active: 0.2, recovery: 1.05, damage: 10,
        count: 3, spreadX: 62, fallSpeed: 210, tags: ['dodge'],
      },
      charge: {
        kind: 'charge', telegraph: 0.58, active: 0.52, recovery: 1.0, damage: 11,
        speed: 190, range: 210, tags: ['dodge-jump'],
      },
    },
    fairness: {
      minTelegraph: 0.5, minRecovery: 0.6, maxActiveAttacks: 1,
      maxSummons: 0, noTransitionDamage: true, guaranteedOpeningAfter: 0.9,
    },
    rewards: { score: 500 },
  };
});
