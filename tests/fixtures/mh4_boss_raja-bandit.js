// Raja Goblin: boss kedua, puncak bab 3. Mekanisme khas: serudukannya berhenti di dinding dan membuatnya
// pusing, satu-satunya celah besar selain setelah memanggil anak buah. Anak buah menjatuhkan
// sedikit HP, jadi pemain memilih antara mengalahkan mereka atau mengejar raja.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    (root.MH4 = root.MH4 || {}).bosses = root.MH4.bosses || {};
    root.MH4.bosses.raja = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    id: 'raja-bandit',
    nama: 'Raja Goblin',
    hint: 'Pancing serudukannya ke dinding, lalu serang saat dia pusing!',
    maxHp: 380,
    spriteFrame: 64,
    art: { scale: 3, foot: 62 },
    sprite: '../assets/mh4/v2/boss/goblin',
    arenaTheme: 'castle',
    body: { w: 44, h: 76 },
    phases: [
      {
        id: 1, hpFrom: 1.0, transitionTime: 1.2, recoveryMul: 1.0,
        pool: [
          { id: 'charge', weight: 3 }, { id: 'wave', weight: 2 },
          { id: 'fan', weight: 1 },
        ],
      },
      {
        id: 2, hpFrom: 0.55, transitionTime: 1.0, recoveryMul: 0.9,
        pool: [
          { id: 'charge', weight: 3 }, { id: 'summon', weight: 2 },
          { id: 'wave', weight: 2 }, { id: 'slam', weight: 2 },
        ],
      },
    ],
    attacks: {
      charge: {
        kind: 'charge', telegraph: 1.05, active: 0.5, recovery: 1.0, wallStun: 1.9, damage: 13,
        speed: 150, toWall: true, tags: ['dodge-jump'],
      },
      slam: {
        kind: 'slam', telegraph: 1.05, active: 0.3, recovery: 0.8, damage: 14, opens: false,
        radius: 100, tags: ['ground', 'dodge-jump'],
      },
      fan: {
        kind: 'projectile_fan', telegraph: 0.95, active: 0.24, recovery: 0.75, damage: 9, opens: false,
        count: 3, spread: 0.4, speed: 115, gravity: 24, life: 3, tags: ['dodge'],
      },
      wave: {
        kind: 'ground_wave', telegraph: 1, active: 0.22, recovery: 0.75, damage: 12, opens: false,
        speed: 112, life: 3.4, height: 10, tags: ['ground', 'dodge-jump'],
      },
      summon: {
        kind: 'summon', telegraph: 1.1, active: 0.25, recovery: 1.3, damage: 8,
        count: 2, minionHp: 14, tags: ['minion'],
      },
    },
    fairness: {
      minTelegraph: 0.55, minRecovery: 0.65, maxActiveAttacks: 1,
      maxSummons: 2, noTransitionDamage: true, guaranteedOpeningAfter: 0.95,
    },
    rewards: { score: 750 },
  };
});
