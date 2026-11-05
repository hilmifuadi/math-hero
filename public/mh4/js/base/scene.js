// Math Hero 4: renderer markas top down. Hanya menggambar. Zoom 2, tile 16.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).baseScene = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  const VW = 640, VH = 360, ZOOM = 2, VIEW_W = VW / ZOOM, VIEW_H = VH / ZOOM, T = 16;
  const A = '../assets/mh4/v2/';
  const FILES = {
    grass: 'base/Grass_Middle.png', path: 'base/Path_Tile.png', water: 'base/Water_Tile.png', farm: 'base/FarmLand_Tile.png',
    house: 'base/House_1_Wood_Base_Blue.png', tree: 'base/Oak_Tree.png', decor: 'base/Outdoor_Decor_Free.png',
    fence: 'base/Fences.png', bridge: 'base/Bridge_Wood.png', chest: 'base/Chest.png', anvil: 'base/anvil.png',
    cow: 'base/Cow.png', pig: 'base/Pig.png', sheep: 'base/Sheep.png', chicken: 'base/Chicken.png',
    kakek: 'base/npc_kakek.png', sari: 'base/npc_sari.png', empu: 'base/npc_empu.png', gapura: 'base/npc_gapura.png',
    floor: 'base/floor.png', furn: 'base/furniture.png', bed: 'base/bed.png',
    hero: 'hero/player.png', actions: 'hero/actions.png',
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
    let camX = 0, camY = 0, inited = false;

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
      for (let r = 0; r < map.H; r++) {
        for (let c = 0; c < map.W; c++) {
          if (map.water[r][c] && ok('water')) autotile(g, images.water, map.water, c, r, true);
          if (map.path[r][c] && ok('path')) autotile(g, images.path, map.path, c, r, true);
          if (map.farm[r][c] && ok('farm')) autotile(g, images.farm, map.farm, c, r, false);
        }
      }
      // Papan jembatan: satu strip 48x16 diulang setinggi jalan.
      g.fillStyle = '#6b4226';
      g.fillRect(map.bridge.c * T + 1, map.bridge.r * T, 46, map.bridge.h * T);
      if (ok('bridge')) for (let i = 0; i < map.bridge.h; i++) g.drawImage(images.bridge, 0, 0, 48, 16, map.bridge.c * T, (map.bridge.r + i) * T, 48, 16);
      return off;
    }

    function drawSprite(o) {
      const k = o.sprite;
      if (k === 'fence') {
        if (!ok('fence')) return;
        if (o.kind === 'h') ctx.drawImage(images.fence, 32, 0, T, T, o.x, o.y, T, T);
        else ctx.drawImage(images.fence, 0, 16, T, T, o.x, o.y, T, T);
        return;
      }
      if (!ok(k)) return;
      if (o.sw) ctx.drawImage(images[k], o.sx, o.sy, o.sw, o.sh, o.x, o.y, o.w, o.h);
      else ctx.drawImage(images[k], o.x, o.y, o.w, o.h);
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
      if (g.tool && ok('actions')) {
        // Baris Player_Actions: kapak 3-5 untuk tanam, siram 9-11, cabut 6-8.
        const base = g.tool.name === 'siram' ? 9 : g.tool.name === 'tanam' ? 3 : 6;
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
      base.plots.forEach((p, i) => {
        const s = map.spots.find((x) => x.plot === i);
        const x = s.x + 4, y = s.y + 4;
        ctx.fillStyle = p.watered ? 'rgba(50,30,20,.55)' : 'rgba(70,40,25,.28)';
        ctx.fillRect(x - 1, y - 1, T + 2, T + 2);
        if (p.crop && ok('decor')) {
          const art = CROP_ART[p.crop][Math.min(3, p.stage)];
          ctx.drawImage(images.decor, art[0], art[1], T, T, x, y, T, T);
        }
        if (p.crop && p.stage >= 3) {
          ctx.fillStyle = `rgba(255,240,140,${0.35 + 0.3 * Math.sin(time * 5)})`;
          ctx.fillRect(x - 1, y - 1, T + 2, 2);
        }
      });
    }

    function draw(g, ui) {
      ui = ui || {};
      const time = ui.time || 0;
      const map = g.map;
      if (groundMap !== map.id) { ground = null; groundMap = map.id; inited = false; }
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
        items.push({ y: a.y, f: () => drawChar(a.sprite, a.x, a.y, a.size, a.wait > 0 ? 0 : Math.floor(time * 4) % 2, a.wait > 0 ? 0 : 1, a.flip) });
      }
      for (const n of map.npcs) {
        // Sprite warga sedikit lebih besar dari Bayu, jadi diperkecil agar setara.
        items.push({
          y: n.y,
          f: () => {
            if (!ok(n.sprite)) return;
            ctx.drawImage(images[n.sprite], (Math.floor(time * 2) % 3) * 32, 0, 32, 32, Math.round(n.x) - 13, Math.round(n.y) - 22, 26, 26);
          },
        });
      }
      items.push({ y: g.y, f: () => drawHero(g) });
      items.sort((a, b) => a.y - b.y);
      for (const it of items) it.f();

      // Penanda interaksi di atas hero.
      if (g.near && !ui.hidePrompt) {
        const label = ui.label || g.near.label;
        ctx.font = 'bold 8px system-ui, sans-serif';
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
        ctx.font = 'bold 14px system-ui, sans-serif';
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
        ctx.font = 'bold 16px system-ui, sans-serif';
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
