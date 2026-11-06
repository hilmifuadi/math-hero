// Math Hero 4: renderer landscape 640x360 dengan kamera dunia 320x180 (zoom 2x).
// Murni gambar: tidak mengubah state game. Semua posisi memakai satuan dunia (tile 16 px).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).scene = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  const VW = 640, VH = 360, LEVEL_ZOOM = 2, ARENA_ZOOM = 1.5;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  // Sel gambar, ukuran gambar di dunia, dan baris kaki pada sel.
  // Hero dan musuh digambar 1:1, jadi kepadatan pikselnya sama dengan tile dan tidak terlalu besar.
  const ENEMY_ART = {
    walker: { frame: 32, draw: 32, foot: 23 },
    jumper: { frame: 64, draw: 64, foot: 40 },
    shooter: { frame: 32, draw: 32, foot: 23 },
    flyer: { frame: 32, draw: 32, foot: 24 },
    charger: { frame: 64, draw: 64, foot: 62 },
    ogre: { frame: 64, draw: 96, foot: 62, sheet: 'charger' },
    goblin: { frame: 64, draw: 48, foot: 62 }, rogue: { frame: 64, draw: 48, foot: 62 }, shaman: { frame: 64, draw: 48, foot: 62 },
    mage: { frame: 64, draw: 48, foot: 62 }, chick: { frame: 32, draw: 24, foot: 23 }, ambusher: { frame: 64, draw: 48, foot: 62 }, guard: { frame: 64, draw: 48, foot: 62 }, plant: { frame: 64, draw: 48, foot: 62 },
    slimeking: { frame: 64, draw: 112, foot: 40, sheet: 'jumper' },
  };
  const HERO_ART = { frame: 32, draw: 32, foot: 23 };
  // Potongan lembar senjata kayu per senjata, dan perlengkapan yang tampak di tubuh Arka.
  // grip = titik genggam (rasio lebar, tinggi gambar), rest = sudut saat dibawa.
  const WEAPON_ART = {
    pedang: [0, 0, 7, 19], tombak: [20, 0, 7, 23], palu: [40, 0, 15, 20],
    blaster: [60, 0, 18, 9], pelontar: [80, 0, 17, 11], pantul: [100, 0, 9, 15],
    'pedang-angin': [0, 0, 7, 19], bumerang: [80, 0, 17, 11], 'panah-cahaya': [60, 0, 18, 9],
  };
  // Senjata pamungkas memakai gambar senjata dasar dengan warna lain.
  const WEAPON_HUE = { 'pedang-angin': 150, bumerang: 40, 'panah-cahaya': 60 };
  const WEAPON_HOLD = {
    pedang: { grip: [0.5, 0.86], rest: 0.6 }, tombak: { grip: [0.5, 0.72], rest: 0.3 }, palu: { grip: [0.5, 0.86], rest: 0.5 },
    blaster: { grip: [0.2, 0.65], rest: 0, ranged: true }, pelontar: { grip: [0.2, 0.75], rest: -0.45, ranged: true }, pantul: { grip: [0.6, 0.5], rest: 0, ranged: true },
    'pedang-angin': { grip: [0.5, 0.86], rest: 0.6 }, bumerang: { grip: [0.2, 0.75], rest: -0.45, ranged: true }, 'panah-cahaya': { grip: [0.2, 0.65], rest: 0, ranged: true },
  };
  // Naik turun tubuh tiap bingkai lembar hero, supaya tangan ikut bergerak.
  const HERO_BOB = { idle: [0, 0, 1, 1, 0, 0], run: [-2, -1, 0, -2, -1, 0] };
  // Lubang isi pada ui/bar.png, dalam rasio ukuran gambar.
  const BAR_HOLE = { x: 6 / 61, w: 52 / 61, y: 3 / 12, h: 6 / 12 };
  const ARMOR_ART = { 'rompi-kulit': [119, 19, 17, 24], 'zirah-besi': [145, 0, 14, 16], 'jubah-bintang': [128, 0, 16, 16] };

  function create(canvas, theme, bossDef) {
    // Arena boss lebih zoomed out supaya hero, boss, dan semua tanda serangan selalu sebingkai.
    const ZOOM = bossDef ? ARENA_ZOOM : LEVEL_ZOOM;
    const VIEW_W = VW / ZOOM, VIEW_H = VH / ZOOM;
    const ctx = canvas.getContext('2d');
    canvas.width = VW; canvas.height = VH;
    ctx.imageSmoothingEnabled = false;
    const images = {};
    let loaded = 0, total = 0;
    const paths = [];
    const add = (key, src) => { if (src) { paths.push([key, src]); total++; } };
    add('bg', theme.bg);
    (theme.layers || []).forEach((l, i) => add('layer.' + i, l.src));
    for (const k of ['spike', 'star', 'flag', 'portal', 'gate', 'lock', 'spring', 'pipe', 'dash', 'saw', 'weapons', 'bomb']) add('obj.' + k, '../assets/mh4/v2/world/' + k + '.png');
    Object.entries(theme.tiles).forEach(([k, v]) => add('tile.' + k, v));
    Object.entries(theme.decor).forEach(([k, v]) => add('decor.' + k, v));
    // Arka, musuh, dan peti memakai satu keluarga gambar di semua tema (assets/mh4/v2).
    add('hero.sheet', '../assets/mh4/v2/hero/player.png');
    add('chest', '../assets/mh4/v2/base/Chest.png');
    add('ui.bar', '../assets/mh4/v2/ui/bar.png');
    add('ui.weapons', '../assets/mh4/v2/ui/weapons.png');
    add('ui.plank', '../assets/mh4/v2/ui/plank.png');
    add('fx.burst', '../assets/mh4/v2/fx/burst.png');
    add('fx.wave', '../assets/mh4/v2/fx/wave.png');
    add('base.decor', '../assets/mh4/v2/base/Outdoor_Decor_Free.png');
    add('base.fence', '../assets/mh4/v2/base/Fences.png');
    // Sprite musuh level biasa: lima tipe dengan lima state animasi.
    const enemyStates = ['Idle', 'Walk', 'Attack', 'Hurt', 'Death'];
    for (const id of ['walker', 'jumper', 'shooter', 'flyer', 'charger', 'goblin', 'rogue', 'shaman', 'mage', 'ambusher', 'guard', 'plant', 'chick']) {
      for (const st of enemyStates) add('enemy.' + id + '.' + st, '../assets/mh4/v2/enemies/' + id + '/' + st + '.png');
    }
    // Sprite boss hanya dimuat bila level memakai boss; level biasa tidak menambah request.
    if (bossDef && bossDef.sprite) {
      for (const k of ['idle', 'prepare', 'attack', 'hurt', 'death']) add('boss.' + k, bossDef.sprite + '/' + k + '.png');
      add('boss.walk', bossDef.sprite + '/walk.png');
      add('boss.projectile', bossDef.sprite + '/projectile.png');
    }
    for (const [key, src] of paths) {
      const im = new Image();
      im.onload = () => { loaded++; };
      im.onerror = () => { loaded++; };
      im.src = src;
      images[key] = im;
    }
    const ready = () => total === 0 || loaded >= total;
    let camX = 0, camY = 0, inited = false, curGame = null;

    function chAt(level, c, r) {
      if (r < 0 || r >= level.map.length) return '.';
      const row = level.map[r];
      return (c >= 0 && c < row.length) ? row[c] : '.';
    }
    const solidCh = (ch) => ch === '#' || ch === 'G' || ch === 'L';

    function groundRow(level, c) {
      const rows = level.map.length;
      for (let r = 0; r + 1 < rows; r++) {
        if (level.map[r][c] === '#' && level.map[r + 1][c] === '#' && (r === 0 || level.map[r - 1][c] !== '#')) return r;
      }
      return -1;
    }

    function drawImage(key, x, y, w, h) {
      const im = images[key];
      if (im && im.complete && im.naturalWidth) ctx.drawImage(im, x, y, w, h);
    }

    function drawBg(level) {
      ctx.fillStyle = theme.palette.sky;
      ctx.fillRect(0, 0, VW, VH);
      const im = images.bg;
      if (im && im.complete && im.naturalWidth) ctx.drawImage(im, 0, 0, VW, VH);
      // Lapisan digambar pada kelipatan dua piksel supaya sama padat dengan hero.
      (theme.layers || []).forEach((l, i) => {
        const lay = images['layer.' + i];
        if (!lay || !lay.complete || !lay.naturalWidth) return;
        const off = -(Math.round(camX * l.f) * 2 % VW);
        ctx.drawImage(lay, off, 0, VW, VH);
        ctx.drawImage(lay, off + VW, 0, VW, VH);
      });
    }

    function drawDecor(level, c0, c1, r0, r1) {
      const seed = level.seed || 0;
      const kinds = Object.keys(theme.decor);
      const start = Math.max(0, c0 - 4);
      for (let c = start - (start % 5); c <= c1 + 2; c += 5) {
        for (let g = Math.max(2, r0); g <= r1 + 1; g++) {
          if (chAt(level, c, g) !== '#' || chAt(level, c, g - 1) !== '.' || chAt(level, c, g - 2) !== '.') continue;
          const h = ((Math.imul(c + 7, 1103515245) + Math.imul(seed + 3 + g, 12345)) >>> 16);
          if (h % 5 === 0) continue;
          const kind = kinds[h % kinds.length];
          const [w, hh] = theme.decorSize[kind];
          if (hh > 32 && (chAt(level, c, g - 3) !== '.' || chAt(level, c, g - 4) !== '.')) continue;
          // Hiasan menapak di tanah, tepat di atas tutup tanah.
          const gap = Math.round(bottomGap('decor.' + kind) * hh);
          drawImage('decor.' + kind, Math.round(c * 16 + (16 - w) / 2), g * 16 - hh + gap, w, hh);
        }
      }
    }

    // Bagian bawah gambar yang transparan, sebagai pecahan tinggi gambar. Disimpan per gambar.
    const gaps = {};
    function bottomGap(key) {
      if (gaps[key] !== undefined) return gaps[key];
      const im = images[key];
      if (!im || !im.complete || !im.naturalWidth) return 0;
      let gap = 0;
      try {
        const off = document.createElement('canvas');
        off.width = im.naturalWidth; off.height = im.naturalHeight;
        const g = off.getContext('2d');
        g.drawImage(im, 0, 0);
        const d = g.getImageData(0, 0, off.width, off.height).data;
        let last = off.height - 1, found = false;
        for (; last >= 0 && !found; last--) {
          for (let x = 0; x < off.width; x++) if (d[(last * off.width + x) * 4 + 3] > 30) { found = true; break; }
        }
        gap = (off.height - 2 - last) / off.height;
      } catch (e) { gap = 0; }
      gaps[key] = Math.max(0, gap);
      return gaps[key];
    }

    function drawTiles(level, c0, c1, r0, r1) {
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const ch = chAt(level, c, r);
          const x = c * 16, y = r * 16;
          if (ch === '#') {
            const open = !solidCh(chAt(level, c, r - 1));
            const fill = images['tile.fill'], top = images['tile.top'];
            // Tekstur 48x48 diulang menurut posisi petak, jadi batu menyambung tanpa pola kaku.
            if (fill && fill.complete && fill.naturalWidth) ctx.drawImage(fill, (c % (fill.naturalWidth / 16)) * 16, (r % (fill.naturalHeight / 16)) * 16, 16, 16, x, y, 16, 16);
            if (!open) {
              // Makin dalam makin gelap dalam tiga tingkat datar.
              // Kedalaman dihitung juga dari kolom sekitar, supaya bawah menara tidak jadi lajur gelap.
              let depth = 4;
              for (let k = c - 2; k <= c + 2; k++) {
                let d = 0;
                while (d < 4 && solidCh(chAt(level, k, r - d - 1))) d++;
                depth = Math.min(depth, d);
              }
              if (depth >= 2) { ctx.fillStyle = `rgba(16,10,24,${[0, 0, 0.12, 0.22, 0.3][depth]})`; ctx.fillRect(x, y, 16, 16); }
            }
            // Garis tepi pada sisi yang terbuka, sama seperti garis tepi sprite.
            const leftOpen = !solidCh(chAt(level, c - 1, r)), rightOpen = !solidCh(chAt(level, c + 1, r));
            ctx.fillStyle = '#1c1426';
            if (leftOpen && c > 0) ctx.fillRect(x, y, 1, 16);
            if (rightOpen && c < level.map[0].length - 1) ctx.fillRect(x + 15, y, 1, 16);
            if (!solidCh(chAt(level, c, r + 1)) && r < level.map.length - 1) ctx.fillRect(x, y + 15, 16, 1);
            if (open && top && top.complete && top.naturalWidth) {
              const v = leftOpen && c > 0 ? 3 : rightOpen && c < level.map[0].length - 1 ? 4 : (c * 7 + r * 3) % 3;
              ctx.drawImage(top, v * 16, 0, 16, 16, x, y, 16, 16);
            }
          } else if (ch === '=') {
            const left = chAt(level, c - 1, r) === '=', right = chAt(level, c + 1, r) === '=';
            const im = images['tile.platform'];
            const v = !left ? 0 : !right ? 2 : 1;
            if (im && im.complete && im.naturalWidth) ctx.drawImage(im, v * 16, 0, 16, 16, x, y, 16, 16);
          } else if (ch === 'G') {
            // Pagar kayu kampung yang dipasang warga, hilang setelah soal terjawab.
            if (curGame.L.tiles[r * curGame.L.cols + c]) drawImage('obj.gate', x, y, 16, 16);
          } else if (ch === 'L') {
            if (curGame.L.tiles[r * curGame.L.cols + c]) drawImage('obj.lock', x, y, 16, 16);
          } else if (ch === '^') {
            drawImage('obj.spike', x, y, 16, 16);
          }
        }
      }
    }

    // Mekanik peta dari MH3.
    function drawMech(game, time) {
      const L = game.L, plat = images['tile.platform'];
      const hasPlat = plat && plat.complete && plat.naturalWidth;
      for (const c of L.crumbles) {
        if (c.state === 'gone' || !hasPlat) continue;
        const dx = c.state === 'shake' ? Math.round(Math.sin(time * 60)) : 0;
        ctx.drawImage(plat, 16, 0, 16, 16, c.x + dx, c.y, 16, 16);
        // Retakan menandai papan yang akan runtuh.
        ctx.fillStyle = '#1c1426';
        ctx.fillRect(c.x + dx + 4, c.y + 1, 1, 3); ctx.fillRect(c.x + dx + 5, c.y + 3, 2, 1);
        ctx.fillRect(c.x + dx + 11, c.y + 2, 1, 3); ctx.fillRect(c.x + dx + 9, c.y + 2, 2, 1);
      }
      for (const m of L.movers) {
        if (!hasPlat) continue;
        const x = Math.round(m.x), y = Math.round(m.y);
        ctx.drawImage(plat, 0, 0, 16, 16, x, y, 16, 16);
        ctx.drawImage(plat, 16, 0, 16, 16, x + 16, y, 16, 16);
        ctx.drawImage(plat, 32, 0, 16, 16, x + 32, y, 16, 16);
      }
      for (const s of L.springs) {
        const im = images['obj.spring'];
        if (im && im.complete && im.naturalWidth) ctx.drawImage(im, s.t > 0 ? 16 : 0, 0, 16, 16, s.x - 2, s.y - 8, 16, 16);
      }
      for (const d of L.dashes) {
        const im = images['obj.dash'];
        if (!im || !im.complete || !im.naturalWidth) continue;
        const f = Math.floor(time * 6) % 2;
        ctx.save();
        ctx.translate(d.x + 6, d.y + 24);
        if (d.dir < 0) ctx.scale(-1, 1);
        ctx.drawImage(im, f * 16, 0, 16, 16, -8, -8, 16, 16);
        ctx.restore();
      }
      for (const s of L.saws) {
        const im = images['obj.saw'];
        if (im && im.complete && im.naturalWidth) ctx.drawImage(im, (Math.floor(time * 16) % 2) * 16, 0, 16, 16, s.cx - 8, s.cy - 8, 16, 16);
      }
      const pipe = images['obj.pipe'];
      if (pipe && pipe.complete && pipe.naturalWidth) {
        for (const m of L.doors) ctx.drawImage(pipe, 20, 0, 20, 24, m.cx - 10, m.foot - 24, 20, 24);
      }
      // Petunjuk masuk pintu.
      if (game.nearDoor) {
        const d = game.nearDoor, y = d.foot - 34;
        ctx.font = 'bold 8px Kleintenna, system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const w = ctx.measureText('\u25BC Masuk').width + 8;
        ctx.fillStyle = 'rgba(58,33,18,.92)'; ctx.fillRect(d.cx - w / 2, y - 6, w, 12);
        ctx.fillStyle = '#fff3d6'; ctx.fillText('\u25BC Masuk', d.cx, y);
        ctx.textAlign = 'left';
      }
    }

    function drawObjects(level, game, time) {
      drawMech(game, time);
      const starIm = images['obj.star'], flagIm = images['obj.flag'], portalIm = images['obj.portal'];
      const has = (im) => im && im.complete && im.naturalWidth;
      for (const s of game.L.stars) {
        if (s.got || !has(starIm)) continue;
        const f = Math.floor(time * 6 + s.id) % 4;
        ctx.drawImage(starIm, f * 11, 0, 11, 11, Math.round(s.cx - 5.5), Math.round(s.cy - 5.5 + Math.sin(time * 3 + s.id) * 1.5), 11, 11);
      }
      for (const c of game.L.checkpoints) {
        if (!has(flagIm)) continue;
        const f = Math.floor(time * 4) % 2;
        ctx.drawImage(flagIm, f * 16, c.got ? 28 : 0, 16, 28, Math.round(c.cx - 4), Math.round(c.cy - 28), 16, 28);
      }
      for (const ch of game.L.chests) {
        const x = ch.x - 1, y = ch.y - 1;
        if (!ch.got) {
          ctx.fillStyle = 'rgba(255,240,150,.3)';
          ctx.beginPath(); ctx.arc(x + 8, y + 8, 14 + Math.sin(time * 4) * 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = ch.got ? 0.45 : 1;
        drawImage('chest', x, y, 16, 16);
        ctx.globalAlpha = 1;
      }
      const goal = game.L.goal;
      if (goal) {
        const locked = game.boss && !game.boss.defeated;
        // Gerbang batu menapak di tanah. Terkunci sampai boss kalah.
        if (has(portalIm)) {
          const f = Math.floor(time * 8) % 4;
          const x = Math.round(goal.x + goal.w / 2 - 16), y = Math.round(goal.y + goal.h - 40);
          ctx.drawImage(portalIm, f * 32, locked ? 40 : 0, 32, 40, x, y, 32, 40);
        }
      }
      if (game.quiz) {
        // Balok angka: sundul atau pukul jawaban yang benar.
        for (const b of game.quiz.blocks) {
          if (b.dead) continue;
          const bob = Math.sin(time * 3 + b.index) * 1.5;
          const plank = images['ui.plank'];
          if (plank && plank.complete && plank.naturalWidth) ctx.drawImage(plank, b.x - 2, b.y - 2 + bob, 20, 20);
          else { ctx.fillStyle = '#8a5a2b'; ctx.fillRect(b.x, b.y + bob, 16, 16); }
          ctx.font = `bold ${String(b.value).length > 3 ? 7 : 9}px Kleintenna, system-ui, sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 2; ctx.strokeStyle = '#2a1608';
          ctx.strokeText(String(b.value), b.x + 8, b.y + 8.5 + bob);
          ctx.fillStyle = '#fff3d6';
          ctx.fillText(String(b.value), b.x + 8, b.y + 8.5 + bob);
          ctx.textAlign = 'left';
        }
      }
      // Musuh level biasa: sprite per tipe, dengan kotak cadangan bila aset gagal dimuat.
      for (const e of game.enemies) {
        if (e.dead || !e.alive) continue;
        const anim = e.anim || 'idle';
        const state = anim === 'walk' ? 'Walk' : anim === 'attack' ? 'Attack'
          : anim === 'hurt' ? 'Hurt' : 'Idle';
        const key = 'enemy.' + ((ENEMY_ART[e.kind] && ENEMY_ART[e.kind].sheet) || e.kind || 'walker') + '.' + state;
        const im = images[key];
        if (im && im.complete && im.naturalWidth) {
          const art = ENEMY_ART[e.kind] || ENEMY_ART.walker;
          const frame = art.frame;
          const count = Math.max(1, Math.floor(im.naturalWidth / frame));
          const rate = state === 'Walk' ? 8 : state === 'Attack' ? 9 : state === 'Hurt' ? 6 : 4;
          const idx = Math.floor((e.animT || 0) * rate + e.id * 0.37) % count;
          const dw = art.draw, dh = art.draw, k = art.draw / frame;
          const cx = e.x + e.w / 2, bottom = e.y + e.h;
          ctx.save();
          if (e.dir < 0) { ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.translate(-cx, 0); }
          ctx.drawImage(im, idx * frame, 0, frame, frame, cx - dw / 2, bottom - art.foot * k, dw, dh);
          ctx.restore();
        } else {
          ctx.fillStyle = e.hurtT > 0 ? '#ffffff' : '#b04ad9';
          ctx.fillRect(e.x, e.y, e.w, e.h);
        }
        if (e.kind === 'guard') {
          // Tameng di sisi depan: serang dari belakang atau injak dari atas.
          const sx = Math.round(e.x + e.w / 2 + e.dir * 7), sy = Math.round(e.y + 2);
          ctx.fillStyle = '#1c1426'; ctx.fillRect(sx - 3, sy - 1, 6, 12);
          ctx.fillStyle = '#7fa8d8'; ctx.fillRect(sx - 2, sy, 4, 10);
          ctx.fillStyle = '#e6ecf2'; ctx.fillRect(sx - 1, sy + 1, 1, 7);
        }
        if (e.warnT > 0) {
          // Kilau laras sebelum penembak melepas tembakan.
          ctx.fillStyle = 'rgba(255,190,90,.85)';
          ctx.beginPath();
          ctx.arc(e.x + e.w / 2 + e.dir * 8, e.y + e.h / 2, 2.4 + Math.sin(time * 20) * .6, 0, Math.PI * 2);
          ctx.fill();
        }
        // HP musuh: bar kecil hanya muncul setelah terkena damage.
        if (e.hp < e.maxHp) {
          const w = e.w;
          ctx.fillStyle = 'rgba(0,0,0,.6)';
          ctx.fillRect(e.x, e.y - 5, w, 3);
          ctx.fillStyle = '#ff6b6b';
          ctx.fillRect(e.x, e.y - 5, w * Math.max(0, e.hp / e.maxHp), 3);
        }
      }
      // Tembakan musuh.
      for (const b of (game.bullets || [])) {
        // Bola sihir bulat dengan warna tiap penyerang.
        const bx = Math.round(b.x), by = Math.round(b.y), bw = b.w, bh = b.h;
        ctx.fillStyle = '#1c1426';
        ctx.fillRect(bx + 1, by - 1, bw - 2, bh + 2); ctx.fillRect(bx - 1, by + 1, bw + 2, bh - 2);
        ctx.fillStyle = b.color || '#ffb066';
        ctx.fillRect(bx + 1, by, bw - 2, bh); ctx.fillRect(bx, by + 1, bw, bh - 2);
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.fillRect(bx + 2, by + 1, 2, 2);
      }
    }

    // Proyektil, ayunan melee, boss, dan angka damage. Semua hanya membaca state.
    // ===== Efek =====
    let darkCanvas = null;
    let parts = [], corpses = [], shake = 0, bossFall = null, banner = null, frameDt = 1 / 60;
    const rand = (a, b) => a + Math.random() * (b - a);
    function burst(x, y, n, colors, speed, life, grav, size) {
      for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2), v = rand(speed * 0.3, speed);
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(life * 0.5, life), max: life, g: grav, s: size || 2, c: colors[i % colors.length] });
      }
    }
    const FIRE = ['#fff3b0', '#ffd84a', '#ff9c3a', '#e0463e'], SMOKE = ['#6a6a78', '#8a8a98', '#4a4a58'], GOLD = ['#fff3b0', '#ffd84a', '#c98f22'];
    function explosion(x, y, r) {
      burst(x, y, 16, FIRE, r * 5, 0.45, 60, 3);
      burst(x, y, 8, SMOKE, r * 2, 0.8, -30, 3);
      parts.push({ ring: true, x, y, r: 2, rMax: r * 1.3, life: 0.25, max: 0.25, c: '#fff3b0' });
    }
    function drainVfx(game) {
      for (const v of game.vfx || []) {
        if (v.t === 'hit') {
          burst(v.x, v.y, 6, ['#ffffff', '#fff3b0', '#ffd84a'], 110, 0.22, 0, 2);
          parts.push({ flash: true, x: v.x, y: v.y, life: 0.09, max: 0.09 });
          shake = Math.max(shake, 1.2);
        } else if (v.t === 'boom') { explosion(v.x, v.y, v.r); shake = Math.max(shake, 4); }
        else if (v.t === 'flash') { burst(v.x, v.y, 24, GOLD, 170, 0.5, 0, 2); parts.push({ ring: true, x: v.x, y: v.y, r: 4, rMax: v.r, life: 0.35, max: 0.35, c: '#fff3b0' }); shake = Math.max(shake, 3); }
        else if (v.t === 'bounce') burst(v.x, v.y, 6, ['#ffffff', '#c9a2ff'], 70, 0.2, 0, 2);
        else if (v.t === 'die') {
          corpses.push({ kind: v.kind, x: v.x, y: v.y, dir: v.dir, t: 0, boss: v.boss, vy: -70 });
          shake = Math.max(shake, v.boss ? 9 : 2.5);
          if (v.boss) banner = { text: 'MINI BOSS KALAH!', sub: 'Jalan terbuka', t: 0, dur: 2.2 };
        } else if (v.t === 'bossdie') bossFall = { t: 0, next: 0, big: false, b: game.boss };
      }
      if (game.vfx) game.vfx.length = 0;
    }
    function stepFx(dt) {
      shake = Math.max(0, shake - dt * 18);
      for (const p of parts) {
        p.life -= dt;
        if (p.ring) { p.r += (p.rMax - p.r) * Math.min(1, dt * 20); continue; }
        if (p.flash) continue;
        p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      }
      parts = parts.filter((p) => p.life > 0);
      if (banner) { banner.t += dt; if (banner.t > banner.dur) banner = null; }
      if (bossFall) {
        const f = bossFall, b = f.b;
        f.t += dt;
        if (f.t < 1.7) {
          f.next -= dt;
          if (f.next <= 0) {
            f.next = 0.13;
            explosion(rand(b.x, b.x + b.w), rand(b.y - 10, b.y + b.h), 14);
            shake = Math.max(shake, 4);
          }
        } else if (!f.big) {
          f.big = true;
          shake = 14;
          burst(b.x + b.w / 2, b.y + b.h / 2, 70, FIRE, 220, 1.0, 40, 3);
          burst(b.x + b.w / 2, b.y + b.h / 2, 40, GOLD, 170, 1.8, 90, 3);
          banner = { text: (b.schema && b.schema.nama ? b.schema.nama : 'BOSS').toUpperCase() + ' KALAH!', sub: 'Luar biasa, Arka!', t: 0, dur: 3.4, big: true };
        } else if (f.t < 4.6 && Math.random() < dt * 30) {
          // Hujan bintang kemenangan.
          parts.push({ x: rand(b.x - 120, b.x + b.w + 120), y: b.y - 60, vx: rand(-10, 10), vy: rand(30, 60), g: 30, life: 1.6, max: 1.6, s: 3, c: GOLD[Math.floor(rand(0, 3))] });
        }
      }
    }
    function drawParts() {
      for (const p of parts) {
        const a = Math.max(0, p.life / p.max);
        if (p.ring) {
          ctx.globalAlpha = a; ctx.strokeStyle = p.c; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke();
        } else if (p.flash) {
          ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff';
          ctx.fillRect(Math.round(p.x) - 6, Math.round(p.y) - 1, 12, 2); ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 6, 2, 12);
        } else {
          ctx.globalAlpha = Math.min(1, a * 1.6); ctx.fillStyle = p.c;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
        }
      }
      ctx.globalAlpha = 1;
    }
    // Musuh kalah: terpental, memutih, lalu pecah jadi percikan.
    function drawCorpses(dt) {
      for (const c of corpses) {
        c.t += dt; c.y += c.vy * dt; c.vy += 260 * dt;
        const art = ENEMY_ART[c.kind] || ENEMY_ART.walker;
        const im = images['enemy.' + (art.sheet || c.kind) + '.Death'];
        const dur = c.boss ? 1.1 : 0.45;
        if (im && im.complete && im.naturalWidth) {
          const count = Math.max(1, Math.floor(im.naturalWidth / art.frame));
          const idx = Math.min(count - 1, Math.floor((c.t / dur) * count));
          const k = art.draw / art.frame;
          ctx.save();
          ctx.translate(Math.round(c.x), 0);
          if (c.dir < 0) ctx.scale(-1, 1);
          ctx.globalAlpha = Math.floor(c.t * 24) % 2 === 0 ? 1 : 0.55;
          ctx.drawImage(im, idx * art.frame, 0, art.frame, art.frame, -art.draw / 2, Math.round(c.y - art.foot * k), art.draw, art.draw);
          ctx.restore();
        }
        if (c.boss && Math.floor(c.t * 8) !== Math.floor((c.t - dt) * 8)) explosion(c.x + rand(-16, 16), c.y - rand(0, 34), 12);
        if (c.t >= dur) {
          c.done = true;
          burst(c.x, c.y - 8, c.boss ? 40 : 14, ['#ffffff', '#d8d8e8', '#a7b2c0'], c.boss ? 160 : 80, 0.5, 40, 2);
          burst(c.x, c.y - 8, c.boss ? 24 : 6, GOLD, c.boss ? 130 : 70, 0.8, 200, 2);
        }
      }
      corpses = corpses.filter((c) => !c.done);
    }
    // Boss kalah: bergetar dan berkedip putih sambil meledak, lalu lenyap dalam ledakan besar.
    function drawBossFall(time) {
      const f = bossFall;
      if (!f || f.t >= 1.7) return;
      const b = f.b, im = images['boss.hurt'] || images['boss.idle'];
      if (!im || !im.complete || !im.naturalWidth) return;
      const frame = (b.schema && b.schema.spriteFrame) || 96;
      const count = Math.max(1, Math.floor(im.naturalWidth / frame));
      const art = (b.schema && b.schema.art) || { scale: Math.min(1.5, 116 / frame), foot: frame };
      const h = frame * art.scale;
      ctx.save();
      ctx.translate(b.x + b.w / 2 + rand(-3, 3), b.y + b.h + rand(-2, 2));
      ctx.scale(b.facing < 0 ? -1 : 1, 1);
      if (Math.floor(time * 18) % 2 === 0) ctx.filter = 'brightness(1.8)';
      ctx.drawImage(im, (Math.floor(time * 8) % count) * frame, 0, frame, frame, -h / 2, -art.foot * art.scale, h, h);
      ctx.restore();
    }
    function drawShot(s, time) {
      const cx = Math.round(s.x + s.w / 2), cy = Math.round(s.y + s.h / 2), dir = s.vx < 0 ? -1 : 1;
      if (s.weapon === 'pelontar') {
        const im = images['obj.bomb'];
        if (Math.random() < 0.4) parts.push({ x: cx, y: cy, vx: rand(-8, 8), vy: rand(-20, -6), g: 0, life: 0.5, max: 0.5, s: 2, c: SMOKE[Math.floor(rand(0, 3))] });
        if (Math.random() < 0.5) parts.push({ x: cx, y: cy - 5, vx: rand(-20, 20), vy: rand(-30, 0), g: 60, life: 0.2, max: 0.2, s: 1, c: '#ffd84a' });
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(time * 7 * dir);
        if (im && im.complete && im.naturalWidth) ctx.drawImage(im, -4, -4, 9, 9);
        ctx.restore();
      } else if (s.weapon === 'bumerang') {
        // Bumerang berputar: dua bilah bersilang.
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(time * 18);
        ctx.fillStyle = '#3a2112'; ctx.fillRect(-7, -2, 14, 4); ctx.fillRect(-2, -7, 4, 14);
        ctx.fillStyle = '#ffcf6b'; ctx.fillRect(-6, -1, 12, 2); ctx.fillRect(-1, -6, 2, 12);
        ctx.restore();
        if (Math.random() < 0.5) parts.push({ x: cx, y: cy, vx: 0, vy: 0, g: 0, life: 0.18, max: 0.18, s: 2, c: '#ffe7a8' });
      } else if (s.weapon === 'panah-cahaya') {
        // Panah cahaya: batang panjang dengan kepala terang dan ekor berkilau.
        for (let i = 0; i < 5; i++) { ctx.globalAlpha = 0.6 - i * 0.11; ctx.fillStyle = '#fff6a8'; ctx.fillRect(cx - dir * (8 + i * 5) - 2, cy - 1, 5, 2); }
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#3a2a08'; ctx.fillRect(cx - 8, cy - 2, 16, 4);
        ctx.fillStyle = '#ffe066'; ctx.fillRect(cx - 7, cy - 1, 14, 2);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(cx + (dir > 0 ? 4 : -7), cy - 2, 3, 4);
      } else if (s.weapon === 'pantul') {
        if (Math.random() < 0.7) parts.push({ x: cx, y: cy, vx: 0, vy: 0, g: 0, life: 0.2, max: 0.2, s: 2, c: '#c9a2ff' });
        const k = Math.floor(time * 16) % 2;
        ctx.fillStyle = '#1c1426'; ctx.fillRect(cx - 4, cy - 1, 8, 2); ctx.fillRect(cx - 1, cy - 4, 2, 8); ctx.fillRect(cx - 3, cy - 3, 6, 6);
        ctx.fillStyle = k ? '#a06fe8' : '#c9a2ff'; ctx.fillRect(cx - 2, cy - 2, 4, 4);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 1, cy - 1, 2, 2);
      } else {
        // Baut energi dengan ekor memudar.
        const c = s.color || '#7be0ff';
        for (let i = 0; i < 4; i++) {
          ctx.globalAlpha = 0.7 - i * 0.16; ctx.fillStyle = c;
          ctx.fillRect(cx - dir * (5 + i * 4) - 1, cy - 1, 3, 2);
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#1c1426'; ctx.fillRect(cx - 5, cy - 3, 10, 6);
        ctx.fillStyle = c; ctx.fillRect(cx - 4, cy - 2, 8, 4);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - (dir > 0 ? -1 : 3), cy - 1, 3, 2);
      }
    }
    // Tebasan berbeda tiap senjata. Ukurannya mengikuti kotak serangan, jadi yang terlihat kena memang kena.
    function drawSwing(sw) {
      const a = Math.min(1, sw.t / Math.max(0.001, sw.dur));
      const bx = sw.box, f = sw.face, cy = bx.y + bx.h / 2;
      const ox = f > 0 ? bx.x : bx.x + bx.w;
      ctx.save();
      if (sw.weapon === 'tombak') {
        // Tusukan: garis panjang dengan ujung terang.
        const len = bx.w * Math.min(1, a * 2.2);
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 1 - a * 0.6;
        ctx.fillRect(f > 0 ? ox : ox - len, Math.round(cy) - 1, len, 2);
        ctx.fillStyle = sw.color;
        ctx.fillRect(f > 0 ? ox : ox - len, Math.round(cy) - 3, len, 1); ctx.fillRect(f > 0 ? ox : ox - len, Math.round(cy) + 2, len, 1);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(ox + f * len - 2, Math.round(cy) - 3, 4, 6);
      } else if (sw.both) {
        // Tebasan ganda: dua sabit dari tengah hero, ke depan dan ke belakang.
        const mid = bx.x + bx.w / 2, R = bx.w * 0.32, N = 10;
        const start = -1.5, end = 1.3, head = start + (end - start) * Math.min(1, a * 1.25);
        for (const d of [1, -1]) {
          for (let i = 0; i < N; i++) {
            const t0 = head - (i + 1) * 0.16, t1 = head - i * 0.16;
            if (t1 < start) break;
            ctx.globalAlpha = (1 - i / N) * (1 - a * 0.5);
            ctx.strokeStyle = i < 3 ? '#ffffff' : sw.color;
            ctx.lineWidth = 5 * (1 - i / N) + 1;
            ctx.beginPath();
            if (d > 0) ctx.arc(mid, cy, R, t0, t1); else ctx.arc(mid, cy, R, Math.PI - t1, Math.PI - t0);
            ctx.stroke();
          }
        }
      } else {
        // Lengkung sabit: kepala putih, ekor berwarna senjata, makin ke ekor makin tipis.
        const R = Math.max(bx.w, bx.h * 0.55) * (sw.weapon === 'palu' ? 0.95 : 0.9);
        const start = -1.5, end = 1.3, head = start + (end - start) * Math.min(1, a * 1.25);
        const N = 12;
        for (let i = 0; i < N; i++) {
          const t0 = head - (i + 1) * 0.16, t1 = head - i * 0.16;
          if (t1 < start) break;
          ctx.globalAlpha = (1 - i / N) * (1 - a * 0.5);
          ctx.strokeStyle = i < 3 ? '#ffffff' : sw.color;
          ctx.lineWidth = (sw.weapon === 'palu' ? 7 : 5) * (1 - i / N) + 1;
          ctx.beginPath();
          if (f > 0) ctx.arc(ox - 2, cy, R, t0, t1);
          else ctx.arc(ox + 2, cy, R, Math.PI - t1, Math.PI - t0);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    function drawBanner() {
      if (!banner) return;
      const b = banner, inT = Math.min(1, b.t / 0.25), s = (b.big ? 1.25 : 1) * (1.5 - 0.5 * inT);
      const a = b.t > b.dur - 0.4 ? (b.dur - b.t) / 0.4 : 1;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(VW / 2, b.big ? 150 : 120);
      ctx.scale(s, s);
      ctx.fillStyle = 'rgba(20,10,24,.7)';
      ctx.fillRect(-VW / 2 / s, -26, VW / s, 52);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 26px Kleintenna, system-ui, sans-serif';
      ctx.lineWidth = 5; ctx.strokeStyle = '#3a1e0c'; ctx.strokeText(b.text, 0, -6);
      ctx.fillStyle = '#ffd84a'; ctx.fillText(b.text, 0, -6);
      ctx.font = 'bold 12px Kleintenna, system-ui, sans-serif';
      ctx.fillStyle = '#fff3d6'; ctx.fillText(b.sub, 0, 15);
      ctx.restore();
    }

    // Tanda pendaratan, perisai, dan bayangan boss yang melayang.
    function drawBossExtras(b, game, time) {
      const a = b.arena;
      if (!a) return;
      if (b.airborne || b.y < a.groundY - b.h - 1) {
        const r = Math.max(10, b.w * 0.45 * (1 - (a.groundY - b.h - b.y) / 260));
        ctx.fillStyle = 'rgba(20,10,30,.35)';
        ctx.beginPath(); ctx.ellipse(b.x + b.w / 2, a.groundY - 2, r, 4, 0, 0, Math.PI * 2); ctx.fill();
      }
      if (b.hop && b.current && b.current.def) {
        const r = b.current.def.radius || 56, cx = b.hop.x1 + b.w / 2;
        ctx.globalAlpha = 0.4 + 0.3 * Math.abs(Math.sin(time * 10));
        ctx.fillStyle = 'rgba(255,70,70,.6)';
        ctx.fillRect(cx - r, a.groundY - 5, r * 2, 5);
        ctx.fillStyle = '#ffd0d0';
        for (const s of [-1, 1]) ctx.fillRect(cx + s * r - 1, a.groundY - 14, 2, 14);
        ctx.globalAlpha = 1;
      }
    }
    function drawShield(b, time) {
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2, r = Math.max(b.w, b.h) * 0.72;
      ctx.save();
      ctx.globalAlpha = 0.28 + 0.1 * Math.sin(time * 5);
      ctx.fillStyle = '#7dd8ff';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = '#e6fbff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    // Tiruan digambar seperti boss, tanpa huruf Z di atas kepala.
    function drawClone(b, c, time) {
      const schema = b.schema, frame = schema.spriteFrame || 64;
      const im = images['boss.idle'], art = schema.art || { scale: 2, foot: frame };
      if (!im || !im.complete || !im.naturalWidth) return;
      const count = Math.max(1, Math.floor(im.naturalWidth / frame)), size = frame * art.scale;
      ctx.save();
      ctx.translate(c.x + c.w / 2, c.y + c.h);
      ctx.scale(c.dir < 0 ? -1 : 1, 1 + Math.sin(time * 3 + c.t) * 0.025);
      ctx.drawImage(im, (Math.floor(time * 5 + c.t) % count) * frame, 0, frame, frame, -size / 2, -art.foot * art.scale, size, size);
      if (art.face) {
        // Wajah sama persis dengan yang asli; bedanya hanya huruf Z di atas yang asli.
        for (const ex of [-11, 9]) {
          ctx.fillStyle = '#1c1426'; ctx.fillRect(ex - 1, -34, 12, 14);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(ex, -33, 10, 12);
          ctx.fillStyle = '#1c1426'; ctx.fillRect(ex + 5, -29, 4, 6);
        }
        ctx.fillRect(-5, -16, 12, 2); ctx.fillRect(-7, -18, 2, 2); ctx.fillRect(7, -18, 2, 2);
      }
      ctx.restore();
    }
    function drawProps(b, time) {
      for (const p of b.props) {
        const x = Math.round(p.x), y = Math.round(p.y);
        if (p.kind === 'totem') {
          ctx.fillStyle = '#1c1426'; ctx.fillRect(x - 1, y - 1, p.w + 2, p.h + 2);
          ctx.fillStyle = '#7d7d92'; ctx.fillRect(x, y, p.w, p.h);
          ctx.fillStyle = '#a6a6ba'; ctx.fillRect(x, y, 3, p.h);
          ctx.fillStyle = Math.floor(time * 4) % 2 ? '#7dd8ff' : '#e6fbff';
          ctx.fillRect(x + 3, y + 4, 8, 5);
          ctx.fillStyle = '#1c1426'; ctx.fillRect(x + 6, y + 5, 2, 3); ctx.fillRect(x + 3, y + 13, 8, 2);
        } else if (p.kind === 'egg') {
          const cx = x + 6, cy = y + 7;
          ctx.fillStyle = '#1c1426'; ctx.beginPath(); ctx.ellipse(cx, cy, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = p.kicked ? '#ffd84a' : '#fff6e6'; ctx.beginPath(); ctx.ellipse(cx, cy, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#e8d8c0'; ctx.fillRect(cx + 1, cy + 1, 3, 3);
          // Telur yang sudah mendarat bergoyang sebelum menetas.
          if (!p.kicked && p.y >= p.groundY) {
            ctx.strokeStyle = Math.floor(time * 6) % 2 ? '#ffd84a' : '#fff3b0'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.ellipse(cx, cy, 9, 10, 0, 0, Math.PI * 2); ctx.stroke();
          }
        } else if (p.kind === 'coin') {
          ctx.fillStyle = '#3a1e0c'; ctx.fillRect(x, y, 8, 8);
          ctx.fillStyle = '#ffd84a'; ctx.fillRect(x + 1, y + 1, 6, 6);
          ctx.fillStyle = '#fff3b0'; ctx.fillRect(x + 2, y + 2, 2, 2);
        } else if (p.kind === 'bag') {
          ctx.fillStyle = '#1c1426'; ctx.fillRect(x, y + 2, 16, 12);
          ctx.fillStyle = '#a8733f'; ctx.fillRect(x + 1, y + 3, 14, 10);
          ctx.fillStyle = '#6f4522'; ctx.fillRect(x + 5, y, 6, 4);
          ctx.fillStyle = '#ffd84a'; ctx.fillRect(x + 6, y + 6, 4, 4);
        } else if (p.kind === 'crown') {
          const bob = Math.round(Math.sin(time * 5) * 2);
          ctx.fillStyle = '#3a1e0c'; ctx.fillRect(x, y + 5 + bob, 16, 10);
          ctx.fillStyle = '#ffd84a'; ctx.fillRect(x + 1, y + 6 + bob, 14, 8);
          for (const k of [1, 6, 11]) { ctx.fillStyle = '#3a1e0c'; ctx.fillRect(x + k - 1, y + bob, 6, 7); ctx.fillStyle = '#ffd84a'; ctx.fillRect(x + k, y + 1 + bob, 4, 6); }
          ctx.fillStyle = '#e0463e'; ctx.fillRect(x + 7, y + 9 + bob, 2, 3);
        } else if (p.kind === 'lantern') {
          ctx.fillStyle = '#1c1426'; ctx.fillRect(x + 4, y + 8, 4, 18); ctx.fillRect(x, y, 12, 12);
          ctx.fillStyle = p.lit > 0 ? '#ffe07a' : '#5a5a6a'; ctx.fillRect(x + 2, y + 2, 8, 8);
          if (p.lit <= 0) { ctx.fillStyle = Math.floor(time * 3) % 2 ? '#ffd84a' : '#a68a3a'; ctx.fillRect(x + 5, y + 4, 2, 4); }
        }
      }
    }
    // Balon kata di atas boss.
    function drawBark(game, b) {
      if (!game.bark) return;
      ctx.save();
      ctx.font = 'bold 8px Kleintenna, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(game.bark.text).width + 10;
      const a = b.arena || { left: 0, right: 432 };
      const cx = Math.max(a.left + w / 2 + 2, Math.min(a.right - w / 2 - 2, b.x + b.w / 2));
      const y = Math.max(46, b.y - 26);
      ctx.fillStyle = '#1c1426'; ctx.fillRect(cx - w / 2 - 1, y - 8, w + 2, 15);
      ctx.fillStyle = '#fff6e6'; ctx.fillRect(cx - w / 2, y - 7, w, 13);
      ctx.fillRect(cx - 2, y + 6, 4, 3);
      ctx.fillStyle = '#2f1a0b'; ctx.fillText(game.bark.text, cx, y);
      ctx.restore();
    }

    function drawCombat(game, time) {
      const b = game.boss;
      for (const s of game.shots) drawShot(s, time);
      if (game.swing) {
        // Lengkung tebasan digambar persis mengisi kotak serangan, jadi yang terlihat kena memang kena.
        drawSwing(game.swing);
      }
      if (b && !b.defeated) {
        drawBossExtras(b, game, time);
        drawBoss(b, time);
        for (const c of b.clones) drawClone(b, c, time);
        for (const p of b.projectiles) {
          if (p.kind === 'wave') {
            // Gelombang tanah: lidah api merayap, dasarnya menempel lantai.
            const im = images['fx.wave'];
            if (im && im.complete && im.naturalWidth) {
              const f = Math.floor(time * 10) % 3;
              ctx.drawImage(im, f * 16, 0, 16, 16, p.x - 5, p.y + p.h - 22, 24, 24);
            } else { ctx.fillStyle = '#ff8a4a'; ctx.fillRect(p.x, p.y, p.w, p.h); }
            continue;
          }
          if (p.reflectable) {
            // Bola bercincin kuning: tanda bahwa bola ini bisa dipukul balik.
            const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
            ctx.fillStyle = '#1c1426';
            ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = p.reflected ? '#ffffff' : (p.color || '#c9a2ff');
            ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(cx - 3, cy - 3, 2, 2);
            if (!p.reflected) {
              ctx.strokeStyle = Math.floor(time * 8) % 2 ? '#ffd84a' : '#fff3b0'; ctx.lineWidth = 1.5;
              ctx.beginPath(); ctx.arc(cx, cy, 9.5, 0, Math.PI * 2); ctx.stroke();
            }
            continue;
          }
          const im = images['boss.projectile'];
          if (im && im.complete && im.naturalWidth) ctx.drawImage(im, p.x - 3, p.y - 3, p.w + 6, p.h + 6);
          else { ctx.fillStyle = '#ff8a4a'; ctx.fillRect(p.x, p.y, p.w, p.h); }
        }
        for (const h of b.hazards) {
          // Batu dari lembar dekorasi kampung.
          const im = images['base.decor'];
          if (im && im.complete && im.naturalWidth) ctx.drawImage(im, 34, 50, 12, 14, h.x, h.y, h.w, h.h);
          else { ctx.fillStyle = '#8a6f5a'; ctx.fillRect(h.x, h.y, h.w, h.h); }
        }
        drawZones(b, time);
        drawProps(b, time);
        if (b.mode === 'telegraph' && b.current) drawTelegraph(b, game, time);
        drawOpening(b, time);
      }
      drawFx(game);
      if (b && !b.defeated) drawBark(game, b);
      drawBossFall(time);
      drawCorpses(frameDt);
      drawParts();
      for (const n of game.numbers) {
        const a = Math.max(0, n.life / n.max);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.font = (n.target === 'weak' ? 'bold 15px' : n.target === 'guard' ? 'bold 9px' : 'bold 11px') + ' Kleintenna, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = n.target === 'weak' ? '#ffe94a' : n.target === 'boss' ? '#ffd84a' : n.target === 'guard' ? '#b8c2cc'
          : n.target === 'heal' ? '#7dff9e' : n.target === 'enemy' ? '#ffffff' : '#ff7b7b';
        ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.lineWidth = 2.5;
        ctx.strokeText(String(n.amount), n.x, n.y);
        ctx.fillText(String(n.amount), n.x, n.y);
        ctx.restore();
      }
    }

    // Tiap jenis serangan punya tanda sendiri, dan tanda itu memakai sasaran yang sudah dikunci
    // di BossMachine, jadi area yang ditandai sama dengan area yang benar-benar berbahaya.
    function drawTelegraph(b, game, time) {
      const def = b.current.def, plan = b.current.plan || {};
      const blink = 0.45 + 0.4 * Math.abs(Math.sin(time * 10));
      const floor = b.y + b.h, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      ctx.save();
      ctx.globalAlpha = blink;
      if (def.kind === 'slam') {
        ctx.fillStyle = 'rgba(255,70,70,.55)';
        ctx.fillRect(cx - def.radius, floor - 6, def.radius * 2, 6);
        ctx.fillStyle = '#ffd0d0';
        for (const s of [-1, 1]) ctx.fillRect(cx + s * def.radius - 1, floor - 16, 2, 16);
      } else if (def.kind === 'charge') {
        const to = plan.targetX === undefined ? b.x : plan.targetX;
        const x0 = Math.min(b.x, to), x1 = Math.max(b.x, to) + b.w;
        ctx.fillStyle = 'rgba(255,150,50,.3)';
        ctx.fillRect(x0, b.y, x1 - x0, b.h);
        ctx.strokeStyle = '#ffb060'; ctx.lineWidth = 2;
        ctx.strokeRect(x0, b.y, x1 - x0, b.h);
        const tip = plan.dir > 0 ? x1 - 4 : x0 + 4;
        ctx.beginPath();
        ctx.moveTo(tip - plan.dir * 12, cy - 9); ctx.lineTo(tip, cy); ctx.lineTo(tip - plan.dir * 12, cy + 9);
        ctx.stroke();
      } else if (def.kind === 'projectile_fan') {
        const p = game.p, px = p.x + p.w / 2, py = p.y + p.h / 2;
        const angle = Math.atan2(py - cy, px - cx), n = def.count || 1;
        ctx.strokeStyle = '#ff7070'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
        for (let i = 0; i < n; i++) {
          const a = angle + (i - (n - 1) / 2) * (def.spread || 0);
          ctx.beginPath(); ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a) * 120, cy + Math.sin(a) * 120);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      } else if (def.kind === 'ground_wave') {
        ctx.fillStyle = 'rgba(255,190,70,.6)';
        const h = def.height || 10;
        for (let i = 1; i <= 4; i++) {
          const x = cx + plan.dir * (b.w / 2 + i * 22);
          ctx.beginPath();
          ctx.moveTo(x, floor - h); ctx.lineTo(x + plan.dir * 12, floor - h / 2); ctx.lineTo(x, floor);
          ctx.closePath(); ctx.fill();
        }
      } else if (def.kind === 'falling_hazard') {
        for (const x of plan.targets || []) drawRockMarker(x, 18, plan.groundY || floor);
      } else if (def.kind === 'floor_burst') {
        for (const z of plan.zones || []) {
          ctx.fillStyle = 'rgba(255,110,40,.3)';
          ctx.fillRect(z.x, z.y, z.w, z.h);
          ctx.strokeStyle = '#ff9a50'; ctx.lineWidth = 1.5;
          ctx.strokeRect(z.x, z.y, z.w, z.h);
        }
      } else if (def.kind === 'summon') {
        ctx.strokeStyle = '#c58aff'; ctx.lineWidth = 2;
        for (const x of plan.spots || []) {
          ctx.beginPath(); ctx.ellipse(x + 7, plan.groundY - 2, 12, 4, 0, 0, Math.PI * 2); ctx.stroke();
        }
      }
      ctx.restore();
    }

    function drawRockMarker(x, w, groundY) {
      ctx.fillStyle = 'rgba(255,70,70,.65)';
      ctx.fillRect(x, groundY - 4, w, 4);
      ctx.fillStyle = 'rgba(255,70,70,.14)';
      ctx.fillRect(x, 0, w, groundY - 4);
    }

    // Zona lantai aktif, dan penanda batu tetap tampil sampai batunya mendarat.
    function drawZones(b, time) {
      const groundY = b.y + b.h;
      for (const h of b.hazards) drawRockMarker(h.x, h.w, groundY);
      const flame = images['fx.burst'];
      for (const z of b.zones) {
        if (flame && flame.complete && flame.naturalWidth) {
          // Tiga lidah api mengisi tinggi zona, sama dengan kotak lukanya.
          const f = Math.floor(time * 12) % 3, n = Math.max(2, Math.round(z.w / 16));
          for (let i = 0; i < n; i++) {
            const k = (f + i) % 3;
            ctx.drawImage(flame, k * 16, 0, 16, 32, z.x + i * (z.w / n), z.y, z.w / n, z.h);
          }
        } else {
          ctx.fillStyle = '#ff7a2a';
          ctx.fillRect(z.x, z.y, z.w, z.h);
        }
      }
    }

    // Celah menyerang harus terlihat di badan boss, bukan hanya di bar HP.
    function drawOpening(b, time) {
      const wp = b.schema.weakPoint;
      if (wp) {
        const x = b.x + wp.ox + wp.w / 2, y = b.y + wp.oy + wp.h / 2;
        const r = b.vulnerable ? 9 + Math.sin(time * 12) * 1.5 : 6;
        ctx.save();
        ctx.fillStyle = b.vulnerable ? '#7ff5ff' : '#5b6672';
        ctx.strokeStyle = b.vulnerable ? '#ffffff' : '#2b323a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.8, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.8, y);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        if (b.vulnerable) {
          ctx.globalAlpha = 0.5 + 0.4 * Math.sin(time * 12);
          ctx.strokeStyle = '#7ff5ff';
          ctx.beginPath(); ctx.arc(x, y, r + 6, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
      }
      if (b.shield) drawShield(b, time);
      // Huruf Z hanya pada yang asli saat ada tiruan.
      if (b.clones.length) {
        ctx.save();
        ctx.font = 'bold 12px Kleintenna, system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#1c1426'; ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 2; i++) {
          const up = ((time * 0.8 + i * 0.5) % 1), zx = b.x + b.w / 2 + 12 + up * 10, zy = b.y - 6 - up * 18;
          ctx.strokeText('Z', zx, zy); ctx.fillText('Z', zx, zy);
        }
        ctx.restore();
      }
      if (b.vulnerable) {
        // Palang sisa waktu celah serang, jadi anak tahu masih sempat atau tidak.
        b._openMax = Math.max(b._openMax || 0, b.timer);
        const w = Math.max(b.w, 44), x = b.x + b.w / 2 - w / 2, y = b.y - 8;
        ctx.fillStyle = '#1c1426'; ctx.fillRect(x - 1, y - 1, w + 2, 6);
        ctx.fillStyle = '#7dff9e'; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, b.timer / b._openMax)), 4);
      } else b._openMax = 0;
      if (b.stunned) {
        for (let i = 0; i < 3; i++) {
          const a = time * 5 + i * 2.09;
          const im = images['obj.star'];
          if (im && im.complete && im.naturalWidth) ctx.drawImage(im, 0, 0, 11, 11, Math.round(b.x + b.w / 2 + Math.cos(a) * 18 - 5), Math.round(b.y - 8 + Math.sin(a) * 4), 11, 11);
        }
      }
      if (b.vulnerable) {
        ctx.save();
        ctx.font = 'bold 12px Kleintenna, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,.85)';
        ctx.fillStyle = '#7dff9e';
        const text = wp ? 'KRISTAL!' : b.stunned ? 'PUKUL DARI DEKAT!' : 'SERANG!';
        // Tetap di dalam arena walau boss menempel dinding.
        const tw = ctx.measureText(text).width / 2, ar = b.arena || { left: 0, right: 432 };
        const tx = Math.max(ar.left + tw + 2, Math.min(ar.right - tw - 2, b.x + b.w / 2));
        ctx.strokeText(text, tx, b.y - 18);
        ctx.fillText(text, tx, b.y - 18);
        ctx.restore();
      }
    }

    function drawFx(game) {
      for (const f of game.fx || []) {
        const a = Math.max(0, f.life / f.max);
        ctx.save();
        ctx.globalAlpha = a;
        if (f.kind === 'blast') {
          ctx.fillStyle = 'rgba(255,170,90,.55)';
          ctx.strokeStyle = '#ffe0b0';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.radius * (1.1 - 0.3 * a), 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
        } else {
          ctx.fillStyle = '#ffb060';
          const h = 4 + 14 * a;
          ctx.fillRect(f.x - f.radius, f.y - h, f.radius * 2, h);
        }
        ctx.restore();
      }
    }

    function drawBoss(b, time) {
      const schema = b.schema || {};
      const frame = schema.spriteFrame || 96;
      // Bergerak memakai animasi jalan, jadi boss tidak meluncur diam.
      const moved = b._px === undefined ? 0 : Math.abs(b.x - b._px);
      b._px = b.x;
      b._moving = moved > 0.01 ? 0.12 : Math.max(0, (b._moving || 0) - 1 / 60);
      const moving = b._moving > 0;
      let key = 'boss.idle';
      let rate = 5;
      if (b.mode === 'telegraph') { key = 'boss.prepare'; rate = 4; }
      else if (b.mode === 'attack') { key = 'boss.attack'; rate = 10; }
      else if (b.mode === 'recovery') { key = b.vulnerable ? 'boss.hurt' : 'boss.idle'; rate = 6; }
      else if (b.mode === 'transition') { key = 'boss.hurt'; rate = 6; }
      // Lembar lompat lendir bergeser sendiri, jadi lendir berwajah melompat lewat kode supaya wajah tetap menempel.
      const faced = schema.art && schema.art.face;
      if (faced && key === 'boss.attack') key = 'boss.prepare';
      if (!faced && moving && b.mode !== 'transition') { key = 'boss.walk'; rate = b.mode === 'attack' ? 16 : 10; }
      const im = images[key];
      if (!(im && im.complete && im.naturalWidth)) {
        ctx.fillStyle = b.mode === 'telegraph' ? '#ff8a4a' : '#5a6a8a';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        return;
      }
      const count = Math.max(1, Math.floor(im.naturalWidth / frame));
      const idx = Math.floor(time * rate) % count;
      const artFlip = schema.art && schema.art.flip ? -1 : 1;
      const face = (b.facing < 0 ? -1 : 1) * artFlip;
      const art = schema.art || { scale: Math.min(1.5, 116 / frame), foot: frame };
      const size = frame * art.scale, footY = art.foot * art.scale;
      // Tubuh lentur: bernapas saat diam, jongkok saat ancang-ancang, melompat kecil saat bergerak.
      let sx = 1, sy = 1 + Math.sin(time * 3.2) * 0.025, lift = 0, tilt = 0;
      if (b.mode === 'telegraph') { sy = 0.9; sx = 1.06; tilt = Math.sin(time * 40) * 0.015; }
      else if (moving) {
        const beat = Math.abs(Math.sin(time * (b.mode === 'attack' ? 12 : 8)));
        lift = beat * (schema.art && schema.art.face ? 16 : 5); sy = 0.95 + beat * 0.1; sx = 1.05 - beat * 0.08; tilt = b.mode === 'attack' ? 0.08 : 0.02;
      } else if (b.stunned) {
        tilt = Math.sin(time * 9) * 0.07;
        // Lendir yang tumbang menjadi gepeng.
        if (art.face) { sy = 0.78; sx = 1.14; }
      }
      ctx.save();
      ctx.translate(b.x + b.w / 2, b.y + b.h - lift);
      ctx.scale(face, 1);
      ctx.rotate(tilt);
      ctx.scale(sx, sy);
      if (b.invuln > 0 && Math.floor(time * 24) % 2 === 0) ctx.globalAlpha = 0.55;
      ctx.drawImage(im, idx * frame, 0, frame, frame, -size / 2, -footY, size, size);
      if (art.face) {
        // Wajah lucu lendir: mata mengikuti lawan, alis turun saat ancang-ancang, mata juling saat pusing.
        const blink = Math.floor(time * 0.7) % 4 === 3 && (time * 0.7) % 1 < 0.15;
        for (const ex of [-11, 9]) {
          ctx.fillStyle = '#1c1426'; ctx.fillRect(ex - 1, -34, 12, blink ? 3 : 14);
          if (blink) continue;
          ctx.fillStyle = '#ffffff'; ctx.fillRect(ex, -33, 10, 12);
          ctx.fillStyle = '#1c1426'; ctx.fillRect(ex + (b.stunned ? 3 : 5), b.stunned ? -29 : -29, 4, 6);
        }
        if (b.mode === 'telegraph') {
          ctx.fillStyle = '#1c1426';
          for (let i = 0; i < 12; i++) { ctx.fillRect(-12 + i, -36 + Math.floor(i / 3), 1, 2); ctx.fillRect(9 + i, -33 - Math.floor(i / 3), 1, 2); }
        }
        ctx.fillStyle = '#1c1426';
        if (b.stunned) ctx.fillRect(-3, -15, 8, 5);
        else { ctx.fillRect(-5, -16, 12, 2); ctx.fillRect(-7, -18, 2, 2); ctx.fillRect(7, -18, 2, 2); }
      }
      ctx.restore();
    }

    function drawHero(game, time) {
      const p = game.p;
      if (game.dying > 0) {
        // Baris terakhir lembar hero: jatuh terduduk lalu rebah.
        const im0 = images['hero.sheet'];
        if (im0 && im0.complete && im0.naturalWidth) {
          const col = Math.min(3, Math.floor((1.4 - game.dying) * 5));
          ctx.save();
          ctx.translate(p.x + p.w / 2, p.y + p.h);
          ctx.scale(game.face < 0 ? -1 : 1, 1);
          ctx.drawImage(im0, col * 32, 9 * 32, 32, 32, -16, -23, 32, 32);
          ctx.restore();
        }
        return;
      }
      if (game.invuln > 0 && Math.floor(time * 20) % 2 === 0) return;
      const anim = game.anim || 'idle';
      const im = images['hero.sheet'];
      const face = game.face < 0 ? -1 : 1;
      const cx = p.x + p.w / 2;
      ctx.save();
      ctx.translate(cx, p.y + p.h);
      ctx.scale(face, 1);
      if (im && im.complete && im.naturalWidth) {
        // Lembar Cute Fantasy: baris samping 1 diam, 4 jalan, 7 serang.
        const art = HERO_ART, fw = art.frame, k = art.draw / fw;
        let row = 1, col = Math.floor(time * 6) % 6;
        if (anim === 'run') { row = 4; col = Math.floor(time * 12) % 6; }
        else if (anim === 'jump') { row = 4; col = game.p.vy < 0 ? 1 : 4; }
        const sheet = images['ui.weapons'];
        const armor = game.loadout && ARMOR_ART[game.loadout.armor];
        const ok = sheet && sheet.complete && sheet.naturalWidth;
        // Perlengkapan tampak di punggung, senjata di tangan.
        if (ok && armor) ctx.drawImage(sheet, armor[0], armor[1], armor[2], armor[3], -9, -15, armor[2] * 0.55, armor[3] * 0.55);
        ctx.drawImage(im, col * fw, row * fw, fw, fw, -art.draw / 2, -art.foot * k, art.draw, art.draw);
        const wp = WEAPON_ART[game.weapon], hold = WEAPON_HOLD[game.weapon];
        if (ok && wp && hold) {
          // Senjata berputar pada kepalan tangan. Kepalan digambar terakhir agar gagang tampak digenggam.
          const bob = row === 4 ? HERO_BOB.run[col] : HERO_BOB.idle[col];
          const t = game.swing && !hold.ranged ? Math.min(1, game.swing.t / Math.max(0.001, game.swing.dur)) : -1;
          const reach = t < 0 ? 0 : Math.sin(t * Math.PI) * 3;
          const hx = 4 + reach, hy = -5 + bob;
          const w = wp[2], h = wp[3], wsheet = images['obj.weapons'];
          ctx.save();
          ctx.translate(hx, hy);
          // Ayunan: dari belakang atas, melewati depan, sampai depan bawah.
          ctx.rotate(t < 0 ? hold.rest : -0.8 + t * 3.2);
          if (WEAPON_HUE[game.weapon]) ctx.filter = `hue-rotate(${WEAPON_HUE[game.weapon]}deg) saturate(1.6) brightness(1.15)`;
          if (wsheet && wsheet.complete && wsheet.naturalWidth) ctx.drawImage(wsheet, wp[0], wp[1], w, h, Math.round(-w * hold.grip[0]), Math.round(-h * hold.grip[1]), w, h);
          ctx.restore();
          // Lengan dan kepalan warna kulit lembar hero.
          ctx.fillStyle = '#0e071b';
          ctx.fillRect(Math.round(hx) - 2, Math.round(hy) - 2, 4, 4);
          ctx.fillRect(1, Math.round(hy) - 1, Math.max(1, Math.round(hx) - 1), 3);
          ctx.fillStyle = '#d29f70';
          ctx.fillRect(2, Math.round(hy), Math.max(1, Math.round(hx) - 2), 1);
          ctx.fillStyle = '#f6ca9f';
          ctx.fillRect(Math.round(hx) - 1, Math.round(hy) - 1, 2, 2);
        }
      } else {
        ctx.fillStyle = '#ff7bd5';
        ctx.fillRect(-7, -26, 14, 26);
      }
      ctx.restore();
      // Jeda serangan: bar kecil di atas kepala, hanya tampil saat senjata belum siap.
      const ready = cooldownLeft(game);
      if (ready > 0) {
        const bw = 16, bx = Math.round(cx - bw / 2), by = Math.round(p.y + p.h - 26);
        ctx.fillStyle = '#0e071b';
        ctx.fillRect(bx - 1, by - 1, bw + 2, 4);
        ctx.fillStyle = '#ffe066';
        ctx.fillRect(bx, by, Math.round(bw * (1 - ready)), 2);
      }
    }

    // Sisa jeda serangan, 1 baru menyerang sampai 0 siap.
    function cooldownLeft(game) {
      return game.cooldown > 0 && game.cooldownMax > 0 ? Math.min(1, game.cooldown / game.cooldownMax) : 0;
    }

    function drawHud(game, level, ui) {
      ctx.save();
      const woodPanel = (x, y, w, h) => {
        ctx.fillStyle = 'rgba(58,33,18,.92)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#d9a35a'; ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      };
      woodPanel(10, 8, 240, 30);
      ctx.fillStyle = '#ffe9b8';
      ctx.font = 'bold 14px Kleintenna, system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(level.boss ? level.nama : level.acak ? `Acak: ${level.nama}` : `Misi ${level.id}: ${level.nama}`, 20, 24);

      // HP hero: bar kayu + angka, senjata aktif, dan bintang.
      const hx = 258;
      woodPanel(hx, 8, 372, 30);
      const hp = Math.max(0, game.hp || 0), maxHp = game.maxHp || 30;
      const bar = images['ui.bar'];
      const barW = 122, barH = 24, barX = hx + 7, barY = 11;
      if (bar && bar.complete && bar.naturalWidth) {
        ctx.drawImage(bar, barX, barY, barW, barH);
        // Gambar bar berisi merah sebagian, jadi lubangnya ditutup lalu isinya digambar sesuai HP.
        const inX = barX + barW * BAR_HOLE.x, inW = barW * BAR_HOLE.w;
        const inY = barY + barH * BAR_HOLE.y, inH = barH * BAR_HOLE.h;
        ctx.fillStyle = '#2a1a22';
        ctx.fillRect(inX, inY, inW, inH);
        const fillW = inW * Math.min(1, hp / maxHp);
        ctx.fillStyle = '#d8392f';
        ctx.fillRect(inX, inY, fillW, inH);
        ctx.fillStyle = '#ff8a6e';
        ctx.fillRect(inX, inY, fillW, Math.max(1, inH * 0.28));
      }
      ctx.font = 'bold 13px Kleintenna, system-ui, sans-serif';
      ctx.fillStyle = '#ffe2d6';
      ctx.fillText(`${hp}/${maxHp}`, hx + 134, 24);
      // Skor berjalan.
      woodPanel(10, 42, 104, 22);
      ctx.font = 'bold 12px Kleintenna, system-ui, sans-serif';
      ctx.fillStyle = '#ffe9b8';
      ctx.fillText(`Skor ${game.score || 0}`, 18, 54);
      // Waktu berjalan dan bonus waktu yang masih bisa didapat.
      const secs = Math.floor(game.t || 0);
      const bonusW = 158;
      woodPanel(118, 42, bonusW, 22);
      ctx.fillStyle = '#ffe9b8';
      ctx.fillText(`Waktu ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, 126, 54);
      ctx.fillStyle = '#ffd84a';
      ctx.fillText(`Bonus +${ui.timeBonus || 0}`, 200, 54);
      ctx.font = 'bold 13px Kleintenna, system-ui, sans-serif';
      ctx.fillStyle = game.weaponColor || '#ffe066';
      ctx.fillText(game.weaponName || '', hx + 196, 22);
      // Garis di bawah nama senjata terisi saat jeda serangan berjalan, penuh berarti siap.
      const cdW = 92, cdLeft = cooldownLeft(game);
      ctx.fillStyle = '#2a1a22';
      ctx.fillRect(hx + 196, 31, cdW, 3);
      ctx.fillStyle = cdLeft > 0 ? '#c9a24a' : (game.weaponColor || '#ffe066');
      ctx.fillRect(hx + 196, 31, Math.round(cdW * (1 - cdLeft)), 3);
      ctx.fillStyle = '#ffd84a';
      ctx.fillText(`\u2605 ${game.stars}/${game.starTotal}`, hx + 300, 24);

      // Bar mini boss saat sudah dekat dan belum kalah.
      const mini = (game.enemies || []).find((e) => e.alive && !e.dead && e.awake && (e.kind === 'ogre' || e.kind === 'slimeking'));
      if (mini) {
        // Di bawah tulisan pesan supaya tidak tertimpa.
        const bw = 240, bx = (VW - bw) / 2, by = 94;
        ctx.fillStyle = 'rgba(8,12,18,.82)';
        ctx.fillRect(bx - 6, by - 14, bw + 12, 26);
        ctx.font = 'bold 11px Kleintenna, system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.fillStyle = '#ffe9b8';
        ctx.fillText(mini.kind === 'ogre' ? 'Orc Raksasa' : 'Raja Lendir', VW / 2, by - 6);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#2a1a22'; ctx.fillRect(bx, by + 1, bw, 7);
        ctx.fillStyle = '#d8392f'; ctx.fillRect(bx, by + 1, bw * Math.max(0, mini.hp / mini.maxHp), 7);
      }

      // Bar boss: hanya tampil di arena boss dan belum kalah.
      const b = game.boss;
      if (b && !b.defeated) {
        // Di kanan panel waktu, di atas tulisan pesan.
        const bw = 280, bx = 284, by = 56;
        ctx.fillStyle = 'rgba(8,12,18,.82)';
        ctx.fillRect(bx - 4, by - 14, bw + 8, 30);
        ctx.font = 'bold 12px Kleintenna, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText(`${b.schema.nama || 'BOSS'}, Fase ${b.schema.phases[b.phaseIndex].id}`, bx + bw / 2, by - 6);
        ctx.fillStyle = 'rgba(255,255,255,.14)';
        ctx.fillRect(bx, by, bw, 12);
        const frac = Math.max(0, b.hp / b.maxHp);
        ctx.fillStyle = b.mode === 'transition' ? '#ffd84a' : b.vulnerable ? '#7dff9e' : '#ff5a5a';
        ctx.fillRect(bx, by, bw * frac, 12);
        // Garis ambang fase: tempat pertarungan berubah.
        ctx.fillStyle = '#ffffff';
        for (const ph of b.schema.phases) {
          if (ph.hpFrom < 1) ctx.fillRect(bx + bw * ph.hpFrom - 1, by - 2, 2, 16);
        }
        ctx.textAlign = 'left';
      }
      ctx.restore();
    }

    function draw(level, game, ui) {
      ui = ui || {};
      const time = ui.time || 0;
      const p = game.p;
      curGame = game;
      frameDt = (ui && ui.dt) || 1 / 60;
      drainVfx(game);
      stepFx(frameDt);
      const mapW = level.map[0].length * 16, mapH = level.map.length * 16;
      const tx = clamp(p.x + p.w / 2 - VIEW_W / 2, 0, Math.max(0, mapW - VIEW_W));
      const ty = clamp(p.y + p.h / 2 - VIEW_H / 2, 0, Math.max(0, mapH - VIEW_H));
      // (Peta arena sedikit lebih lebar dari layar, jadi kamera hampir diam.)
      if (!inited) { camX = tx; camY = ty; inited = true; }
      const k = 1 - Math.pow(0.001, ui.dt || 1 / 60);
      camX += (tx - camX) * k;
      camY += (ty - camY) * k;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      drawBg(level);
      ctx.save();
      ctx.scale(ZOOM, ZOOM);
      // Dibulatkan ke piksel layar supaya tile tidak bergaris pada zoom pecahan.
      ctx.translate(-Math.round(camX * ZOOM) / ZOOM, -Math.round(camY * ZOOM) / ZOOM);
      if (shake > 0) ctx.translate(Math.round(rand(-shake, shake)), Math.round(rand(-shake, shake)));
      const c0 = Math.max(0, Math.floor(camX / 16) - 1), c1 = Math.min(level.map[0].length - 1, Math.ceil((camX + VIEW_W) / 16) + 1);
      const r0 = Math.max(0, Math.floor(camY / 16) - 1), r1 = Math.min(level.map.length - 1, Math.ceil((camY + VIEW_H) / 16) + 1);
      // Ruang rahasia: dinding batu gelap, bukan langit.
      for (const v of level.vaults || []) {
        const fill = images['tile.fill'];
        if (!fill || !fill.complete || !fill.naturalWidth) continue;
        for (let r = v.r; r < v.r + v.h; r++) for (let c = v.c; c < v.c + v.w; c++) ctx.drawImage(fill, (c % (fill.naturalWidth / 16)) * 16, (r % (fill.naturalHeight / 16)) * 16, 16, 16, c * 16, r * 16, 16, 16);
        ctx.fillStyle = 'rgba(14,8,20,.72)';
        ctx.fillRect(v.c * 16, v.r * 16, v.w * 16, v.h * 16);
      }
      drawDecor(level, c0, c1, r0, r1);
      drawTiles(level, c0, c1, r0, r1);
      drawObjects(level, game, time);
      drawCombat(game, time);
      drawHero(game, time);
      ctx.restore();
      // Arena gelap: hanya sekitar hero dan lentera yang terlihat. Boss hanya tampak matanya.
      const db = game.boss;
      if (db && db.dark && !db.defeated && !db.stunned) {
        if (!darkCanvas) { darkCanvas = document.createElement('canvas'); darkCanvas.width = VW; darkCanvas.height = VH; }
        const d = darkCanvas.getContext('2d');
        d.globalCompositeOperation = 'source-over';
        d.fillStyle = 'rgba(6,8,22,.94)';
        d.clearRect(0, 0, VW, VH); d.fillRect(0, 0, VW, VH);
        d.globalCompositeOperation = 'destination-out';
        const hole = (wx, wy, r) => {
          const sx = (wx - camX) * ZOOM, sy = (wy - camY) * ZOOM, R = r * ZOOM;
          const g2 = d.createRadialGradient(sx, sy, R * 0.55, sx, sy, R);
          g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
          d.fillStyle = g2; d.beginPath(); d.arc(sx, sy, R, 0, Math.PI * 2); d.fill();
        };
        hole(p.x + p.w / 2, p.y + p.h / 2, 62);
        for (const q of db.props) if (q.kind === 'lantern') hole(q.x + q.w / 2, q.y + 6, q.lit > 0 ? (db.lightRadius || 90) : 26);
        ctx.drawImage(darkCanvas, 0, 0);
        // Lentera padam digambar di atas kegelapan dengan warna toska, supaya tidak tertukar
        // dengan jendela rumah di latar yang kuning. Panah menunjukkan bahwa ini bisa dipukul.
        for (const q of db.props) {
          if (q.kind !== 'lantern' || q.lit > 0) continue;
          const lx = Math.round((q.x + q.w / 2 - camX) * ZOOM), ly = Math.round((q.y + 6 - camY) * ZOOM);
          const pulse = 0.5 + 0.5 * Math.sin(time * 5);
          ctx.fillStyle = `rgba(90,240,230,${0.16 + pulse * 0.2})`;
          ctx.beginPath(); ctx.arc(lx, ly, 22 + pulse * 6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#10222e'; ctx.fillRect(lx - 3, ly + 8, 6, 26); ctx.fillRect(lx - 12, ly - 12, 24, 24);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(lx - 10, ly - 10, 20, 20);
          ctx.fillStyle = pulse > 0.5 ? '#5af0e6' : '#2cc8c0'; ctx.fillRect(lx - 8, ly - 8, 16, 16);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(lx - 3, ly - 5, 6, 10);
          const ay = ly - 34 - Math.round(pulse * 5);
          ctx.fillStyle = '#10222e'; ctx.fillRect(lx - 11, ay - 2, 22, 5); ctx.fillRect(lx - 7, ay + 3, 14, 4); ctx.fillRect(lx - 3, ay + 7, 6, 4);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(lx - 9, ay, 18, 2); ctx.fillRect(lx - 5, ay + 3, 10, 3); ctx.fillRect(lx - 1, ay + 6, 2, 3);
        }
        // Mata boss selalu terlihat, jadi posisinya bisa dibaca.
        const ex = (db.x + db.w / 2 - camX) * ZOOM, ey = (db.y + 22 - camY) * ZOOM;
        ctx.fillStyle = '#ffe07a';
        for (const s of [-1, 1]) ctx.fillRect(ex + s * 12 - 4, ey - 3, 8, 6);
        ctx.fillStyle = '#1c1426';
        for (const s of [-1, 1]) ctx.fillRect(ex + s * 12 - 1, ey - 2, 2, 4);
      }
      // Kilat putih saat ledakan besar boss.
      if (bossFall && bossFall.t >= 1.7 && bossFall.t < 2.3) {
        ctx.fillStyle = `rgba(255,255,255,${1 - (bossFall.t - 1.7) / 0.6})`;
        ctx.fillRect(0, 0, VW, VH);
      }
      drawHud(game, level, ui);
      drawBanner();
      // Layar menggelap perlahan sebelum Arka bangkit.
      if (game.dying > 0 && game.dying < 0.8) {
        ctx.fillStyle = `rgba(8,4,14,${Math.min(1, (0.8 - game.dying) / 0.6)})`;
        ctx.fillRect(0, 0, VW, VH);
        ctx.fillStyle = '#fff3d6'; ctx.font = 'bold 18px Kleintenna, system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('Bangkit lagi, Arka!', VW / 2, VH / 2);
        ctx.textAlign = 'left';
      }

      if (game.quiz) {
        // Soal gerbang di papan kayu, tetap terlihat tanpa menghentikan permainan.
        const q = game.quiz;
        ctx.save();
        ctx.font = 'bold 19px Kleintenna, system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const w = Math.min(VW - 120, ctx.measureText(q.teks).width + 56);
        // Di atas (bawah HUD): tidak tertimpa tombol sentuh di bagian bawah layar HP.
        const x = (VW - w) / 2, py = game.boss && !game.boss.defeated ? 92 : 64;
        ctx.fillStyle = 'rgba(58,33,18,.95)'; ctx.fillRect(x, py, w, 32);
        ctx.strokeStyle = '#d9a35a'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, py + 1, w - 2, 30);
        ctx.fillStyle = '#fff3d6'; ctx.fillText(q.teks, x + w / 2, py + 17, w - 16);
        ctx.font = 'bold 12px Kleintenna, system-ui, sans-serif';
        const note = q.hint || 'Sundul atau pukul balok jawabannya!';
        const nw = Math.min(330, ctx.measureText(note).width + 18);
        ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect((VW - nw) / 2, py + 34, nw, 20);
        ctx.fillStyle = q.hint ? '#ffd9a1' : '#fff'; ctx.fillText(note, VW / 2, py + 44, nw - 8);
        ctx.restore();
      }
      if (ui.toast) {
        const ty = game.quiz ? (game.boss && !game.boss.defeated ? 150 : 122) : (game.boss && !game.boss.defeated ? 76 : 50);
        ctx.save();
        ctx.globalAlpha = Math.min(1, ui.toastT || 1);
        ctx.fillStyle = 'rgba(0,0,0,.72)';
        // Petunjuk panjang mengecil sendiri supaya tetap muat di layar.
        let size = 18;
        ctx.font = `bold ${size}px Kleintenna, system-ui, sans-serif`;
        while (size > 11 && ctx.measureText(ui.toast).width + 32 > VW - 16) {
          size--;
          ctx.font = `bold ${size}px Kleintenna, system-ui, sans-serif`;
        }
        const w = ctx.measureText(ui.toast).width + 32;
        ctx.fillRect(VW / 2 - w / 2, ty, w, 34);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(ui.toast, VW / 2, ty + 17);
        ctx.restore();
      }
    }

    return { VW, VH, ZOOM, VIEW_W, VIEW_H, draw, ready, images };
  }

  return { create, VW, VH };
});
