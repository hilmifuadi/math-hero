// Math Hero 3: halaman uji ruang kombinasi (buka mh3/?uji=1). Memilih satu ruang yang belum diuji dari pustaka level generator
// (levelgen.chunks.js) dan memainkannya langsung: ruang awal, ruang itu, lalu tujuan.
// Baris tombol 'Kejar 5-8' memainkan level Kejar asli (seed tetap) langsung.
// Tidak menyentuh data permainan; menang atau keluar kembali ke daftar ini.
(function () {
  const M = window.MH2;
  const Gen = window.MHKit && window.MHKit.levelgen;
  if (!M || !Gen) return;
  const ROWS = [
    { id: 'menara_per', nama: 'Menara per', info: 'Menara dua tuas, naik ke tuas 1 lewat per' },
    { id: 'menara_pipa', nama: 'Menara pipa', info: 'Menara dua tuas, naik ke tuas 2 lewat pipa' },
    { id: 'menara_lift', nama: 'Menara lift', info: 'Menara dua tuas, naik ke tuas 1 lewat lift' },
    { id: 'lift_jembatan', nama: 'Lift + jembatan', info: 'Tuas di dasar, naik lift, seberangi jembatan' },
    { id: 'kotak_menara', nama: 'Kotak + menara', info: 'Kotak ke tombol, tangga naik, tuas, keluar atas' },
    { id: 'saklar_naik', nama: 'Tangga saklar', info: 'Tuas memunculkan anak tangga di dinding' },
    { id: 'gerak_tinggi', nama: 'Gerak bertingkat', info: 'Dua platform gerak, rendah lalu tinggi' },
    { id: 'rapuh_tangga', nama: 'Tangga rapuh', info: 'Naik lewat papan rapuh yang runtuh' },
    { id: 'samping_dua', nama: 'Lontar samping ganda', info: 'Dua lontaran samping, lewat pulau tengah' },
    { id: 'gergaji_tiga', nama: 'Tiga gergaji', info: 'Lompati tiga gergaji berderet' },
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
      const x = 16, w = M.VW - 32, rh = Math.max(38, Math.min(76, (M.VH - 190) / (ROWS.length + 3)));
      let y = 14;
      M.text(g, 'Uji ruang kombinasi', M.VW / 2, y + 16, { size: 20, align: 'center' });
      M.text(g, 'Pilih satu, mainkan, lalu beri tahu hasilnya.', M.VW / 2, y + 38, { size: 12, align: 'center', outline: false, color: '#e8e0ff' });
      y += 54;
      ROWS.forEach((r) => {
        M.button(g, { id: 'u_' + r.id, x, y, w, h: rh - 6, label: '', color: 'blue', onTap: () => play([r.id]),
          draw: (c, bx, by, bw, bh) => { const t = bh < 56; M.text(c, r.nama, bx + bw / 2, by + (t ? 16 : 22), { size: t ? 15 : 18, align: 'center' }); M.text(c, r.info, bx + bw / 2, by + (t ? 33 : 44), { size: t ? 11 : 12, align: 'center', maxW: bw - 16, outline: false }); } });
        y += rh;
      });
      const bw4 = (w - 3 * 8) / 4, bh4 = Math.min(rh - 6, 48);
      [5, 6, 7, 8].forEach((n, i) => M.button(g, { id: 'u_k' + n, x: x + i * (bw4 + 8), y, w: bw4, h: bh4, label: 'Kejar ' + n, color: 'orange', size: 15, onTap: () => M.go('plat', { level: n, onWin: () => M.go('uji'), onLose: () => M.go('uji') }) }));
      y += rh;
      M.button(g, { id: 'u_semua', x, y, w, h: Math.min(rh - 6, 52), label: 'Semua ruang berurutan', color: 'green', size: 17, onTap: () => play(ROWS.map((r) => r.id)) });
      y += rh;
      M.button(g, { id: 'u_soal', x, y, w, h: Math.min(rh - 6, 48), label: withQuiz ? 'Benda macet (soal): nyala' : 'Benda macet (soal): mati', color: withQuiz ? 'purple' : 'gray', size: 15, onTap: () => { withQuiz = !withQuiz; } });
    },
  });
})();
