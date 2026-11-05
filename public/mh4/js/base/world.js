// Math Hero 4: peta markas Kampung Lumbung dan rumah Arka, sebagai data murni.
// Tile 16 px. `solids` adalah kotak tabrakan, `spots` adalah tempat yang bisa diajak berinteraksi.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).world = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  const T = 16;
  const rect = (c, r, w, h) => ({ x: c * T, y: r * T, w: w * T, h: h * T });

  function grid(w, h) { return Array.from({ length: h }, () => new Array(w).fill(0)); }
  function fill(m, c, r, w, h) {
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (m[y] && x >= 0 && x < m[y].length) m[y][x] = 1;
  }

  // Letak bedengan ladang (kiri atas, 2x2 petak), dua baris empat kolom di barat alun-alun.
  const PLOT_POS = [];
  for (const r of [15, 18]) for (const c of [4, 7, 10, 13]) PLOT_POS.push([c, r]);

  // Tata kampung: utara rumah warga dan jalan utama, tengah alun-alun, barat ladang, timur kandang,
  // selatan sungai dan gerbang keluar. Rumah milik Arka, Bida, tetangga, dan Ayah Hilmi.
  // built: daftar bangunan yang sudah dibeli (lihat Farm.BUILDS). Tanah selatan disiapkan untuk bangunan baru.
  function kampung(built) {
    built = built || [];
    const has = (id) => built.includes(id);
    const W = 42, H = 38;
    const path = grid(W, H), water = grid(W, H), farm = grid(W, H);

    fill(path, 3, 12, 36, 2);       // jalan utama
    fill(path, 7, 10, 2, 2);        // halaman rumah Arka
    fill(path, 16, 10, 2, 2);       // halaman kios
    fill(path, 27, 10, 2, 2);       // halaman tetangga
    fill(path, 36, 10, 2, 2);       // halaman bengkel
    fill(path, 31, 11, 4, 1);       // tempat kerja Ayah Hilmi
    fill(path, 18, 12, 8, 8);       // alun-alun
    fill(path, 21, 20, 2, 2);       // ke jembatan
    fill(path, 21, 25, 2, 6);       // jalan keluar kampung
    fill(path, 8, 14, 2, 1);        // ke ladang
    fill(path, 32, 14, 2, 1);       // ke kandang
    const south = ['bengkel', 'ramuan', 'sekolah', 'altar'].some(has);
    if (south) {
      fill(path, 21, 31, 2, 6);     // jalan keluar diteruskan ke tanah selatan
      fill(path, 4, 36, 29, 2);     // jalan depan bangunan selatan
    }

    // Sungai melintang dengan tepi yang tidak lurus.
    fill(water, 0, 22, W, 3);
    fill(water, 0, 21, 3, 1);
    fill(water, 12, 25, 7, 1);
    fill(water, 28, 25, W - 28, 1);
    fill(water, 33, 26, W - 33, 1);
    fill(water, 37, 21, W - 37, 1);

    for (const [c, r] of PLOT_POS) fill(farm, c, r, 2, 2);

    const bridge = { c: 21, r: 22, h: 3 };
    const solids = [];
    // Air, kecuali di atas jembatan. Rel jembatan juga menahan hero.
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        if (!water[r][c]) continue;
        const onBridge = r >= bridge.r && r < bridge.r + bridge.h && (c === bridge.c || c === bridge.c + 1);
        if (!onBridge) solids.push(rect(c, r, 1, 1));
      }
    }
    solids.push({ x: bridge.c * T, y: bridge.r * T, w: 4, h: bridge.h * T });
    solids.push({ x: (bridge.c + 2) * T - 4, y: bridge.r * T, w: 4, h: bridge.h * T });

    const objects = [];
    // Rumah: gambar 96x128, dinding padat setinggi tembok, atap bisa dilewati di belakang.
    const houseBase = 10 * T;
    for (const [sprite, c] of [['house', 5], ['houseMerah', 14], ['houseHijau', 25], ['houseCoklat', 34]]) {
      const x = c * T, y = houseBase - 115;
      objects.push({ sprite, x, y, w: 96, h: 128, base: houseBase });
      solids.push({ x: x + 14, y: houseBase - 50, w: 68, h: 48 });
    }

    // Air mancur di tengah alun-alun, delapan bingkai, setengah ukuran gambar.
    objects.push({ sprite: 'fountain', frames: 8, sw: 160, sh: 128, x: 22 * T - 40, y: 16 * T - 32, w: 80, h: 64, base: 16 * T + 24 });
    solids.push({ x: 22 * T - 28, y: 16 * T - 12, w: 56, h: 30 });
    solids.push({ x: 22 * T - 18, y: 16 * T - 20, w: 36, h: 46 });

    // Bengkel, peti, penanda ladang, dan orang-orangan sawah.
    objects.push({ sprite: 'anvil', sx: 0, sy: 0, sw: 64, sh: 32, x: 31 * T, y: 10 * T - 6, w: 48, h: 24, base: 11 * T });
    solids.push({ x: 31 * T, y: 10 * T + 2, w: 44, h: 12 });
    objects.push({ sprite: 'chest', x: 11 * T, y: 10 * T, w: 16, h: 16, base: 11 * T });
    solids.push({ x: 11 * T, y: 10 * T + 8, w: 16, h: 8 });
    objects.push({ sprite: 'decor', sx: 50, sy: 0, sw: 14, sh: 16, x: 3 * T - 4, y: 15 * T, w: 14, h: 16, base: 16 * T });
    objects.push({ sprite: 'decor', sx: 81, sy: 0, sw: 14, sh: 16, x: 3 * T - 4, y: 18 * T, w: 14, h: 16, base: 19 * T });
    objects.push({ sprite: 'scarecrow', x: 15 * T + 12, y: 16 * T + 2, w: 24, h: 47, base: 19 * T });
    solids.push({ x: 16 * T + 4, y: 19 * T - 6, w: 8, h: 6 });

    // Lampu jalan di alun-alun, ujung jalan, dan gerbang keluar. [kolom, baris kaki]
    for (const [c, r] of [[17, 12], [26, 12], [20, 28], [23, 28], [4, 12], [38, 12]]) {
      objects.push({ sprite: 'decor', sx: 68, sy: 72, sw: 10, sh: 40, x: c * T + 3, y: r * T - 38, w: 10, h: 40, base: r * T + 1 });
      solids.push({ x: c * T + 4, y: r * T - 4, w: 8, h: 6 });
    }

    // Pohon: hutan di tepi peta dan seberang sungai. [kolom, baris tanah, besar?]
    const trees = [];
    for (let c = 2; c < W - 1; c += 4) trees.push([c, 2 + (c % 3), true]);
    for (let r = 6; r < 21; r += 3) { trees.push([1, r, r % 2 === 0]); trees.push([W - 1, r, r % 2 === 1]); }
    for (let c = 2; c < W - 1; c += 3) if (Math.abs(c - 21.5) > 3) trees.push([c, 31 + (c % 2), true]);
    for (const c of [3, 7, 10, 15, 26, 30, 34, 38]) trees.push([c, 28 + (c % 2), c % 3 !== 0]);
    trees.push([13, 11, false], [24, 10, false], [32, 8, false], [2, 26, true], [8, 26, false], [25, 26, false]);
    // Bangunan baru menyingkirkan pohon yang menutupinya. [kolom awal, baris awal, lebar, tinggi]
    const clears = [];
    if (has('dapur')) clears.push([19, 5, 7, 6]);
    if (has('unggun')) clears.push([25, 26, 8, 4]);
    if (has('ramuan')) clears.push([2, 28, 10, 9]);
    if (has('sekolah')) clears.push([10, 28, 9, 9]);
    if (has('bengkel')) clears.push([24, 28, 9, 9]);
    if (has('altar')) clears.push([32, 27, 10, 10]);
    const cleared = (c, r) => clears.some(([x, y, w, h]) => c >= x && c < x + w && r >= y && r < y + h);
    for (const [c, r, big] of trees) {
      if (cleared(c, r)) continue;
      if (big) objects.push({ sprite: 'tree', x: c * T - 32, y: r * T - 70, w: 64, h: 80, base: r * T });
      else objects.push({ sprite: 'treeS', sx: 37, sy: 3, sw: 23, sh: 34, x: c * T - 11, y: r * T - 30, w: 23, h: 34, base: r * T });
      solids.push({ x: c * T - 7, y: r * T - 6, w: 14, h: 8 });
    }

    // Kandang: pagar tiga sisi, gerbang terbuka di utara.
    const pen = { c: 29, r: 15, w: 8, h: 5 };
    const fences = [];
    for (let c = pen.c; c < pen.c + pen.w; c++) {
      if (c < pen.c + 3 || c > pen.c + 4) fences.push([c, pen.r, 'h']);
      fences.push([c, pen.r + pen.h, 'h']);
    }
    // Setengah petak penyambung supaya pagar mendatar bertemu tiang kanan.
    fences.push([pen.c + pen.w, pen.r, 'half'], [pen.c + pen.w, pen.r + pen.h, 'half']);
    for (let r = pen.r; r <= pen.r + pen.h; r++) {
      fences.push([pen.c, r, 'v']);
      fences.push([pen.c + pen.w, r, 'v']);
    }
    for (const [c, r, kind] of fences) {
      objects.push({ sprite: 'fence', kind, x: c * T, y: r * T, w: 16, h: 16, base: r * T + 14 });
      if (kind === 'half') continue;
      solids.push(kind === 'h' ? { x: c * T, y: r * T + 6, w: 16, h: 6 } : { x: c * T + 5, y: r * T, w: 6, h: 16 });
    }
    const herd = [
      { sprite: 'cow', x: 31 * T, y: 17 * T, size: 32 },
      { sprite: 'sheep', x: 34 * T, y: 18 * T, size: 32 },
      { sprite: 'chicken', x: 35 * T, y: 16 * T + 8, size: 32 },
      { sprite: 'chicken', x: 31 * T, y: 19 * T, size: 32 },
    ];
    if (has('ternak')) {
      herd.push({ sprite: 'cow', x: 33 * T, y: 19 * T + 6, size: 32 }, { sprite: 'sheep', x: 30 * T + 8, y: 16 * T + 10, size: 32 },
        { sprite: 'chicken', x: 33 * T, y: 16 * T + 4, size: 32 }, { sprite: 'chicken', x: 35 * T + 4, y: 19 * T + 8, size: 32 });
    }
    const animals = herd.map((a) => Object.assign(a, { pen: rect(pen.c + 1, pen.r + 1, pen.w - 2, pen.h - 2) }));

    // --- Bangun kampung ---
    const extraSpots = [];
    // Papan pembangunan di barat alun-alun, selalu ada.
    objects.push({ sprite: 'sign', text: 'Bangun', x: 17 * T - 2, y: 14 * T - 4, w: 20, h: 18, base: 15 * T });
    solids.push({ x: 17 * T + 2, y: 15 * T - 6, w: 12, h: 6 });
    extraSpots.push({ id: 'bangun', label: 'Bangun kampung', x: 16 * T, y: 14 * T - 8, w: 3 * T, h: 2 * T + 8 });
    if (has('sungai')) {
      for (const [c, r] of [[3, 23], [8, 22], [14, 24], [27, 23], [31, 22], [36, 24], [40, 23], [11, 22]]) objects.push({ sprite: 'lily', x: c * T + 2, y: r * T + 3, w: 12, h: 10, base: 0, ground: true, seed: c });
      for (const [c, r, k] of [[6, 24, 0], [17, 22, 1], [33, 23, 2], [24, 23, 1]]) objects.push({ sprite: 'decor', sx: k * 16, sy: 48, sw: 16, sh: 16, x: c * T, y: r * T, w: 16, h: 16, base: 0, ground: true });
    }
    if (has('bunga')) {
      const F = [[0, 128], [16, 128], [0, 144], [16, 144], [0, 160], [16, 160], [0, 176], [16, 176]];
      let k = 0;
      for (let c = 3; c <= 16; c++) {
        for (const r of c % 2 ? [20] : [20, 21]) { const [sx, sy] = F[k++ % F.length]; objects.push({ sprite: 'decor', sx, sy, sw: 16, sh: 16, x: c * T, y: r * T, w: 16, h: 16, base: r * T + 14 }); }
      }
      for (const c of [4, 5, 6, 10, 11, 12]) { const [sx, sy] = F[k++ % F.length]; objects.push({ sprite: 'decor', sx, sy, sw: 16, sh: 16, x: c * T, y: 14 * T, w: 16, h: 16, base: 14 * T + 14 }); }
    }
    if (has('taman')) {
      for (const x of [18 * T + 2, 23 * T + 10]) {
        objects.push({ sprite: 'props_pc', sx: 83, sy: 160, sw: 58, sh: 32, x, y: 18 * T + 6, w: 41, h: 22, base: 19 * T + 10 });
        solids.push({ x: x + 2, y: 19 * T + 2, w: 37, h: 8 });
      }
      for (const [c, sx] of [[18, 32], [25, 48]]) {
        objects.push({ sprite: 'decor', sx, sy: 144, sw: 16, sh: 16, x: c * T, y: 14 * T, w: 16, h: 16, base: 15 * T });
        solids.push({ x: c * T + 3, y: 15 * T - 5, w: 10, h: 5 });
      }
    }
    if (has('unggun')) {
      objects.push({ sprite: 'cook', sx: 2, sy: 16, sw: 62, sh: 48, x: 27 * T, y: 28 * T - 46, w: 62, h: 48, base: 28 * T, glow: true });
      solids.push({ x: 27 * T + 10, y: 27 * T, w: 42, h: 14 });
      for (const x of [25 * T + 8, 31 * T + 4]) objects.push({ sprite: 'decor', sx: 0, sy: 112, sw: 32, sh: 16, x, y: 27 * T + 4, w: 24, h: 12, base: 28 * T });
    }
    if (has('dapur')) {
      objects.push({ sprite: 'cook', sx: 208, sy: 70, sw: 80, sh: 74, x: 19 * T + 6, y: 10 * T - 74, w: 80, h: 74, base: 10 * T });
      solids.push({ x: 19 * T + 10, y: 10 * T - 30, w: 72, h: 28 });
    }
    // Rumah di tanah selatan: gambar 96x128 dengan kaki di baris 36.
    const southHouse = (sprite, c) => {
      const x = c * T, base = 36 * T;
      objects.push({ sprite, x, y: base - 115, w: 96, h: 128, base });
      solids.push({ x: x + 14, y: base - 50, w: 68, h: 48 });
    };
    if (has('ramuan')) {
      southHouse('houseUngu', 3);
      objects.push({ sprite: 'alchemy', frames: 6, sw: 32, sh: 33, x: 9 * T + 6, y: 36 * T - 31, w: 32, h: 33, base: 36 * T, fps: 6 });
      solids.push({ x: 9 * T + 8, y: 36 * T - 10, w: 28, h: 8 });
    }
    if (has('sekolah')) {
      southHouse('houseKuning', 11);
      objects.push({ sprite: 'sign', text: 'SEKOLAH', x: 17 * T + 2, y: 34 * T, w: 34, h: 18, base: 35 * T + 2 });
      solids.push({ x: 17 * T + 12, y: 35 * T - 4, w: 14, h: 6 });
    }
    if (has('bengkel')) {
      southHouse('houseAbu', 25);
      objects.push({ sprite: 'anvil', sx: 0, sy: 0, sw: 64, sh: 32, x: 31 * T + 4, y: 35 * T - 6, w: 48, h: 24, base: 36 * T });
      solids.push({ x: 31 * T + 4, y: 35 * T + 2, w: 44, h: 12 });
    }
    if (has('altar')) {
      const x = 33 * T, base = 36 * T;
      objects.push({ sprite: 'altar', frames: 39, sw: 224, sh: 288, x, y: base - 144, w: 112, h: 144, base: base - 20, fps: 10 });
      solids.push({ x: x + 18, y: base - 66, w: 76, h: 40 });
      extraSpots.push({ id: 'altar', label: 'Lihat Kristal', x: x + 36, y: base - 30, w: 40, h: 26 });
    }
    if (has('perahu')) objects.push({ sprite: 'boat', x: 30 * T, y: 23 * T - 2, w: 34, h: 16, base: 0, ground: true, from: 26 * T, to: 38 * T });

    const npcs = [
      { id: 'kakek', sprite: 'kakek', nama: 'Aki Tyo', x: 10 * T, y: 12 * T - 2 },
      { id: 'sari', sprite: 'sari', nama: 'Bida', x: 19 * T + 8, y: 11 * T + 6 },
      { id: 'empu', sprite: 'empu', nama: 'Ayah Hilmi', x: 34 * T + 8, y: 12 * T - 2 },
      { id: 'gapura', sprite: 'gapura', nama: 'Farah', x: 24 * T, y: 29 * T },
      { id: 'guru', sprite: 'guru', nama: 'Nadiya', x: 22 * T + 8, y: 11 * T + 6 },
      { id: 'zahra', sprite: 'zahra', nama: 'Mamah Zahra', x: 35 * T + 8, y: 14 * T + 6 },
    ];
    for (const n of npcs) solids.push({ x: n.x - 6, y: n.y - 4, w: 12, h: 8 });

    const spots = [
      { id: 'rumah', label: 'Masuk rumah', x: 7 * T, y: houseBase - 8, w: 2 * T, h: 14 },
      { id: 'peti', label: 'Buka peti', x: 11 * T - 6, y: 10 * T - 2, w: 28, h: 28 },
      ...extraSpots,
      ...npcs.map((n) => ({ id: n.id, label: `Bicara: ${n.nama}`, x: n.x - 16, y: n.y - 16, w: 32, h: 34 })),
      ...PLOT_POS.map(([c, r], i) => ({ id: 'plot' + i, plot: i, label: 'Petak', x: c * T - 2, y: r * T - 2, w: 2 * T + 4, h: 2 * T + 4, px: c * T, py: r * T })),
    ];

    // Hiasan kecil di rumput kosong, acak tetap supaya peta selalu sama.
    const BITS = [[7, 18, 8, 8], [19, 20, 10, 8], [33, 20, 13, 6], [69, 20, 7, 7], [82, 21, 13, 4], [18, 37, 10, 7], [36, 117, 8, 8]];
    let seed = 7;
    const rnd = (n) => { seed = (seed * 1103 + 12345) % 65536; return (seed >> 4) % n; };
    for (let i = 0; i < 150; i++) {
      const c = rnd(W), r = rnd(H), bit = BITS[rnd(BITS.length)], ox = rnd(8), oy = rnd(8);
      if (path[r][c] || water[r][c] || farm[r][c]) continue;
      objects.push({ sprite: 'decor', sx: bit[0], sy: bit[1], sw: bit[2], sh: bit[3], x: c * T + ox, y: r * T + oy, w: bit[2], h: bit[3], base: 0, ground: true });
    }

    return {
      id: 'kampung', key: 'kampung:' + built.join(','), built: built.slice(), W, H, path, water, farm, solids, objects, animals, npcs, spots,
      spawn: { x: 8 * T, y: 11 * T }, fromHouse: { x: 8 * T, y: 11 * T }, fromMission: { x: 22 * T, y: 28 * T },
      bridge,
    };
  }

  function rumah() {
    const W = 12, H = 10;
    const objects = [
      { sprite: 'bed', x: 2 * T - 8, y: 2 * T + 2, w: 32, h: 64, base: 3 * T + 12 },
      { sprite: 'furn', sx: 160, sy: 16, sw: 48, sh: 48, x: 4 * T + 8, y: 5 * T, w: 56, h: 40, base: 0, ground: true },
      { sprite: 'furn', sx: 33, sy: 64, sw: 46, sh: 47, x: 7 * T, y: T - 2, w: 46, h: 47, base: 3 * T + 12 },
      { sprite: 'furn', sx: 1, sy: 32, sw: 46, sh: 30, x: 5 * T + 2, y: 2 * T + 4, w: 30, h: 22, base: 3 * T + 8 },
      { sprite: 'chest', x: 9 * T + 8, y: 6 * T, w: 16, h: 16, base: 7 * T },
    ];
    const solids = [
      { x: 0, y: 0, w: W * T, h: 2 * T + 2 },                 // dinding atas
      { x: 0, y: 0, w: T, h: H * T }, { x: (W - 1) * T, y: 0, w: T, h: H * T },
      { x: 0, y: (H - 1) * T, w: 5 * T, h: T }, { x: 7 * T, y: (H - 1) * T, w: 5 * T, h: T },
      { x: T + 8, y: 2 * T, w: 28, h: 2 * T + 8 },            // kasur
      { x: 5 * T, y: 2 * T, w: 30, h: 2 * T - 6 },            // meja
      { x: 7 * T, y: 2 * T, w: 46, h: 2 * T - 2 },            // rak
      { x: 9 * T + 8, y: 6 * T + 8, w: 16, h: 8 },            // peti
    ];
    const spots = [
      { id: 'tidur', label: 'Tidur sampai besok', x: T, y: 3 * T, w: 3 * T, h: 2 * T },
      { id: 'meja', label: 'Catat upgrade', x: 5 * T - 4, y: 3 * T, w: 3 * T - 8, h: 2 * T },
      { id: 'rak', label: 'Baca buku Aki', x: 8 * T, y: 3 * T, w: 3 * T, h: 2 * T },
      { id: 'peti', label: 'Buka peti', x: 9 * T, y: 6 * T - 4, w: 2 * T, h: 2 * T },
      { id: 'keluar', label: 'Keluar', x: 5 * T, y: 8 * T, w: 2 * T, h: 2 * T },
    ];
    return {
      id: 'rumah', W, H, indoor: true, solids, objects, animals: [], npcs: [], spots,
      spawn: { x: 6 * T, y: 7 * T + 8 },
    };
  }

  return { T, kampung, rumah, PLOT_POS };
});
