// Math Hero 4: tujuh boss cerita. Tiap boss punya satu mekanik khas dan watak sendiri.
// Aturan bersama: celah serang panjang di tanah, senjata dekat jauh lebih kuat saat celah,
// dan senjata jauh punya gunanya sendiri (menjatuhkan yang terbang, mengganggu dari jauh).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    (root.MH4 = root.MH4 || {}).bosses = root.MH4.bosses || {};
    root.MH4.bosses.roster = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const FAIR = { minTelegraph: 0.5, minRecovery: 0.6, maxActiveAttacks: 1, maxSummons: 0, noTransitionDamage: true, guaranteedOpeningAfter: 2 };
  const SLIME = { scale: 3.34, foot: 40, face: true };
  const ORC = { scale: 3, foot: 62 };
  const DMG = { meleeOpen: 2.4, rangedOpen: 0.6, meleeGuard: 0.2, rangedGuard: 0.06 };
  const A = '../assets/mh4/v2/boss/';

  // Bab 1. Gembul dan rakus. Mengajarkan: lompati hentakan, pukul saat gepeng, pukul balik ludahnya.
  const lendirKabut = Object.assign({}, DMG, {
    id: 'penjaga-mesin', nama: 'Lendir Kabut', sprite: A + 'lendir', spriteFrame: 64, art: SLIME,
    hint: 'Lompati hentakannya. Saat dia gepeng, pukul dari dekat!',
    maxHp: 800, body: { w: 62, h: 54 }, arenaTheme: 'green', contactDamage: 5, idleGap: 1.0,
    roam: { mode: 'chase', speed: 18 },
    barks: {
      intro: ['Blub! Kristal ini enak!', 'Mau kristal? Tangkap aku! Blub!'],
      taunt: ['Hihi, kena! Blub!', 'Empuk kan? Blub!'],
      stun: ['Aduh, perutku...', 'Gepeng... blub...', 'Pusiiing!'],
      phase: ['Sekarang aku marah! BLUB!'],
      attack: { hop: ['Awas tertindih!', 'Hop, hop, hop!'], spit: ['Ptui!', 'Nih, makan!'], hop2: ['Lompat lebih tinggi!'] },
    },
    phases: [
      { id: 1, hpFrom: 1, transitionTime: 1.1, recoveryMul: 1, pool: [{ id: 'hop', weight: 3 }, { id: 'spit', weight: 1 }] },
      { id: 2, hpFrom: 0.5, transitionTime: 1, recoveryMul: 0.9, pool: [{ id: 'hop2', weight: 3 }, { id: 'spit', weight: 2 }] },
    ],
    attacks: {
      hop: { kind: 'hop', telegraph: 1.1, active: 2, recovery: 3.4, damage: 10, count: 2, hopTime: 1.3, height: 100, radius: 44, rest: 0.8, signature: true, opens: true, tired: true },
      hop2: { kind: 'hop', telegraph: 1.0, active: 3, recovery: 3.0, damage: 11, count: 3, hopTime: 1.15, height: 104, radius: 48, rest: 0.65, signature: true, opens: true, tired: true },
      spit: { kind: 'projectile_fan', telegraph: 0.9, active: 0.2, recovery: 0.7, damage: 7, count: 1, spread: 0, speed: 92, gravity: 0, life: 4, reflect: true, opens: false, signature: true, stun: 3.2, color: '#c9a2ff' },
    },
    fairness: FAIR, rewards: { score: 500 },
  });

  // Bab 2. Labu penyihir yang sombong dan suka pamer sulap. Perisainya hanya pecah bila totem dihancurkan senjata dekat.
  const dukun = Object.assign({}, DMG, {
    id: 'dukun', nama: 'Labu Ajaib', sprite: A + 'labu', spriteFrame: 32, art: { scale: 2.8, foot: 31 },
    hint: 'Hancurkan totem dengan senjata dekat, atau pukul balik bola sihirnya!',
    maxHp: 1000, body: { w: 44, h: 66 }, arenaTheme: 'industrial', contactDamage: 5, idleGap: 1.1,
    roam: { mode: 'avoid', speed: 26 },
    anchors: [{ x: 40 }, { x: 340 }, { x: 88, y: 24 }, { x: 300, y: 24 }],
    barks: {
      intro: ['Saksikan sulap terhebat!', 'Tepuk tangan dulu, dong!'],
      taunt: ['Tadaaa!', 'Sulapku memang hebat!'],
      stun: ['Eh, kok gagal?!', 'Itu tidak ada di buku sulapku!'],
      phase: ['Babak kedua dimulai!'],
      attack: { blink: ['Hilang!', 'Aku di sini lho!'], shield: ['Perisai ajaib, bangkit!'], orb: ['Bola sakti, kejar dia!'], orb3: ['Tiga bola sekaligus!'] },
    },
    phases: [
      { id: 1, hpFrom: 1, transitionTime: 1.1, recoveryMul: 1, pool: [{ id: 'shield', weight: 3 }, { id: 'orb', weight: 3 }, { id: 'blink', weight: 2 }] },
      { id: 2, hpFrom: 0.5, transitionTime: 1, recoveryMul: 0.95, pool: [{ id: 'shield', weight: 3 }, { id: 'orb3', weight: 3 }, { id: 'blink', weight: 3 }] },
    ],
    attacks: {
      blink: { kind: 'teleport', telegraph: 0.6, active: 0.25, recovery: 0.6, damage: 0, opens: false },
      shield: { kind: 'shield', telegraph: 0.9, active: 0.3, recovery: 0.6, damage: 0, totems: 2, stun: 3.4, opens: false, signature: true },
      orb: { kind: 'projectile_fan', telegraph: 0.8, active: 0.2, recovery: 0.7, damage: 8, count: 1, spread: 0, speed: 60, gravity: 0, life: 5, home: 90, reflect: true, opens: false, signature: true, stun: 3.2, color: '#7dff9e' },
      orb3: { kind: 'projectile_fan', telegraph: 0.9, active: 0.2, recovery: 0.8, damage: 8, count: 3, spread: 0.7, speed: 60, gravity: 0, life: 5, home: 70, reflect: true, opens: false, signature: true, stun: 3.0, color: '#7dff9e' },
    },
    fairness: FAIR, rewards: { score: 600 },
  });

  // Bab 3. Panik dan lucu. Terbang menjatuhkan telur. Tendang telur ke arahnya, atau tembak saat terbang.
  const ayam = Object.assign({}, DMG, {
    id: 'ayam', nama: 'Ayam Kabut', sprite: A + 'ayam', spriteFrame: 32, art: { scale: 4, foot: 23, flip: true },
    hint: 'Pukul telurnya ke arah ayam, atau tembak saat dia terbang!',
    maxHp: 1100, body: { w: 54, h: 60 }, arenaTheme: 'crystal', contactDamage: 5, idleGap: 0.9,
    roam: { mode: 'pace', speed: 40 },
    barks: {
      intro: ['PETOK! Aku makan kristal, jadi besar!', 'Petok petok, jangan dekat-dekat!'],
      taunt: ['PETOOOK!', 'Hahaha, petok!'],
      stun: ['Petok... bintang...', 'Buluku rontok!', 'Telurku sendiri?!'],
      phase: ['PETOK! Sekarang serius!'],
      attack: { fly: ['Aku bisa terbang! Sedikit!', 'Awas telur!'], peck: ['Patuk! Patuk!'], fly2: ['Telur lebih banyak!'] },
    },
    phases: [
      { id: 1, hpFrom: 1, transitionTime: 1.1, recoveryMul: 1, pool: [{ id: 'fly', weight: 3 }, { id: 'peck', weight: 2 }] },
      { id: 2, hpFrom: 0.5, transitionTime: 1, recoveryMul: 0.95, pool: [{ id: 'fly2', weight: 3 }, { id: 'peck', weight: 2 }] },
    ],
    attacks: {
      fly: { kind: 'flight', telegraph: 0.8, active: 4, recovery: 0.8, damage: 8, duration: 4.5, eggEvery: 0.9, shotsToDrop: 4, stun: 3.4, opens: false, signature: true },
      fly2: { kind: 'flight', telegraph: 0.8, active: 5, recovery: 0.8, damage: 9, duration: 5.5, eggEvery: 0.65, shotsToDrop: 5, stun: 3.0, opens: false, signature: true },
      peck: { kind: 'charge', telegraph: 0.8, active: 0.5, recovery: 1.6, damage: 9, speed: 150, range: 170, opens: true },
    },
    minion: 'chick',
    fairness: Object.assign({}, FAIR, { maxSummons: 3, guaranteedOpeningAfter: 1.5 }), rewards: { score: 700 },
  });

  // Bab 4. Makhluk merah muda yang mengantuk dan malas. Membelah diri; yang asli selalu mendengkur (ada huruf Z di atasnya).
  const spora = Object.assign({}, DMG, {
    id: 'spora', nama: 'Anak Anjing Ngantuk', sprite: A + 'anjing', spriteFrame: 32, art: { scale: 3.2, foot: 31 },
    hint: 'Cari yang mendengkur! Yang asli punya huruf Z di atas kepalanya.',
    maxHp: 1300, body: { w: 50, h: 50 }, arenaTheme: 'hive', contactDamage: 5, idleGap: 1.2,
    roam: { mode: 'pace', speed: 14 },
    barks: {
      intro: ['Hoaahm... siapa itu...', 'Zzz... jangan berisik...'],
      taunt: ['Zzz... kena... zzz...'],
      stun: ['Hah?! Aku ketahuan!', 'Padahal lagi enak tidur...'],
      phase: ['Sekarang aku bangun sedikit...'],
      attack: { split: ['Satu jadi banyak... zzz...'], hop: ['Hup... hoaahm...'], spore: ['Hatsyi! Kabut!'] },
    },
    phases: [
      { id: 1, hpFrom: 1, transitionTime: 1.1, recoveryMul: 1, pool: [{ id: 'split', weight: 4 }, { id: 'spore', weight: 2 }, { id: 'hop', weight: 2 }] },
      { id: 2, hpFrom: 0.5, transitionTime: 1, recoveryMul: 0.95, pool: [{ id: 'split2', weight: 4 }, { id: 'spore', weight: 3 }, { id: 'hop', weight: 2 }] },
    ],
    attacks: {
      split: { kind: 'split', telegraph: 0.9, active: 0.5, recovery: 0.7, damage: 0, fakes: 2, stun: 3.4, opens: false, signature: true },
      split2: { kind: 'split', telegraph: 0.9, active: 0.5, recovery: 0.7, damage: 0, fakes: 3, stun: 3.0, opens: false, signature: true },
      hop: { kind: 'hop', telegraph: 1.1, active: 1, recovery: 2.4, damage: 10, count: 1, hopTime: 1.3, height: 100, radius: 46, tired: true, opens: true },
      spore: { kind: 'floor_burst', telegraph: 1.1, active: 0.6, recovery: 0.7, damage: 9, count: 3, zoneW: 40, gap: 70, zoneH: 40, opens: false },
    },
    fairness: FAIR, rewards: { score: 800 },
  });

  // Bab 5. Kucing pencuri yang suka pamer. Bila tertangkap serudukannya, senjata jauh dicuri.
  // Bila dilompati, dia terpeleset dan menjatuhkan koin.
  const goblinMerah = Object.assign({}, DMG, {
    id: 'goblin-merah', nama: 'Kucing Belang', sprite: A + 'kucing', spriteFrame: 32, art: { scale: 3.2, foot: 31 },
    hint: 'Lompati serudukannya! Dia terpeleset, lalu pukul dari dekat dan ambil koinnya.',
    maxHp: 1400, body: { w: 50, h: 50 }, arenaTheme: 'day', contactDamage: 6, idleGap: 0.9,
    roam: { mode: 'chase', speed: 34 },
    barks: {
      intro: ['Meong! Senjatamu bagus. Boleh kupinjam selamanya?', 'Semua barang di kota ini punyaku. Meong!'],
      taunt: ['Terima kasih senjatanya! Meong!', 'Hehehe, gratis!'],
      stun: ['Koinku! Koinku jatuh! Meooong!', 'Siapa taruh kulit pisang di sini?!'],
      phase: ['Sekarang kupakai sepatu bot!'],
      attack: { grab: ['Sini senjatamu!', 'Pinjam dulu!'], toss: ['Bom kembalian!'], grab2: ['Lebih cepat!'] },
    },
    phases: [
      { id: 1, hpFrom: 1, transitionTime: 1.1, recoveryMul: 1, pool: [{ id: 'grab', weight: 4 }, { id: 'toss', weight: 2 }] },
      { id: 2, hpFrom: 0.5, transitionTime: 1, recoveryMul: 0.95, pool: [{ id: 'grab2', weight: 4 }, { id: 'toss', weight: 3 }] },
    ],
    attacks: {
      grab: { kind: 'charge', telegraph: 0.85, active: 0.5, recovery: 0.8, wallStun: 3.4, damage: 8, speed: 185, toWall: true, grab: true, coins: 5 },
      grab2: { kind: 'charge', telegraph: 0.7, active: 0.5, recovery: 0.8, wallStun: 3.0, damage: 9, speed: 225, toWall: true, grab: true, coins: 7 },
      toss: { kind: 'falling_hazard', telegraph: 0.9, active: 0.2, recovery: 0.7, damage: 9, count: 3, spreadX: 70, fallSpeed: 150, opens: false },
    },
    fairness: FAIR, rewards: { score: 900 },
  });

  // Bab 6. Hantu kecil yang penakut, berani hanya di gelap. Nyalakan lentera dengan senjata dekat saat dia di dekatnya.
  const lendirMalam = Object.assign({}, DMG, {
    id: 'lendir-malam', nama: 'Hantu Penakut', sprite: A + 'hantu', spriteFrame: 32, art: { scale: 2.8, foot: 31 },
    hint: 'Pancing dia ke dekat lentera, lalu pukul lenteranya sampai menyala!',
    maxHp: 1500, body: { w: 44, h: 62 }, arenaTheme: 'night', contactDamage: 6, idleGap: 1.0,
    roam: { mode: 'chase', speed: 36 },
    barks: {
      intro: ['Sssst... lampunya kumatikan ya.', 'Di gelap aku tidak takut... kok.'],
      taunt: ['Hihihi, tidak kelihatan kan?'],
      stun: ['SILAU! Matikan!', 'Aku takut terang!'],
      phase: ['Lebih gelap lagi... kalau berani.'],
      attack: { lights: ['Gelap... gelap...'], hop: ['Dari mana ya datangnya?'], dash: ['Wuuush!'] },
    },
    phases: [
      { id: 1, hpFrom: 1, transitionTime: 1.1, recoveryMul: 1, pool: [{ id: 'lights', weight: 5 }, { id: 'hop', weight: 3 }] },
      { id: 2, hpFrom: 0.5, transitionTime: 1, recoveryMul: 0.95, pool: [{ id: 'lights', weight: 4 }, { id: 'hop', weight: 3 }, { id: 'dash', weight: 2 }] },
    ],
    attacks: {
      lights: { kind: 'lights', telegraph: 0.9, active: 0.3, recovery: 0.6, damage: 0, lanterns: 3, radius: 92, stun: 3.4, opens: false, signature: true },
      hop: { kind: 'hop', telegraph: 1.1, active: 1, recovery: 0.8, damage: 10, count: 1, hopTime: 1.35, height: 100, radius: 46, opens: false },
      dash: { kind: 'charge', telegraph: 0.8, active: 0.5, recovery: 0.8, damage: 10, speed: 170, range: 200, opens: false },
    },
    fairness: FAIR, rewards: { score: 1000 },
  });

  // Bab 7, penutup. Sombong dan pelupa. Semua pelajaran dipakai: dinding, pantulan, telur diganti mahkota.
  const rajaGoblin = Object.assign({}, DMG, {
    id: 'raja-bandit', nama: 'Raja Goblin', sprite: A + 'goblin', spriteFrame: 64, art: ORC,
    hint: 'Pancing dia menabrak dinding, lalu rebut mahkotanya supaya dia panik!',
    maxHp: 2000, body: { w: 44, h: 76 }, arenaTheme: 'castle', contactDamage: 7, idleGap: 0.9,
    roam: { mode: 'chase', speed: 26 },
    barks: {
      intro: ['Akulah raja! Sujudlah! Eh, hitunglah!', 'Mahkotaku lebih kinclong dari kristalmu!'],
      taunt: ['Hahaha! Raja selalu menang!'],
      stun: ['Mahkotaku! Mana mahkotaku?!', 'Dindingnya siapa yang pindahkan?!'],
      phase: ['Pengawal! Tolong rajamu!', 'Cukup main-mainnya!'],
      attack: { charge: ['Minggir semua!'], wave: ['Rasakan hentakan raja!'], summon: ['Pengawal!'], crownball: ['Bola kerajaan!'], rage: ['GRAAAH!'] },
    },
    phases: [
      { id: 1, hpFrom: 1, transitionTime: 1.2, recoveryMul: 1, pool: [{ id: 'charge', weight: 4 }, { id: 'wave', weight: 2 }, { id: 'crownball', weight: 2 }] },
      { id: 2, hpFrom: 0.66, transitionTime: 1.2, recoveryMul: 0.95, pool: [{ id: 'charge', weight: 3 }, { id: 'summon', weight: 2 }, { id: 'wave', weight: 2 }, { id: 'crownball', weight: 2 }] },
      { id: 3, hpFrom: 0.33, transitionTime: 1.4, recoveryMul: 0.9, roam: { mode: 'chase', speed: 40 }, pool: [{ id: 'rage', weight: 4 }, { id: 'summon', weight: 1 }, { id: 'wave', weight: 2 }, { id: 'crownball', weight: 2 }] },
    ],
    attacks: {
      charge: { kind: 'charge', telegraph: 0.95, active: 0.5, recovery: 0.8, wallStun: 3.6, damage: 12, speed: 170, toWall: true, crown: true },
      rage: { kind: 'charge', telegraph: 0.7, active: 0.5, recovery: 0.8, wallStun: 3.0, damage: 13, speed: 230, toWall: true, crown: true },
      wave: { kind: 'ground_wave', telegraph: 0.9, active: 0.22, recovery: 0.7, damage: 11, opens: false, speed: 120, life: 3.4, height: 10 },
      crownball: { kind: 'projectile_fan', telegraph: 0.85, active: 0.2, recovery: 0.7, damage: 9, count: 1, spread: 0, speed: 95, gravity: 0, life: 4, reflect: true, opens: false, signature: true, stun: 3, color: '#ffd84a' },
      summon: { kind: 'summon', telegraph: 1, active: 0.25, recovery: 0.8, damage: 8, count: 2, minionHp: 14, opens: false },
    },
    minion: 'goblin',
    fairness: Object.assign({}, FAIR, { maxSummons: 2 }), rewards: { score: 1200 },
  });

  return { lendirKabut, dukun, ayam, spora, goblinMerah, lendirMalam, rajaGoblin };
});
