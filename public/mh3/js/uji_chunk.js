// Math Hero 3: halaman uji ruang kombinasi (buka mh3/?uji=1). Memilih satu ruang kombinasi dari pustaka level generator
// (levelgen.chunks.js, bertanda kombo: true) dan memainkannya langsung: ruang awal, ruang itu, lalu tujuan.
// Tidak menyentuh data permainan; menang atau keluar kembali ke daftar ini.
(function () {
  const M = window.MH2;
  const Gen = window.MHKit && window.MHKit.levelgen;
  if (!M || !Gen) return;
  const ROWS = [
    { id: 'tuas_ganda', nama: 'Tuas ganda', info: 'Tarik tuas 1 lalu tuas 2 untuk membuka dua gerbang' },
    { id: 'kotak_tuas', nama: 'Tuas + kotak', info: 'Tuas buka gerbang, dorong kotak ke lubang tombol' },
    { id: 'jembatan_dua', nama: 'Dua jembatan tuas', info: 'Tuas di awal dan di seberang memunculkan jembatan' },
    { id: 'kotak_jembatan', nama: 'Kotak + jembatan', info: 'Kotak di lubang tombol memunculkan jembatan' },
    { id: 'kotak_dua', nama: 'Dua kotak', info: 'Kotak pertama membuka kotak kedua' },
    { id: 'menara_dua_tuas', nama: 'Menara dua tuas', info: 'Naik ke tuas, turun, naik tangga, jembatan (vertikal)' },
    { id: 'tuas_silang', nama: 'Tuas silang', info: 'Nyalakan, naik tarik tuas 2, turun matikan tuas 1' },
    { id: 'kotak_turun', nama: 'Kotak turun sumur', info: 'Kotak jatuh ke tombol, tangga turun ke ceruk tuas' },
    { id: 'menara_rapuh', nama: 'Menara rapuh', info: 'Menara dua tuas dengan pijakan papan rapuh' },
    { id: 'menara_gergaji', nama: 'Menara gergaji', info: 'Menara dua tuas dengan gergaji di dasar' },
    { id: 'tuas_silang_naik', nama: 'Tuas silang naik', info: 'Tuas silang, lalu naik tangga ke tujuan' },
    { id: 'sumur_ceruk_ganda', nama: 'Sumur dua ceruk', info: 'Turun tangga, dua ceruk tuas, gergaji di dasar' },
  ];
  let withQuiz = false;

  function play(ids) {
    const d = Gen.generate({ seed: 11, tier: 2, tema: 'gua', mech: [], fixed: ids, quiz: withQuiz ? 1 : 0, foes: ['e'] });
    const def = { id: 0, nama: 'Uji ruang', tema: d.tema, tier: d.tier, seed: d.seed, map: d.map, inside: d.inside, rooms: d.rooms };
    const back = () => M.go('uji');
    M.go('plat', { def, onWin: back, onLose: back });
  }

  M.register('uji', {
    enter() { M.setControls(null); M.audio.music('padang'); },
    update() {},
    draw(g) {
      M.drawBg(g, 'gua', 0, 0);
      const x = 16, w = M.VW - 32, rh = Math.max(38, Math.min(76, (M.VH - 190) / (ROWS.length + 2)));
      let y = 14;
      M.text(g, 'Uji ruang kombinasi', M.VW / 2, y + 16, { size: 20, align: 'center' });
      M.text(g, 'Pilih satu, mainkan, lalu beri tahu hasilnya.', M.VW / 2, y + 38, { size: 12, align: 'center', outline: false, color: '#e8e0ff' });
      y += 54;
      ROWS.forEach((r) => {
        M.button(g, { id: 'u_' + r.id, x, y, w, h: rh - 6, label: '', color: 'blue', onTap: () => play([r.id]),
          draw: (c, bx, by, bw, bh) => { const t = bh < 56; M.text(c, r.nama, bx + bw / 2, by + (t ? 16 : 22), { size: t ? 15 : 18, align: 'center' }); M.text(c, r.info, bx + bw / 2, by + (t ? 33 : 44), { size: t ? 11 : 12, align: 'center', maxW: bw - 16, outline: false }); } });
        y += rh;
      });
      M.button(g, { id: 'u_semua', x, y, w, h: Math.min(rh - 6, 52), label: 'Semua ruang berurutan', color: 'green', size: 17, onTap: () => play(ROWS.map((r) => r.id)) });
      y += rh;
      M.button(g, { id: 'u_soal', x, y, w, h: Math.min(rh - 6, 48), label: withQuiz ? 'Benda macet (soal): nyala' : 'Benda macet (soal): mati', color: withQuiz ? 'purple' : 'gray', size: 15, onTap: () => { withQuiz = !withQuiz; } });
    },
  });
})();
