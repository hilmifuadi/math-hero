// Math Hero 4: cerita "Arka dan Kabut Kacau". Hanya teks dan urutan misi, tanpa DOM.
// Urutan misi: dua boss menjadi puncak bab, jadi level dan boss saling menyambung.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).story = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  const K = 'Aki Tyo', B = 'Arka', S = 'Bida', E = 'Ayah Hilmi', G = 'Farah';

  const CHAPTERS = [
    { id: 1, nama: 'Bab 1: Hutan Berkabut', misi: [1, 2, 3, 18, 15] },
    { id: 2, nama: 'Bab 2: Bukit dan Gudang Tua', misi: [4, 19, 5, 6, 30] },
    { id: 3, nama: 'Bab 3: Jejak Kristal', misi: [20, 7, 8, 21, 31] },
    { id: 4, nama: 'Bab 4: Sarang Spora', misi: [9, 10, 22, 32] },
    { id: 5, nama: 'Bab 5: Kota di Balik Kabut', misi: [11, 12, 23, 24, 33] },
    { id: 6, nama: 'Bab 6: Malam Panjang', misi: [25, 26, 13, 34] },
    { id: 7, nama: 'Bab 7: Benteng Kacau', misi: [14, 27, 28, 29, 16] },
    { id: 8, nama: 'Tantangan Acak', misi: [35, 17] },
  ];
  const ROUTE = CHAPTERS.reduce((all, c) => all.concat(c.misi), []);
  // Mode acak terbuka setelah boss pertama dan tidak dihitung sebagai kemajuan cerita.
  const ACAK = [35, 17], ACAK_AFTER = 15, FINALE = 16;

  const INTRO = [
    'Kampung Lumbung hidup dari ladang dan gotong royong. Di tengahnya, Kristal Bilangan menjaga hitungan panen tetap benar.',
    'Suatu malam Kabut Kacau turun. Kristal dicuri, tanaman layu, dan warga tidak lagi bisa menghitung hasil panen.',
    'Arka, cucu Aki Tyo, memegang cangkul dan pedang tua. Ia harus merawat ladang sambil memburu pencuri kristal.',
  ];

  const BOSS_LINES = {
    'penjaga-mesin': {
      before: [
        [B, 'Itu dia! Kristal kampung tertelan lendir raksasa itu.'],
        ['Lendir Kabut', 'Blub! Kristal ini enak! Hitungan kalian jadi kacau, blub!'],
      ],
      after: [
        [B, 'Satu pecahan kristal kembali! Kabut di kampung pasti menipis.'],
      ],
    },
    'raja-bandit': {
      before: [
        ['Raja Goblin', 'Jadi kamu yang mengumpulkan pecahan itu? Mahkotaku lebih kinclong kalau ada kristalnya! Hahaha!'],
        [B, 'Bukan aku yang akan menabrak.'],
      ],
      after: [
        [B, 'Kristal Bilangan utuh lagi. Ayo pulang, Aki pasti menunggu.'],
      ],
    },
  };

  Object.assign(BOSS_LINES, {
    dukun: {
      before: [['Labu Ajaib', 'Sulapku bikin angka menari! Coba hitung kalau bisa!'], [B, 'Angka tidak bisa menari. Kembalikan kristal itu!']],
      after: [[B, 'Pecahan kedua! Kabut sedikit lebih tipis.']],
    },
    ayam: {
      before: [[B, 'Itu ayam atau gunung?'], ['Ayam Kabut', 'PETOK! Aku makan kristal, jadi besar! PETOOOK!']],
      after: [[B, 'Maaf ya, Ayam. Sekarang kamu kembali normal. Kristalnya aku bawa pulang.']],
    },
    spora: {
      before: [['Anak Anjing Ngantuk', 'Hoaahm... jangan bangunkan aku...'], [B, 'Kristalnya kembalikan dulu, baru boleh tidur lagi.']],
      after: [[B, 'Sarangnya bersih! Tinggal kota di balik kabut.']],
    },
    'goblin-merah': {
      before: [['Kucing Belang', 'Meong! Semua barang di kota ini sudah kucuri. Berapa jumlahnya? Lupa!'], [B, 'Itu sebabnya kamu perlu belajar matematika.']],
      after: [[B, 'Warga kota bisa berhitung lagi. Satu langkah menuju benteng.']],
    },
    'lendir-malam': {
      before: [['Hantu Penakut', 'Sssst... jangan nyalakan lampu, ya. Aku... tidak takut kok.'], [B, 'Oh, jadi kamu takut terang?']],
      after: [[B, 'Kristalnya hampir utuh. Benteng sudah terlihat!']],
    },
  });

  // Tiap tokoh berkata sesuai jumlah misi yang sudah selesai.
  const TALK = {
    kakek: [
      { upto: 0, lines: [[K, 'Arka, ladang kita layu. Tanam benih di petak, lalu siram.'], [K, 'Tanaman tumbuh setiap kamu pulang dari misi. Temui Farah di seberang jembatan untuk berangkat.']] },
      { upto: 3, lines: [[K, 'Lendir Kabut bersembunyi di ujung hutan. Bawa bekal wortel, itu menambah tenaga.']] },
      { upto: 4, lines: [[K, 'Kabut menipis! Kamu berhasil, Cu. Tapi kristal baru sepotong. Jejak lainnya menuju timur.']] },
      { upto: 10, lines: [[K, 'Kalau soal di gerbang terasa sulit, tenang saja. Salah tidak mengurangi tenagamu.']] },
      { upto: 30, lines: [[K, 'Benteng di ujung sana sarang Raja Goblin. Pancing serudukannya ke dinding.']] },
      { upto: 99, lines: [[K, 'Kampung kembali cerah berkat kamu. Hitungan panen pun benar lagi.'], [K, 'Farah bilang ada lawan-lawan baru di luar sana, kalau kamu mau menguji diri.']] },
    ],
    sari: [
      { upto: 99, lines: [[S, 'Mampir, Arka! Mau beli benih atau perlengkapan?']] },
    ],
    empu: [
      { upto: 0, lines: [[E, 'Nak, peti di luar sana kadang berisi senjata tua. Temukan, lalu pasang di sini.']] },
      { upto: 99, lines: [[E, 'Senjatamu butuh diganti? Tiap senjata punya caranya sendiri.']] },
    ],
    gapura: [
      { upto: 99, lines: [[G, 'Jalannya sudah Farah buka! Pilih tujuanmu, Arka!']] },
    ],
  };

  function doneCount(profile) {
    return ROUTE.filter((id) => !ACAK.includes(id) && profile.best[id] && profile.best[id].done).length;
  }

  function linesFor(who, profile) {
    const n = doneCount(profile);
    const list = TALK[who] || [];
    const hit = list.find((x) => n <= x.upto) || list[list.length - 1];
    return hit ? hit.lines : [];
  }

  // Kabut di kampung menipis tiap boss kalah: 0.3, lalu 0.14, lalu cerah.
  function fogAlpha(profile) {
    const b1 = !!(profile.best[15] && profile.best[15].done);
    const b2 = !!(profile.best[16] && profile.best[16].done);
    return b2 ? 0 : b1 ? 0.14 : 0.3;
  }

  function chapterOf(levelId) {
    return CHAPTERS.find((c) => c.misi.includes(levelId)) || CHAPTERS[0];
  }

  // Tampil sekali, setelah Raja Goblin kalah untuk pertama kali.
  const ENDING = [
    ['', 'Arka pulang membawa Kristal Bilangan. Kabut Kacau menghilang, dan warga bisa menghitung hasil panen lagi.'],
    [K, 'Alhamdulillah. Kamu berani karena mau terus belajar, Arka.'],
    ['Mamah Zahra', 'Ayo makan dulu. Petualang juga butuh istirahat.'],
    [E, 'Senjatamu banyak lecetnya. Besok kita rawat sama-sama.'],
    [G, 'Kak Arka, nanti ajari aku berhitung ya!'],
    [B, 'Siap! Kita belajar sama-sama.'],
    ['', 'Tamat. Ladang tetap bisa dirawat, dan Boss Acak menunggu di Papan Misi.'],
  ];

  const CREDITS = [
    { head: 'MATH HERO 4', lines: ['Arka dan Kabut Kacau'] },
    { lines: ['Seri Math Hero', 'game belajar matematika', 'untuk anak SD'] },
    { head: 'SPRITE DAN TILE', lines: ['Cute Fantasy Free', 'Mystic Woods Free', 'Pipoya Free RPG Character Sprites', 'Pixel Crawler Free', 'pixel_16_woods', 'EPIC RPG World Pack: Ancient Ruins', 'Top-Down Retro Interior'] },
    { head: 'ANTARMUKA DAN EFEK', lines: ['Medieval UI Free', 'Effect and Bullet 16x16'] },
    'font',
    { head: 'PIXEL ART TAMBAHAN', lines: ['Latar, platform, duri, dan gerbang:', 'digambar untuk game ini'] },
    'musik',
    'animasi',
  ];

  return { ACAK, ACAK_AFTER, FINALE, ENDING, CREDITS, CHAPTERS, ROUTE, INTRO, BOSS_LINES, TALK, doneCount, linesFor, fogAlpha, chapterOf };
});
