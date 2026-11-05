// Math Hero 4: boss generator. Merakit BossSchema dari mekanisme, serangan, skin, dan arena
// berdasarkan seed. Kesulitan menambah jumlah mekanisme dan memendekkan telegraph, bukan
// sekadar menaikkan HP. Hasilnya data biasa yang dijalankan BossMachine yang sama.
//   BossGen.build({ seed, difficulty }) -> BossSchema
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./machine.js'));
  else ((root.MH4 = root.MH4 || {}).bossGen = factory(root.MH4.bossMachine));
})(typeof self !== 'undefined' ? self : this, function (Machine) {
  const A = '../assets/mh4/v2/boss/';
  const SLIME = { frame: 64, art: { scale: 3.34, foot: 40, face: true }, body: { w: 62, h: 54 } };
  const BEAST = { frame: 32, art: { scale: 3.2, foot: 31 }, body: { w: 50, h: 50 } };
  const GHOST = { frame: 32, art: { scale: 2.8, foot: 31 }, body: { w: 44, h: 62 } };
  const SKINS = [
    Object.assign({ sprite: A + 'lendir', makhluk: 'Lendir', suara: 'Blub' }, SLIME),
    Object.assign({ sprite: A + 'lendir-biru', makhluk: 'Lendir', suara: 'Blub' }, SLIME),
    Object.assign({ sprite: A + 'labu', makhluk: 'Labu', suara: 'Tadaa' }, GHOST, { body: { w: 44, h: 66 } }),
    Object.assign({ sprite: A + 'anjing', makhluk: 'Anjing', suara: 'Guk' }, BEAST),
    Object.assign({ sprite: A + 'kucing', makhluk: 'Kucing', suara: 'Meong' }, BEAST),
    Object.assign({ sprite: A + 'hantu', makhluk: 'Hantu', suara: 'Buu' }, GHOST),
    Object.assign({ sprite: A + 'hantu-topi', makhluk: 'Hantu', suara: 'Buu' }, GHOST),
    { sprite: A + 'ayam', makhluk: 'Ayam', suara: 'Petok', frame: 32, art: { scale: 4, foot: 23, flip: true }, body: { w: 54, h: 60 } },
    { sprite: A + 'goblin-merah', makhluk: 'Goblin', suara: 'Hehe', frame: 64, art: { scale: 3, foot: 62 }, body: { w: 44, h: 76 } },
  ];
  // Watak menentukan celetukan, supaya boss acak tetap terasa punya kepribadian.
  const WATAK = [
    (s) => ({ intro: [`Siapa berani melawanku? ${s}!`, `Aku yang terhebat di sini! ${s}!`], taunt: [`Hahaha, ${s}!`], stun: [`Aduh, ${s}...`, 'Itu tadi tidak dihitung!'], phase: [`Sekarang aku serius! ${s}!`] }),
    (s) => ({ intro: [`${s}! Jangan dekat-dekat!`, `Eh, kamu siapa? ${s}!`], taunt: ['Eh, kena ya? Maaf!'], stun: ['Tolong, pusing!', `${s}... ada bintang...`], phase: [`${s}! Aku jadi panik!`] }),
    (s) => ({ intro: [`Ayo main kejar-kejaran! ${s}!`, 'Kristalnya kusembunyikan, hihi!'], taunt: ['Hihi, kena!'], stun: ['Curang, ah!', 'Aduh, kalah sebentar!'], phase: [`Giliranku sekarang! ${s}!`] }),
  ];
  const GELAR = ['Raja', 'Ratu', 'Penjaga', 'Panglima', 'Penguasa'];
  const ASAL = {
    green: 'Hutan', industrial: 'Mesin', simple: 'Bukit', night: 'Malam',
    crystal: 'Kristal', hive: 'Sarang', day: 'Kota', castle: 'Benteng',
  };

  // Serangan dasar yang selalu tersedia dan bisa diselingi mekanisme.
  const BASE = {
    slam: { kind: 'slam', telegraph: 0.8, active: 0.28, recovery: 1.1, damage: 12, radius: 96 },
    fan: { kind: 'projectile_fan', telegraph: 0.72, active: 0.22, recovery: 1.0, damage: 8, count: 3, spread: 0.36, speed: 110, gravity: 25, life: 3 },
    wave: { kind: 'ground_wave', telegraph: 0.78, active: 0.22, recovery: 1.0, damage: 11, speed: 110, life: 3.4, height: 10 },
  };

  // Tiap mekanisme menambah serangan dan/atau mengubah aturan celah, dan punya petunjuk.
  const MECHS = {
    lompat: {
      hint: 'Lompati hentakannya. Saat dia lelah, pukul dari dekat!',
      attacks: { hop: { kind: 'hop', telegraph: 1.1, active: 2, recovery: 3.4, damage: 10, count: 2, hopTime: 1.3, height: 100, radius: 46, rest: 0.8, tired: true, opens: true, signature: true } },
    },
    pantul: {
      hint: 'Bola bercincin kuning bisa dipukul balik dengan senjata dekat!',
      attacks: { spit: { kind: 'projectile_fan', telegraph: 0.85, active: 0.2, recovery: 0.7, damage: 8, count: 1, spread: 0, speed: 95, gravity: 0, life: 4, reflect: true, opens: false, signature: true, stun: 3.2, color: '#ffd84a' } },
    },
    perisai: {
      hint: 'Hancurkan totem dengan senjata dekat untuk memecah perisainya!',
      attacks: { shield: { kind: 'shield', telegraph: 0.9, active: 0.3, recovery: 0.8, damage: 0, totems: 2, stun: 3.2, opens: false, signature: true } },
    },
    dinding: {
      hint: 'Pancing serudukannya ke dinding, lalu serang saat dia pusing!',
      attacks: { charge: { kind: 'charge', telegraph: 0.8, active: 0.5, recovery: 1.0, wallStun: 3.2, damage: 13, speed: 165, toWall: true } },
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
      attacks: { rocks: { kind: 'falling_hazard', telegraph: 0.92, active: 0.2, recovery: 1.2, damage: 10, count: 3, spreadX: 62, fallSpeed: 145 } },
    },
    sulap: {
      hint: 'Dia bisa menghilang! Pukul balik bola sihirnya dengan senjata dekat.',
      attacks: {
        blink: { kind: 'teleport', telegraph: 0.6, active: 0.25, recovery: 0.7, damage: 0, opens: false },
        orb: { kind: 'projectile_fan', telegraph: 0.8, active: 0.2, recovery: 0.7, damage: 8, count: 1, spread: 0, speed: 60, gravity: 0, life: 5, home: 90, reflect: true, opens: false, signature: true, stun: 3.2, color: '#7dff9e' },
      },
    },
    terbang: {
      hint: 'Tembak saat dia terbang, atau pukul telurnya ke arahnya!',
      attacks: { fly: { kind: 'flight', telegraph: 0.8, active: 4, recovery: 0.8, damage: 8, duration: 4.5, eggEvery: 0.9, shotsToDrop: 4, stun: 3.4, opens: false, signature: true } },
      apply(s) { s.minion = 'chick'; s.fairness.maxSummons = Math.max(s.fairness.maxSummons, 3); },
    },
    kembar: {
      hint: 'Cari yang mendengkur! Yang asli punya huruf Z di atas kepalanya.',
      attacks: { split: { kind: 'split', telegraph: 0.9, active: 0.5, recovery: 0.7, damage: 0, fakes: 2, stun: 3.4, opens: false, signature: true } },
    },
    gelap: {
      hint: 'Pancing dia ke dekat lentera, lalu pukul lenteranya sampai menyala!',
      attacks: { lights: { kind: 'lights', telegraph: 0.9, active: 0.3, recovery: 0.7, damage: 0, lanterns: 3, radius: 92, stun: 3.4, opens: false, signature: true } },
    },
    curi: {
      hint: 'Lompati serudukannya supaya senjatamu tidak dicuri, lalu pukul saat dia pusing!',
      attacks: { grab: { kind: 'charge', telegraph: 0.85, active: 0.5, recovery: 0.8, wallStun: 3.4, damage: 8, speed: 185, toWall: true, grab: true, coins: 5 } },
    },
  };
  const MECH_IDS = Object.keys(MECHS);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  // Pasangan yang sulit dibaca bila digabung: di gelap, tanda Z dan boss terbang tidak terlihat.
  const CLASH = { gelap: ['kembar', 'terbang'], kembar: ['gelap'], terbang: ['gelap'] };

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
    const mechs = [];
    for (const id of ids) {
      if (mechs.length > difficulty) break;
      if (!mechs.some((m) => (CLASH[m] || []).includes(id))) mechs.push(id);
    }
    const suara = skin.suara;

    const baseIds = Object.keys(BASE);
    const firstBase = R.pick(baseIds);
    const secondBase = R.pick(baseIds.filter((b) => b !== firstBase));
    const schema = {
      id: `gen-${seed}-${difficulty}`,
      nama: `${R.pick(GELAR)} ${skin.makhluk} ${ASAL[tema] || 'Misterius'}`,
      generated: true, seed, difficulty, mechanics: mechs,
      hint: MECHS[mechs[0]].hint,
      maxHp: 900 + difficulty * 150,
      meleeOpen: 2.4, rangedOpen: 0.6, meleeGuard: 0.2, rangedGuard: 0.06,
      roam: { mode: 'chase', speed: 24 }, idleGap: 1,
      barks: R.pick(WATAK)(suara),
      spriteFrame: skin.frame, art: skin.art, sprite: skin.sprite, arenaTheme: tema,
      body: clone(skin.body),
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
    const tele = 1.45 - 0.1 * difficulty;
    for (const a of Object.values(schema.attacks)) {
      a.telegraph = Math.max(schema.fairness.minTelegraph, Math.round(a.telegraph * tele * 100) / 100);
    }

    // Fase 1 mengajarkan mekanisme pertama; fase berikutnya membuka sisanya.
    const mechAttacks = (m) => Object.keys(MECHS[m].attacks || {});
    const ph1 = [firstBase, ...mechAttacks(mechs[0])];
    const all = Object.keys(schema.attacks);
    const weightFor = (id) => (id === 'charge' || (schema.attacks[id] && schema.attacks[id].signature) ? 3 : 2);
    const toPool = (list) => list.map((id) => ({ id, weight: weightFor(id) }));
    // Dengan aturan dinding, serangan dasar tidak membuka celah, jadi charge wajib ada sejak awal.
    if (mechs.includes('dinding') && !ph1.includes('charge')) ph1.push('charge');
    // Fase pertama selalu punya lebih dari satu pola.
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
