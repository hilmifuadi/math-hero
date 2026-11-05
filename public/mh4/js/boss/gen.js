// Math Hero 4: boss generator. Merakit BossSchema dari mekanisme, serangan, skin, dan arena
// berdasarkan seed. Kesulitan menambah jumlah mekanisme dan memendekkan telegraph, bukan
// sekadar menaikkan HP. Hasilnya data biasa yang dijalankan BossMachine yang sama.
//   BossGen.build({ seed, difficulty }) -> BossSchema
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./machine.js'));
  else ((root.MH4 = root.MH4 || {}).bossGen = factory(root.MH4.bossMachine));
})(typeof self !== 'undefined' ? self : this, function (Machine) {
  const SKINS = [
    { sprite: '../assets/mh4/v2/boss/kabut', frame: 96 },
    { sprite: '../assets/mh4/v2/boss/iblis', frame: 96 },
    { sprite: '../assets/mh4/v2/boss/roh', frame: 96 },
    { sprite: '../assets/mh4/v2/boss/pusaran', frame: 96 },
  ];
  const GELAR = ['Raja', 'Ratu', 'Penjaga', 'Panglima', 'Penguasa'];
  const ASAL = {
    green: 'Hutan', industrial: 'Mesin', simple: 'Bukit', night: 'Malam',
    crystal: 'Kristal', hive: 'Sarang', day: 'Kota', castle: 'Benteng',
  };

  // Serangan dasar yang selalu tersedia dan bisa diselingi mekanisme.
  const BASE = {
    slam: { kind: 'slam', telegraph: 0.8, active: 0.28, recovery: 1.1, damage: 12, radius: 96 },
    fan: { kind: 'projectile_fan', telegraph: 0.72, active: 0.22, recovery: 1.0, damage: 8, count: 3, spread: 0.36, speed: 155, gravity: 34, life: 2.3 },
    wave: { kind: 'ground_wave', telegraph: 0.78, active: 0.22, recovery: 1.0, damage: 11, speed: 145, life: 2.6, height: 10 },
  };

  // Tiap mekanisme menambah serangan dan/atau mengubah aturan celah, dan punya petunjuk.
  const MECHS = {
    kristal: {
      hint: 'Saat kristal menyala, lompat lalu serang!',
      apply(s) { s.weakPoint = { ox: 0, oy: 0, w: 60, h: 24, mul: 2 }; },
    },
    dinding: {
      hint: 'Pancing serudukannya ke dinding, lalu serang saat dia pusing!',
      attacks: { charge: { kind: 'charge', telegraph: 0.8, active: 0.5, recovery: 1.0, wallStun: 1.9, damage: 13, speed: 200, toWall: true } },
      apply(s) { for (const id of ['slam', 'fan', 'wave']) if (s.attacks[id]) s.attacks[id].opens = false; },
    },
    anakbuah: {
      hint: 'Anak buahnya menjatuhkan HP. Kalahkan bila perlu!',
      attacks: { summon: { kind: 'summon', telegraph: 0.9, active: 0.25, recovery: 1.25, damage: 8, count: 2, minionHp: 14 } },
      apply(s) { s.fairness.maxSummons = 2; },
    },
    semburan: {
      hint: 'Lantai yang menyala akan menyembur. Menjauh!',
      attacks: { burst: { kind: 'floor_burst', telegraph: 0.95, active: 0.5, recovery: 1.1, damage: 11, count: 2, zoneW: 44, gap: 60, zoneH: 44 } },
    },
    batu: {
      hint: 'Lihat tanda di lantai. Batu jatuh di sana!',
      attacks: { rocks: { kind: 'falling_hazard', telegraph: 0.92, active: 0.2, recovery: 1.2, damage: 10, count: 3, spreadX: 62, fallSpeed: 210 } },
    },
  };
  const MECH_IDS = Object.keys(MECHS);
  const clone = (o) => JSON.parse(JSON.stringify(o));

  function build(opts) {
    opts = opts || {};
    const seed = (opts.seed >>> 0) || 1;
    const difficulty = Math.max(1, Math.min(3, Math.floor(opts.difficulty || 1)));
    const R = Machine.rng(seed);
    const tema = opts.tema || R.pick(Object.keys(ASAL));
    const skin = R.pick(SKINS);

    // Kocok deterministik, lalu ambil mekanisme sebanyak tingkat kesulitan + 1.
    const ids = MECH_IDS.slice();
    for (let i = ids.length - 1; i > 0; i--) {
      const j = R.int(0, i);
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    const mechs = ids.slice(0, difficulty + 1);

    const baseIds = Object.keys(BASE);
    const firstBase = R.pick(baseIds);
    const secondBase = R.pick(baseIds.filter((b) => b !== firstBase));
    const schema = {
      id: `gen-${seed}-${difficulty}`,
      nama: `${R.pick(GELAR)} ${ASAL[tema] || 'Misterius'}`,
      generated: true, seed, difficulty, mechanics: mechs,
      hint: MECHS[mechs[0]].hint,
      maxHp: 280 + difficulty * 40,
      spriteFrame: skin.frame, sprite: skin.sprite, arenaTheme: tema,
      body: { w: 60, h: 60 },
      attacks: { [firstBase]: clone(BASE[firstBase]), [secondBase]: clone(BASE[secondBase]) },
      fairness: {
        minTelegraph: 0.55, minRecovery: 0.65, maxActiveAttacks: 1,
        maxSummons: 0, noTransitionDamage: true, guaranteedOpeningAfter: 0.8,
      },
      rewards: { score: 400 + difficulty * 150 },
    };
    for (const m of mechs) Object.assign(schema.attacks, clone(MECHS[m].attacks || {}));
    for (const m of mechs) if (MECHS[m].apply) MECHS[m].apply(schema);

    // Kesulitan lebih tinggi: telegraph sedikit lebih pendek, tetap di atas batas adil.
    const tele = 1.15 - 0.1 * difficulty;
    for (const a of Object.values(schema.attacks)) {
      a.telegraph = Math.max(schema.fairness.minTelegraph, Math.round(a.telegraph * tele * 100) / 100);
    }

    // Fase 1 mengajarkan mekanisme pertama; fase berikutnya membuka sisanya.
    const mechAttacks = (m) => Object.keys(MECHS[m].attacks || {});
    const ph1 = [firstBase, ...mechAttacks(mechs[0])];
    const all = Object.keys(schema.attacks);
    const weightFor = (id) => (id === 'charge' ? 3 : 2);
    const toPool = (list) => list.map((id) => ({ id, weight: weightFor(id) }));
    // Dengan aturan dinding, serangan dasar tidak membuka celah, jadi charge wajib ada sejak awal.
    if (mechs.includes('dinding') && !ph1.includes('charge')) ph1.push('charge');
    // Mekanisme tanpa serangan sendiri (kristal) tetap butuh pola yang bervariasi.
    if (ph1.length < 2) ph1.push(secondBase);
    schema.phases = [{ id: 1, hpFrom: 1.0, transitionTime: 1.2, recoveryMul: 1.0, pool: toPool(ph1) }];
    if (difficulty >= 3) {
      const mid = [...ph1, secondBase, ...mechAttacks(mechs[1])].filter((id, i, a) => a.indexOf(id) === i);
      schema.phases.push({ id: 2, hpFrom: 0.66, transitionTime: 1.0, recoveryMul: 0.95, pool: toPool(mid) });
      schema.phases.push({ id: 3, hpFrom: 0.33, transitionTime: 1.0, recoveryMul: 0.9, pool: toPool(all) });
    } else {
      schema.phases.push({ id: 2, hpFrom: 0.5, transitionTime: 1.0, recoveryMul: 0.92, pool: toPool(all) });
    }
    return schema;
  }

  return { build, MECHS: MECH_IDS, ASAL };
});
