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
  for (const f of ['Chicken', 'Cow', 'Pig', 'Sheep']) copy(path.join(CF, 'Animals', f, f + '.png'), `base/${f}.png`);
});

section('Mystic Woods', 'sprites/objects/objects.png', (MW) => {
  const mystic = P.decode(path.join(MW, 'sprites', 'objects', 'objects.png'));
  save(crop(mystic, 176, 32, 16, 32), 'base/bed.png');
});

section('Pipoya', 'Boss/Boss 01.png', (PIP) => {
  const bossSheet = P.decode(path.join(PIP, 'Boss', 'Boss 01.png'));
  [['kabut', 1], ['iblis', 3], ['roh', 0], ['pusaran', 2]].forEach(([id, row]) => {
    const s = crop(bossSheet, 0, row * 96, 288, 96);
    save(s, `boss/${id}/idle.png`);
    save(tint(s, [255, 90, 60], 0.35), `boss/${id}/prepare.png`);
    save(tint(s, [255, 170, 60], 0.25), `boss/${id}/attack.png`);
    save(tint(s, [120, 255, 170], 0.45), `boss/${id}/hurt.png`);
    save(tint(s, [40, 40, 60], 0.6), `boss/${id}/death.png`);
  });
  const npcs = { kakek: ['Male', 'Male 09-1'], sari: ['Female', 'Female 18-1'], empu: ['Male', 'Male 01-1'], gapura: ['Male', 'Male 13-1'] };
  for (const [id, [d, f]] of Object.entries(npcs)) copy(path.join(PIP, d, f + '.png'), `base/npc_${id}.png`);
});

section('Efek peluru', 'Fire Effect and Bullet 16x16.png', (EF) => {
  const fire = P.decode(path.join(EF, 'Fire Effect and Bullet 16x16.png'));
  const purple = P.decode(path.join(EF, 'Purple Effect and Bullet 16x16.png'));
  // Bola bulat di tengah lembar efek, satu petak 16x16.
  for (const id of ['kabut', 'roh']) save(crop(purple, 240, 96, 16, 16), `boss/${id}/projectile.png`);
  for (const id of ['iblis', 'pusaran']) save(crop(fire, 240, 96, 16, 16), `boss/${id}/projectile.png`);
});

section('Pixel Crawler', 'Environment/Structures/Stations/Anvil/Anvil.png', (PC) => {
  copy(path.join(PC, 'Environment', 'Structures', 'Stations', 'Anvil', 'Anvil.png'), 'base/anvil.png');
  copy(path.join(PC, 'Environment', 'Structures', 'Stations', 'Bonfire', 'Fire_01-Sheet.png'), 'base/fire.png');
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
