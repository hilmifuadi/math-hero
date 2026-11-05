// Menyiapkan visual platformer MH4 ke public/assets/mh4/v2/world, satu gaya untuk semua tema.
//   node scripts/prepare_world_mh4.js "<folder berisi paket hasil ekstrak>"
// Tanah memakai tekstur batu Pixel Crawler yang diwarnai per tema. Latar berlapis digambar kode
// pada ukuran 320x180 supaya kepadatan pikselnya sama dengan hero di zoom 2. Dekor dipotong dari
// paket yang sudah dipakai markas. Tanpa dependensi.
const fs = require('fs'), path = require('path');
const P = require('./pngtool.js');

const SRC = process.argv[2];
const OUT = path.join(__dirname, '..', 'public', 'assets', 'mh4', 'v2', 'world');
if (!SRC || !fs.existsSync(SRC)) { console.error('Folder sumber tidak ada: ' + SRC); process.exit(1); }
const ALL = [];
(function walk(d) { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk(p); else ALL.push(p); } })(SRC);
function find(tail) {
  const t = path.sep + tail.split('/').join(path.sep);
  const hit = ALL.find((f) => f.endsWith(t));
  if (!hit) { console.error('Berkas tidak ditemukan: ' + tail); process.exit(1); }
  return hit;
}
function save(img, rel) {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  P.encode(img, f);
}
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
const OUTLINE = hex('#1c1426');

function put(im, x, y, c) {
  if (x < 0 || y < 0 || x >= im.w || y >= im.h) return;
  const o = (y * im.w + x) * 4;
  im.data[o] = c[0]; im.data[o + 1] = c[1]; im.data[o + 2] = c[2]; im.data[o + 3] = c.length > 3 ? c[3] : 255;
}
const rect = (im, x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) put(im, i, j, c); };
function crop(src, x, y, w, h) {
  const out = P.blank(w, h);
  for (let r = 0; r < h; r++) src.data.copy(out.data, r * w * 4, ((y + r) * src.w + x) * 4, ((y + r) * src.w + x + w) * 4);
  return out;
}
function shade(img, m) {
  const out = { w: img.w, h: img.h, data: Buffer.from(img.data) };
  for (let i = 0; i < out.data.length; i += 4) for (let c = 0; c < 3; c++) out.data[i + c] = Math.min(255, Math.round(out.data[i + c] * m[c]));
  return out;
}
// Kotak batu berlekuk untuk bata dan balok benteng, dengan sudut bulat seperti tekstur batu.
function blocks(light, mid, dark, line, bw, bh) {
  const im = P.blank(48, 48);
  rect(im, 0, 0, 48, 48, hex(line));
  for (let row = 0; row * bh < 48; row++) {
    const shift = row % 2 ? Math.floor(bw / 2) : 0;
    for (let k = -1; k * bw < 48; k++) {
      const x0 = k * bw + shift, y0 = row * bh;
      for (let y = 0; y < bh - 1; y++) {
        for (let x = 0; x < bw - 1; x++) {
          const corner = (x === 0 || x === bw - 2) && (y === 0 || y === bh - 2);
          if (corner) continue;
          const c = y === 0 ? light : (y >= bh - 3 || x >= bw - 3) ? dark : mid;
          put(im, (x0 + x + 48) % 48, y0 + y, hex(c));
        }
      }
    }
  }
  return im;
}

// Tutup tanah, lima kolom: tiga variasi, ujung kiri, ujung kanan. Permukaan rata di baris atas.
function capSheet(st) {
  const im = P.blank(80, 16);
  const LOW = [[6, 5, 7, 6, 5, 6, 8, 6, 5, 7, 6, 5, 6, 7, 5, 6], [5, 7, 6, 5, 8, 6, 5, 6, 7, 5, 6, 8, 5, 6, 7, 5], [7, 5, 6, 8, 6, 5, 7, 5, 6, 6, 8, 5, 7, 6, 5, 6]];
  for (let v = 0; v < 5; v++) {
    const prof = LOW[v % 3];
    for (let x = 0; x < 16; x++) {
      const h = st.kind === 'grass' || st.kind === 'moss' ? prof[x] : st.h || 6;
      const seam = (st.kind === 'plank' && (x + v * 5) % 8 === 7) || (st.kind === 'stone' && (x + v * 4) % 8 === 7);
      for (let y = 0; y < h; y++) {
        let c = st.mid;
        if (y === 0) c = OUTLINE;
        else if (y === 1) c = st.light;
        else if (y >= h - 2) c = st.dark;
        if (seam && y > 0) c = st.dark;
        if (st.kind === 'plank' && y === 3 && (x + v * 5) % 8 === 1) c = st.dark;
        if (st.kind === 'roof') {
          const scale = (x + (y > 3 ? 4 : 0)) % 8;
          if (y === 3 || y === 7 || (scale === 0 && y > 0)) c = st.dark;
        }
        put(im, v * 16 + x, y, c);
      }
      put(im, v * 16 + x, h, OUTLINE);
      // Helai rumput dan kilau kristal kecil sebagai variasi.
      if (st.kind === 'grass' && (x * 7 + v * 3) % 11 === 0) put(im, v * 16 + x, 2, st.light);
      if (st.spark && (x * 5 + v * 7) % 13 === 0) { put(im, v * 16 + x, 2, st.spark); put(im, v * 16 + x, 3, st.spark); }
    }
  }
  // Ujung: sudut dipotong dan diberi garis tepi.
  for (let y = 0; y < 8; y++) {
    if (im.data[((y * im.w + 48) * 4) + 3]) put(im, 48, y, OUTLINE);
    if (im.data[((y * im.w + 79) * 4) + 3]) put(im, 79, y, OUTLINE);
  }
  put(im, 48, 0, [0, 0, 0, 0]); put(im, 79, 0, [0, 0, 0, 0]);
  put(im, 49, 1, OUTLINE); put(im, 78, 1, OUTLINE);
  return im;
}

// Platform tembus: kiri, tengah, kanan. Papan tipis dengan penyangga kecil.
function platformSheet(st) {
  const im = P.blank(48, 16);
  for (let i = 0; i < 3; i++) {
    const x0 = i * 16;
    rect(im, x0, 0, 16, 7, OUTLINE);
    rect(im, x0, 1, 16, 1, st.light);
    rect(im, x0, 2, 16, 3, st.mid);
    rect(im, x0, 5, 16, 1, st.dark);
    for (const s of [3, 11]) rect(im, x0 + s, 1, 1, 5, st.dark);
    put(im, x0 + 7, 3, st.dark);
  }
  rect(im, 0, 1, 1, 5, OUTLINE); rect(im, 47, 1, 1, 5, OUTLINE);
  put(im, 0, 0, [0, 0, 0, 0]); put(im, 47, 0, [0, 0, 0, 0]); put(im, 0, 6, [0, 0, 0, 0]); put(im, 47, 6, [0, 0, 0, 0]);
  for (const x of [5, 42]) { rect(im, x - 1, 7, 4, 3, OUTLINE); rect(im, x, 7, 2, 2, st.dark); }
  return im;
}

// ===== Latar =====
const W = 320, H = 180;
// Tanah menutup separuh bawah layar, jadi bukit dan bangunan dinaikkan supaya tetap terlihat.
const RAISE = 38;
function rnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
// Garis punggung bukit yang menyambung di ujung gambar.
function wave(seed, parts) {
  const r = rnd(seed), list = parts.map(([k, a]) => [k, a, r() * Math.PI * 2]);
  return (x) => list.reduce((s, [k, a, p]) => s + a * Math.sin((x / W) * Math.PI * 2 * k + p), 0);
}
function ridge(im, base, f, c, edge) {
  for (let x = 0; x < W; x++) {
    const top = Math.round(base - RAISE + f(x));
    for (let y = Math.max(0, top); y < H; y++) put(im, x, y, y === top && edge ? edge : c);
  }
}
function wrapCircle(im, cx, cy, r, c) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.5) put(im, ((cx + x) % W + W) % W, cy + y, c);
}
function trees(im, seed, n, baseF, base, rMin, rMax, dark, light, pine) {
  const r = rnd(seed);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r() * W), y0 = Math.round(base - RAISE + baseF(x)), rad = rMin + Math.floor(r() * (rMax - rMin + 1));
    if (pine) {
      for (let k = 0; k < rad * 3; k++) {
        const hw = Math.floor(k / 2) - (k % 6 > 3 ? 1 : 0);
        for (let i2 = -hw; i2 <= hw; i2++) put(im, ((x + i2) % W + W) % W, y0 - rad * 3 + k, i2 < 0 ? light : dark);
      }
    } else {
      rect(im, x, y0 - rad, 2, rad + 2, dark);
      wrapCircle(im, x, y0 - rad - 2, rad, dark);
      wrapCircle(im, x - 1, y0 - rad - 3, rad - 2, light);
    }
  }
}
function clouds(im, seed, n, yMin, yMax, c, shadow) {
  const r = rnd(seed);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r() * W), y = yMin + Math.floor(r() * (yMax - yMin)), w = 3 + Math.floor(r() * 3);
    for (let k = 0; k < w; k++) {
      const rad = 3 + ((k * 7 + i) % 4);
      wrapCircle(im, x + k * 5, y + 1, rad, shadow);
      wrapCircle(im, x + k * 5, y, rad, c);
    }
    rect(im, Math.max(0, x - 2), y + 4, 0, 0, c);
  }
}
function house(im, x, ground, w, h, wall, roof, win) {
  const wrap = (a) => (a % W + W) % W;
  for (let j = ground - h; j < H; j++) for (let i = 0; i < w; i++) put(im, wrap(x + i), j, wall);
  const rh = Math.ceil(w / 2) + 1;
  for (let k = 0; k < rh; k++) for (let i = -1 + k; i <= w - k; i++) put(im, wrap(x + i), ground - h - 1 - k, roof);
  if (win) for (let j = ground - h + 3; j < ground - 3; j += 7) for (let i = 2; i < w - 2; i += 6) rect(im, wrap(x + i), j, 2, 3, win);
}
function row(im, seed, groundY, wall, roof, win, minH, maxH) {
  const ground = groundY - RAISE;
  const r = rnd(seed);
  let x = 0;
  while (x < W) {
    const w = 12 + Math.floor(r() * 12), h = minH + Math.floor(r() * (maxH - minH));
    house(im, x, ground, w, h, wall, roof, r() > 0.25 ? win : null);
    x += w + 1 + Math.floor(r() * 4);
  }
}
function stalactites(im, seed, n, c, light, fromTop, maxLen) {
  const r = rnd(seed);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r() * W), len = 6 + Math.floor(r() * maxLen), hw = 2 + Math.floor(len / 8);
    for (let k = 0; k < len; k++) {
      const half = Math.round(hw * (1 - k / len));
      const y = fromTop ? k : H - 1 - k;
      for (let j = -half; j <= half; j++) put(im, ((x + j) % W + W) % W, y, j < 0 ? light : c);
    }
  }
}
function crystals(im, seed, n, f, base, c, light) {
  const r = rnd(seed);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r() * W), y0 = Math.round(base - RAISE + f(x)), len = 8 + Math.floor(r() * 12);
    for (let k = 0; k < len; k++) {
      const half = Math.min(3, Math.round((len - k) / 3));
      for (let j = -half; j <= half; j++) put(im, ((x + j) % W + W) % W, y0 - k, j <= 0 ? light : c);
    }
  }
}
function sky(bands) {
  const im = P.blank(W, H);
  let y = 0;
  for (const [h, c] of bands) { rect(im, 0, y, W, h, hex(c)); y += h; }
  rect(im, 0, y, W, H - y, hex(bands[bands.length - 1][1]));
  return im;
}
const BG = {
  green(L) {
    const s = sky([[50, '#7fc8ee'], [28, '#98d6f0'], [22, '#b2e2f2'], [20, '#cdeef0']]);
    const c = P.blank(W, H); clouds(c, 11, 7, 12, 58, hex('#f4fbff'), hex('#d6ecf6'));
    const far = P.blank(W, H), fa = wave(3, [[2, 10], [5, 4]]); ridge(far, 100, fa, hex('#9cc9c8'), hex('#b0d8d2'));
    const mid = P.blank(W, H), fb = wave(5, [[3, 7], [7, 3]]);
    ridge(mid, 118, fb, hex('#79b98a'), hex('#8fcb96'));
    trees(mid, 31, 22, fb, 118, 5, 8, hex('#5f9f7b'), hex('#72b184'));
    const near = P.blank(W, H), fc = wave(9, [[4, 5], [9, 2]]);
    ridge(near, 142, fc, hex('#5c9c62'), hex('#6fae6c'));
    trees(near, 77, 12, fc, 142, 7, 11, hex('#4b8a58'), hex('#5e9f63'));
    L({ s, c, far, mid, near });
  },
  simple(L) {
    const s = sky([[44, '#ffcf9e'], [30, '#ffdcae'], [26, '#ffe8bf'], [24, '#fff1cf']]);
    const c = P.blank(W, H); clouds(c, 21, 5, 14, 60, hex('#fff6e6'), hex('#ffe0c0'));
    const far = P.blank(W, H), fa = wave(13, [[2, 8], [3, 6]]); ridge(far, 104, fa, hex('#e2b58f'), hex('#ecc49c'));
    const mid = P.blank(W, H), fb = wave(15, [[3, 8], [6, 3]]);
    ridge(mid, 122, fb, hex('#bfae74'), hex('#cfbd7f'));
    trees(mid, 41, 16, fb, 122, 3, 5, hex('#8d9a5f'), hex('#a0ac69'), true);
    const near = P.blank(W, H), fc = wave(19, [[2, 6], [5, 3]]);
    ridge(near, 146, fc, hex('#9aa55f'), hex('#adb76a'));
    trees(near, 81, 9, fc, 146, 6, 9, hex('#7f9455'), hex('#92a55f'));
    L({ s, c, far, mid, near });
  },
  industrial(L) {
    const s = sky([[50, '#b9a68f'], [30, '#c6b59b'], [24, '#d3c3a7'], [20, '#dccfb4']]);
    const c = P.blank(W, H); clouds(c, 33, 6, 8, 46, hex('#a7978a'), hex('#958679'));
    const far = P.blank(W, H);
    row(far, 51, 130, hex('#a4988a'), hex('#94887c'), null, 16, 44);
    for (const x of [40, 130, 215, 290]) rect(far, x, 20, 7, 90, hex('#94887c'));
    const mid = P.blank(W, H);
    row(mid, 53, 150, hex('#807468'), hex('#6d6259'), hex('#caa45c'), 14, 34);
    const near = P.blank(W, H);
    for (let x = 0; x < W; x += 44) { rect(near, x, 90, 3, 90, hex('#5a4d44')); rect(near, x + 3, 100, 41, 2, hex('#5a4d44')); }
    L({ s, c, far, mid, near });
  },
  night(L) {
    const s = sky([[46, '#141a38'], [30, '#1b2348'], [26, '#242d58'], [20, '#2f3866']]);
    const r = rnd(61);
    for (let i = 0; i < 90; i++) put(s, Math.floor(r() * W), Math.floor(r() * 100), hex(i % 5 ? '#8c98c8' : '#f4f2d0'));
    wrapCircle(s, 250, 34, 13, hex('#f1e9c2')); wrapCircle(s, 255, 31, 11, hex('#fbf5da'));
    const far = P.blank(W, H); row(far, 63, 134, hex('#2c3560'), hex('#262e55'), null, 12, 40);
    const mid = P.blank(W, H); row(mid, 65, 152, hex('#222a4d'), hex('#1c2342'), hex('#e5b860'), 12, 36);
    const near = P.blank(W, H); row(near, 67, 172, hex('#171d38'), hex('#12172e'), hex('#d09a4c'), 14, 28);
    L({ s, far, mid, near });
  },
  crystal(L) {
    const s = sky([[50, '#121a2e'], [50, '#162238'], [40, '#1a2942']]);
    const far = P.blank(W, H), fa = wave(71, [[3, 8], [8, 3]]); ridge(far, 118, fa, hex('#1f3148'), hex('#27405a'));
    stalactites(far, 73, 26, hex('#1f3148'), hex('#27405a'), true, 30);
    crystals(far, 75, 14, fa, 118, hex('#2f6f8e'), hex('#3f90ad'));
    const mid = P.blank(W, H), fb = wave(77, [[4, 7], [9, 3]]); ridge(mid, 138, fb, hex('#182638'), hex('#21344a'));
    stalactites(mid, 79, 16, hex('#182638'), hex('#21344a'), true, 44);
    crystals(mid, 81, 12, fb, 138, hex('#3f8fb0'), hex('#65c3d8'));
    const near = P.blank(W, H), fc = wave(83, [[2, 5], [7, 3]]); ridge(near, 160, fc, hex('#101a29'), hex('#172435'));
    L({ s, far, mid, near });
  },
  hive(L) {
    const s = sky([[60, '#22122a'], [50, '#2a1632'], [40, '#311a38']]);
    const r = rnd(91);
    for (let i = 0; i < 46; i++) put(s, Math.floor(r() * W), Math.floor(r() * H), hex('#7fae55'));
    const far = P.blank(W, H), fa = wave(93, [[3, 9], [7, 3]]); ridge(far, 112, fa, hex('#3a2040'), hex('#47284c'));
    stalactites(far, 95, 22, hex('#3a2040'), hex('#47284c'), true, 34);
    const mid = P.blank(W, H), fb = wave(97, [[4, 8], [6, 4]]); ridge(mid, 134, fb, hex('#2d1934'), hex('#3a2140'));
    stalactites(mid, 99, 12, hex('#2d1934'), hex('#3a2140'), true, 52);
    trees(mid, 101, 10, fb, 134, 4, 7, hex('#3e5c38'), hex('#527a44'));
    const near = P.blank(W, H), fc = wave(103, [[2, 6], [5, 3]]); ridge(near, 158, fc, hex('#1f1226'), hex('#2a1832'));
    L({ s, far, mid, near });
  },
  day(L) {
    const s = sky([[50, '#8ed0f0'], [30, '#a6dcf2'], [24, '#c0e7f2'], [20, '#d9f0ef']]);
    const c = P.blank(W, H); clouds(c, 111, 6, 10, 56, hex('#ffffff'), hex('#dcecf4'));
    const far = P.blank(W, H); row(far, 113, 128, hex('#bcd2d8'), hex('#a9c3cc'), null, 14, 46);
    const mid = P.blank(W, H); row(mid, 115, 150, hex('#d8c3a5'), hex('#c78469'), hex('#8a6f62'), 12, 38);
    const near = P.blank(W, H); row(near, 117, 172, hex('#c2a988'), hex('#ad6450'), hex('#6e564c'), 14, 28);
    L({ s, c, far, mid, near });
  },
  castle(L) {
    const s = sky([[44, '#241d33'], [44, '#2a223b'], [50, '#312843']]);
    // Dinding balok jauh.
    const far = P.blank(W, H);
    for (let y = 0; y < H; y += 12) for (let x = (y / 12) % 2 ? 0 : 10; x < W; x += 20) { rect(far, x, y, 1, 12, hex('#2b233b')); }
    for (let y = 0; y < H; y += 12) rect(far, 0, y, W, 1, hex('#2b233b'));
    const mid = P.blank(W, H);
    for (let x = 0; x < W; x += 80) {
      rect(mid, x, 0, 16, H, hex('#3a3050')); rect(mid, x, 0, 3, H, hex('#463b5e')); rect(mid, x + 13, 0, 3, H, hex('#30274a'));
      // Lengkung di antara pilar.
      for (let i = 16; i < 80; i++) {
        const t = (i - 48) / 32, y = Math.round(36 - Math.sqrt(Math.max(0, 1 - t * t)) * 26);
        for (let j = 0; j < y; j++) put(mid, x + i, j, hex('#3a3050'));
        put(mid, x + i, y, hex('#463b5e'));
      }
      // Panji dan cahaya obor.
      rect(mid, x + 44, 44, 8, 26, hex('#8b3a4c')); rect(mid, x + 44, 44, 2, 26, hex('#a34a5a'));
      for (let i = 0; i < 4; i++) rect(mid, x + 44 + i, 70 + i, 8 - 2 * i, 1, hex('#8b3a4c'));
    }
    const near = P.blank(W, H);
    rect(near, 0, 120, W, 60, hex('#231b2e'));
    for (let x = 0; x < W; x += 24) rect(near, x, 120, 1, 60, hex('#1b1524'));
    L({ s, far, mid, near });
  },
};

// ===== Benda =====
const OBJ_PAL = {
  '.': [0, 0, 0, 0], o: hex('#3a1e0c'), Y: hex('#ffd84a'), y: hex('#e8a320'), W: hex('#fff3b0'),
};
function ascii(rows, pal) {
  const im = P.blank(rows[0].length, rows.length);
  rows.forEach((r, y) => [...r].forEach((ch, x) => put(im, x, y, pal[ch] || pal['.'])));
  return im;
}
function spike() {
  const im = P.blank(16, 16);
  const white = hex('#eef2f6'), gray = hex('#a7b2c0'), red = hex('#e0463e');
  for (const cx of [2, 8, 13]) {
    for (let k = 0; k < 11; k++) {
      const half = Math.floor(k / 3) + (k > 8 ? 0 : 0);
      for (let j = -half - 1; j <= half + 1; j++) put(im, cx + j, 5 + k, OUTLINE);
      for (let j = -half; j <= half; j++) put(im, cx + j, 5 + k, k < 3 ? red : j > 0 ? gray : white);
    }
    put(im, cx, 4, OUTLINE);
  }
  rect(im, 0, 15, 16, 1, OUTLINE);
  return im;
}
function star() {
  const a = ['.....o.....', '....oWo....', '....oYo....', 'oooooYooooo', 'oWYYYYYYyyo', '.oYYYYYyyo.', '..oYYYyyo..', '.oYYYoyyyo.', '.oYYo.oyyo.', 'oYoo...ooyo', 'ooo.....ooo'];
  const im = P.blank(44, 11);
  for (let f = 0; f < 4; f++) {
    const shine = f === 1 ? 'W' : f === 2 ? 'Y' : null;
    a.forEach((r, y) => [...r].forEach((ch, x) => {
      if (ch === '.') return;
      put(im, f * 11 + x, y, OBJ_PAL[shine && ch === 'Y' && (x + y) % 5 === f ? shine : ch]);
    }));
  }
  return im;
}
function flag() {
  // Dua keadaan (baris) dan dua bingkai berkibar (kolom), kaki di tepi bawah.
  const im = P.blank(32, 56);
  for (let st = 0; st < 2; st++) {
    const [lt, dk] = st ? [hex('#6fe08f'), hex('#2f9f62')] : [hex('#b6bfc8'), hex('#7d8894')];
    for (let f = 0; f < 2; f++) {
      const x0 = f * 16, y0 = st * 28;
      rect(im, x0 + 2, y0 + 2, 4, 26, OUTLINE);
      rect(im, x0 + 3, y0 + 3, 2, 25, hex('#a8733f'));
      rect(im, x0 + 1, y0 + 26, 6, 2, OUTLINE);
      for (let x = 0; x < 10; x++) {
        const wob = f ? (x % 4 > 1 ? 1 : 0) : (x % 4 < 2 ? 1 : 0);
        const half = Math.max(1, 5 - Math.floor(x / 2));
        const cy = y0 + 8 + wob;
        for (let y = -half - 1; y <= half + 1; y++) put(im, x0 + 5 + x, cy + y, OUTLINE);
        for (let y = -half; y <= half; y++) put(im, x0 + 5 + x, cy + y, y > 0 ? dk : lt);
      }
    }
  }
  return im;
}
function portal() {
  // Baris 0 terbuka dengan empat bingkai pusaran, baris 1 terkunci. Tiap sel 32x40.
  const im = P.blank(128, 80);
  for (let st = 0; st < 2; st++) {
    for (let f = 0; f < 4; f++) {
      const x0 = f * 32, y0 = st * 40, cx = 16, cy = 16;
      for (let y = 0; y < 40; y++) {
        for (let x = 0; x < 32; x++) {
          const inside = (rx) => (y >= cy ? Math.abs(x - cx + 0.5) <= rx : Math.hypot(x - cx + 0.5, y - cy) <= rx);
          if (!inside(15.5)) continue;
          let c = OUTLINE;
          if (inside(14.5)) {
            const seam = (Math.floor(y / 5) + (x < cx ? 0 : 1)) % 2 === 0 && y % 5 === 0;
            c = hex(seam ? '#6a6a80' : x < cx - 8 ? '#a6a6ba' : '#8a8aa0');
          }
          if (inside(10.5)) c = OUTLINE;
          if (inside(9.5)) {
            if (st) c = hex('#2a2a38');
            else {
              const a = Math.atan2(y - cy, x - cx + 0.5), d = Math.hypot(x - cx + 0.5, y - cy);
              const band = Math.floor((a / (Math.PI * 2) + d / 18 + f / 4) * 4 + 8) % 2;
              c = hex(band ? '#6fd8ff' : d < 5 ? '#e6fbff' : '#3f8fe0');
            }
          }
          put(im, x0 + x, y0 + y, c);
        }
      }
      rect(im, x0 + 1, y0 + 37, 30, 3, OUTLINE);
      rect(im, x0 + 2, y0 + 37, 28, 2, hex('#a6a6ba'));
      if (st) {
        rect(im, x0 + 12, y0 + 22, 8, 7, OUTLINE); rect(im, x0 + 13, y0 + 23, 6, 5, hex('#e6c35a'));
        rect(im, x0 + 13, y0 + 17, 6, 1, OUTLINE); rect(im, x0 + 13, y0 + 17, 1, 5, OUTLINE); rect(im, x0 + 18, y0 + 17, 1, 5, OUTLINE);
      }
    }
  }
  return im;
}
function gate() {
  const im = P.blank(16, 16);
  rect(im, 1, 0, 14, 16, OUTLINE);
  for (const [x, w] of [[2, 3], [6, 3], [10, 4]]) {
    rect(im, x, 0, w, 16, hex('#9a6636'));
    rect(im, x, 0, 1, 16, hex('#c08a4e'));
    rect(im, x + w - 1, 0, 1, 16, hex('#6f4522'));
  }
  rect(im, 1, 3, 14, 2, hex('#4a4a58')); rect(im, 1, 11, 14, 2, hex('#4a4a58'));
  rect(im, 1, 3, 14, 1, hex('#7a7a8c')); rect(im, 1, 11, 14, 1, hex('#7a7a8c'));
  return im;
}

// Kunci besi jalan mini boss.
function lock() {
  const im = P.blank(16, 16);
  rect(im, 1, 0, 14, 16, OUTLINE);
  for (const x of [2, 6, 10]) { rect(im, x, 0, 3, 16, hex('#7a7a8c')); rect(im, x, 0, 1, 16, hex('#a6a6ba')); }
  rect(im, 1, 6, 14, 3, hex('#4a4a58'));
  rect(im, 6, 5, 4, 5, hex('#e6c35a'));
  return im;
}
// Per: dua bingkai, diam dan terhentak.
function spring() {
  const im = P.blank(32, 16);
  for (let f = 0; f < 2; f++) {
    const x0 = f * 16, top = f ? 4 : 9;
    rect(im, x0 + 1, top - 2, 14, 4, OUTLINE); rect(im, x0 + 2, top - 1, 12, 2, hex('#e0463e'));
    for (let y = top + 2; y < 14; y += 2) { rect(im, x0 + 4, y, 8, 1, hex('#a7b2c0')); rect(im, x0 + 4, y + 1, 8, 1, OUTLINE); }
    rect(im, x0 + 2, 14, 12, 2, OUTLINE);
  }
  return im;
}
// Mulut terowongan: masuk (gelap) dan keluar (bercahaya).
function pipe() {
  const im = P.blank(40, 24);
  for (let f = 0; f < 2; f++) {
    const x0 = f * 20;
    for (let y = 0; y < 24; y++) for (let x = 0; x < 20; x++) {
      const dy = Math.max(0, 10 - y), d = Math.hypot(x - 9.5, dy);
      if (d <= 9.5) put(im, x0 + x, y, d > 8.5 ? OUTLINE : d > 6 ? hex(x < 9 ? '#a6a6ba' : '#7d7d92') : d > 5 ? OUTLINE : hex(f ? '#6fd8ff' : '#120c1c'));
    }
  }
  return im;
}
// Pad lari: dua bingkai panah.
function dash() {
  const im = P.blank(32, 16);
  for (let f = 0; f < 2; f++) {
    const x0 = f * 16 + f;
    for (let i = 0; i < 2; i++) {
      for (let k = 0; k < 5; k++) {
        put(im, x0 + 1 + i * 6 + k, 3 + k, OUTLINE); put(im, x0 + 1 + i * 6 + k, 11 - k, OUTLINE);
        put(im, x0 + 2 + i * 6 + k, 3 + k, hex('#ffd84a')); put(im, x0 + 2 + i * 6 + k, 11 - k, hex('#ffd84a'));
      }
    }
  }
  return im;
}
// Gergaji: dua bingkai berputar.
function saw() {
  const im = P.blank(32, 16);
  for (let f = 0; f < 2; f++) {
    const x0 = f * 16;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x - 7.5, dy = y - 7.5, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx) + f * 0.39;
      const tooth = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 16) % 2 === 0;
      const R = tooth ? 7.8 : 6.2;
      if (d <= R) put(im, x0 + x, y, d > R - 1 ? OUTLINE : d < 2 ? hex('#3a3a48') : hex(dx + dy < 0 ? '#e6ecf2' : '#a7b2c0'));
    }
  }
  return im;
}

// Senjata setara kepadatan piksel hero. Sel 20x28, urutan sama dengan icon di weapons.js.
const WPAL = {
  o: OUTLINE, S: hex('#eef2f6'), s: hex('#a7b2c0'), K: hex('#4a4a58'), M: hex('#8a8a9e'), G: hex('#ffd84a'), g: hex('#c98f22'),
  W: hex('#a8733f'), w: hex('#6f4522'), B: hex('#3f8fe0'), C: hex('#6fd8ff'), c: hex('#2f8fc0'), R: hex('#e0463e'), r: hex('#9c2c2c'),
  P: hex('#a06fe8'), p: hex('#6a3fb0'),
};
const WEAPON_ROWS = [
  ['...o...', '..oSo..', '..oSso.', '..oSso.', '..oSso.', '..oSso.', '..oSso.', '..oSso.', '..oSso.', '..oSso.', '..oSso.', '..oSso.', 'oGGBGGo', 'ooooooo', '..oWo..', '..oWo..', '..owo..', '..oGo..', '...o...'],
  ['...o...', '..oSo..', '.oSSso.', '.oSSso.', '..oSso.', '..oso..', '..oKo..', '.oRRRo.', '.oRrRo.', '..oWo..', '..oWo..', '..owo..', '..oWo..', '..oWo..', '..owo..', '..oWo..', '..oWo..', '..owo..', '..oWo..', '..oWo..', '..owo..', '..oKo..', '...o...'],
  ['.ooooooooooooo.', 'oSMMMMMMMMMMMKo', 'oSMMMMMMMMMMMKo', 'oMMMGGGGGGGMMKo', 'oMMMMMMMMMMMMKo', 'oMMMMMMMMMMMMKo', 'oKKKKKKKKKKKKKo', '.ooooooooooooo.', '......oWo......', '......oWo......', '......owo......', '......oWo......', '......oWo......', '......owo......', '......oWo......', '......oWo......', '......owo......', '......oGo......', '......oGo......', '......ooo......'],
  ['......ooooooo.....', 'ooooooKMMMMMKoooo.', 'oGGGGoKCCCCCKSSSSo', 'oGWWGoKCcCcCKsssso', 'oooooooKKKKKKoooo.', '..oWWo.oooooo.....', '..oWWo............', '..owwo............', '..oooo............'],
  ['.........oooooooo', '.......ooKMMMMMMo', '.....ooKMMMMMMMGo', '....oKMMMMMMMMMGo', '....oKKMMMMMMMMGo', '....oKKKKKKKKKKGo', '.ooooooooooooooo.', '.oWWWWWWWo.......', '.oWwwWWWo........', '.oWWWo...........', '.oooo............'],
  ['ooo......', 'oPPoo....', '.ooPPo...', '...oPPo..', '...oPCo..', '....oPCo.', '....oCCo.', '...oGGGo.', '....oCCo.', '....oPCo.', '...oPCo..', '...oPPo..', '.ooPPo...', 'oPPoo....', 'ooo......'],
];
function weaponSheet() {
  const im = P.blank(120, 28);
  WEAPON_ROWS.forEach((rows, i) => rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') put(im, i * 20 + x, y, WPAL[ch]); })));
  return im;
}
// Ikon armor dan benda berguna, sel 14x12.
const GEAR_ROWS = [
  ['.oo......oo.', 'oWWo....oWWo', 'oWWWoooWWWWo', 'oWwWWWWWWwWo', '.oWWWWWWWWo.', '.oWWwWWwWWo.', '.oWWWWWWWWo.', '.oWWwWWwWWo.', '.oWWWWWWWWo.', '.oooooooooo.'],
  ['.oo......oo.', 'oSMo....oMMo', 'oSMMoooMMMMo', 'oSMMMMMMMKMo', '.oSMMMMMMKo.', '.oSMGGGGMKo.', '.oSMMMMMMKo.', '.oSMGGGGMKo.', '.oSMMMMMMKo.', '.oooooooooo.'],
  ['...oooooo...', '..oPPPPPPo..', '..oPPGGPPo..', '.oPPGGGGPPo.', '.oPPPGGPPPo.', '.oPPPPPPPPo.', 'oPPPPPPPPPPo', 'oPpPPpPPpPPo', 'oPpPPpPPpPPo', 'oooooooooooo'],
  ['.oooo..oooo.', '.oSSo..oSSo.', '.oSSo..oSSo.', '.oRRo..oRRo.', '.oRRo..oRRo.', '.oRRo..oRRo.', '.oRRRooRRRo.', '.oRRRRRRRRo.', '..oRRRRRRo..', '...oooooo...'],
  ['...oooo.....', '...oCCo..oo.', '...oCCo.oSSo', '...oCCooSSo.', '...oCCCCoo..', '...oCCCCCoo.', '...oCCCCCCCo', '...oWWWWWWWo', '...ooooooooo'],
  ['oo........oo', 'oGo......oGo', '.oGo....oGo.', '..oGo..oGo..', '...oGooGo...', '..oRRooRRo..', '.oRRRRRRRRo.', '.oRRRRRRRRo.', '..oRRRRRRo..', '...oRRRRo...', '....oRRo....', '.....oo.....'],
];
function gearSheet() {
  const im = P.blank(84, 12);
  GEAR_ROWS.forEach((rows, i) => rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') put(im, i * 14 + x, y, WPAL[ch]); })));
  return im;
}
function bomb() {
  const rows = ['.....oo..', '....oGo..', '...ooo...', '.oooooo..', 'oKKKKKKo.', 'oMSKKKKo.', 'oMKKKKKo.', 'oKKKKKKo.', '.oooooo..'];
  const im = P.blank(9, 9);
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') put(im, x, y, WPAL[ch]); }));
  return im;
}

// ===== Tema =====
const rocks = P.decode(find('Environment/Tilesets/Wall_Tiles.png'));
// Tekstur asli punya lubang di sudut dan garis tegak tiap 48 piksel. Bagian tengahnya dipakai sebagai
// lapisan batu yang digeser tiap 8 piksel, supaya sambungannya acak dan tidak ada yang tembus.
function strata(sx, under) {
  const out = P.blank(32, 48);
  for (let y = 0; y < 48; y++) {
    const shift = (Math.floor(y / 8) * 13) % 32;
    for (let x = 0; x < 32; x++) {
      const o = ((256 + y) * rocks.w + sx + 8 + ((x + shift) % 32)) * 4;
      const a = rocks.data[o + 3];
      put(out, x, y, a > 40 ? [rocks.data[o], rocks.data[o + 1], rocks.data[o + 2], 255] : hex(under));
    }
  }
  return out;
}
const ROCK = { brown: strata(48, '#5a3622'), gray: strata(144, '#2a3a44'), dark: strata(240, '#2e1e12') };
const veg = P.decode(find('Props/Static/Vegetation.png'));
const rk = P.decode(find('Props/Static/Rocks.png'));
const furn = P.decode(find('Props/Static/Furniture.png'));
const dun = P.decode(find('Props/Static/Dungeon_Props.png'));
const woods = P.decode(find('free_pixel_16_woods.png'));
const cute = P.decode(find('Outdoor decoration/Outdoor_Decor_Free.png'));
const oak = P.decode(find('Outdoor decoration/Oak_Tree.png'));
const mystic = P.decode(find('sprites/objects/objects.png'));

const STYLES = {
  green: {
    fill: shade(ROCK.brown, [1, 1, 1]), cap: { kind: 'grass', light: hex('#a4dc58'), mid: hex('#6fbe45'), dark: hex('#3f8f3c') },
    plat: { light: hex('#d9a35a'), mid: hex('#a8733f'), dark: hex('#6f4522') },
    decor: { oak: [oak, 11, 9, 41, 63], pine: [woods, 308, 97, 25, 31], bush: [veg, 2, 5, 29, 27], mush: [woods, 228, 70, 10, 9], stump: [woods, 231, 80, 19, 16] },
  },
  simple: {
    fill: shade(ROCK.brown, [1.12, 1.02, 0.86]), cap: { kind: 'grass', light: hex('#e4dc6a'), mid: hex('#bdb94e'), dark: hex('#8d8e3c') },
    plat: { light: hex('#e8bc78'), mid: hex('#bd8a4e'), dark: hex('#82562c') },
    decor: { tree: [woods, 275, 92, 28, 36], bush: [veg, 50, 5, 29, 27], rock: [rk, 80, 17, 16, 14], flower: [woods, 258, 54, 11, 10], stump: [woods, 231, 80, 19, 16] },
  },
  industrial: {
    fill: shade(ROCK.gray, [1.08, 0.98, 0.9]), cap: { kind: 'plank', h: 7, light: hex('#c08a4e'), mid: hex('#936036'), dark: hex('#5d3a20') },
    plat: { light: hex('#a9b0ba'), mid: hex('#7d8490'), dark: hex('#4c525e') },
    decor: { crate: [mystic, 82, 2, 16, 16], jar: [furn, 769, 80, 14, 16], rock: [rk, 176, 17, 16, 14], lamp: [cute, 68, 72, 10, 40] },
  },
  night: {
    fill: shade(ROCK.gray, [0.62, 0.68, 0.95]), cap: { kind: 'roof', h: 8, light: hex('#6a79c0'), mid: hex('#48558f'), dark: hex('#2c3560') },
    plat: { light: hex('#8a7b8e'), mid: hex('#5e5468'), dark: hex('#3a3346') },
    decor: { lamp: [cute, 68, 72, 10, 40], crate: [mystic, 82, 2, 16, 16], jar: [furn, 769, 112, 14, 16] },
  },
  crystal: {
    fill: shade(ROCK.gray, [0.72, 0.9, 1.12]), cap: { kind: 'stone', h: 5, light: hex('#b6e2ee'), mid: hex('#7fb0c6'), dark: hex('#4d7690'), spark: hex('#e8fbff') },
    plat: { light: hex('#a8d8e6'), mid: hex('#6f9eb6'), dark: hex('#3f6680') },
    decor: { shard: [rk, 146, 279, 12, 25], rock: [rk, 176, 17, 16, 14], gem: [cute, 49, 50, 14, 14] },
  },
  hive: {
    fill: shade(ROCK.gray, [0.95, 0.55, 1.0]), cap: { kind: 'moss', light: hex('#c8e860'), mid: hex('#86b83e'), dark: hex('#4f7a34') },
    plat: { light: hex('#a88fb0'), mid: hex('#74597e'), dark: hex('#493652') },
    decor: { dead: [veg, 196, 98, 39, 46], rock: [rk, 80, 113, 16, 14], fern: [veg, 112, 166, 32, 26], mush: [woods, 228, 70, 10, 9] },
  },
  day: {
    fill: blocks('#cf8660', '#b56d4a', '#8c4f36', '#5b3226', 16, 8), cap: { kind: 'roof', h: 8, light: hex('#e8795a'), mid: hex('#c4533e'), dark: hex('#8c3730') },
    plat: { light: hex('#d9a35a'), mid: hex('#a8733f'), dark: hex('#6f4522') },
    decor: { lamp: [cute, 68, 72, 10, 40], crate: [mystic, 82, 2, 16, 16], pot: [cute, 36, 145, 7, 14], tree: [woods, 275, 92, 28, 36] },
  },
  castle: {
    fill: blocks('#8f8aa6', '#6f6a88', '#4f4a66', '#2b2740', 24, 12), cap: { kind: 'stone', h: 6, light: hex('#c6c2d6'), mid: hex('#9c98b4'), dark: hex('#67627f') },
    plat: { light: hex('#b6b2c8'), mid: hex('#8a86a2'), dark: hex('#56526e') },
    decor: { lamp: [cute, 68, 72, 10, 40], jar: [furn, 769, 80, 14, 16], crate: [mystic, 82, 2, 16, 16], rock: [rk, 176, 17, 16, 14] },
  },
};

for (const [id, st] of Object.entries(STYLES)) {
  save(st.fill, `${id}/fill.png`);
  save(capSheet(st.cap), `${id}/top.png`);
  save(platformSheet(st.plat), `${id}/platform.png`);
  for (const [k, [src, x, y, w, h]] of Object.entries(st.decor)) save(crop(src, x, y, w, h), `${id}/decor_${k}.png`);
  BG[id]((layers) => {
    for (const [k, im] of Object.entries(layers)) save(im, `${id}/bg_${k}.png`);
  });
}
save(spike(), 'spike.png');
save(star(), 'star.png');
save(flag(), 'flag.png');
save(portal(), 'portal.png');
save(gate(), 'gate.png');
save(lock(), 'lock.png');
save(spring(), 'spring.png');
save(pipe(), 'pipe.png');
save(dash(), 'dash.png');
save(saw(), 'saw.png');
save(weaponSheet(), 'weapons.png');
save(gearSheet(), 'gear.png');
save(bomb(), 'bomb.png');
console.log('selesai: ' + OUT);
