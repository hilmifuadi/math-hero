// Math Hero 4: peta markas Kampung Lumbung dan rumah Bayu, sebagai data murni.
// Tile 16 px. `solids` adalah kotak tabrakan, `spots` adalah tempat yang bisa diajak berinteraksi.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).world = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  const T = 16;
  const rect = (c, r, w, h) => ({ x: c * T, y: r * T, w: w * T, h: h * T });

  function grid(w, h) { return Array.from({ length: h }, () => new Array(w).fill(0)); }
  function fill(m, c, r, w, h) {
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (m[y] && x < m[y].length) m[y][x] = 1;
  }

  // Letak petak ladang: dua baris empat kolom di dalam tanah garapan.
  const PLOT_POS = [];
  for (const r of [16, 18]) for (const c of [13, 15, 17, 19]) PLOT_POS.push([c, r]);

  function kampung() {
    const W = 34, H = 23;
    const path = grid(W, H), water = grid(W, H), farm = grid(W, H);
    fill(path, 2, 11, 24, 3);       // jalan utama barat
    fill(path, 29, 11, 5, 3);       // jalan seberang jembatan
    fill(path, 8, 8, 4, 3);         // halaman rumah
    fill(path, 15, 8, 3, 3);        // ke kios Bu Sari
    fill(path, 21, 8, 3, 3);        // ke tempat Empu Bara
    fill(path, 15, 14, 3, 1);       // ke ladang
    fill(water, 26, 0, 3, H);       // sungai
    fill(farm, 12, 15, 10, 6);      // tanah garapan

    const solids = [];
    // Sungai, kecuali di bawah jembatan.
    solids.push({ x: 26 * T, y: 0, w: 3 * T, h: 11 * T });
    solids.push({ x: 26 * T, y: 14 * T, w: 3 * T, h: (H - 14) * T });
    // Rumah: atap boleh dilewati di belakang, dinding bawah padat.
    solids.push({ x: 6 * T + 4, y: 3 * T + 8, w: 6 * T - 8, h: 5 * T - 8 });

    const objects = [
      { sprite: 'house', x: 6 * T, y: 0, w: 96, h: 128, base: 8 * T },
      { sprite: 'anvil', sx: 0, sy: 0, sw: 64, sh: 32, x: 21 * T, y: 6 * T + 4, w: 48, h: 24, base: 8 * T },
      { sprite: 'chest', x: 13 * T, y: 7 * T, w: 16, h: 16, base: 8 * T },
      { sprite: 'decor', sx: 50, sy: 0, sw: 14, sh: 16, x: 15 * T, y: 6 * T, w: 14, h: 16, base: 7 * T },
      { sprite: 'decor', sx: 81, sy: 0, sw: 14, sh: 16, x: 17 * T, y: 6 * T, w: 14, h: 16, base: 7 * T },
      { sprite: 'decor', sx: 68, sy: 72, sw: 10, sh: 40, x: 7 * T, y: 10 * T - 8, w: 10, h: 40, base: 11 * T - 1 },
      { sprite: 'decor', sx: 68, sy: 72, sw: 10, sh: 40, x: 24 * T, y: 9 * T + 8, w: 10, h: 40, base: 11 * T + 7 },
    ];
    solids.push({ x: 13 * T, y: 7 * T + 8, w: 16, h: 8 });
    solids.push({ x: 21 * T, y: 7 * T, w: 44, h: 12 });

    // Pohon di tepi peta dan di sudut kosong. [kolom, baris tanah]
    for (const [c, r] of [[1, 3], [3, 7], [14, 3], [19, 3], [24, 3], [1, 20], [11, 21], [24, 18], [24, 22], [31, 5], [31, 9], [31, 18], [31, 22]]) {
      objects.push({ sprite: 'tree', x: c * T - 32, y: r * T - 70, w: 64, h: 80, base: r * T });
      solids.push({ x: c * T - 7, y: r * T - 6, w: 14, h: 8 });
    }
    // Hiasan kecil tanpa tabrakan.
    const bits = [[3, 10, 7, 20], [5, 10, 7, 20], [13, 10, 33, 20], [20, 5, 33, 20], [30, 15, 7, 20], [32, 16, 33, 20], [2, 14, 7, 20], [23, 15, 33, 20], [22, 4, 7, 20]];
    for (const [c, r, sx, sy] of bits) objects.push({ sprite: 'decor', sx, sy, sw: 14, sh: 12, x: c * T, y: r * T, w: 14, h: 12, base: 0, ground: true });

    // Kandang: pagar tiga sisi, gerbang terbuka di utara.
    const pen = { c: 2, r: 15, w: 8, h: 6 };
    const fences = [];
    for (let c = pen.c; c < pen.c + pen.w; c++) {
      if (c < pen.c + 3 || c > pen.c + 4) fences.push([c, pen.r, 'h']);
      fences.push([c, pen.r + pen.h, 'h']);
    }
    for (let r = pen.r; r <= pen.r + pen.h; r++) {
      fences.push([pen.c, r, 'v']);
      fences.push([pen.c + pen.w, r, 'v']);
    }
    for (const [c, r, kind] of fences) {
      objects.push({ sprite: 'fence', kind, x: c * T, y: r * T, w: 16, h: 16, base: r * T + 14 });
      solids.push(kind === 'h' ? { x: c * T, y: r * T + 6, w: 16, h: 6 } : { x: c * T + 5, y: r * T, w: 6, h: 16 });
    }
    const animals = [
      { sprite: 'cow', x: 4 * T, y: 17 * T, size: 32 },
      { sprite: 'sheep', x: 7 * T, y: 18 * T, size: 32 },
      { sprite: 'pig', x: 5 * T, y: 19 * T, size: 32 },
      { sprite: 'chicken', x: 8 * T, y: 16 * T + 8, size: 32 },
      { sprite: 'chicken', x: 3 * T + 8, y: 19 * T, size: 32 },
    ].map((a) => Object.assign(a, { pen: rect(pen.c + 1, pen.r + 1, pen.w - 2, pen.h - 2) }));

    const npcs = [
      { id: 'kakek', sprite: 'kakek', nama: 'Kakek Darma', x: 12 * T + 8, y: 11 * T - 2 },
      { id: 'sari', sprite: 'sari', nama: 'Bu Sari', x: 16 * T + 8, y: 8 * T - 2 },
      { id: 'empu', sprite: 'empu', nama: 'Empu Bara', x: 24 * T + 4, y: 8 * T + 6 },
      { id: 'gapura', sprite: 'gapura', nama: 'Pak Gapura', x: 31 * T + 8, y: 11 * T - 2 },
    ];
    for (const n of npcs) solids.push({ x: n.x - 6, y: n.y - 4, w: 12, h: 8 });

    const spots = [
      { id: 'rumah', label: 'Masuk rumah', x: 8 * T, y: 8 * T - 6, w: 2 * T, h: 14 },
      ...npcs.map((n) => ({ id: n.id, label: `Bicara: ${n.nama}`, x: n.x - 16, y: n.y - 16, w: 32, h: 34 })),
      ...PLOT_POS.map(([c, r], i) => ({ id: 'plot' + i, plot: i, label: 'Petak', x: c * T - 4, y: r * T - 4, w: T + 8, h: T + 8 })),
    ];
    return {
      id: 'kampung', W, H, path, water, farm, solids, objects, animals, npcs, spots,
      spawn: { x: 9 * T, y: 9 * T + 8 }, fromMission: { x: 30 * T, y: 12 * T + 8 },
      bridge: { c: 26, r: 11, h: 3 },
    };
  }

  function rumah() {
    const W = 12, H = 10;
    const objects = [
      { sprite: 'bed', x: 2 * T - 8, y: 2 * T + 2, w: 32, h: 64, base: 3 * T + 12 },
      { sprite: 'furn', sx: 160, sy: 16, sw: 48, sh: 48, x: 4 * T + 8, y: 5 * T, w: 56, h: 40, base: 0, ground: true },
      { sprite: 'furn', sx: 33, sy: 64, sw: 46, sh: 47, x: 7 * T, y: T - 2, w: 46, h: 47, base: 3 * T + 12 },
      { sprite: 'furn', sx: 1, sy: 32, sw: 46, sh: 30, x: 5 * T + 2, y: 2 * T + 4, w: 30, h: 22, base: 3 * T + 8 },
    ];
    const solids = [
      { x: 0, y: 0, w: W * T, h: 2 * T + 2 },                 // dinding atas
      { x: 0, y: 0, w: T, h: H * T }, { x: (W - 1) * T, y: 0, w: T, h: H * T },
      { x: 0, y: (H - 1) * T, w: 5 * T, h: T }, { x: 7 * T, y: (H - 1) * T, w: 5 * T, h: T },
      { x: T + 8, y: 2 * T, w: 28, h: 2 * T + 8 },            // kasur
      { x: 5 * T, y: 2 * T, w: 30, h: 2 * T - 6 },            // meja
      { x: 7 * T, y: 2 * T, w: 46, h: 2 * T - 2 },            // rak
    ];
    const spots = [
      { id: 'tidur', label: 'Tidur sampai besok', x: T, y: 3 * T, w: 3 * T, h: 2 * T },
      { id: 'meja', label: 'Catat upgrade', x: 5 * T - 4, y: 3 * T, w: 3 * T - 8, h: 2 * T },
      { id: 'rak', label: 'Baca buku Kakek', x: 8 * T, y: 3 * T, w: 3 * T, h: 2 * T },
      { id: 'keluar', label: 'Keluar', x: 5 * T, y: 8 * T, w: 2 * T, h: 2 * T },
    ];
    return {
      id: 'rumah', W, H, indoor: true, solids, objects, animals: [], npcs: [], spots,
      spawn: { x: 6 * T, y: 7 * T + 8 },
    };
  }

  return { T, kampung, rumah, PLOT_POS };
});
