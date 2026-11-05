// Math Hero 4: renderer markas top down. Hanya menggambar. Zoom 2, tile 16.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).baseScene = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  const VW = 640, VH = 360, ZOOM = 2, VIEW_W = VW / ZOOM, VIEW_H = VH / ZOOM, T = 16;
  const A = '../assets/mh4/v2/';
  const FILES = {
    grass: 'base/Grass_Middle.png', path: 'base/Path_Tile.png', water: 'base/Water_Tile.png', farm: 'base/FarmLand_Tile.png',
    house: 'base/House_1_Wood_Base_Blue.png', houseMerah: 'base/house_merah.png', houseHijau: 'base/house_hijau.png', houseCoklat: 'base/house_coklat.png',
    tree: 'base/Oak_Tree.png', treeS: 'base/Oak_Tree_Small.png', decor: 'base/Outdoor_Decor_Free.png',
    fence: 'base/Fences.png', bridge: 'base/Bridge_Wood.png', chest: 'base/Chest.png', anvil: 'base/anvil.png',
    fountain: 'base/fountain.png', scarecrow: 'base/scarecrow.png',
    cow: 'base/Cow.png', sheep: 'base/Sheep.png', chicken: 'base/Chicken.png',
    kakek: 'base/npc_kakek.png', sari: 'base/npc_sari.png', empu: 'base/npc_empu.png', gapura: 'base/npc_gapura.png', guru: 'base/npc_guru.png', zahra: 'base/npc_zahra.png',
    floor: 'base/floor.png', furn: 'base/furniture.png', bed: 'base/bed.png',
    hero: 'hero/player.png', actions: 'hero/actions.png',
    houseUngu: 'base/house_ungu.png', houseKuning: 'base/house_kuning.png', houseAbu: 'base/house_abu.png',
    cook: 'base/cook.png', props_pc: 'base/props_pc.png', alchemy: 'base/alchemy.png', altar: 'base/altar.png', titu: 'base/titu.png',
  };
  // Tahap tanaman: sel 16x16 di Outdoor_Decor.
  const CROP_ART = {
    wortel: [[48, 16], [64, 16], [48, 32], [64, 32]],
    gandum: [[80, 16], [96, 16], [80, 32], [96, 32]],
  };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function create(canvas) {
    const ctx = canvas.getContext('2d');
    const images = {};
    let pending = 0;
    for (const [k, f] of Object.entries(FILES)) {
      const im = new Image();
      pending++;
      im.onload = im.onerror = () => { pending--; ground = null; };
      im.src = A + f;
      images[k] = im;
    }
    const ok = (k) => images[k] && images[k].complete && images[k].naturalWidth;
    let ground = null, groundMap = null;
    let camX = 0, camY = 0, inited = false, now = 0;

    // Pilih petak 9-slice dari tetangga. Lembar path/air punya sudut dalam di bawahnya.
    function autotile(g, img, mask, c, r, inner) {
      const at = (x, y) => y >= 0 && y < mask.length && x >= 0 && x < mask[0].length ? mask[y][x] : 1;
      const n = at(c, r - 1), s = at(c, r + 1), w = at(c - 1, r), e = at(c + 1, r);
      let sx = (w ? (e ? 1 : 2) : 0) * T, sy = (n ? (s ? 1 : 2) : 0) * T;
      if (inner && n && s && w && e) {
        if (!at(c + 1, r + 1)) { sx = 0; sy = 48; }
        else if (!at(c - 1, r + 1)) { sx = 16; sy = 48; }
        else if (!at(c + 1, r - 1)) { sx = 0; sy = 64; }
        else if (!at(c - 1, r - 1)) { sx = 16; sy = 64; }
      }
      g.drawImage(img, sx, sy, T, T, c * T, r * T, T, T);
    }

    function buildGround(map) {
      const off = typeof document !== 'undefined' ? document.createElement('canvas') : null;
      if (!off) return null;
      off.width = map.W * T; off.height = map.H * T;
      const g = off.getContext('2d');
      g.imageSmoothingEnabled = false;
      if (map.indoor) {
        g.fillStyle = '#2b1c14';
        g.fillRect(0, 0, off.width, off.height);
        for (let r = 2; r < map.H - 1; r++) for (let c = 1; c < map.W - 1; c++) if (ok('floor')) g.drawImage(images.floor, c * T, r * T);
        g.fillStyle = '#6d4a32'; g.fillRect(T, T, (map.W - 2) * T, T + 2);
        g.fillStyle = '#4b3122'; g.fillRect(T, 2 * T, (map.W - 2) * T, 3);
        g.fillStyle = '#8a6242';
        for (let c = 1; c < map.W - 1; c += 2) g.fillRect(c * T + 7, T, 2, T);
        if (ok('floor')) for (let c = 5; c < 7; c++) g.drawImage(images.floor, c * T, (map.H - 1) * T);
        return off;
      }
      for (let r = 0; r < map.H; r++) for (let c = 0; c < map.W; c++) if (ok('grass')) g.drawImage(images.grass, c * T, r * T);
      // Jalan menyambung terus ke jembatan: petak jembatan dianggap jalan saat memilih tepi.
      const pathMask = map.path.map((row) => row.slice());
      for (let r = map.bridge.r; r < map.bridge.r + map.bridge.h; r++) { pathMask[r][map.bridge.c] = 1; pathMask[r][map.bridge.c + 1] = 1; }
      for (let r = 0; r < map.H; r++) {
        for (let c = 0; c < map.W; c++) {
          if (map.water[r][c] && ok('water')) autotile(g, images.water, map.water, c, r, true);
          if (map.path[r][c] && ok('path')) autotile(g, images.path, pathMask, c, r, true);
          if (map.farm[r][c] && ok('farm')) autotile(g, images.farm, map.farm, c, r, false);
        }
      }
      // Jembatan utara-selatan dari gambar aslinya: kepala, papan tengah diulang, lalu kaki.
      if (ok('bridge')) {
        const x = map.bridge.c * T + 2, top = map.bridge.r * T - 2, bottom = (map.bridge.r + map.bridge.h) * T + 2;
        const SX = 106, HEAD = [21, 12], MID = [33, 14], FOOT = [47, 12];
        g.fillStyle = 'rgba(10,40,70,.35)';
        g.fillRect(x + 1, top + 3, 28, bottom - top);
        g.drawImage(images.bridge, SX, HEAD[0], 28, HEAD[1], x, top, 28, HEAD[1]);
        for (let y = top + HEAD[1]; y < bottom - FOOT[1]; y += MID[1]) {
          const h = Math.min(MID[1], bottom - FOOT[1] - y);
          g.drawImage(images.bridge, SX, MID[0], 28, h, x, y, 28, h);
        }
        g.drawImage(images.bridge, SX, FOOT[0], 28, FOOT[1], x, bottom - FOOT[1], 28, FOOT[1]);
      }
      return off;
    }

    // Papan kayu bertulisan, digambar kode supaya bisa diberi nama apa pun.
    function drawSign(o) {
      const cx = o.x + o.w / 2;
      ctx.fillStyle = '#4a2a14'; ctx.fillRect(cx - 1, o.y + 8, 3, o.h - 8);
      ctx.font = 'bold 6px Kleintenna, system-ui, sans-serif';
      const w = Math.max(o.w, ctx.measureText(o.text).width + 8);
      ctx.fillStyle = '#3a2112'; ctx.fillRect(Math.round(cx - w / 2) - 1, o.y - 1, w + 2, 11);
      ctx.fillStyle = '#c98a4a'; ctx.fillRect(Math.round(cx - w / 2), o.y, w, 9);
      ctx.fillStyle = '#2f1a0b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(o.text, cx, o.y + 5);
    }
    // Teratai: daun bulat dengan celah, bunga merah muda pada sebagian.
    function drawLily(o) {
      const bob = Math.round(Math.sin(now * 1.5 + o.seed) * 0.6);
      ctx.fillStyle = '#1f5a2c'; ctx.fillRect(o.x + 1, o.y + 2 + bob, 10, 7);
      ctx.fillStyle = '#4fa04a'; ctx.fillRect(o.x + 2, o.y + 2 + bob, 8, 6); ctx.fillRect(o.x + 1, o.y + 3 + bob, 10, 4);
      ctx.fillStyle = '#2f7a3a'; ctx.fillRect(o.x + 6, o.y + 2 + bob, 1, 3);
      if (o.seed % 3 === 0) {
        ctx.fillStyle = '#f3a3c4'; ctx.fillRect(o.x + 3, o.y + bob, 4, 3);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(o.x + 4, o.y + bob, 2, 1);
        ctx.fillStyle = '#ffd84a'; ctx.fillRect(o.x + 4, o.y + 1 + bob, 2, 1);
      }
    }
    // Perahu kayu kecil yang berlayar bolak-balik di sungai.
    function drawBoat(o) {
      const span = o.to - o.from, p = (now * 10) % (span * 2), x = Math.round(o.from + (p < span ? p : span * 2 - p));
      const dir = p < span ? 1 : -1, y = Math.round(o.y + Math.sin(now * 2) * 1);
      ctx.save(); ctx.translate(x + o.w / 2, y); ctx.scale(dir, 1);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-20, 12, 6, 1); ctx.fillRect(-24, 10, 4, 1);
      ctx.fillStyle = '#3a2112'; ctx.fillRect(-16, 5, 32, 8); ctx.fillRect(-13, 13, 26, 2);
      ctx.fillStyle = '#a0612e'; ctx.fillRect(-15, 6, 30, 5); ctx.fillRect(-12, 11, 24, 2);
      ctx.fillStyle = '#c98a4a'; ctx.fillRect(-15, 6, 30, 1);
      ctx.fillStyle = '#5a3418'; ctx.fillRect(-1, -12, 2, 18);
      ctx.fillStyle = '#fff3d6'; ctx.fillRect(1, -11, 9, 12); ctx.fillRect(1, -11, 11, 6);
      ctx.fillStyle = '#e0463e'; ctx.fillRect(1, -14, 5, 3);
      ctx.restore();
    }

    function drawSprite(o) {
      const k = o.sprite;
      if (k === 'sign') { drawSign(o); return; }
      if (k === 'lily') { drawLily(o); return; }
      if (k === 'boat') { drawBoat(o); return; }
      if (k === 'fence') {
        if (!ok('fence')) return;
        if (o.kind === 'half') ctx.drawImage(images.fence, 32, 0, 9, T, o.x, o.y, 9, T);
        else if (o.kind === 'h') ctx.drawImage(images.fence, 32, 0, T, T, o.x, o.y, T, T);
        else ctx.drawImage(images.fence, 0, 16, T, T, o.x, o.y, T, T);
        return;
      }
      if (!ok(k)) return;
      if (o.frames) ctx.drawImage(images[k], (Math.floor(now * (o.fps || 8)) % o.frames) * o.sw, 0, o.sw, o.sh, o.x, o.y, o.w, o.h);
      else if (o.sw) ctx.drawImage(images[k], o.sx, o.sy, o.sw, o.sh, o.x, o.y, o.w, o.h);
      else ctx.drawImage(images[k], o.x, o.y, o.w, o.h);
      if (k === 'altar') {
        // Kristal Bilangan melayang di atas altar.
        const cx = Math.round(o.x + o.w / 2), cy = Math.round(o.y + 58 + Math.sin(now * 2) * 3);
        ctx.fillStyle = `rgba(120,230,255,${0.22 + 0.1 * Math.sin(now * 3)})`;
        ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1c2a4a';
        ctx.beginPath(); ctx.moveTo(cx, cy - 15); ctx.lineTo(cx + 9, cy); ctx.lineTo(cx, cy + 15); ctx.lineTo(cx - 9, cy); ctx.fill();
        ctx.fillStyle = '#64e3ff';
        ctx.beginPath(); ctx.moveTo(cx, cy - 13); ctx.lineTo(cx + 7, cy); ctx.lineTo(cx, cy + 13); ctx.lineTo(cx - 7, cy); ctx.fill();
        ctx.fillStyle = '#d8f8ff'; ctx.fillRect(cx - 2, cy - 7, 3, 6);
      }
      if (o.glow) {
        // Cahaya api yang berkedip.
        const a = 0.18 + 0.08 * Math.sin(now * 9) + 0.05 * Math.sin(now * 23);
        ctx.fillStyle = `rgba(255,170,70,${a})`;
        ctx.beginPath(); ctx.arc(o.x + o.w / 2, o.y + o.h - 14, 26, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Titu: lembar 32x32, baris bawah, kiri, kanan, atas; tiga kolom jalan.
    function drawPet(p) {
      if (!ok('titu')) return;
      const row = { down: 0, left: 1, right: 2, up: 3 }[p.face] || 0;
      const col = p.moving ? Math.floor(p.t * 8) % 3 : 1;
      const x = Math.round(p.x), y = Math.round(p.y);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x - 6, y - 1, 12, 3);
      if (p.sleep) {
        // Meringkuk: bingkai diam yang dipendekkan, ditambah huruf Z.
        ctx.drawImage(images.titu, 32, 0, 32, 32, x - 12, y - 16, 24, 18);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 7px Kleintenna, system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('z', x + 8, y - 18 - (Math.floor(now * 2) % 3) * 2);
      } else ctx.drawImage(images.titu, col * 32, row * 32, 32, 32, x - 12, y - 22, 24, 24);
      if (p.sayT > 0 && p.say) {
        ctx.font = 'bold 7px Kleintenna, system-ui, sans-serif';
        const w = ctx.measureText(p.say).width + 8;
        ctx.fillStyle = 'rgba(255,248,230,.95)'; ctx.fillRect(x - w / 2, y - 36, w, 10);
        ctx.fillStyle = '#3a2112'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.say, x, y - 31);
      }
    }

    function drawChar(key, x, y, frameW, col, row, flip) {
      if (!ok(key)) return;
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      if (flip) ctx.scale(-1, 1);
      ctx.drawImage(images[key], col * frameW, row * frameW, frameW, frameW, -frameW / 2, -frameW + 6, frameW, frameW);
      ctx.restore();
    }

    function drawHero(g) {
      const faceRow = { down: 0, side: 1, up: 2 }[g.face];
      if (g.tool && g.tool.name === 'panen') {
        // Panen tanpa alat: hasilnya terangkat di atas kepala Arka.
        drawChar('hero', g.x, g.y, 32, 0, faceRow, g.flip);
        const art = g.tool.icon, sheet = g.tool.sheet || 'decor';
        if (art && ok(sheet)) {
          const up = 20 + g.tool.t * 14;
          ctx.drawImage(images[sheet], art[0], art[1], art[2], art[3], Math.round(g.x - 8), Math.round(g.y - up - 16), 16, 16);
        }
        return;
      }
      if (g.tool && ok('actions')) {
        // Baris Player_Actions: cangkul 6-8 untuk menanam, penyiram 9-11.
        const base = g.tool.name === 'siram' ? 9 : 6;
        const col = g.tool.t / g.tool.dur < 0.5 ? 0 : 1;
        ctx.save();
        ctx.translate(Math.round(g.x), Math.round(g.y));
        if (g.flip) ctx.scale(-1, 1);
        ctx.drawImage(images.actions, col * 48, (base + faceRow) * 48, 48, 48, -24, -32, 48, 48);
        ctx.restore();
        return;
      }
      const col = Math.floor(g.t * (g.moving ? 10 : 5)) % 6;
      drawChar('hero', g.x, g.y, 32, col, (g.moving ? 3 : 0) + faceRow, g.flip);
    }

    function drawPlots(map, base, time) {
      if (map.id !== 'kampung' || !base) return;
      const SIZE = 2 * T;
      base.plots.forEach((p, i) => {
        const s = map.spots.find((x) => x.plot === i);
        const x = s.px, y = s.py;
        // Tanah basah lebih gelap, dan alur bajak supaya bedengan tampak digarap.
        if (p.watered) {
          ctx.fillStyle = 'rgba(50,28,18,.45)';
          ctx.fillRect(x + 3, y + 3, SIZE - 6, SIZE - 6);
        }
        ctx.fillStyle = 'rgba(70,38,22,.45)';
        for (let k = 0; k < 4; k++) ctx.fillRect(x + 5, y + 6 + k * 6, SIZE - 10, 2);
        if (p.crop && ok('decor')) {
          // Empat rumpun dalam satu bedengan.
          const art = CROP_ART[p.crop][Math.min(3, p.stage)];
          for (const [ox, oy] of [[1, -1], [15, -1], [1, 13], [15, 13]]) ctx.drawImage(images.decor, art[0], art[1], T, T, x + ox, y + oy, T, T);
        }
        if (p.crop && p.stage >= 3) {
          ctx.fillStyle = `rgba(255,240,140,${0.3 + 0.25 * Math.sin(time * 5)})`;
          ctx.fillRect(x + 2, y + 2, SIZE - 4, SIZE - 4);
        }
      });
    }

    function draw(g, ui) {
      ui = ui || {};
      const time = ui.time || 0;
      now = time;
      const map = g.map;
      const mapKey = map.key || map.id;
      if (groundMap !== mapKey) { ground = null; if (!groundMap || groundMap.split(':')[0] !== map.id) inited = false; groundMap = mapKey; }
      if (!ground && pending === 0) ground = buildGround(map);
      const mapW = map.W * T, mapH = map.H * T;
      const tx = mapW <= VIEW_W ? (mapW - VIEW_W) / 2 : clamp(g.x - VIEW_W / 2, 0, mapW - VIEW_W);
      const ty = mapH <= VIEW_H ? (mapH - VIEW_H) / 2 : clamp(g.y - VIEW_H / 2, 0, mapH - VIEW_H);
      if (!inited) { camX = tx; camY = ty; inited = true; }
      const k = 1 - Math.pow(0.001, ui.dt || 1 / 60);
      camX += (tx - camX) * k; camY += (ty - camY) * k;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = map.indoor ? '#150d09' : '#3f7d3a';
      ctx.fillRect(0, 0, VW, VH);
      ctx.save();
      ctx.scale(ZOOM, ZOOM);
      ctx.translate(-Math.round(camX), -Math.round(camY));
      if (ground) ctx.drawImage(ground, 0, 0);
      for (const o of map.objects) if (o.ground) drawSprite(o);
      drawPlots(map, ui.base, time);

      // Urutkan menurut kaki supaya hero bisa berjalan di depan dan di belakang benda.
      const items = [];
      for (const o of map.objects) if (!o.ground) items.push({ y: o.base, f: () => drawSprite(o) });
      for (const a of g.animals) {
        items.push({
          y: a.y,
          f: () => {
            drawChar(a.sprite, a.x, a.y, a.size, a.wait > 0 ? 0 : Math.floor(time * 4) % 2, a.wait > 0 ? 0 : 1, a.flip);
            if (g.animalReady && g.animalReady(a.sprite)) {
              // Tanda ada hasil yang bisa diambil.
              const by = a.y - 24 + Math.sin(time * 4) * 1.5;
              ctx.fillStyle = '#fff3d6'; ctx.fillRect(Math.round(a.x) - 5, Math.round(by) - 6, 10, 11);
              ctx.strokeStyle = '#3a2112'; ctx.lineWidth = 1; ctx.strokeRect(Math.round(a.x) - 4.5, Math.round(by) - 5.5, 9, 10);
              ctx.fillStyle = '#b5451f'; ctx.font = 'bold 9px Kleintenna, system-ui, sans-serif';
              ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.fillText('!', Math.round(a.x), Math.round(by));
            }
          },
        });
      }
      for (const n of map.npcs) {
        // Sprite warga sedikit lebih besar dari Arka, jadi diperkecil agar setara.
        items.push({
          y: n.y,
          f: () => {
            if (!ok(n.sprite)) return;
            ctx.drawImage(images[n.sprite], (Math.floor(time * 2) % 3) * 32, 0, 32, 32, Math.round(n.x) - 13, Math.round(n.y) - 22, 26, 26);
          },
        });
      }
      items.push({ y: g.y, f: () => drawHero(g) });
      if (g.pet) items.push({ y: g.pet.y, f: () => drawPet(g.pet) });
      items.sort((a, b) => a.y - b.y);
      for (const it of items) it.f();

      // Penanda interaksi di atas hero.
      if (g.near && !ui.hidePrompt) {
        const label = ui.label || g.near.label;
        ctx.font = 'bold 8px Kleintenna, system-ui, sans-serif';
        ctx.textAlign = 'center';
        const w = ctx.measureText(label).width + 10;
        const px = clamp(g.x, camX + w / 2 + 2, camX + VIEW_W - w / 2 - 2), py = g.y - 34;
        ctx.fillStyle = 'rgba(58,33,18,.92)';
        ctx.fillRect(px - w / 2, py - 7, w, 12);
        ctx.strokeStyle = '#d9a35a'; ctx.lineWidth = 1;
        ctx.strokeRect(px - w / 2 + 0.5, py - 6.5, w - 1, 11);
        ctx.fillStyle = '#fff3d6';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, px, py);
      }
      ctx.restore();

      // Kabut Kacau: menipis setiap boss kalah, tanda kemajuan cerita di kampung.
      if (!map.indoor && ui.fog > 0) {
        ctx.fillStyle = `rgba(82,60,130,${ui.fog})`;
        ctx.fillRect(0, 0, VW, VH);
      }

      // HUD ringkas memakai warna papan kayu.
      if (ui.hud) {
        ctx.font = 'bold 14px Kleintenna, system-ui, sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        const w = ctx.measureText(ui.hud).width + 22;
        ctx.fillStyle = 'rgba(58,33,18,.92)';
        ctx.fillRect(10, 8, w, 28);
        ctx.strokeStyle = '#d9a35a'; ctx.lineWidth = 2;
        ctx.strokeRect(11, 9, w - 2, 26);
        ctx.fillStyle = '#ffe9b8';
        ctx.fillText(ui.hud, 21, 23);
      }
      if (ui.toast) {
        ctx.font = 'bold 16px Kleintenna, system-ui, sans-serif';
        ctx.textAlign = 'center';
        const w = ctx.measureText(ui.toast).width + 28;
        ctx.fillStyle = 'rgba(0,0,0,.72)';
        ctx.fillRect(VW / 2 - w / 2, 44, w, 30);
        ctx.fillStyle = '#fff';
        ctx.fillText(ui.toast, VW / 2, 60);
      }
    }

    return { draw, ready: () => pending === 0, images };
  }

  return { create };
});
