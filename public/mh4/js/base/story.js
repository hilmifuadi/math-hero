// Math Hero 4: cerita "Bayu dan Kabut Kacau". Hanya teks dan urutan misi, tanpa DOM.
// Urutan misi: dua boss menjadi puncak bab, jadi level dan boss saling menyambung.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).story = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  const K = 'Kakek Darma', B = 'Bayu', S = 'Bu Sari', E = 'Empu Bara', G = 'Pak Gapura';

  const CHAPTERS = [
    { id: 1, nama: 'Bab 1: Hutan Berkabut', misi: [1, 2, 3, 4, 15] },
    { id: 2, nama: 'Bab 2: Jejak Kristal', misi: [5, 6, 7, 8, 9, 10] },
    { id: 3, nama: 'Bab 3: Benteng Kacau', misi: [11, 12, 13, 14, 16] },
    { id: 4, nama: 'Tantangan: Boss Acak', misi: [17] },
  ];
  const ROUTE = CHAPTERS.reduce((all, c) => all.concat(c.misi), []);

  const INTRO = [
    'Kampung Lumbung hidup dari ladang dan gotong royong. Di tengahnya, Kristal Bilangan menjaga hitungan panen tetap benar.',
    'Suatu malam Kabut Kacau turun. Kristal dicuri, tanaman layu, dan warga tidak lagi bisa menghitung hasil panen.',
    'Bayu, cucu Kakek Darma, memegang cangkul dan pedang tua. Ia harus merawat ladang sambil memburu pencuri kristal.',
  ];

  const BOSS_LINES = {
    'penjaga-mesin': {
      before: [
        [B, 'Itu dia! Kristal kampung ada di tubuh hantu itu.'],
        ['Hantu Kabut', 'Hitungan kalian sudah kacau. Pulanglah, anak ladang.'],
      ],
      after: [
        [B, 'Satu pecahan kristal kembali! Kabut di kampung pasti menipis.'],
      ],
    },
    'raja-bandit': {
      before: [
        ['Raja Iblis', 'Jadi kamu yang mengumpulkan pecahan itu? Coba tabrak aku kalau berani.'],
        [B, 'Bukan aku yang akan menabrak.'],
      ],
      after: [
        [B, 'Kristal Bilangan utuh lagi. Ayo pulang, Kakek pasti menunggu.'],
      ],
    },
  };

  // Tiap tokoh berkata sesuai jumlah misi yang sudah selesai.
  const TALK = {
    kakek: [
      { upto: 0, lines: [[K, 'Bayu, ladang kita layu. Tanam benih di petak, lalu siram.'], [K, 'Tanaman tumbuh setiap kamu pulang dari misi. Temui Pak Gapura di seberang jembatan untuk berangkat.']] },
      { upto: 4, lines: [[K, 'Hantu Kabut bersembunyi di ujung hutan. Bawa bekal wortel, itu menambah tenaga.']] },
      { upto: 5, lines: [[K, 'Kabut menipis! Kamu berhasil, Cu. Tapi kristal baru sepotong. Jejak lainnya menuju timur.']] },
      { upto: 10, lines: [[K, 'Kalau soal di gerbang terasa sulit, tenang saja. Salah tidak mengurangi tenagamu.']] },
      { upto: 15, lines: [[K, 'Benteng di ujung sana sarang Raja Iblis. Pancing serudukannya ke dinding.']] },
      { upto: 99, lines: [[K, 'Kampung kembali cerah berkat kamu. Hitungan panen pun benar lagi.'], [K, 'Pak Gapura bilang ada lawan-lawan baru di luar sana, kalau kamu mau menguji diri.']] },
    ],
    sari: [
      { upto: 99, lines: [[S, 'Mampir, Bayu. Mau beli benih atau perlengkapan?']] },
    ],
    empu: [
      { upto: 0, lines: [[E, 'Peti di luar sana kadang berisi senjata tua. Temukan, lalu pasang di sini.']] },
      { upto: 99, lines: [[E, 'Senjatamu butuh diganti? Tiap senjata punya caranya sendiri.']] },
    ],
    gapura: [
      { upto: 99, lines: [[G, 'Jalan sudah kubuka. Pilih tujuanmu, Bayu.']] },
    ],
  };

  function doneCount(profile) {
    return ROUTE.filter((id) => profile.best[id] && profile.best[id].done).length;
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

  return { CHAPTERS, ROUTE, INTRO, BOSS_LINES, TALK, doneCount, linesFor, fogAlpha, chapterOf };
});
