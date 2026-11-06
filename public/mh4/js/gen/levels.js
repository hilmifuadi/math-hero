// Math Hero 4: level vertical slice, seed tetap. Peta dihasilkan oleh inti generator
// bersama (public/shared/levelgen/core.js) memakai LevelRules MH4.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('../../../shared/levelgen/core.js'),
      require('./rules.js'),
      require('../boss/bosses/roster.js'),
      require('../boss/gen.js')
    );
  } else {
    (root.MH4 = root.MH4 || {}).levels = factory(
      root.MHKit.levelgenCore, root.MH4.levelgenRules,
      root.MH4.bosses.roster, root.MH4.bossGen
    );
  }
})(typeof self !== 'undefined' ? self : this, function (Core, Rules, Roster, BossGen) {
  const Gen = Core.create(Rules);
  const CLEAR = ".*=";
  // Musuh khas tiap tema, dari yang paling ramah. Jumlah jenis bertambah mengikuti tier.
  const THEME_POOL = {
    green: ['e', 'a', 'b', 'p', 'f'],
    simple: ['a', 'b', 'j', 'p', 'f'],
    industrial: ['b', 'j', 'w', 'r', 'g'],
    night: ['u', 'e', 'm', 'f', 'h'],
    crystal: ['a', 'm', 'f', 'g', 'p'],
    hive: ['a', 'p', 'f', 'b', 'w'],
    day: ['j', 'b', 'r', 'w', 'h'],
    castle: ['h', 'e', 'm', 'u', 'r', 'g'],
  };
  // Rangkaian mekanik pada tanah datar. Tiap level memakai urutan berbeda, supaya tidak monoton.
  const SETS = {
    bridge(rows, c, r) { hole(rows, c + 2, 6, r); for (let k = 0; k < 6; k++) rows[r + 1][c + 2 + k] = '~'; rows[r - 3][c + 4] = '*'; },
    lift(rows, c, r) { hole(rows, c + 1, 9, r); for (let k = 0; k < 9; k++) rows[r + 1][c + 1 + k] = '-'; rows[r - 3][c + 5] = '*'; },
    spring(rows, c, r) {
      rows[r][c + 2] = 's';
      for (let k = 0; k < 5; k++) rows[r - 5][c + 4 + k] = '=';
      rows[r - 7][c + 5] = '*'; rows[r - 7][c + 7] = '*';
    },
    saw(rows, c, r) { rows[r][c + 3] = 'o'; rows[r][c + 7] = 'o'; rows[r - 3][c + 5] = '*'; },
    // Pintu ajaib menuju ruang rahasia di bawah tanah, berisi bintang dan penjaga. Tidak melewati apa pun.
    tunnel(rows, c, r) {
      rows[r][c + 5] = '(';
      for (let y = r + 3; y <= r + 5; y++) for (let k = 1; k <= 9; k++) rows[y][c + k] = '.';
      rows[r + 5][c + 2] = ')';
      for (const k of [4, 6, 8]) rows[r + 4][c + k] = '*';
      rows[r + 5][c + 7] = '*';
    },
    // Lubang 12 petak: lompat ganda hanya sampai sekitar 8, pelontar samping sekitar 15.
    dash(rows, c, r) { rows[r][c + 1] = '>'; hole(rows, c + 3, 12, r); rows[r - 4][c + 9] = '*'; },
  };
  const SET_ORDER = ['bridge', 'spring', 'lift', 'saw', 'tunnel', 'dash'];

  // Pintu ajaib jenis baru. Semua dua arah dan masuk dengan tombol bawah.
  const DOORS = {
    // Pintu Langit: dari tanah ke pulau awan berbintang yang terlalu tinggi untuk dilompati.
    sky(rows, c, r) {
      rows[r][c + 1] = '(';
      for (let k = 2; k <= 8; k++) rows[r - 7][c + k] = '=';
      rows[r - 8][c + 5] = ')';
      for (const k of [3, 7]) rows[r - 8][c + k] = '*';
      for (const k of [4, 6]) rows[r - 9][c + k] = '*';
    },
    // Pintu Tembus: tembok setinggi delapan petak hanya bisa dilewati lewat pintu.
    wall(rows, c, r) {
      for (let y = r - 7; y <= r; y++) { rows[y][c + 5] = '#'; rows[y][c + 6] = '#'; }
      rows[r][c + 2] = '(';
      rows[r][c + 9] = ')';
      rows[r - 3][c + 2] = '*';
    },
    // Pintu Atap: dari tanah naik ke atas tembok yang lebar, lalu turun di sisi lain berbonus bintang.
    roof(rows, c, r) {
      for (let y = r - 6; y <= r; y++) for (let k = 4; k <= 9; k++) rows[y][c + k] = '#';
      rows[r][c + 2] = '(';
      rows[r - 7][c + 6] = ')';
      for (const k of [5, 8]) rows[r - 7][c + k] = '*';
      rows[r - 9][c + 7] = '*';
    },
  };
  const DOOR_SIZE = { sky: [10, 10], wall: [12, 9], roof: [12, 10] };
  // Sel yang dipakai tiap rangkaian: kolom yang butuh tanah, dan kotak [dx0, dx1, dy0, dy1] yang harus kosong.
  const DOOR_NEED = {
    sky: { ground: [0, 1, 2], free: [[0, 2, -2, 0], [2, 8, -10, -6]] },
    wall: { ground: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], free: [[1, 10, -2, 0], [4, 7, -8, -3]] },
    roof: { ground: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], free: [[1, 10, -2, 0], [3, 10, -10, -3]] },
  };

  // Menambah pintu ajaib di tanah lapang, berjauhan dari gerbang, kunci, dan rangkaian lain.
  function addDoors(def, p) {
    const rows = def.map.map((r) => r.split(''));
    const H = rows.length, W = rows[0].length;
    const busy = [];
    for (let c = 0; c < W; c++) if (rows.some((row) => 'GLSEK()><s'.includes(row[c]))) busy.push(c);
    const want = p.tier < 1 ? ['sky'] : ['wall', 'sky', 'roof', 'sky'];
    const placed = [];
    const freeArea = (c, r, kind) => {
      const need = DOOR_NEED[kind];
      if (r - 11 < 1) return false;
      for (const k of need.ground) if (rows[r + 1][c + k] !== '#') return false;
      for (const [x0, x1, y0, y1] of need.free) {
        for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) if (!'.*'.includes(rows[r + y][c + x])) return false;
      }
      return true;
    };
    for (const kind of want) {
      const [w, h] = DOOR_SIZE[kind];
      const off = (p.seed * 7 + kind.length * 13) % 9;
      for (let c = 18 + off; c < W - 24 - w; c += 2) {
        if (busy.some((b) => b >= c - 6 && b <= c + w + 6) || placed.some((x) => Math.abs(x - c) < 20)) continue;
        let ok = false, r = -1;
        for (let y = H - 2; y > h && !ok; y--) {
          if (rows[y + 1][c] !== '#' || !'.*'.includes(rows[y][c])) continue;
          if (freeArea(c, y, kind)) { ok = true; r = y; }
        }
        if (!ok) continue;
        DOORS[kind](rows, c, r);
        placed.push(c);
        for (let k = 0; k < w; k++) busy.push(c + k);
        break;
      }
    }
    return Object.assign({}, def, { map: rows.map((r) => r.join('')) });
  }

  const PLAN = [
    { id: 1, nama: 'Langkah Pertama', tema: 'green', tier: 0, seed: 3901, sec: 45 },
    { id: 2, nama: 'Pipa Berkarat', tema: 'industrial', tier: 1, seed: 4120, sec: 50 },
    { id: 3, nama: 'Bukit Ceria', tema: 'simple', tier: 2, seed: 4155, sec: 55 },
    { id: 4, nama: 'Jurang Hijau', tema: 'green', tier: 2, seed: 4473, sec: 60 },
    { id: 5, nama: 'Gudang Tua', tema: 'industrial', tier: 3, seed: 4320, sec: 60 },
    { id: 6, nama: 'Gerbang Matematika', tema: 'simple', tier: 3, seed: 4423, sec: 65 },
    { id: 7, nama: 'Atap Neon', tema: 'night', tier: 3, seed: 7220, sec: 65 },
    { id: 8, nama: 'Jantung Gua', tema: 'crystal', tier: 3, seed: 29529, sec: 70 },
    { id: 9, nama: 'Sarang Purba', tema: 'hive', tier: 3, seed: 18325, sec: 70 },
    { id: 10, nama: 'Lorong Spora', tema: 'hive', tier: 3, seed: 1005, sec: 75 },
    { id: 11, nama: 'Distrik Bata', tema: 'day', tier: 3, seed: 13609, sec: 75 },
    { id: 12, nama: 'Atap Kota', tema: 'day', tier: 3, seed: 1000, sec: 75 },
    { id: 13, nama: 'Gerbang Benteng', tema: 'castle', tier: 3, seed: 201202, sec: 80 },
    { id: 14, nama: 'Aula Bawah', tema: 'castle', tier: 3, seed: 2402, sec: 80 },
    { id: 19, nama: 'Padang Per', tema: 'simple', tier: 2, seed: 5119, sec: 65 },
    { id: 20, nama: 'Gang Lentera', tema: 'night', tier: 3, seed: 5120, sec: 70 },
    { id: 22, nama: 'Akar Bercahaya', tema: 'hive', tier: 3, seed: 5122, sec: 80 },
    { id: 23, nama: 'Pasar Lama', tema: 'day', tier: 3, seed: 5123, sec: 80 },
    { id: 25, nama: 'Gudang Timur', tema: 'industrial', tier: 3, seed: 5125, sec: 85 },
    { id: 26, nama: 'Malam Panjang', tema: 'night', tier: 3, seed: 5126, sec: 85 },
    { id: 27, nama: 'Halaman Benteng', tema: 'castle', tier: 3, seed: 5127, sec: 90 },
    { id: 29, nama: 'Ruang Takhta', tema: 'castle', tier: 3, seed: 5239, sec: 95 },
  ];
  // Level menara: naik terus, lebar peta cukup untuk bergerak bebas.
  const TOWERS = [
    { id: 18, nama: 'Menara Pengintai', tema: 'green', tier: 1, seed: 6118, storeys: 4 },
    { id: 21, nama: 'Menara Kristal', tema: 'crystal', tier: 2, seed: 6121, storeys: 5 },
    { id: 24, nama: 'Menara Jam', tema: 'day', tier: 3, seed: 6124, storeys: 6 },
    { id: 28, nama: 'Menara Benteng', tema: 'castle', tier: 3, seed: 6128, storeys: 7 },
  ];
  // Urutan dalam cerita, untuk kekuatan musuh dan senjata per level.
  const ROUTE_ORDER = [1, 2, 3, 18, 4, 19, 5, 6, 20, 7, 8, 21, 9, 10, 22, 11, 12, 23, 24, 25, 26, 13, 14, 27, 28, 29];
  const powerOf = (id) => Math.round(ROUTE_ORDER.indexOf(id) * 3 / ROUTE_ORDER.length * 100) / 100;

  // Invariant minimal supaya level tidak mustahil diselesaikan.
  function validate(def) {
    const bad = [];
    const map = def.map;
    if (!Array.isArray(map) || !map.length) return ['peta kosong'];
    const W = map[0].length;
    map.forEach((row, r) => { if (row.length !== W) bad.push(`baris ${r} panjang ${row.length}, harus ${W}`); });
    const find = (ch) => {
      const out = [];
      map.forEach((row, r) => { for (let c = 0; c < row.length; c++) if (row[c] === ch) out.push({ c, r }); });
      return out;
    };
    const S = find('S'), E = find('E'), K = find('K'), G = find('G'), C = find('C'), H = find('^');
    if (S.length !== 1) bad.push(`S harus tepat 1, ada ${S.length}`);
    if (E.length !== 1) bad.push(`E harus tepat 1, ada ${E.length}`);
    if (!K.length) bad.push('K (peti reward) tidak ada');
    if (!G.length) bad.push('G (gerbang soal) tidak ada');
    if (!C.length) bad.push('C (checkpoint) tidak ada');
    const gMin = G.length ? Math.min(...G.map((p) => p.c)) : Infinity;
    if (!def.tower) {
      if (S.length && E.length && S[0].c >= E[0].c) bad.push('S harus di kiri E');
      if (K.length && gMin >= Math.min(...K.map((p) => p.c))) bad.push('gerbang G harus sebelum peti K');
      if (E.length && gMin >= Math.min(...E.map((p) => p.c))) bad.push('gerbang G harus sebelum tujuan E');
      if (K.length && E.length && Math.min(...K.map((p) => p.c)) >= Math.min(...E.map((p) => p.c))) bad.push('peti K harus sebelum E');
    } else if (S.length && E.length && S[0].r <= E[0].r) bad.push('S menara harus di bawah E');
    // Benda penting harus berdiri di atas tanah padat, bukan di jurang/duri.
    const solid = (c, r) => r >= 0 && r < map.length && c >= 0 && c < W && '#G'.includes(map[r][c]);
    for (const p of [...S, ...C, ...K, ...E]) {
      if (!solid(p.c, p.r + 1)) bad.push(`benda di kolom ${p.c} baris ${p.r} tidak punya tanah di bawahnya`);
      if (H.some((h) => h.c === p.c && h.r === p.r)) bad.push(`benda di kolom ${p.c} menempel duri`);
    }
    // Gerbang harus berupa dinding penuh sampai tanah, bukan satu sel yang bisa dilompati.
    for (const p of def.tower ? [] : G) {
      let r = p.r;
      while (r < map.length && map[r][p.c] === 'G') r++;
      if (!solid(p.c, r)) bad.push(`gerbang kolom ${p.c} tidak mencapai tanah`);
    }
    return bad;
  }

  const REGULAR = PLAN.map((p) => {
    const def = Gen.generate({
      seed: p.seed, tier: p.tier, tema: p.tema, mech: [], intro: [], sec: p.sec,
    });
    const level = {
      id: p.id, nama: p.nama, tema: p.tema, tier: p.tier, seed: def.seed,
      // Kekuatan musuh dan senjata naik halus tiap level, sampai 3 di arena boss.
      power: powerOf(p.id),
      par: p.sec * 3,
      map: def.map, inside: def.inside, rooms: def.rooms, checkpoints: def.checkpoints,
    };
    return addEnemies(addDoors(addMech(addMiniBoss(addGates(level), p.id), p), p), p.tier);
  });
  const LEVELS = REGULAR.concat(TOWERS.map((t) => buildTower(t)));

  // Tanah datar selebar `len` kolom ke kiri dari c, dengan ruang kepala. Mengembalikan baris berdiri.
  function flatAt(rows, c, len) {
    const H = rows.length;
    for (let r = H - 2; r >= 4; r--) {
      if (rows[r + 1][c] !== "#" || rows[r][c] !== ".") continue;
      let ok = true;
      for (let k = c - len; k <= c + 1 && ok; k++) {
        if (k < 1 || k >= rows[0].length - 1 || rows[r + 1][k] !== "#") ok = false;
        for (let up = 0; up < 4 && ok; up++) if (!CLEAR.includes(rows[r - up][k])) ok = false;
      }
      if (ok) return r;
    }
    return -1;
  }
  // Tembok dari atas sampai lantai. Batal bila menimpa benda penting.
  function wallAt(rows, c, r, ch) {
    for (let y = 0; y <= r; y++) if (!CLEAR.includes(rows[y][c])) return false;
    for (let y = 0; y <= r; y++) rows[y][c] = ch;
    return true;
  }
  function nearestFlat(rows, frac, len, taken) {
    const W = rows[0].length, mid = Math.floor(W * frac);
    for (let d = 0; d < W * 0.2; d++) {
      for (const c of [mid + d, mid - d]) {
        if (c < 14 || c > W - 12 || taken.some((t) => Math.abs(t - c) < 20)) continue;
        const r = flatAt(rows, c, len);
        if (r >= 0) return { c, r };
      }
    }
    return null;
  }

  // Tiga gerbang soal per level: gerbang dari generator ditambah dua yang tersebar di depan.
  function addGates(def) {
    const rows = def.map.map((r) => r.split(""));
    const taken = [];
    for (let c = 0; c < rows[0].length; c++) if (rows.some((row) => row[c] === "G")) taken.push(c);
    for (const frac of [0.22, 0.45, 0.6, 0.85]) {
      if (taken.length >= 3) break;
      const at = nearestFlat(rows, frac, 14, taken);
      if (at && wallAt(rows, at.c, at.r, "G")) taken.push(at.c);
    }
    return Object.assign({}, def, { map: rows.map((r) => r.join("")) });
  }

  function hole(rows, c, n, r) {
    for (let k = 0; k < n; k++) for (let y = r + 1; y < rows.length; y++) rows[y][c + k] = '.';
  }
  function addMech(def, p) {
    const rows = def.map.map((r) => r.split(''));
    const W = rows[0].length;
    const blocked = [];
    for (let c = 0; c < W; c++) if (rows.some((row) => row[c] === 'G' || row[c] === 'L')) blocked.push(c);
    // Level awal lebih ramah, tetapi tetap punya kejutan.
    const want = p.tier < 1 ? 2 : 5 + p.tier;
    const taken = [], vaults = [];
    let done = 0;
    // Pelontar samping lebih dulu, karena butuh tanah paling panjang: lubang 12 petak di antara dua tanah.
    if (p.tier >= 1) {
      let placed = 0;
      for (let c = 16 + (p.seed % 11); c < W - 34 && placed < (p.tier >= 3 ? 3 : 2); c += 2) {
        if (taken.some((x) => Math.abs(x - c) < 30)) continue;
        if (blocked.some((g) => c + 22 > g - 16 && c < g + 3)) continue;
        const r = flatAt(rows, c + 2, 2);
        if (r < 8 || flatAt(rows, c + 21, 5) !== r) continue;
        let ok = true;
        for (let k = 0; k <= 21 && ok; k++) {
          for (let y = r - 6; y <= r; y++) if (!CLEAR.includes(rows[y][c + k])) ok = false;
          for (let y = r + 1; y < rows.length; y++) if (rows[y][c + k] !== '#' && rows[y][c + k] !== '.') ok = false;
        }
        if (!ok) continue;
        SETS.dash(rows, c, r);
        taken.push(c + 10);
        placed++;
      }
    }
    const span = W - 34, start = p.seed % 7;
    for (let i = start; i < span && done < want; i += 3) {
      const c = 16 + i;
      if (taken.some((t) => Math.abs(t - c) < 26)) continue;
      if (blocked.some((g) => c + 11 > g - 16 && c < g + 3)) continue;
      const r = flatAt(rows, c + 10, 10);
      if (r < 8) continue;
      // Lubang hanya pada tanah yang tidak punya ruang lain di bawahnya.
      let plain = true;
      for (let k = 0; k <= 10 && plain; k++) for (let y = r + 2; y < rows.length; y++) if (rows[y][c + k] !== '#') { plain = false; break; }
      for (let up = 4; up < 8; up++) for (let k = 0; k <= 10; k++) if (!CLEAR.includes(rows[r - up][c + k])) { taken.push(c); up = 9; break; }
      if (taken[taken.length - 1] === c) { taken.pop(); continue; }
      // Tanah dengan ruang di bawahnya hanya memakai rangkaian tanpa lubang.
      let kind = plain ? SET_ORDER[(p.id + done) % SET_ORDER.length] : ['spring', 'saw'][(p.id + done) % 2];
      if (p.tier < 1) kind = done === 0 ? 'spring' : 'tunnel';
      // Ruang rahasia butuh tanah yang cukup dalam.
      if (kind === 'tunnel' && (!plain || r + 7 > rows.length - 1)) kind = 'spring';
      // Pelontar butuh tanah datar panjang sampai tempat mendarat.
      if (kind === 'dash') {
        let room = plain && flatAt(rows, c + 20, 20) === r;
        for (let k = 11; k <= 15 && room; k++) for (let y = r + 2; y < rows.length; y++) if (rows[y][c + k] !== '#') { room = false; break; }
        if (!room) kind = 'spring';
      }
      if (kind === 'tunnel') vaults.push({ c: c + 1, r: r + 3, w: 9, h: 3 });
      SETS[kind](rows, c, r);
      taken.push(c); done++;
    }
    return Object.assign({}, def, { map: rows.map((r) => r.join('')), vaults });
  }

  // Mini boss: tanah lapang di tengah level dengan kunci di ujungnya. Mulai level ketiga, selang seling.
  function addMiniBoss(def, id) {
    if (id < 3 || (id % 2 === 0 && !(id <= 14 && id % 4 === 0))) return def;
    const rows = def.map.map((r) => r.split(""));
    const taken = [];
    for (let c = 0; c < rows[0].length; c++) if (rows.some((row) => row[c] === "G")) taken.push(c);
    const at = nearestFlat(rows, 0.5, 16, taken);
    if (!at || !wallAt(rows, at.c, at.r, "L")) return def;
    rows[at.r][at.c - 6] = id % 4 === 1 ? "Q" : "Z";
    return Object.assign({}, def, { map: rows.map((r) => r.join("")), mini: true });
  }

  // Menara: tiap lantai punya lubang di satu sisi. Tangga papan membawa hero ke landasan di bawah
  // lubang. Sebagian lubang ditutup gerbang soal. Jarak antar pijakan selalu terjangkau lompat ganda.
  function buildTower(t) {
    let s = t.seed >>> 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const W = 34, SH = 16, n = t.storeys, H = n * SH + 10;
    const g = Array.from({ length: H }, () => Array(W).fill("."));
    for (let r = 0; r < H; r++) { g[r][0] = "#"; g[r][W - 1] = "#"; }
    const fillRow = (r, a, b, ch) => { for (let c = a; c <= b; c++) if (r >= 0 && r < H) g[r][c] = ch; };
    fillRow(H - 2, 1, W - 2, "#"); fillRow(H - 1, 1, W - 2, "#");
    g[H - 3][4] = "S";
    // Tiga gerbang tersebar merata di antara lantai.
    const gateAt = new Set([Math.floor(n * 0.25), Math.floor(n * 0.55), n - 1]);
    let x = 6, poolEnemy = THEME_POOL[t.tema].filter((c) => c !== "f").slice(0, t.tier + 2);
    for (let i = 0; i < n; i++) {
      const floor = H - 2 - i * SH, ceil = floor - SH, right = i % 2 === 0;
      const hole = right ? W - 6 : 3;
      fillRow(ceil, 1, W - 2, "#"); fillRow(ceil + 1, 1, W - 2, "#");
      fillRow(ceil, hole, hole + 2, gateAt.has(i) ? "G" : ".");
      fillRow(ceil + 1, hole, hole + 2, ".");
      // Landasan papan di bawah lubang, sekaligus tempat balok soal.
      const landing = ceil + 5;
      if (right) fillRow(landing, W - 20, W - 2, "="); else fillRow(landing, 1, 19, "=");
      // Pijakan dari lantai naik ke landasan.
      let r = floor - 4, k = 0;
      const crumbleAt = int(0, 1);
      while (r >= landing + 3) {
        x = Math.max(3, Math.min(W - 9, x + int(-6, 6)));
        const roll = k === crumbleAt ? 0 : rnd();
        if (roll < 0.34) fillRow(r, x, x + 4, "~");
        else if (roll < 0.5 && t.tier >= 1) fillRow(r, Math.max(1, x - 2), Math.min(W - 2, x + 6), "-");
        else if (roll < 0.72) { fillRow(r, x, x + 4, "#"); if (r - 1 > 0 && rnd() < 0.6) g[r - 1][x + 2] = poolEnemy[int(0, poolEnemy.length - 1)]; }
        else fillRow(r, x, x + 4, "=");
        if (g[r - 2][x + 1] === ".") g[r - 2][x + 1] = "*";
        r -= 4; k++;
      }
      // Langkah terakhir selalu dekat ujung landasan yang terbuka.
      const lastX = right ? Math.max(3, W - 26) : 21;
      fillRow(landing + 3, lastX, lastX + 4, "=");
      x = lastX;
      // Isi lantai: bintang, duri, per, kelelawar.
      const mid = int(9, W - 12);
      g[floor - 1][mid] = "*";
      if (t.tier >= 1) { g[floor - 1][mid + 3] = "^"; g[floor - 1][mid + 4] = "^"; }
      if (rnd() < 0.5) g[floor - 1][int(6, 8)] = "s";
      if (t.tier >= 2) g[floor - 6 - int(0, 2)][int(4, W - 5)] = "f";
      // Checkpoint di lantai atas, menjauh dari lubang.
      if (i < n - 1) g[ceil - 1][right ? hole - 4 : hole + 6] = "C";
    }
    const top = H - 2 - n * SH;
    const lastRight = (n - 1) % 2 === 0;
    g[top - 1][lastRight ? 8 : W - 9] = "K";
    g[top - 1][lastRight ? 4 : W - 5] = "E";
    return {
      id: t.id, nama: t.nama, tema: t.tema, tier: t.tier, tower: true, seed: t.seed, power: powerOf(t.id), par: t.storeys * 45,
      map: g.map((r) => r.join("")), inside: [], rooms: [], checkpoints: n - 1,
    };
  }

  // Menaruh musuh jalan setelah peta jadi, bukan di dalam chunk, supaya generator
  // tetap bersih dan level tier 0 tetap ramah untuk tutorial. Penempatan deterministik
  // dari seed: kolom datar (tanah 3 tile) yang jauh dari S/E/K/G/C. Tipe musuh dibuka
  // bertahap: tier 1 jalan, tier 2 + pelompat, tier 3 + penembak.
  function addEnemies(def, tier) {
    if (tier < 1) return def;
    // Kepadatan mengikuti panjang peta: sekitar satu musuh tiap 40 kolom, di level awal lebih jarang.
    const target = Math.max(tier + 1, Math.min(10, Math.round(def.map[0].length / (tier >= 2 ? 40 : 70))));
    const pool = (THEME_POOL[def.tema] || THEME_POOL.green).slice(0, tier + 2);
    const rows = def.map.map((r) => r.split(''));
    const H = rows.length, W = rows[0].length;
    const blocked = new Set();
    for (const ch of ['S', 'E', 'K', 'G', 'C', 'L']) {
      for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
          if (rows[r][c] !== ch) continue;
          // Daerah balok soal di depan gerbang dibiarkan tenang supaya anak bisa berhitung.
          const before = ch === 'G' ? 18 : ch === 'L' ? 18 : 2;
          for (let d = -before; d <= 2; d++) blocked.add(c + d);
        }
      }
    }
    const flat = (r, c) => r >= 0 && r + 1 < H && c > 0 && c + 1 < W &&
      rows[r][c] === '.' && rows[r][c - 1] === '.' && rows[r][c + 1] === '.' &&
      (r === 0 || rows[r - 1][c] === '.') &&
      rows[r + 1][c] === '#' && rows[r + 1][c - 1] === '#' && rows[r + 1][c + 1] === '#';
    const cands = [];
    for (let c = 8; c < W - 8; c++) {
      if (blocked.has(c)) continue;
      for (let r = 1; r < H - 1; r++) {
        if (flat(r, c)) { cands.push({ c, r }); break; }
      }
    }
    for (let i = 0; i < target && cands.length; i++) {
      const at = Math.floor((i + 0.5) * cands.length / target);
      const p = cands[at];
      if (!p) continue;
      const pick = pool[((p.c * 31 + def.seed * 7 + i * 13) >>> 0) % pool.length];
      rows[p.r][p.c] = pick;
    }
    return Object.assign({}, def, { map: rows.map((r) => r.join('')) });
  }

  // Arena boss: 27x15 tile supaya seluruhnya terlihat pada zoom 1.5 (scene.js). Lantai di
  // baris 10, jadi hero dan serangan selalu di atas tombol sentuh. Tanpa gerbang soal
  // (matematika hanya di platforming). `B` spawn boss; `E` aktif setelah boss kalah.
  const ARENA_W = 27, ARENA_H = 15, ARENA_FLOOR = 10;

  function makeArena(platforms) {
    const rows = Array.from({ length: ARENA_H }, () => Array(ARENA_W).fill('.'));
    for (let r = ARENA_FLOOR; r < ARENA_H; r++) for (let c = 0; c < ARENA_W; c++) rows[r][c] = '#';
    for (const [r, from, to] of platforms) for (let c = from; c <= to; c++) rows[r][c] = '=';
    rows[ARENA_FLOOR - 1][2] = 'S';
    rows[ARENA_FLOOR - 1][19] = 'B';
    rows[ARENA_FLOOR - 1][25] = 'E';
    return rows.map((r) => r.join(''));
  }

  // Dua platform lompat ganda sebagai tempat aman dari slam dan semburan lantai.
  const arenaBoss = () => makeArena([[6, 5, 9], [6, 17, 21]]);
  // Tengah dikosongkan supaya serudukan tampak jelas; platform dekat kedua dinding.
  const arenaBossRaja = () => makeArena([[6, 2, 6], [6, 20, 24]]);

  const BOSS = {
    id: 15, boss: true, nama: 'Lendir Kabut', tema: 'green', tier: 3, power: 1.2, seed: 9901,
    map: arenaBoss(), inside: [], rooms: [], checkpoints: 0,
    bossDef: Roster.lendirKabut,
  };

  const BOSS2 = {
    id: 16, boss: true, nama: 'Raja Goblin', tema: 'castle', tier: 3, seed: 9902,
    map: arenaBossRaja(), inside: [], rooms: [], checkpoints: 0,
    bossDef: Roster.rajaGoblin,
  };

  // Boss penutup tiap bab. Arena mengikuti mekanik khasnya.
  const arenaOf = (id) => ({
    dukun: () => makeArena([[6, 5, 9], [6, 17, 21]]),
    ayam: () => makeArena([[6, 3, 6], [6, 20, 23]]),
    spora: () => makeArena([[6, 11, 15]]),
    'goblin-merah': () => makeArena([[6, 11, 15]]),
    'lendir-malam': () => makeArena([[6, 4, 8], [6, 18, 22]]),
  })[id]();
  const CHAPTER_BOSSES = [
    { id: 30, def: Roster.dukun, tema: 'industrial', seed: 7301, power: 0.8 },
    { id: 31, def: Roster.ayam, tema: 'crystal', seed: 7302, power: 1.4 },
    { id: 32, def: Roster.spora, tema: 'hive', seed: 7303, power: 1.8 },
    { id: 33, def: Roster.goblinMerah, tema: 'day', seed: 7304, power: 2.3 },
    { id: 34, def: Roster.lendirMalam, tema: 'night', seed: 7305, power: 2.7 },
  ].map((c) => ({
    id: c.id, boss: true, nama: c.def.nama, tema: c.tema, tier: 3, power: c.power, seed: c.seed,
    map: arenaOf(c.def.id), inside: [], rooms: [], checkpoints: 0, bossDef: c.def, par: 180,
  }));

  const BOSSES = [BOSS, BOSS2].concat(CHAPTER_BOSSES);

  // Boss hasil generator: seed menentukan mekanisme, skin, tema arena, dan pola serangan.
  const GEN_ARENAS = [[[6, 5, 9], [6, 17, 21]], [[6, 11, 15]], [[6, 2, 6], [6, 20, 24]], [[6, 4, 8], [6, 18, 22]]];
  function genBoss(seed, difficulty, power) {
    const bossDef = BossGen.build({ seed, difficulty: difficulty || 2 });
    const level = {
      id: 17, boss: true, gen: true, nama: bossDef.nama, tema: bossDef.arenaTheme, tier: 3,
      seed: bossDef.seed, map: makeArena(GEN_ARENAS[bossDef.seed % GEN_ARENAS.length]), inside: [], rooms: [], checkpoints: 0, bossDef, par: 180,
    };
    if (power !== undefined) level.power = power;
    return level;
  }

  // Pemeriksa jalur untuk peta acak yang tidak pernah dicoba orang: dari S sampai K dan E harus ada
  // rangkaian pijakan dalam jangkauan lompat ganda. Sengaja longgar, tujuannya menolak jurang dan tembok
  // yang mustahil, bukan menilai tingkat kesulitan. Gerbang soal dianggap terbuka.
  const JUMP_UP = 6, JUMP_ACROSS = 8, SPRING_UP = 11, DASH_ACROSS = 16;
  function reachable(def) {
    const map = def.map, H = map.length, W = map[0].length;
    const air = (c, r) => r >= 0 && r < H && c >= 0 && c < W && map[r][c] !== '#';
    const floor = (c, r) => r >= 0 && r < H && '#=~-|'.includes(map[r][c]);
    const stand = (c, r) => air(c, r) && air(c, r - 1) && floor(c, r + 1);
    const key = (c, r) => r * W + c;
    let start = null;
    const goals = [];
    map.forEach((row, r) => {
      for (let c = 0; c < W; c++) {
        if (row[c] === 'S') start = { c, r };
        if (row[c] === 'E' || row[c] === 'K') goals.push(key(c, r));
      }
    });
    if (!start) return false;
    // Tembok penuh di antara dua kolom tidak bisa dilewati, setinggi apa pun lompatannya.
    const open = (a, b, r0, r1) => {
      for (let c = Math.min(a, b) + 1; c < Math.max(a, b); c++) {
        let any = false;
        for (let r = Math.max(0, Math.min(r0, r1) - JUMP_UP); r <= Math.max(r0, r1) && !any; r++) any = air(c, r) && air(c, r - 1);
        if (!any) return false;
      }
      return true;
    };
    // Pintu ajaib: mulut dan ujung berpasangan menurut urutan kolom, sama seperti Mech.linkDoors.
    const ins = [], outs = [];
    map.forEach((row, r) => { for (let c = 0; c < W; c++) { if (row[c] === '(') ins.push({ c, r }); else if (row[c] === ')') outs.push({ c, r }); } });
    ins.sort((a, b) => a.c - b.c); outs.sort((a, b) => a.c - b.c);
    const link = new Map();
    for (let i = 0; i < Math.min(ins.length, outs.length); i++) { link.set(key(ins[i].c, ins[i].r), outs[i]); link.set(key(outs[i].c, outs[i].r), ins[i]); }
    const seen = new Set([key(start.c, start.r)]);
    const queue = [start];
    while (queue.length) {
      const { c, r } = queue.pop();
      const ch = map[r][c];
      const via = link.get(key(c, r));
      if (via && !seen.has(key(via.c, via.r))) { seen.add(key(via.c, via.r)); queue.push(via); }
      const upMax = ch === 's' ? SPRING_UP : JUMP_UP;
      const reachUp = (up) => JUMP_ACROSS - Math.floor(Math.max(0, up) / 2);
      for (let r2 = Math.max(1, r - upMax); r2 < H - 1; r2++) {
        const up = r - r2;
        const across = up >= 0 ? reachUp(up) : JUMP_ACROSS + Math.min(8, -up);
        const left = ch === '<' ? DASH_ACROSS : across, right = ch === '>' ? DASH_ACROSS : across;
        for (let c2 = Math.max(0, c - left); c2 <= Math.min(W - 1, c + right); c2++) {
          const k = key(c2, r2);
          if (seen.has(k) || !stand(c2, r2) || !open(c, c2, r, r2)) continue;
          seen.add(k);
          queue.push({ c: c2, r: r2 });
        }
      }
    }
    return goals.length > 0 && goals.every((k) => seen.has(k));
  }

  const TEMA_ACAK = Object.keys(THEME_POOL);
  const TEMPAT = {
    green: ['Hutan Rimbun', 'Padang Hijau', 'Lembah Angin'],
    industrial: ['Pabrik Bising', 'Gudang Besi', 'Pipa Panjang'],
    simple: ['Bukit Pelangi', 'Padang Ceria', 'Tanjakan Riang'],
    night: ['Gang Bulan', 'Atap Malam', 'Kota Tidur'],
    crystal: ['Gua Berkilau', 'Lubang Kristal', 'Terowongan Biru'],
    hive: ['Sarang Hangat', 'Lorong Akar', 'Rongga Spora'],
    day: ['Jalan Ramai', 'Pasar Siang', 'Alun-Alun Kota'],
    castle: ['Lorong Benteng', 'Menara Tua', 'Aula Batu'],
  };

  function buildAcak(seed, tier, power) {
    let s = seed >>> 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    rnd(); rnd();
    const tema = TEMA_ACAK[Math.floor(rnd() * TEMA_ACAK.length)];
    const list = TEMPAT[tema];
    const nama = list[Math.floor(rnd() * list.length)];
    if (rnd() < 0.25) {
      const t = buildTower({ id: 35, nama: 'Menara ' + nama.split(' ').pop(), tema, tier, seed, storeys: 3 + tier });
      return Object.assign(t, { power });
    }
    const sec = 50 + Math.floor(rnd() * 36);
    const wantMini = tier >= 2 && rnd() < 0.6;
    const miniId = rnd() < 0.5 ? 5 : 3;
    const def = Gen.generate({ seed, tier, tema, mech: [], intro: [], sec });
    const level = {
      id: 35, nama, tema, tier, seed, power, par: sec * 3,
      map: def.map, inside: def.inside, rooms: def.rooms, checkpoints: def.checkpoints,
    };
    const gated = addGates(level);
    const pm = { id: seed % 6, seed, tier };
    return addEnemies(addDoors(addMech(wantMini ? addMiniBoss(gated, miniId) : gated, pm), pm), tier);
  }

  // Seed menentukan tema, bentuk, dan isi. Tingkat dan kekuatan mengikuti perkembangan pemain.
  // Peta yang gagal diperiksa diganti turunan seed yang sama, jadi seed tetap deterministik.
  function genLevel(seed, opts) {
    opts = opts || {};
    const shown = (seed >>> 0) || 1;
    const tier = Math.max(1, Math.min(3, opts.tier || 2));
    const power = opts.power === undefined ? tier : opts.power;
    for (let i = 0; i < 40; i++) {
      const s = (shown + i * 7919) >>> 0;
      let def = null;
      try { def = buildAcak(s, tier, power); } catch (e) { def = null; }
      if (def && !validate(def).length && reachable(def)) return Object.assign(def, { seed: shown, acak: true });
    }
    return Object.assign({}, LEVELS[1], { id: 35, seed: shown, acak: true, power });
  }

  const ALL = LEVELS.concat(BOSSES, [genBoss(9903), genLevel(9904)]);

  function validateBoss(def) {
    const bad = [];
    const map = def && def.map;
    if (!Array.isArray(map) || !map.length) return ['peta boss kosong'];
    const W = map[0].length;
    map.forEach((row, r) => { if (row.length !== W) bad.push(`baris boss ${r} panjang ${row.length}, harus ${W}`); });
    const count = (ch) => map.reduce((n, row) => n + row.split(ch).length - 1, 0);
    if (count('S') !== 1) bad.push('boss butuh tepat 1 S');
    if (count('E') !== 1) bad.push('boss butuh tepat 1 E');
    if (count('B') !== 1) bad.push('boss butuh tepat 1 B');
    if (!def.bossDef || !def.bossDef.id) bad.push('bossDef wajib');
    return bad;
  }

  return {
    PLAN, LEVELS, BOSS, BOSS2, BOSSES, ALL, genBoss, genLevel, reachable,
    level: (id) => LEVELS.find((l) => l.id === id) || LEVELS[0],
    validate, validateBoss, generate: Gen.generate,
  };
});
