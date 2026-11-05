// Menyiapkan aset visual MH4 v2 dari paket itch.io ke public/assets/mh4/v2. Tanpa dependensi.
//   node scripts/prepare_assets_mh4.js "<folder berisi paket hasil ekstrak>"
// Paket dicari di dalam folder itu menurut isinya, jadi nama foldernya bebas. Paket yang tidak
// ada dilewati dengan peringatan. Hanya berkas yang dipakai game yang disalin.
const fs = require('fs'), path = require('path');
const P = require('./pngtool.js');

const SRC = process.argv[2];
const OUT = path.join(__dirname, '..', 'public', 'assets', 'mh4', 'v2');
if (!SRC || !fs.existsSync(SRC)) { console.error('Folder sumber tidak ada: ' + SRC); process.exit(1); }

const ALL = [];
(function walk(dir) {
  for (const n of fs.readdirSync(dir)) {
    const p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) walk(p); else ALL.push(p);
  }
})(SRC);
// Cari folder induk dari berkas penanda, mis. 'Player/Player_Actions.png' -> folder paket.
function packRoot(marker) {
  const tail = path.sep + marker.split('/').join(path.sep);
  const hit = ALL.find((f) => f.endsWith(tail));
  return hit ? hit.slice(0, -tail.length) : null;
}
// Jalankan bagian hanya bila paketnya ada.
function section(name, marker, fn) {
  const root = packRoot(marker);
  if (!root) { console.warn(`LEWATI ${name}: paket tidak ditemukan (${marker})`); return; }
  fn(root);
  console.log(`ok ${name}`);
}

function save(img, rel) {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  P.encode(img, f);
}
function copy(src, rel) {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.copyFileSync(src, f);
}
function crop(src, x, y, w, h) {
  const out = P.blank(w, h);
  for (let r = 0; r < h; r++) src.data.copy(out.data, r * w * 4, ((y + r) * src.w + x) * 4, ((y + r) * src.w + x + w) * 4);
  return out;
}
// Warnai ulang: dipakai untuk musuh penyihir dan keadaan boss, tanpa aset tambahan.
function tint(img, rgb, amount) {
  const out = { w: img.w, h: img.h, data: Buffer.from(img.data) };
  for (let i = 0; i < out.data.length; i += 4) {
    if (!out.data[i + 3]) continue;
    for (let c = 0; c < 3; c++) out.data[i + c] = Math.round(out.data[i + c] * (1 - amount) + rgb[c] * amount);
  }
  return out;
}
const strip = (img, frame, row, n) => crop(img, 0, row * frame, n * frame, frame);
// Lembar diam Pixel Crawler memakai sel 32, lembar lari sel 64. Disamakan menjadi 64 dengan kaki di dasar.
function to64(img) {
  if (img.h >= 64) return img;
  const n = Math.floor(img.w / img.h), s = img.h;
  const out = P.blank(n * 64, 64);
  for (let i = 0; i < n; i++) P.paste(out, crop(img, i * s, 0, s, s), i * 64 + (64 - s) / 2, 64 - s, 1);
  return out;
}

section('Cute Fantasy', 'Player/Player_Actions.png', (CF) => {
  copy(path.join(CF, 'Player', 'Player.png'), 'hero/player.png');
  copy(path.join(CF, 'Player', 'Player_Actions.png'), 'hero/actions.png');
  const skel = P.decode(path.join(CF, 'Enemies', 'Skeleton.png'));
  for (const [id, paint] of [['walker', null], ['shooter', [120, 70, 200]]]) {
    const fx = (im) => (paint ? tint(im, paint, 0.42) : im);
    save(fx(strip(skel, 32, 1, 6)), `enemies/${id}/Idle.png`);
    save(fx(strip(skel, 32, 4, 6)), `enemies/${id}/Walk.png`);
    save(fx(strip(skel, 32, 1, 6)), `enemies/${id}/Attack.png`);
    save(fx(strip(skel, 32, 8, 4)), `enemies/${id}/Hurt.png`);
    save(fx(strip(skel, 32, 6, 4)), `enemies/${id}/Death.png`);
  }
  const slime = P.decode(path.join(CF, 'Enemies', 'Slime_Green.png'));
  save(strip(slime, 64, 0, 4), 'enemies/jumper/Idle.png');
  save(strip(slime, 64, 1, 8), 'enemies/jumper/Walk.png');
  save(strip(slime, 64, 1, 8), 'enemies/jumper/Attack.png');
  save(strip(slime, 64, 0, 4), 'enemies/jumper/Hurt.png');
  save(strip(slime, 64, 2, 8), 'enemies/jumper/Death.png');
  for (const f of ['Grass_Middle', 'Path_Tile', 'Water_Tile', 'FarmLand_Tile']) copy(path.join(CF, 'Tiles', f + '.png'), `base/${f}.png`);
  for (const f of ['House_1_Wood_Base_Blue', 'Oak_Tree', 'Oak_Tree_Small', 'Outdoor_Decor_Free', 'Fences', 'Bridge_Wood', 'Chest']) copy(path.join(CF, 'Outdoor decoration', f + '.png'), `base/${f}.png`);
  for (const f of ['Chicken', 'Cow', 'Sheep']) copy(path.join(CF, 'Animals', f, f + '.png'), `base/${f}.png`);
  // Satu gambar rumah diwarnai ulang atapnya supaya rumah warga berbeda-beda.
  const house = P.decode(path.join(CF, 'Outdoor decoration', 'House_1_Wood_Base_Blue.png'));
  for (const [id, m] of [['merah', [1.7, 0.5, 0.5]], ['hijau', [1.05, 1.15, 0.45]], ['coklat', [1.45, 0.85, 0.55]], ['ungu', [1.25, 0.7, 1.6]], ['kuning', [1.75, 1.45, 0.5]], ['abu', [1.0, 1.05, 1.15]]]) {
    const out = { w: house.w, h: house.h, data: Buffer.from(house.data) };
    for (let i = 0; i < out.data.length; i += 4) {
      const [r, g, b] = [out.data[i], out.data[i + 1], out.data[i + 2]];
      // Atap: hijau kebiruan gelap dengan r paling kecil. Jendela biru terang dilewati.
      if (!out.data[i + 3] || r >= g || r >= b || b > 150 || r === g) continue;
      const lum = (r + g + b) / 3 * 1.5;
      out.data[i] = Math.min(255, lum * m[0]); out.data[i + 1] = Math.min(255, lum * m[1]); out.data[i + 2] = Math.min(255, lum * m[2]);
    }
    save(out, `base/house_${id}.png`);
  }
});

section('Hiasan kampung', 'Props/Static/Farm.png', (PC) => {
  // Orang-orangan sawah dari lembar pertanian.
  save(crop(P.decode(path.join(PC, 'Props', 'Static', 'Farm.png')), 244, 33, 24, 47), 'base/scarecrow.png');
});

section('Air mancur', 'Props/shrine or fountain 160x128-on grass.png', (EP) => {
  copy(path.join(EP, 'Props', 'shrine or fountain 160x128-on grass.png'), 'base/fountain.png');
});

section('Mystic Woods', 'sprites/objects/objects.png', (MW) => {
  const mystic = P.decode(path.join(MW, 'sprites', 'objects', 'objects.png'));
  save(crop(mystic, 176, 32, 16, 32), 'base/bed.png');
});

section('Pipoya', 'Boss/Boss 01.png', (PIP) => {
  // Boss ramah anak dari Pipoya: tiap boss berbeda makhluk, dengan animasi jalan menghadap kanan.
  const beasts = { labu: ['Enemy', 'Enemy 03-1'], anjing: ['Animal', 'Dog 01-1'], hantu: ['Enemy', 'Enemy 11-1'], kucing: ['Animal', 'Cat 01-1'], 'hantu-topi': ['Enemy', 'Enemy 09-1'] };
  for (const [id, [d, f]] of Object.entries(beasts)) {
    const im = P.decode(path.join(PIP, d, f + '.png'));
    // Kolom tengah berdiri, ketiga kolom untuk berjalan.
    const idle = crop(im, 32, 64, 32, 32), walk = crop(im, 0, 64, 96, 32);
    save(idle, `boss/${id}/idle.png`);
    save(walk, `boss/${id}/walk.png`);
    save(tint(idle, [255, 200, 120], 0.3), `boss/${id}/prepare.png`);
    save(tint(walk, [255, 170, 80], 0.2), `boss/${id}/attack.png`);
    save(tint(idle, [255, 255, 255], 0.55), `boss/${id}/hurt.png`);
    save(tint(idle, [40, 40, 60], 0.5), `boss/${id}/death.png`);
  }
  const npcs = { kakek: ['Male', 'Male 09-1'], sari: ['Female', 'Female 18-1'], empu: ['Male', 'Male 01-1'], guru: ['Female', 'Female 05-1'], zahra: ['Female', 'Female 17-1'] };
  for (const [id, [d, f]] of Object.entries(npcs)) copy(path.join(PIP, d, f + '.png'), `base/npc_${id}.png`);
});

// Farah anak-anak: dirakit dari lapisan generator Pipoya (tubuh, baju, mata, rambut).
(function farah() {
  const parts = ALL.filter((f) => f.includes('pipoya32x32_children') && f.endsWith('.png'));
  if (!parts.length) { console.warn('LEWATI Farah: generator Pipoya tidak ditemukan'); return; }
  const byDir = {};
  for (const f of parts) {
    const d = path.basename(path.dirname(f));
    (byDir[d] = byDir[d] || []).push(f);
  }
  for (const d of Object.keys(byDir)) byDir[d].sort();
  const layer = (d, i) => P.decode(byDir[d][i]);
  const out = P.blank(96, 128);
  for (const im of [layer('00Skin', 2), layer('01Costume', 1), layer('02Eye', 2), layer('03Hair', 1)]) P.paste(out, im, 0, 0, 1);
  save(out, 'base/npc_gapura.png');
})();

// Mamah Zahra: hijab panjang digambar di atas sprite. Wajah dipertahankan, rambut dan pakaian atas ditutup.
section('Hijab Mamah Zahra', 'Female/Female 17-1.png', (PIP) => {
  const src = P.decode(path.join(PIP, 'Female', 'Female 17-1.png'));
  const out = { w: src.w, h: src.h, data: Buffer.from(src.data) };
  const OUTLINE = [36, 24, 46, 255];
  const HIJAB = [[58, 92, 112], [84, 128, 148], [122, 168, 184]];   // gelap, sedang, terang
  const ROBE = [[48, 44, 78], [72, 66, 110], [98, 90, 142]];
  const SKIN = [255, 224, 189, 255], INNER = [238, 232, 218, 255];
  const get = (im, x, y) => { const o = (y * im.w + x) * 4; return [im.data[o], im.data[o + 1], im.data[o + 2], im.data[o + 3]]; };
  const put = (x, y, c) => { const o = (y * out.w + x) * 4; out.data[o] = c[0]; out.data[o + 1] = c[1]; out.data[o + 2] = c[2]; out.data[o + 3] = 255; };
  const lum = (c) => (c[0] + c[1] + c[2]) / 3;
  const ramp = (r, v) => (v < 95 ? r[0] : v < 150 ? r[1] : r[2]);
  const isSkin = (c) => c[3] > 40 && c[0] > 200 && c[1] > 140 && c[2] > 90 && c[0] > c[2] + 30;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      const X = col * 32, Y = row * 32;
      let top = 99, minX = 99, maxX = -1;
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        if (get(src, X + x, Y + y)[3] > 40) { top = Math.min(top, y); if (y < top + 16) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); } }
      }
      const cx = (minX + maxX) / 2;
      // Pakaian bawah menjadi gamis gelap.
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        const c = get(src, X + x, Y + y);
        if (c[3] > 40 && !isSkin(c)) put(X + x, Y + y, lum(c) < 50 ? OUTLINE : ramp(ROBE, lum(c)));
      }
      // Satu kain utuh dari puncak kepala sampai pinggang: kepala bulat menyambung ke bahu, lalu melebar.
      const inCloth = (x, y) => {
        const dy = y - (top + 9), dx = x - cx;
        if ((dx * dx) / (9.5 * 9.5) + (dy * dy) / (9 * 9) <= 1) return true;
        if (y < top + 10 || y > top + 25) return false;
        const half = 9 + ((y - top - 10) / 15) * 3;
        // Tepi bawah melengkung.
        const drop = y === top + 25 ? 3 : y === top + 24 ? 1 : 0;
        return Math.abs(dx) <= half - drop;
      };
      const opening = row === 3 ? null : { x: cx + (row === 1 ? -3 : row === 2 ? 3 : 0), y: top + 13, rx: row === 0 ? 6.4 : 5, ry: 6 };
      const inFace = (x, y) => opening && ((x - opening.x) ** 2) / (opening.rx ** 2) + ((y - opening.y) ** 2) / (opening.ry ** 2) <= 1;
      const inRing = (x, y) => opening && ((x - opening.x) ** 2) / ((opening.rx + 1.3) ** 2) + ((y - opening.y) ** 2) / ((opening.ry + 1.3) ** 2) <= 1;
      // Rambut dan lengan lama di luar kain dihapus, supaya bentuknya bersih.
      for (let y = 0; y < top + 26; y++) for (let x = 0; x < 32; x++) {
        if (!inCloth(x, y)) out.data[((Y + y) * out.w + X + x) * 4 + 3] = 0;
      }
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        if (!inCloth(x, y)) continue;
        const edge = !inCloth(x - 1, y) || !inCloth(x + 1, y) || !inCloth(x, y - 1) || !inCloth(x, y + 1);
        if (edge) { put(X + x, Y + y, OUTLINE); continue; }
        if (inFace(x, y)) {
          // Wajah: kulit bersih, hanya mata dari gambar asli yang dipakai.
          const c = get(src, X + x, Y + y);
          const eye = c[3] > 40 && !isSkin(c) && (lum(c) < 90 || c[0] > c[1] + 50) && y >= opening.y - 2 && y <= opening.y + 2 && Math.abs(x - opening.x) <= opening.rx - 1.5;
          put(X + x, Y + y, eye ? c : SKIN);
          continue;
        }
        if (inRing(x, y)) { put(X + x, Y + y, INNER); continue; }
        // Lipatan kain di bawah dagu dan sisi yang terkena cahaya.
        const dx = x - cx;
        const fold = y > top + 19 && Math.round(Math.abs(dx)) % 4 === 3;
        const shade = fold ? HIJAB[0] : dx < -4 ? HIJAB[2] : HIJAB[1];
        put(X + x, Y + y, y === top + 2 ? HIJAB[2] : shade);
      }
    }
  }
  save(out, 'base/npc_zahra.png');
});

// Boss ramah anak: lendir raksasa dan raja goblin bermahkota, dengan animasi jalan sungguhan.
section('Boss lendir', 'Enemies/Slime_Green.png', (CF) => {
  const slime = P.decode(path.join(CF, 'Enemies', 'Slime_Green.png'));
  const swap = (img, f) => {
    const out = { w: img.w, h: img.h, data: Buffer.from(img.data) };
    for (let i = 0; i < out.data.length; i += 4) {
      if (!out.data[i + 3]) continue;
      const [r, g, bl] = f(out.data[i], out.data[i + 1], out.data[i + 2]);
      out.data[i] = Math.min(255, r); out.data[i + 1] = Math.min(255, g); out.data[i + 2] = Math.min(255, bl);
    }
    return out;
  };
  const skins = {
    lendir: (r, g, bl) => [g * 0.8 + bl * 0.2, r * 0.45 + bl * 0.4, g * 1.05],
    'lendir-biru': (r, g, bl) => [r * 0.6, g * 0.75, g * 1.1 + 20],
  };
  for (const [id, f] of Object.entries(skins)) {
    const idle = swap(strip(slime, 64, 0, 4), f), walk = swap(strip(slime, 64, 1, 8), f);
    save(idle, `boss/${id}/idle.png`);
    save(walk, `boss/${id}/walk.png`);
    save(tint(idle, [255, 200, 120], 0.3), `boss/${id}/prepare.png`);
    save(tint(walk, [255, 170, 80], 0.2), `boss/${id}/attack.png`);
    save(tint(idle, [255, 255, 255], 0.55), `boss/${id}/hurt.png`);
    save(swap(strip(slime, 64, 2, 8), f), `boss/${id}/death.png`);
  }
});

section('Boss ayam', 'Animals/Chicken/Chicken.png', (CF) => {
  const ayam = P.decode(path.join(CF, 'Animals', 'Chicken', 'Chicken.png'));
  const idle = tint(strip(ayam, 32, 0, 2), [150, 110, 220], 0.28), walk = tint(strip(ayam, 32, 1, 2), [150, 110, 220], 0.28);
  save(idle, 'boss/ayam/idle.png');
  save(walk, 'boss/ayam/walk.png');
  save(tint(idle, [255, 170, 90], 0.3), 'boss/ayam/prepare.png');
  save(tint(walk, [255, 120, 70], 0.2), 'boss/ayam/attack.png');
  save(tint(idle, [255, 255, 255], 0.55), 'boss/ayam/hurt.png');
  save(tint(idle, [40, 40, 60], 0.5), 'boss/ayam/death.png');
});

section('Anak ayam', 'Animals/Chicken/Chicken.png', (CF) => {
  const ayam = P.decode(path.join(CF, 'Animals', 'Chicken', 'Chicken.png'));
  const idle = strip(ayam, 32, 0, 2), walk = strip(ayam, 32, 1, 2);
  save(idle, 'enemies/chick/Idle.png');
  save(walk, 'enemies/chick/Walk.png');
  save(walk, 'enemies/chick/Attack.png');
  save(tint(idle, [255, 255, 255], 0.6), 'enemies/chick/Hurt.png');
  save(tint(idle, [40, 40, 60], 0.5), 'enemies/chick/Death.png');
});

section('Boss goblin', 'Orc Crew/Orc/Run/Run-Sheet.png', (PC) => {
  // Mahkota emas di atas kepala tiap bingkai, mengikuti naik turun tubuh.
  const crown = (img) => {
    const out = { w: img.w, h: img.h, data: Buffer.from(img.data) };
    const n = Math.floor(img.w / 64);
    const G = [255, 216, 74, 255], D = [201, 143, 34, 255], O = [58, 30, 12, 255];
    const put = (x, y, c) => { if (y < 0) return; const o = (y * out.w + x) * 4; out.data[o] = c[0]; out.data[o + 1] = c[1]; out.data[o + 2] = c[2]; out.data[o + 3] = 255; };
    for (let f = 0; f < n; f++) {
      let top = -1, sx = 0, cnt = 0;
      for (let y = 0; y < 64 && top < 0; y++) for (let x = 0; x < 64; x++) if (img.data[(y * img.w + f * 64 + x) * 4 + 3] > 40) { if (top < 0) top = y; sx += x; cnt++; }
      if (top < 0) continue;
      const cx = f * 64 + Math.round(sx / cnt);
      const rows = ['O.O.O.O', 'OGOGOGO', 'OGGGGGO', 'ODDDDDO', 'OOOOOOO'];
      rows.forEach((row, j) => [...row].forEach((ch, i) => {
        if (ch !== '.') put(cx - 3 + i, top - 3 + j, ch === 'G' ? G : ch === 'D' ? D : O);
      }));
    }
    return out;
  };
  for (const [id, dir] of [['goblin', 'Orc Crew/Orc'], ['goblin-merah', 'Orc Crew/Orc - Rogue']]) {
    const sheet = (st) => P.decode(path.join(PC, dir, st, st + '-Sheet.png'));
    const idle = crown(to64(sheet('Idle'))), run = crown(sheet('Run'));
    save(idle, `boss/${id}/idle.png`);
    save(run, `boss/${id}/walk.png`);
    save(tint(idle, [255, 170, 90], 0.3), `boss/${id}/prepare.png`);
    save(tint(run, [255, 120, 70], 0.2), `boss/${id}/attack.png`);
    save(tint(idle, [255, 255, 255], 0.55), `boss/${id}/hurt.png`);
    save(sheet('Death'), `boss/${id}/death.png`);
  }
});

section('Efek peluru', 'Fire Effect and Bullet 16x16.png', (EF) => {
  const fire = P.decode(path.join(EF, 'Fire Effect and Bullet 16x16.png'));
  const purple = P.decode(path.join(EF, 'Purple Effect and Bullet 16x16.png'));
  // Bola api padat untuk peluru boss.
  for (const id of ['lendir', 'lendir-biru', 'ayam', 'anjing', 'hantu', 'hantu-topi']) save(crop(purple, 112, 112, 16, 16), `boss/${id}/projectile.png`);
  for (const id of ['goblin', 'goblin-merah', 'labu', 'kucing']) save(crop(fire, 112, 112, 16, 16), `boss/${id}/projectile.png`);
  // Tiga bingkai lidah api setinggi 32 untuk semburan lantai, dan api rendah untuk gelombang.
  save(crop(fire, 160, 160, 48, 32), 'fx/burst.png');
  save(crop(fire, 224, 144, 48, 16), 'fx/wave.png');
});

section('Musuh tambahan', 'Enemy01/fly01.png', (CS) => {
  // Kelelawar: bingkai lepas digabung menjadi strip.
  const frames = (dir, name, n) => Array.from({ length: n }, (_, i) => P.decode(path.join(CS, dir, `${name}${String(i + 1).padStart(2, '0')}.png`)));
  const join = (list, size) => {
    const out = P.blank(size * list.length, size);
    list.forEach((im, i) => P.paste(out, im, i * size, 0, 1));
    return out;
  };
  const fly = join(frames('Enemy01', 'fly', 7), 32);
  save(fly, 'enemies/flyer/Walk.png');
  save(fly, 'enemies/flyer/Idle.png');
  save(tint(fly, [255, 90, 60], 0.3), 'enemies/flyer/Attack.png');
  save(tint(fly, [255, 255, 255], 0.6), 'enemies/flyer/Hurt.png');
  save(tint(fly, [40, 40, 60], 0.5), 'enemies/flyer/Death.png');
});

section('Musuh per tema', 'Orc Crew/Orc - Warrior/Run/Run-Sheet.png', (PC) => {
  const crew = { goblin: 'Orc Crew/Orc', rogue: 'Orc Crew/Orc - Rogue', shaman: 'Orc Crew/Orc - Shaman', mage: 'Skeleton Crew/Skeleton - Mage', ambusher: 'Skeleton Crew/Skeleton - Rogue', guard: 'Skeleton Crew/Skeleton - Warrior' };
  for (const [id, dir] of Object.entries(crew)) {
    const sheet = (st) => P.decode(path.join(PC, dir, st, st + '-Sheet.png'));
    const run = sheet('Run'), idle = to64(sheet('Idle'));
    save(idle, `enemies/${id}/Idle.png`);
    save(run, `enemies/${id}/Walk.png`);
    save(tint(run, [255, 90, 60], 0.3), `enemies/${id}/Attack.png`);
    save(tint(run, [255, 255, 255], 0.6), `enemies/${id}/Hurt.png`);
    const death = sheet('Death');
    save(death.h === 64 ? death : crop(death, 0, Math.max(0, death.h - 64), death.w, Math.min(64, death.h)), `enemies/${id}/Death.png`);
  }
});

section('Bunga peludah', 'Enemy03/idle01.png', (CS) => {
  const d = path.join(CS, 'Enemy03');
  const load = (prefix) => fs.readdirSync(d).filter((n) => n.startsWith(prefix)).sort().map((n) => P.decode(path.join(d, n)));
  const join = (list) => { const out = P.blank(64 * list.length, 64); list.forEach((im, i) => P.paste(out, im, i * 64, 0, 1)); return out; };
  const idle = join(load('idle')), atk = join(load('attack_right'));
  save(idle, 'enemies/plant/Idle.png');
  save(idle, 'enemies/plant/Walk.png');
  save(atk, 'enemies/plant/Attack.png');
  save(tint(idle, [255, 255, 255], 0.6), 'enemies/plant/Hurt.png');
  save(tint(idle, [40, 40, 60], 0.5), 'enemies/plant/Death.png');
});

section('Orc penyeruduk', 'Orc Crew/Orc - Warrior/Run/Run-Sheet.png', (PC) => {
  const dir = path.join(PC, 'Orc Crew', 'Orc - Warrior');
  const run = P.decode(path.join(dir, 'Run', 'Run-Sheet.png'));
  const idle = P.decode(path.join(dir, 'Idle', 'Idle-Sheet.png'));
  // Bingkai diam 32 ditempatkan di tengah bawah sel 64 agar segaris dengan bingkai lari.
  const pad = P.blank(64 * 4, 64);
  for (let i = 0; i < 4; i++) P.paste(pad, idle, i * 64 + 16, 32, 1, i * 32, 0, 32, 32);
  save(pad, 'enemies/charger/Idle.png');
  save(run, 'enemies/charger/Walk.png');
  save(tint(pad, [255, 120, 60], 0.35), 'enemies/charger/Attack.png');
  save(tint(pad, [190, 190, 255], 0.45), 'enemies/charger/Hurt.png');
  save(pad, 'enemies/charger/Death.png');
  let bottom = 0;
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (run.data[(y * run.w + x) * 4 + 3] > 200) bottom = Math.max(bottom, y);
  console.log(`orc kaki baris ${bottom}`);
});

section('Senjata', 'Weapons/Wood/Wood.png', (PC) => {
  copy(path.join(PC, 'Weapons', 'Wood', 'Wood.png'), 'ui/weapons.png');
});

section('Pixel Crawler', 'Environment/Structures/Stations/Anvil/Anvil.png', (PC) => {
  copy(path.join(PC, 'Environment', 'Structures', 'Stations', 'Anvil', 'Anvil.png'), 'base/anvil.png');
  copy(path.join(PC, 'Environment', 'Structures', 'Stations', 'Bonfire', 'Fire_01-Sheet.png'), 'base/fire.png');
});

// Bangunan dan hiasan yang dibeli untuk kampung, serta Titu si kucing.
section('Bangun kampung', 'Environment/Structures/Stations/Anvil/Anvil.png', (PC) => {
  const st = path.join(PC, 'Environment', 'Structures');
  copy(path.join(st, 'Stations', 'Cooking Station', 'Cooking Station.png'), 'base/cook.png');
  copy(path.join(st, 'Buildings', 'Props.png'), 'base/props_pc.png');
  // Meja alkimia: enam bingkai pertama, 32x33.
  save(crop(P.decode(path.join(st, 'Stations', 'Alchemy', 'Alchemy_Table_01-Sheet.png')), 0, 31, 192, 33), 'base/alchemy.png');
});
section('Altar kristal', 'Props/altar 224x288 - standing on grass.png', (EP) => {
  copy(path.join(EP, 'Props', 'altar 224x288 - standing on grass.png'), 'base/altar.png');
});
section('Titu', 'Animal/Cat 01-3.png', (PIP) => {
  copy(path.join(PIP, 'Animal', 'Cat 01-3.png'), 'base/titu.png');
});

section('Retro Interior', 'TopDownHouse_FloorsAndWalls.png', (INT) => {
  const floors = P.decode(path.join(INT, 'TopDownHouse_FloorsAndWalls.png'));
  save(crop(floors, 80, 112, 16, 16), 'base/floor.png');
  copy(path.join(INT, 'TopDownHouse_FurnitureState1.png'), 'base/furniture.png');
});

section('Medieval UI', 'MediavelFree.png', (UI) => {
  const ui = P.decode(path.join(UI, 'MediavelFree.png'));
  save(crop(ui, 3, 22, 71, 71), 'ui/panel.png');
  save(crop(ui, 224, 34, 32, 29), 'ui/plank.png');
  save(crop(ui, 2, 98, 61, 12), 'ui/bar.png');
  const icons = { pause: [145, 1], plus: [81, 17], check: [145, 17], close: [81, 33], ask: [81, 49], coin: [145, 49] };
  for (const [id, [x, y]] of Object.entries(icons)) save(crop(ui, x, y, 14, 14), `ui/${id}.png`);
});

console.log('selesai:', OUT);
