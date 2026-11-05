// Math Hero 4: renderer landscape 640x360 dengan kamera dunia 320x180 (zoom 2x).
// Murni gambar: tidak mengubah state game. Semua posisi memakai satuan dunia (tile 16 px).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).scene = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  const VW = 640, VH = 360, ZOOM = 2, VIEW_W = VW / ZOOM, VIEW_H = VH / ZOOM;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function create(canvas, theme, bossDef) {
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
    Object.entries(theme.hero).forEach(([k, v]) => { if (k !== 'frame') add('hero.' + k, v); });
    // Sprite musuh level biasa: tiga tipe dengan lima state animasi.
    const enemyStates = ['Idle', 'Walk', 'Attack', 'Hurt', 'Death'];
    for (const id of ['walker', 'jumper', 'shooter']) {
      for (const st of enemyStates) add('enemy.' + id + '.' + st, '../assets/mh4/enemies/' + id + '/' + st + '.png');
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

    function drawBg() {
      ctx.fillStyle = theme.palette.sky;
      ctx.fillRect(0, 0, VW, VH);
      const im = images.bg;
      if (im && im.complete && im.naturalWidth) {
        if (theme.bgTile) {
          // Pola kecil (mis. 64x64) diulang, bukan diregangkan ke seluruh layar.
          const s = theme.bgTile;
          for (let y = 0; y < VH; y += s) for (let x = 0; x < VW; x += s) ctx.drawImage(im, x, y, s, s);
        } else {
          ctx.drawImage(im, 0, 0, VW, VH);
        }
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
        drawImage('decor.' + kind, c * 16 + (16 - w) / 2, y - hh, w, hh);
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
            else if (r % 4 === 0) drawImage('tile.fillDark', x, y, 16, 16);
            else drawImage('tile.fill', x, y, 16, 16);
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
        const x = ch.x - 6, y = ch.y - 1;
        ctx.fillStyle = '#8a5a2b'; ctx.fillRect(x, y + 4, 18, 12);
        ctx.fillStyle = ch.got ? '#6f6f6f' : theme.palette.gold; ctx.fillRect(x, y - 1, 18, 7);
        ctx.fillStyle = '#4a2f18'; ctx.fillRect(x + 7, y + 4, 4, 5);
        if (!ch.got) {
          ctx.fillStyle = 'rgba(255,240,150,.35)';
          ctx.beginPath(); ctx.arc(x + 9, y + 7, 14 + Math.sin(time * 4) * 2, 0, Math.PI * 2); ctx.fill();
        }
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
          const frame = 48;
          const count = Math.max(1, Math.floor(im.naturalWidth / frame));
          const rate = state === 'Walk' ? 8 : state === 'Attack' ? 9 : state === 'Hurt' ? 6 : 4;
          const idx = Math.floor((e.animT || 0) * rate + e.id * 0.37) % count;
          const dw = 28, dh = 28;
          const cx = e.x + e.w / 2, bottom = e.y + e.h;
          ctx.save();
          if (e.dir < 0) { ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.translate(-cx, 0); }
          ctx.drawImage(im, idx * frame, 0, frame, frame, cx - dw / 2, bottom - dh + 1, dw, dh);
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
        if (b.mode === 'telegraph' && b.current) {
          // Telegraph jelas: kilau di badan boss + garis bahaya di lantai untuk slam.
          const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
          const blink = 0.45 + 0.4 * Math.abs(Math.sin(time * 10));
          ctx.save();
          ctx.globalAlpha = blink;
          ctx.strokeStyle = b.current.def.kind === 'charge' ? '#ff9a3c' : '#ff5a5a';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(cx, cy, b.w * 0.85, 0, Math.PI * 2); ctx.stroke();
          if (b.current.def.kind === 'slam') {
            const gy = b.y + b.h;
            ctx.fillStyle = 'rgba(255,90,90,.22)';
            ctx.fillRect(cx - b.current.def.radius, gy - 2, b.current.def.radius * 2, 3);
          }
          if (b.current.def.kind === 'charge') {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + b.facing * b.current.def.range, cy);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
      for (const n of game.numbers) {
        const a = Math.max(0, n.life / n.max);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = n.target === 'boss' ? '#ffd84a' : n.target === 'enemy' ? '#ffffff' : '#ff7b7b';
        ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.lineWidth = 2.5;
        ctx.strokeText(String(n.amount), n.x, n.y);
        ctx.fillText(String(n.amount), n.x, n.y);
        ctx.restore();
      }
    }

    function drawBoss(b, time) {
      const schema = b.schema || {};
      const frame = schema.spriteFrame || 96;
      let key = 'boss.idle';
      let rate = 5;
      if (b.mode === 'telegraph') { key = 'boss.prepare'; rate = 4; }
      else if (b.mode === 'attack' || b.mode === 'recovery') { key = 'boss.attack'; rate = 10; }
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
      const drawW = frame * 1.5, drawH = frame * 1.5;
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
      const key = 'hero.' + (anim === 'run' ? 'run' : anim === 'jump' ? 'jump' : 'idle');
      const im = images[key];
      const face = game.face < 0 ? -1 : 1;
      const cx = p.x + p.w / 2;
      ctx.save();
      ctx.translate(cx, p.y + p.h);
      ctx.scale(face, 1);
      if (im && im.complete && im.naturalWidth) {
        const fw = theme.hero.frame || 32;
        const count = Math.max(1, Math.floor(im.naturalWidth / fw));
        const idx = Math.floor(time * (anim === 'run' ? 12 : anim === 'jump' ? 10 : 6)) % count;
        ctx.drawImage(im, idx * fw, 0, fw, fw, -13, -26, 26, 26);
      } else {
        ctx.fillStyle = '#ff7bd5';
        ctx.fillRect(-7, -26, 14, 26);
      }
      ctx.restore();
    }

    function drawHud(game, level, ui) {
      ctx.save();
      ctx.fillStyle = theme.palette.panel;
      ctx.fillRect(10, 8, 280, 30);
      ctx.fillStyle = theme.palette.text;
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Level ${level.id}: ${level.nama}`, 20, 24);

      // HP hero: bar 3 segmen (30 HP) + angka, senjata aktif, dan bintang.
      const hx = 300;
      ctx.fillStyle = theme.palette.panel;
      ctx.fillRect(hx, 8, 330, 30);
      const hp = Math.max(0, game.hp || 0), maxHp = game.maxHp || 30;
      const segs = 3, per = maxHp / segs, sw = 32;
      for (let i = 0; i < segs; i++) {
        const filled = Math.max(0, Math.min(1, (hp - i * per) / per));
        ctx.fillStyle = 'rgba(0,0,0,.5)';
        ctx.fillRect(hx + 10 + i * (sw + 3), 16, sw, 12);
        ctx.fillStyle = filled > 0.5 ? '#ff6b6b' : filled > 0 ? '#ffb36b' : '#5a2a2a';
        ctx.fillRect(hx + 10 + i * (sw + 3), 16, sw * filled, 12);
      }
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = '#ffd9d9';
      ctx.fillText(`${hp}/${maxHp}`, hx + 118, 24);
      ctx.fillStyle = game.weapon === 'blaster' ? '#7be0ff' : '#ffe066';
      ctx.fillText(game.weapon === 'blaster' ? 'Blaster' : 'Pedang', hx + 170, 24);
      ctx.fillStyle = theme.palette.star;
      ctx.fillText(`\u2605 ${game.stars}/${game.starTotal}`, hx + 246, 24);

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
        ctx.fillStyle = b.mode === 'transition' ? '#ffd84a' : '#ff5a5a';
        ctx.fillRect(bx, by, bw * frac, 12);
        if (b.mode === 'recovery') {
          ctx.fillStyle = 'rgba(255,255,255,.35)';
          ctx.fillRect(bx, by, bw * frac, 12);
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
      if (!inited) { camX = tx; camY = ty; inited = true; }
      const k = 1 - Math.pow(0.001, ui.dt || 1 / 60);
      camX += (tx - camX) * k;
      camY += (ty - camY) * k;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      drawBg();
      ctx.save();
      ctx.scale(ZOOM, ZOOM);
      ctx.translate(-Math.round(camX), -Math.round(camY));
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
        ctx.font = 'bold 18px system-ui, sans-serif';
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
