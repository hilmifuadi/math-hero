// Raja Bandit: boss kedua. Tubuh besar dari boss pack tipe 3, dua fase, dan lima
// serangan yang semuanya punya telegraph. Serangan `ground_wave` memaksa pemain
// melompati gelombang rendah, jadi tidak bisa hanya berdiri jauh dan menembak.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    (root.MH4 = root.MH4 || {}).bosses = root.MH4.bosses || {};
    root.MH4.bosses.raja = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    id: 'raja-bandit',
    nama: 'Raja Bandit',
    maxHp: 280,
    spriteFrame: 72,
    sprite: '../assets/mh4/boss/raja',
    arenaTheme: 'castle',
    body: { w: 66, h: 80 },
    phases: [
      {
        id: 1, hpFrom: 1.0, transitionTime: 1.2, recoveryMul: 1.0,
        pool: [
          { id: 'slam', weight: 3 }, { id: 'fan', weight: 2 },
          { id: 'wave', weight: 2 },
        ],
      },
      {
        id: 2, hpFrom: 0.55, transitionTime: 1.0, recoveryMul: 0.82,
        pool: [
          { id: 'slam', weight: 2 }, { id: 'fan', weight: 2 },
          { id: 'wave', weight: 2 }, { id: 'rocks', weight: 2 },
          { id: 'charge', weight: 2 },
        ],
      },
    ],
    attacks: {
      slam: {
        kind: 'slam', telegraph: 0.82, active: 0.3, recovery: 1.0, damage: 14,
        radius: 100, tags: ['ground', 'dodge-jump'],
      },
      fan: {
        kind: 'projectile_fan', telegraph: 0.7, active: 0.24, recovery: 0.92, damage: 9,
        count: 3, spread: 0.4, speed: 165, gravity: 32, life: 2.4, tags: ['dodge'],
      },
      wave: {
        kind: 'ground_wave', telegraph: 0.78, active: 0.22, recovery: 0.9, damage: 12,
        speed: 150, life: 2.6, height: 10, tags: ['ground', 'dodge-jump'],
      },
      rocks: {
        kind: 'falling_hazard', telegraph: 0.95, active: 0.2, recovery: 1.05, damage: 11,
        count: 4, spreadX: 70, fallSpeed: 220, tags: ['dodge'],
      },
      charge: {
        kind: 'charge', telegraph: 0.62, active: 0.52, recovery: 1.0, damage: 13,
        speed: 205, range: 230, tags: ['dodge-jump'],
      },
    },
    fairness: {
      minTelegraph: 0.55, minRecovery: 0.65, maxActiveAttacks: 1,
      maxSummons: 0, noTransitionDamage: true, guaranteedOpeningAfter: 0.95,
    },
    rewards: { score: 750 },
  };
});
