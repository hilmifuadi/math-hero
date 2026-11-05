// Math Hero 4: renderer landscape 640x360 dengan kamera dunia 320x180 (zoom 2x).
// Murni gambar: tidak mengubah state game. Semua posisi memakai satuan dunia (tile 16 px).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).scene = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  const VW = 640, VH = 360, LEVEL_ZOOM = 2, ARENA_ZOOM = 1.5;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  // Sel gambar, ukuran gambar di dunia, dan baris kaki pada sel.
  const ENEMY_ART = {
    walker: { frame: 32, draw: 48, foot: 23 },
    jumper: { frame: 64, draw: 96, foot: 40 },
    shooter: { frame: 32, draw: 48, foot: 23 },
  };
  const HERO_ART = { frame: 32, draw: 48, foot: 23 };

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
    Object.entries(theme.tiles).forEach(([k, v]) => add('tile.' + k, v));
    Object.entries(theme.decor).forEach(([k, v]) => add('decor.' + k, v));
    // Bayu, musuh, dan peti memakai satu keluarga gambar di semua tema (assets/mh4/v2).
    add('hero.sheet', '../assets/mh4/v2/hero/player.png');
    add('chest', '../assets/mh4/v2/base/Chest.png');
    add('ui.bar', '../assets/mh4/v2/ui/bar.png');
    // Sprite musuh level biasa: tiga tipe dengan lima state animasi.
    const enemyStates = ['Idle', 'Walk', 'Attack', 'Hurt', 'Death'];
    for (const id of ['walker', 'jumper', 'shooter']) {
      for (const st of enemyStates) add('enemy.' + id + '.' + st, '../assets/mh4/v2/enemies/' + id + '/' + st + '.png');
    }
    // Sprite boss hanya dimuat bila level memakai boss; level biasa tidak menambah request.
    if (bossDef && bossDef.sprite) {
      for (const k of ['idle', 'prepare', 'attack', 'hurt', 'death']) add('boss.' + k, bossDef.sprite + '/' + k + '.png');
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
    let camX = 0, camY = 0, inited = false;

    function chAt(level, c, r) {
      if (r < 0 || r >= level.map.length) return '.';
      const row = level.map[r];
      return (c >= 0 && c < row.length) ? row[c] : '.';
    }
    const solidCh = (ch) => ch === '#' || ch === 'G';

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
      if (im && im.complete && im.naturalWidth) {
        if (theme.bgTile) {
          // Pola kecil (mis. 64x64) diulang, bukan diregangkan ke seluruh layar.
          const s = theme.bgTile;
          const off = -Math.floor(camX * 0.4) % s;
          for (let y = 0; y < VH; y += s) for (let x = off; x < VW; x += s) ctx.drawImage(im, x, y, s, s);
        } else {
          // Latar lebih lebar dari layar dan bergeser pelan mengikuti kamera (parallax).
          const span = Math.max(1, level.map[0].length * 16 - VIEW_W);
          const f = clamp(camX / span, 0, 1);
          ctx.drawImage(im, -f * VW * 0.25, 0, VW * 1.25, VH);
        }
        // Latar dibuat sedikit pudar supaya tanah dan bahaya lebih menonjol.
        ctx.fillStyle = 'rgba(255,250,235,.1)';
        ctx.fillRect(0, 0, VW, VH);
      } else {
        ctx.fillStyle = theme.palette.groundDark || '#bfe6a0';
        ctx.fillRect(0, VH * .55, VW, VH * .45);
      }
    }

    function drawDecor(level, c0, c1, r0, r1) {
      const seed = level.seed || 0;
      const ds = theme.decorSize || { tree: [40, 52], bush: [16, 15], grass: [8, 6] };
      for (let c = c0 - (c0 % 9); c <= c1; c += 9) {
        const h = ((c * 1103515245 + seed * 12345) >>> 0);
        const g = groundRow(level, c);
        if (g < 0) continue;
        const y = g * 16;
        const kind = h % 3 === 0 ? 'tree' : h % 3 === 1 ? 'bush' : 'grass';
        const [w, hh] = ds[kind] || [16, 16];
        // Dekorasi tidak bisa ditabrak, jadi dibuat pudar agar tidak dikira rintangan.
        ctx.globalAlpha = 0.55;
        drawImage('decor.' + kind, c * 16 + (16 - w) / 2, y - hh, w, hh);
        ctx.globalAlpha = 1;
      }
    }

    function drawTiles(level, c0, c1, r0, r1) {
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const ch = chAt(level, c, r);
          const x = c * 16, y = r * 16;
          if (ch === '#') {
            const above = chAt(level, c, r - 1);
            if (!solidCh(above)) drawImage('tile.top', x, y, 16, 16);
            else {
              // Isi tanah menggelap makin dalam, jadi permukaan pijakan terbaca jelas.
              drawImage('tile.fill', x, y, 16, 16);
              let depth = 1;
              while (depth < 4 && solidCh(chAt(level, c, r - depth - 1))) depth++;
              ctx.fillStyle = `rgba(14,10,22,${Math.min(0.72, 0.2 + depth * 0.16)})`;
              ctx.fillRect(x, y, 16, 16);
            }
          } else if (ch === '=') {
            drawImage('tile.platform', x, y, 16, 16);
          } else if (ch === 'G') {
            drawImage('tile.fillDark', x, y, 16, 16);
            const t = (Date.now() % 900) / 900;
            ctx.fillStyle = `rgba(255, 216, 74, ${0.25 + 0.35 * Math.abs(Math.sin(t * Math.PI * 2))})`;
            ctx.fillRect(x + 3, y, 10, 16);
          } else if (ch === '^') {
            ctx.fillStyle = theme.palette.spike;
            for (let i = 0; i < 3; i++) {
              const sx = x + 1 + i * 5;
              ctx.beginPath();
              ctx.moveTo(sx, y + 16);
              ctx.lineTo(sx + 2.5, y + 5);
              ctx.lineTo(sx + 5, y + 16);
              ctx.closePath();
              ctx.fill();
            }
          }
        }
      }
    }

    function star(x, y, r, rot) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = theme.palette.star;
      ctx.strokeStyle = 'rgba(120,80,0,.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? r * .45 : r;
        const a = -Math.PI / 2 + i * Math.PI / 5;
        const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    function drawObjects(level, game, time) {
      for (const s of game.L.stars) {
        if (s.got) continue;
        star(s.cx, s.cy + Math.sin(time * 3 + s.id) * 1.5, 5, Math.sin(time * 2 + s.id) * .3);
      }
      for (const c of game.L.checkpoints) {
        const x = c.cx, y = c.cy;
        ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x - 1, y - 22, 2, 22);
        ctx.fillStyle = c.got ? '#3ddc84' : '#9aa4ad';
        ctx.beginPath();
        ctx.moveTo(x + 1, y - 22); ctx.lineTo(x + 13, y - 18); ctx.lineTo(x + 1, y - 13);
        ctx.closePath(); ctx.fill();
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
        const gx = goal.x + goal.w / 2, gy = goal.y + goal.h / 2;
        const pulse = locked ? 1 : 1 + Math.sin(time * 4) * .08;
        ctx.save(); ctx.translate(gx, gy); ctx.scale(pulse, pulse);
        ctx.strokeStyle = locked ? 'rgba(150,160,170,.7)' : '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = locked ? 'rgba(120,130,140,.6)' : 'rgba(120,230,255,.85)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, 6, time * 2, time * 2 + Math.PI * 1.4); ctx.stroke();
        ctx.fillStyle = locked ? 'rgba(90,100,110,.2)' : 'rgba(180,240,255,.25)';
        ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
        if (locked) {
          // Gembok kecil: tujuan hanya terbuka setelah boss kalah.
          ctx.fillStyle = 'rgba(230,235,240,.9)';
          ctx.fillRect(-3, -1, 6, 6);
          ctx.strokeStyle = 'rgba(230,235,240,.9)'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(0, -1, 2.4, Math.PI, 0); ctx.stroke();
        }
        ctx.restore();
      }
      if (!game.gateOpen && game.L.gateCol >= 0) {
        const cell = game.L.gates.find((q) => q.c === game.L.gateCol) || game.L.gates[0];
        let floor = cell.r;
        while (floor < level.map.length && chAt(level, cell.c, floor) !== '#') floor++;
        const gx = cell.c * 16 + 8, gy = (floor - 2) * 16 + 8;
        ctx.fillStyle = theme.palette.gold;
        ctx.fillRect(gx - 5, gy - 2, 10, 8);
        ctx.strokeStyle = theme.palette.gold; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(gx, gy - 3, 4, Math.PI, 0); ctx.stroke();
      }
      // Musuh level biasa: sprite per tipe, dengan kotak cadangan bila aset gagal dimuat.
      for (const e of game.enemies) {
        if (e.dead || !e.alive) continue;
        const anim = e.anim || 'idle';
        const state = anim === 'walk' ? 'Walk' : anim === 'attack' ? 'Attack'
          : anim === 'hurt' ? 'Hurt' : 'Idle';
        const key = 'enemy.' + (e.kind || 'walker') + '.' + state;
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
        ctx.fillStyle = '#ffb066';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = 'rgba(255,240,200,.8)';
        ctx.fillRect(b.x + (b.vx > 0 ? b.w - 2 : 0), b.y + 1, 2, Math.max(1, b.h - 2));
      }
    }

    // Proyektil, ayunan melee, boss, dan angka damage. Semua hanya membaca state.
    function drawCombat(game, time) {
      const b = game.boss;
      for (const s of game.shots) {
        ctx.fillStyle = s.color || '#7be0ff';
        ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        ctx.fillRect(s.x + (s.vx > 0 ? s.w - 3 : 0), s.y + 1, 3, Math.max(1, s.h - 2));
      }
      if (game.swing) {
        const sw = game.swing;
        const a = Math.min(1, sw.t / Math.max(0.001, sw.dur));
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.5 * (1 - a);
        ctx.strokeStyle = sw.color || '#ffe066';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (sw.face > 0) ctx.arc(sw.box.x, sw.box.y + sw.box.h / 2, sw.box.w, -Math.PI / 2.6, Math.PI / 2.6);
        else ctx.arc(sw.box.x + sw.box.w, sw.box.y + sw.box.h / 2, sw.box.w, Math.PI - Math.PI / 2.6, Math.PI + Math.PI / 2.6);
        ctx.stroke();
        ctx.restore();
      }
      if (b && !b.defeated) {
        drawBoss(b, time);
        for (const p of b.projectiles) {
          const im = images['boss.projectile'];
          if (im && im.complete && im.naturalWidth) ctx.drawImage(im, p.x, p.y, p.w, p.h);
          else { ctx.fillStyle = '#ff8a4a'; ctx.fillRect(p.x, p.y, p.w, p.h); }
        }
        for (const h of b.hazards) {
          ctx.fillStyle = '#8a6f5a';
          ctx.beginPath();
          ctx.moveTo(h.x + h.w / 2, h.y);
          ctx.lineTo(h.x + h.w, h.y + h.h);
          ctx.lineTo(h.x, h.y + h.h);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(255,180,90,.35)';
          ctx.fillRect(h.x + 2, h.y + h.h - 3, h.w - 4, 3);
        }
        drawZones(b, time);
        if (b.mode === 'telegraph' && b.current) drawTelegraph(b, game, time);
        drawOpening(b, time);
      }
      drawFx(game);
      for (const n of game.numbers) {
        const a = Math.max(0, n.life / n.max);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.font = (n.target === 'weak' ? 'bold 15px' : n.target === 'guard' ? 'bold 9px' : 'bold 11px') + ' system-ui, sans-serif';
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
      for (const z of b.zones) {
        ctx.fillStyle = '#ff7a2a';
        ctx.fillRect(z.x, z.y, z.w, z.h);
        ctx.fillStyle = '#ffd24a';
        const wob = Math.sin(time * 30) * 3;
        ctx.fillRect(z.x + 6 + wob, z.y + 6, z.w - 12, z.h - 6);
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
      if (b.stunned) {
        for (let i = 0; i < 3; i++) {
          const a = time * 5 + i * 2.09;
          star(b.x + b.w / 2 + Math.cos(a) * 18, b.y - 4 + Math.sin(a) * 4, 4, a);
        }
      }
      if (b.vulnerable) {
        ctx.save();
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,.85)';
        ctx.fillStyle = '#7dff9e';
        const text = wp ? 'KRISTAL!' : 'SERANG!';
        ctx.strokeText(text, b.x + b.w / 2, b.y - 14);
        ctx.fillText(text, b.x + b.w / 2, b.y - 14);
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
      let key = 'boss.idle';
      let rate = 5;
      if (b.mode === 'telegraph') { key = 'boss.prepare'; rate = 4; }
      else if (b.mode === 'attack') { key = 'boss.attack'; rate = 10; }
      else if (b.mode === 'recovery') { key = b.vulnerable ? 'boss.hurt' : 'boss.idle'; rate = 6; }
      else if (b.mode === 'transition') { key = 'boss.hurt'; rate = 6; }
      const im = images[key];
      if (!(im && im.complete && im.naturalWidth)) {
        ctx.fillStyle = b.mode === 'telegraph' ? '#ff8a4a' : '#5a6a8a';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        return;
      }
      const count = Math.max(1, Math.floor(im.naturalWidth / frame));
      const idx = Math.floor(time * rate) % count;
      const face = b.facing < 0 ? -1 : 1;
      // Batas tinggi supaya kepala boss tidak masuk ke balik bar HP.
      const drawH = Math.min(frame * 1.5, 116), drawW = drawH;
      const cx = b.x + b.w / 2;
      const top = b.y + b.h - drawH;
      ctx.save();
      ctx.translate(cx, top);
      ctx.scale(face, 1);
      if (b.invuln > 0 && Math.floor(time * 24) % 2 === 0) ctx.globalAlpha = 0.55;
      ctx.drawImage(im, idx * frame, 0, frame, frame, -drawW / 2, 0, drawW, drawH);
      ctx.restore();
    }

    function drawHero(game, time) {
      const p = game.p;
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
        if (game.swing) { row = 7; col = Math.min(3, Math.floor(game.swing.t / game.swing.dur * 4)); }
        else if (anim === 'run') { row = 4; col = Math.floor(time * 12) % 6; }
        else if (anim === 'jump') { row = 4; col = game.p.vy < 0 ? 1 : 4; }
        ctx.drawImage(im, col * fw, row * fw, fw, fw, -art.draw / 2, -art.foot * k, art.draw, art.draw);
      } else {
        ctx.fillStyle = '#ff7bd5';
        ctx.fillRect(-7, -26, 14, 26);
      }
      ctx.restore();
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
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(level.boss ? level.nama : `Misi ${level.id}: ${level.nama}`, 20, 24);

      // HP hero: bar kayu + angka, senjata aktif, dan bintang.
      const hx = 258;
      woodPanel(hx, 8, 372, 30);
      const hp = Math.max(0, game.hp || 0), maxHp = game.maxHp || 30;
      const bar = images['ui.bar'];
      const barW = 122, barH = 24, barX = hx + 7, barY = 11;
      if (bar && bar.complete && bar.naturalWidth) {
        ctx.drawImage(bar, barX, barY, barW, barH);
        // Bagian HP yang hilang ditutup warna gelap lubang bar.
        const inX = barX + barW * 0.05, inW = barW * 0.9;
        const gone = inW * (1 - Math.min(1, hp / maxHp));
        ctx.fillStyle = '#2a1a22';
        ctx.fillRect(inX + inW - gone, barY + barH * 0.25, gone, barH * 0.5);
      }
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = '#ffe2d6';
      ctx.fillText(`${hp}/${maxHp}`, hx + 134, 24);
      ctx.fillStyle = game.weaponColor || '#ffe066';
      ctx.fillText(game.weaponName || '', hx + 196, 24);
      ctx.fillStyle = '#ffd84a';
      ctx.fillText(`\u2605 ${game.stars}/${game.starTotal}`, hx + 300, 24);

      // Bar boss: hanya tampil di arena boss dan belum kalah.
      const b = game.boss;
      if (b && !b.defeated) {
        const bw = 360, bx = (VW - bw) / 2, by = 52;
        ctx.fillStyle = 'rgba(8,12,18,.82)';
        ctx.fillRect(bx - 8, by - 20, bw + 16, 38);
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText(`${b.schema.nama || 'BOSS'} — Fase ${b.schema.phases[b.phaseIndex].id}`, VW / 2, by - 8);
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
      const c0 = Math.max(0, Math.floor(camX / 16) - 1), c1 = Math.min(level.map[0].length - 1, Math.ceil((camX + VIEW_W) / 16) + 1);
      const r0 = Math.max(0, Math.floor(camY / 16) - 1), r1 = Math.min(level.map.length - 1, Math.ceil((camY + VIEW_H) / 16) + 1);
      drawDecor(level, c0, c1, r0, r1);
      drawTiles(level, c0, c1, r0, r1);
      drawObjects(level, game, time);
      drawCombat(game, time);
      drawHero(game, time);
      ctx.restore();
      drawHud(game, level, ui);

      if (ui.toast) {
        const ty = game.boss && !game.boss.defeated ? 76 : 50;
        ctx.save();
        ctx.globalAlpha = Math.min(1, ui.toastT || 1);
        ctx.fillStyle = 'rgba(0,0,0,.72)';
        // Petunjuk panjang mengecil sendiri supaya tetap muat di layar.
        let size = 18;
        ctx.font = `bold ${size}px system-ui, sans-serif`;
        while (size > 11 && ctx.measureText(ui.toast).width + 32 > VW - 16) {
          size--;
          ctx.font = `bold ${size}px system-ui, sans-serif`;
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
