// Hantu Kabut: boss pertama, puncak bab 1. Mekanisme khas weak point: kristal curian hanya terbuka
// saat recovery dan harus diserang sambil melompat. Fase 2 menambah semburan lantai.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    (root.MH4 = root.MH4 || {}).bosses = root.MH4.bosses || {};
    root.MH4.bosses.penjaga = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    id: 'penjaga-mesin',
    nama: 'Hantu Kabut',
    hint: 'Saat kristal menyala, lompat lalu serang!',
    maxHp: 320,
    spriteFrame: 96,
    sprite: '../assets/mh4/v2/boss/kabut',
    arenaTheme: 'green',
    body: { w: 62, h: 60 },
    // Selebar badan supaya peluru yang menabrak sisi badan pada ketinggian ini tetap dihitung.
    weakPoint: { ox: 0, oy: 0, w: 62, h: 24, mul: 2 },
    phases: [
      {
        id: 1, hpFrom: 1.0, transitionTime: 1.15, recoveryMul: 1.0,
        pool: [{ id: 'slam', weight: 3 }, { id: 'fan', weight: 2 }],
      },
      {
        id: 2, hpFrom: 0.5, transitionTime: 1.0, recoveryMul: 0.9,
        pool: [
          { id: 'slam', weight: 2 }, { id: 'fan', weight: 1 },
          { id: 'rocks', weight: 2 }, { id: 'burst', weight: 3 },
        ],
      },
    ],
    attacks: {
      slam: {
        kind: 'slam', telegraph: 0.78, active: 0.28, recovery: 1.25, damage: 12,
        radius: 92, tags: ['ground', 'dodge-jump'],
      },
      fan: {
        kind: 'projectile_fan', telegraph: 0.7, active: 0.22, recovery: 1.1, damage: 8,
        count: 3, spread: 0.34, speed: 150, gravity: 35, life: 2.2, tags: ['dodge'],
      },
      rocks: {
        kind: 'falling_hazard', telegraph: 0.92, active: 0.2, recovery: 1.25, damage: 10,
        count: 3, spreadX: 62, fallSpeed: 210, tags: ['dodge'],
      },
      burst: {
        kind: 'floor_burst', telegraph: 0.95, active: 0.5, recovery: 1.1, damage: 11,
        count: 2, zoneW: 44, gap: 60, zoneH: 44, tags: ['dodge', 'platform'],
      },
    },
    fairness: {
      minTelegraph: 0.5, minRecovery: 0.6, maxActiveAttacks: 1,
      maxSummons: 0, noTransitionDamage: true, guaranteedOpeningAfter: 0.9,
    },
    rewards: { score: 500 },
  };
});
