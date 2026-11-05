// Alat PNG minimal tanpa dependensi: baca, tulis, potong, perbesar, dan cari kotak isi.
const fs = require('fs'), zlib = require('zlib');
function decode(file) {
  const b = fs.readFileSync(file);
  let p = 8, w = 0, h = 0, depth = 8, type = 6, plte = null, trns = null;
  const idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p), t = b.toString('latin1', p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; type = d[9]; }
    else if (t === 'PLTE') plte = d;
    else if (t === 'tRNS') trns = d;
    else if (t === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type];
  const bpp = Math.max(1, ch * depth / 8);
  const stride = Math.ceil(w * ch * depth / 8);
  const out = Buffer.alloc(w * h * 4);
  let prev = Buffer.alloc(stride), q = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[q++], line = Buffer.from(raw.subarray(q, q + stride)); q += stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0, u = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (f === 1) v += a; else if (f === 2) v += u; else if (f === 3) v += (a + u) >> 1;
      else if (f === 4) { const k = a + u - c, pa = Math.abs(k - a), pb = Math.abs(k - u), pc = Math.abs(k - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? u : c; }
      line[i] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      let r, g, bl, al = 255;
      const sample = (ix) => {
        if (depth === 8) return line[ix];
        if (depth === 16) return line[ix * 2];
        const bit = ix * depth, byte = line[bit >> 3], shift = 8 - depth - (bit & 7);
        return (byte >> shift) & ((1 << depth) - 1);
      };
      if (type === 6) { r = sample(x * 4); g = sample(x * 4 + 1); bl = sample(x * 4 + 2); al = sample(x * 4 + 3); }
      else if (type === 2) { r = sample(x * 3); g = sample(x * 3 + 1); bl = sample(x * 3 + 2); }
      else if (type === 3) { const i = sample(x); r = plte[i * 3]; g = plte[i * 3 + 1]; bl = plte[i * 3 + 2]; al = trns && i < trns.length ? trns[i] : 255; }
      else if (type === 0) { r = g = bl = depth < 8 ? sample(x) * (255 / ((1 << depth) - 1)) : sample(x); }
      else { r = g = bl = sample(x * 2); al = sample(x * 2 + 1); }
      const o = (y * w + x) * 4;
      out[o] = r; out[o + 1] = g; out[o + 2] = bl; out[o + 3] = al;
    }
    prev = line;
  }
  return { w, h, data: out };
}
const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc(b) { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(t, d) {
  const l = Buffer.alloc(4); l.writeUInt32BE(d.length);
  const tb = Buffer.from(t, 'latin1'), c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([tb, d])));
  return Buffer.concat([l, tb, d, c]);
}
function encode(img, file) {
  const raw = Buffer.alloc((img.w * 4 + 1) * img.h);
  for (let y = 0; y < img.h; y++) img.data.copy(raw, y * (img.w * 4 + 1) + 1, y * img.w * 4, (y + 1) * img.w * 4);
  const ih = Buffer.alloc(13); ih.writeUInt32BE(img.w, 0); ih.writeUInt32BE(img.h, 4); ih[8] = 8; ih[9] = 6;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}
function blank(w, h, bg) {
  const data = Buffer.alloc(w * h * 4);
  if (bg) for (let i = 0; i < w * h; i++) { data[i * 4] = bg[0]; data[i * 4 + 1] = bg[1]; data[i * 4 + 2] = bg[2]; data[i * 4 + 3] = 255; }
  return { w, h, data };
}
// Tempel dengan skala bulat dan alpha sederhana.
function paste(dst, src, dx, dy, s, sx, sy, sw, sh) {
  s = s || 1; sx = sx || 0; sy = sy || 0; sw = sw || src.w; sh = sh || src.h;
  for (let y = 0; y < sh * s; y++) for (let x = 0; x < sw * s; x++) {
    const px = dx + x, py = dy + y;
    if (px < 0 || py < 0 || px >= dst.w || py >= dst.h) continue;
    const so = ((sy + Math.floor(y / s)) * src.w + sx + Math.floor(x / s)) * 4, o = (py * dst.w + px) * 4;
    if (so < 0 || so + 3 >= src.data.length) continue;
    const a = src.data[so + 3] / 255;
    if (a === 0) continue;
    for (let i = 0; i < 3; i++) dst.data[o + i] = src.data[so + i] * a + dst.data[o + i] * (1 - a);
    dst.data[o + 3] = 255;
  }
}
// Kotak-kotak isi yang terpisah oleh baris/kolom kosong (deteksi kasar).
function boxes(img) {
  const seen = new Uint8Array(img.w * img.h), out = [];
  const solid = (x, y) => img.data[(y * img.w + x) * 4 + 3] > 0;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    if (seen[y * img.w + x] || !solid(x, y)) continue;
    let x0 = x, x1 = x, y0 = y, y1 = y; const st = [[x, y]]; seen[y * img.w + x] = 1;
    while (st.length) {
      const [a, b] = st.pop();
      x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b);
      for (const [c, d] of [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]]) {
        if (c < 0 || d < 0 || c >= img.w || d >= img.h || seen[d * img.w + c] || !solid(c, d)) continue;
        seen[d * img.w + c] = 1; st.push([c, d]);
      }
    }
    out.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
  }
  return out;
}
module.exports = { decode, encode, blank, paste, boxes };
if (require.main === module) {
  // node pngtool.js sheet keluaran.png lebar item... ; item = berkas|skala|label(abaikan)
  const [, , out, width, ...items] = process.argv;
  const imgs = items.map((s) => { const [f, sc] = s.split('|'); const im = decode(f); return { im, s: Number(sc || 2) }; });
  let x = 4, y = 4, rowH = 0, W = Number(width);
  const pos = [];
  for (const { im, s } of imgs) {
    const w = im.w * s, h = im.h * s;
    if (x + w + 4 > W) { x = 4; y += rowH + 6; rowH = 0; }
    pos.push([x, y]); x += w + 6; rowH = Math.max(rowH, h);
  }
  const dst = blank(W, y + rowH + 4, [120, 140, 150]);
  imgs.forEach(({ im, s }, i) => paste(dst, im, pos[i][0], pos[i][1], s));
  encode(dst, out);
  console.log('tulis', out, dst.w, dst.h);
}
