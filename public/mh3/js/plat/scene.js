// Math Hero 3: adegan Kejar (platformer layar tegak). Menggambar sim.js dan membaca pad 4 arah + tombol Lompat dan B.
// Mulai: MH3.plat.start(levelDef, onWin, onLose)  atau  M.go('plat', { level: 1, onEnd })
// Peti (PR) tidak menghalangi: menyentuhnya membuka kartu PR (MH3.homework). Peti Kekuatan -> pilih 1 dari 3 kekuatan,
// Peti Kristal -> 1 sampai 3 Kunci Kristal. opts.onChest(kind, id, g) bila ada menggantikan perilaku ini.
(function () {
  const M = window.MH2;
  const MH3 = window.MH3 = window.MH3 || {};
  const Sim = MH3.platSim, Lv = MH3.platLevels, En = MH3.endless, Ph = window.Physics;
  const T = Ph.T, SC = 1.3, HUD = 56, PAD_H = 180;
  let S = null;
  const grade = () => (M.save && M.save.active && M.save.active.grade) || 2;
  const POWERS = [
    { key: 'glide', nama: 'Meluncur', info: 'Setelah lompat 2x, tahan Lompat untuk meluncur', color: 'red' },
    { key: 'magnet', nama: 'Magnet bintang', info: 'Bintang di sekitar tertarik ke kamu', color: 'yellow' },
    { key: 'shield', nama: 'Perisai', info: 'Menahan pukulan, pulih lagi tiap 10 detik', color: 'teal' },
  ];
  const POWER_NAME = { glide: 'Meluncur', magnet: 'Magnet', shield: 'Perisai' };

  const SKILL_LABEL = { lempar: 'Bola api', terjang: 'Terjang', hantam: 'Hantam' };
  const controls = () => ({ dpad: true, a: 'Lompat', b: SKILL_LABEL[S && S.g && S.g.skill] || null });
  const heroKey = () => (M.save && M.save.active && M.save.active.hero) || 'pinki';
  const say = (t, ms, c) => M.toast(t, ms, c);
  // viewH: bagian layar di atas tombol (dipakai kamera dan balon petunjuk). Dunia digambar sampai dasar layar,
  // tombol menumpang di atasnya, jadi dasar kolom tidak terpotong di layar tinggi atau laptop.
  const viewH = () => M.VH - HUD - PAD_H;
  const fullH = () => M.VH - HUD;

  function handle(e) {
    const a = M.audio, fx = M.fx;
    const sx = (x) => (x - S.cam.x) * SC, sy = (y) => HUD + (y - S.cam.y) * SC;
    if (e.type === 'jump' || e.type === 'djump') a.sfx('lompat');
    else if (e.type === 'star') { a.sfx('ambil'); fx.float('+1', sx(e.x), sy(e.y), '#ffd54a', 16); fx.pop(sx(e.x), sy(e.y)); }
    else if (e.type === 'stomp') { a.sfx('pop'); fx.burst(sx(e.x), sy(e.y), { n: 10, speed: 110, color: ['#fff6dc', '#b38cff'], life: 0.4 }); }
    else if (e.type === 'hurt') { a.sfx('hit'); S.shake = 0.3; M.flash('#ff6b6b', 0.3); }
    else if (e.type === 'respawn') say('Ulang dari bendera terakhir, ya!', 1800);
    else if (e.type === 'checkpoint') { a.sfx('kartu'); say('Bendera! Kamu mulai dari sini kalau jatuh.', 1800, '#e3ffe6'); }
    else if (e.type === 'power') say({ glide: 'Meluncur! Lompat 2x lalu tahan Lompat.', magnet: 'Magnet bintang!', shield: 'Perisai! Pulih lagi tiap 10 detik.' }[e.key] || 'Kekuatan!', 2200);
    else if (e.type === 'shieldBreak') { a.sfx('hit'); fx.burst(sx(S.g.p.x + 14), sy(S.g.p.y + 26), { n: 14, speed: 140, color: ['#64e3ff', '#b8f4ff'], life: 0.4 }); }
    else if (e.type === 'shieldReady') { a.sfx('naik'); fx.float('Perisai siap!', sx(S.g.p.x + 14), sy(S.g.p.y - 10), '#64e3ff', 14); }
    else if (e.type === 'lunge') a.sfx('boost');
    else if (e.type === 'cannon') a.sfx('tembak');
    else if (e.type === 'spring' || e.type === 'dash') { a.sfx('boost'); fx.burst(sx(e.x), sy(e.y), { n: 8, speed: 90, color: ['#ffd54a', '#fff6dc'], life: 0.3 }); }
    else if (e.type === 'pipeIn' || e.type === 'pipeOut') a.sfx('hop');
    else if (e.type === 'lever' || e.type === 'plate') a.sfx('klik');
    else if (e.type === 'gateOpen') {
      a.sfx('naik');
      // blok saklar ada di dekat tuasnya dan terlihat berubah: tanpa pesan dan tanpa tengok kamera
      const gt = S.g.L.gates.find((o) => o.c === e.c && o.r === e.r);
      if (gt && blockGate(S.g.L, gt)) return;
      say('Gerbang terbuka!', 1500, '#e3ffe6');
      // gerbang di luar layar: tengok sebentar supaya anak melihat apa yang dibuka tuas/tombolnya
      const vw = M.VW / SC, vh = viewH() / SC, gx = e.x + T / 2, gy = e.y + T;
      if (gx < S.cam.x || gx > S.cam.x + vw || gy < S.cam.y || gy > S.cam.y + vh) S.pan = { x: gx, y: gy, t: 2.2 };
    }
    else if (e.type === 'gateClose') a.sfx('klik');
    else if (e.type === 'crumble') fx.burst(sx(e.x + 16), sy(e.y + 6), { n: 8, speed: 70, color: ['#c48a4a', '#7a4a2a'], life: 0.4 });
    else if (e.type === 'boxReset') say('Kotak kembali ke tempat awal.', 1600);
    else if (e.type === 'quiz') quiz(e);
    else if (e.type === 'throw') a.sfx('tembak');
    else if (e.type === 'shotHit') fx.burst(sx(e.x), sy(e.y), { n: 8, speed: 70, color: ['#ffd54a', '#ff7a2f', '#ff3d2e'], life: 0.3 });
    else if (e.type === 'slam') { a.sfx('ledak'); S.shake = 0.25; fx.burst(sx(e.x), sy(e.y), { n: 14, speed: 140, color: ['#fff6dc', '#c48a4a'], life: 0.4 }); }
    else if (e.type === 'crack') { fx.burst(sx(e.x), sy(e.y), { n: 12, speed: 120, color: ['#c48a4a', '#7a4a2a', '#4a2a14'], life: 0.5 }); if (!S.crackHint) { S.crackHint = true; say('Blok retak pecah!', 1500, '#e3ffe6'); } }
    else if (e.type === 'chest') chest(e);
    else if (e.type === 'dead') { a.sfx('salah'); S.shake = 0.4; }
    else if (e.type === 'win') { a.sfx('benar'); fx.confetti(); }
  }
  // Kartu PR: di Kejar biasa mengikuti tingkat level; di tanpa batas tingkat pelajaran naik tiap putaran.
  function cardOpts(title) {
    if (!S.endless) return { grade: grade(), tier: S.def.tier || 0, title };
    const ls = En.lesson(S.endless.round, S.endless.grade0);
    return { grade: ls.grade, tier: ls.tier, title };
  }
  // Tanpa batas: tiap jawaban salah di kartu memotong 1 hati (paling banyak En.WRONG_MAX per kartu).
  // Mengembalikan true bila hati habis (adegan pindah ke layar akhir).
  function wrongCost(r) {
    if (!S.endless || !r || !(r.wrong > 0)) return false;
    const n = Math.min(En.WRONG_MAX, r.wrong);
    const dead = Sim.loseHearts(S.g, n);
    M.audio.sfx('hit'); S.shake = 0.3; M.flash('#ff6b6b', 0.3);
    say(`Jawaban salah: hati -${n}`, 1800, '#ffd0d0');
    if (dead) { overNow(); return true; }
    return false;
  }
  function chest(e) {
    const f = S.opts.onChest;
    if (f) { f(e.kind, e.id, S.g); return; }
    const ch = S.g.L.chests[e.id], power = e.kind === 'power';
    S.state = 'card';
    MH3.homework.open(cardOpts(power ? 'Peti Kekuatan' : 'Peti Kristal'), (r) => {
      M.setControls(controls());
      if (wrongCost(r)) return;
      if (r.status !== 'done') { ch.got = false; ch.skip = true; S.state = 'play'; say('Peti disimpan. Sentuh lagi kalau sudah siap.', 2200); return; }
      M.audio.sfx('benar');
      if (power) S.state = 'power';
      else {
        S.state = 'play'; S.keys = (S.keys || 0) + Math.max(1, Math.min(3, r.stars));
        MH3.defense.addKeys(Math.max(1, Math.min(3, r.stars))); M.fx.confetti();
        say(`Dapat ${Math.max(1, Math.min(3, r.stars))} Kunci Kristal!`, 2000, '#e3ffe6');
      }
    });
  }

  // Tuas atau tombol macet: kartu PR. Benar -> benda bekerja; ditunda -> tetap macet, sentuh lagi nanti.
  function quiz(e) {
    if (S.opts.onQuiz) { S.opts.onQuiz(e, S.g); return; }
    S.state = 'card'; a0().sfx('awas');
    MH3.homework.open(cardOpts(e.what === 'lever' ? 'Tuas macet!' : 'Tombol macet!'), (r) => {
      M.setControls(controls());
      if (wrongCost(r)) return;
      S.state = 'play';
      if (r.status !== 'done') { say(e.what === 'lever' ? 'Masih macet. Tekan B lagi kalau sudah siap.' : 'Masih macet. Injak lagi kalau sudah siap.', 2200); return; }
      Sim.solveQuiz(S.g, e.what, e.id);
      say(e.what === 'lever' ? 'Tuas bisa ditarik!' : 'Tombol bisa ditekan!', 1800, '#e3ffe6');
    });
  }
  const a0 = () => M.audio;

  // Kamera mengikuti hero; saat pan (gerbang jauh terbuka) kamera menengok ke gerbang dulu lalu kembali.
  function updateCam(dt, snap) {
    const g = S.g, p = g.p, L = g.L, vw = M.VW / SC, vh = viewH() / SC, pan = S.pan && S.pan.t > 0.5 ? S.pan : null;
    const fx = pan ? pan.x - vw / 2 : p.x + p.w / 2 - vw * 0.42 + g.face * 20, fy = pan ? pan.y - vh / 2 : p.y + p.h / 2 - vh * 0.6;
    const tx = Math.max(0, Math.min(L.cols * T - vw, fx)), ty = Math.max(0, Math.min(L.rows * T - vh, fy));
    if (snap) { S.cam.x = tx; S.cam.y = ty; } else { S.cam.x += (tx - S.cam.x) * Math.min(1, dt * 8); S.cam.y += (ty - S.cam.y) * Math.min(1, dt * 5); }
  }

  // Tile per tema dari tileset CraftPix (16 px sumber, digambar 32 px). 'grass': blok 3x3 berautotile.
  // 'bars': potongan tepi atas + isi. Sama dengan tema MH1 (public/js/render.js) supaya seri terlihat satu keluarga.
  const TILE = {
    padang: { kind: 'grass', ox: 0, oy: 0, plank: [12, 8], wood: ['#8a5a2b', '#c48a4a'] },
    kebun: { kind: 'grass', ox: 6, oy: 0, plank: [12, 8], wood: ['#7a4a2a', '#b8743c'] },
    gua: { kind: 'bars', top: [[7, 4], [8, 4]], capL: [6, 4], capR: [9, 4], fill: [[0, 4], [1, 4], [2, 5], [3, 5], [4, 4], [0, 6]], plank: [12, 9], wood: ['#5d6278', '#9aa0b4'] },
    langit: { kind: 'bars', top: [[13, 0]], capL: [12, 0], capR: [14, 0], fill: [[13, 1], [14, 1], [13, 2], [14, 2]], plank: [12, 9], wood: ['#6b7a99', '#c8d3e6'] },
  };
  const CH_COL = ['#ff5d73', '#4b9cff', '#ffd54a'], CH_DARK = ['#a3283d', '#2d5fb4', '#b8860b'];
  const theme = () => TILE[S.def.tema] || TILE.padang;

  function solidAt(L, c, r) {
    if (c < 0 || c >= L.cols || r >= L.rows) return true;
    if (r < 0) return false;
    return L.tiles[r * L.cols + c] === 1 && !S.gateCell.has(r * L.cols + c);
  }
  function drawTile(g, L, c, r) {
    const th = theme(), x = c * T, y = r * T;
    const up = solidAt(L, c, r - 1), dn = solidAt(L, c, r + 1), lf = solidAt(L, c - 1, r), rt = solidAt(L, c + 1, r);
    let p;
    if (th.kind === 'grass') p = [th.ox + (!lf ? 0 : !rt ? 2 : 1), th.oy + (!up ? 0 : !dn ? 2 : 1)];
    else if (!up) p = !lf ? th.capL : !rt ? th.capR : th.top[c % th.top.length];
    else p = th.fill[((c & 1) + (r & 1) * 2 + (c % 5 === 0 ? 1 : 0)) % th.fill.length];
    M.tile1(g, p[0], p[1], x, y);
  }
  function drawPlank(g, x, y, w) {
    const th = theme(), n = Math.max(1, Math.round(w / T));
    for (let i = 0; i < n; i++) {
      let p;
      if (th.kind === 'grass') p = [th.ox + (i === 0 ? 0 : i === n - 1 ? 2 : 1), th.oy];
      else p = i === 0 ? th.capL : i === n - 1 ? th.capR : th.top[i % th.top.length];
      M.tile1(g, p[0], p[1], x + i * T, y, T);
    }
  }
  // Papan tipis (platform gerak): potongan papan tileset 16x8 sumber, sama seperti platform gerak MH1.
  function drawBoard(g, x, y, w) {
    const p = theme().plank, n = Math.max(1, Math.round(w / T));
    for (let i = 0; i < n; i++) M.tile1Part(g, p[0], p[1], 16, 8, x + i * T, y - 2, T, 16);
  }
  function drawLadder(g, c, r) {
    const [dk, lt] = theme().wood, x = c * T, y = r * T;
    g.fillStyle = dk; g.fillRect(x + 5, y, 5, T); g.fillRect(x + T - 10, y, 5, T);
    g.fillStyle = lt; g.fillRect(x + 6, y, 2, T); g.fillRect(x + T - 9, y, 2, T);
    for (let k = 0; k < 2; k++) { g.fillStyle = dk; g.fillRect(x + 8, y + 6 + k * 16, T - 16, 5); g.fillStyle = lt; g.fillRect(x + 8, y + 6 + k * 16, T - 16, 2); }
  }
  function drawPipe(g, pp) {
    const a = { x: pp.a.x + T / 2, y: pp.a.y + T / 2 }, b = { x: pp.b.x + T / 2, y: pp.b.y + T / 2 };
    const path = [a, { x: b.x, y: a.y }, b];
    for (const [w, col] of [[26, '#3e4a66'], [20, '#7f8fb0'], [6, '#c8d3e6']]) {
      g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round'; g.beginPath(); g.moveTo(path[0].x, path[0].y);
      for (const q of path.slice(1)) g.lineTo(q.x, q.y); g.stroke();
    }
    for (const m of [pp.a, pp.b]) {
      M.box(g, m.x - 2, m.y + 2, T + 4, T - 2, m === pp.a ? '#5fd068' : '#64e3ff', { line: '#1d1438' });
      g.fillStyle = '#1d1438'; g.fillRect(m.x + 6, m.y + 8, T - 12, T - 10);
    }
  }
  // Gerbang: jeruji tebal berwarna kanal di dalam bingkai gelap. Saat terbuka jeruji naik masuk ke kepala gerbang
  // (animasi gt.anim 0..1), jadi anak melihat gerbang mana yang dibuka tuas/tombolnya.
  // Blok saklar: gerbang terbalik, atau sel gerbang tunggal (tanpa sel gerbang sejenis di atas/bawahnya).
  const blockGate = (L, o) => o.inv || !L.gates.some((q) => q !== o && q.c === o.c && Math.abs(q.r - o.r) === 1 && q.ch === o.ch && !q.inv === !o.inv);
  function drawGate(g, gt, L) {
    const x = gt.c * T, y = gt.r * T, col = CH_COL[gt.ch], dk = CH_DARK[gt.ch];
    gt.anim = gt.anim === undefined ? (gt.open ? 1 : 0) : gt.anim + ((gt.open ? 1 : 0) - gt.anim) * Math.min(1, M.dt * 4);
    const k = gt.anim, same = (o) => o.c === gt.c && o.ch === gt.ch && !o.inv === !gt.inv;
    const top = !L.gates.some((o) => same(o) && o.r === gt.r - 1);
    // Blok saklar (gerbang terbalik, atau sel gerbang tunggal yang melayang): padat berwarna saat tertutup,
    // garis putus-putus saat terbuka. Gerbang biasa setinggi 2 sel atau lebih: jeruji yang terangkat.
    if (blockGate(L, gt)) {
      g.save();
      if (k < 0.99) {
        g.globalAlpha = 1 - k;
        M.box(g, x + 1, y + 1, T - 2, T - 2, col, { line: '#1d1438', shade: true });
        g.fillStyle = dk; g.fillRect(x + 5, y + 5, T - 10, T - 10);
        g.fillStyle = col; g.fillRect(x + 7, y + 7, T - 14, T - 14);
        g.fillStyle = '#fff';
        if (gt.inv) { g.beginPath(); g.moveTo(x + T / 2, y + 9); g.lineTo(x + T - 9, y + T / 2); g.lineTo(x + T / 2, y + T - 9); g.lineTo(x + 9, y + T / 2); g.fill(); }
        else g.fillRect(x + 10, y + T / 2 - 2, T - 20, 4);
      }
      if (k > 0.01) {
        g.globalAlpha = k * 0.8; g.strokeStyle = col; g.lineWidth = 2; g.setLineDash([4, 4]);
        g.strokeRect(x + 3, y + 3, T - 6, T - 6);
      }
      g.restore();
      return;
    }
    g.fillStyle = 'rgba(29,20,56,0.35)'; g.fillRect(x, y, T, T);
    const h = Math.round(T * (1 - k));
    if (h > 0) {
      g.fillStyle = dk; g.fillRect(x + 2, y, T - 4, h);
      g.fillStyle = col; for (let i = 0; i < 4; i++) g.fillRect(x + 4 + i * 7, y, 4, h);
      g.fillStyle = '#fff'; g.globalAlpha = 0.35; for (let i = 0; i < 4; i++) g.fillRect(x + 4 + i * 7, y, 1, h); g.globalAlpha = 1;
      g.fillStyle = '#1d1438'; g.fillRect(x + 2, y + Math.max(0, h - 3), T - 4, 3);
    }
    g.fillStyle = '#1d1438'; g.fillRect(x, y, 2, T); g.fillRect(x + T - 2, y, 2, T);
    if (top) {
      M.box(g, x - 4, y - 8, T + 8, 10, '#3a3346', { line: '#1d1438', shade: false });
      g.fillStyle = col; g.fillRect(x + T / 2 - 5, y - 6, 10, 6);
    }
  }
  // Duri: tiga paku perak tajam berujung merah di atas alas gelap, sedikit lebih tinggi dari kotak lukanya supaya
  // terlihat jelas berbahaya.
  function drawSpike(g, s) {
    const by = s.y + s.h, ty = s.y - 6, w = s.w / 3;
    g.fillStyle = '#2b1d52'; g.fillRect(s.x - 2, by - 5, s.w + 4, 5);
    g.lineWidth = 2; g.strokeStyle = '#1d1438';
    for (let i = 0; i < 3; i++) {
      const x0 = s.x + i * w, mx = x0 + w / 2;
      g.fillStyle = '#e8ecf5'; g.beginPath(); g.moveTo(x0, by - 4); g.lineTo(mx, ty); g.lineTo(x0 + w, by - 4); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#9aa0b8'; g.beginPath(); g.moveTo(mx, ty); g.lineTo(x0 + w, by - 4); g.lineTo(mx, by - 4); g.closePath(); g.fill();
      g.fillStyle = '#ff3b5c'; g.beginPath(); g.moveTo(mx, ty); g.lineTo(mx + w * 0.22, ty + 8); g.lineTo(mx - w * 0.22, ty + 8); g.closePath(); g.fill();
    }
  }
  function drawSwitches(g, L) {
    for (const pl of L.plates) {
      const cx = pl.x + pl.w / 2, by = pl.y + pl.h;
      g.fillStyle = '#3a3346'; g.fillRect(pl.x - 2, by - 4, pl.w + 4, 4);
      g.fillStyle = pl.down ? CH_DARK[pl.ch] : CH_COL[pl.ch]; g.fillRect(cx - 9, by - (pl.down ? 6 : 10), 18, pl.down ? 2 : 6);
    }
    for (const lv of L.levers) {
      const bx = lv.x + lv.w / 2, by = lv.y + lv.h;
      g.strokeStyle = '#3a3346'; g.lineWidth = 4; g.beginPath(); g.moveTo(bx, by - 6); g.lineTo(bx + (lv.on ? 11 : -11), by - 24); g.stroke();
      g.fillStyle = CH_COL[lv.ch]; g.beginPath(); g.arc(bx + (lv.on ? 11 : -11), by - 25, 5, 0, 7); g.fill();
      M.box(g, bx - 10, by - 8, 20, 8, '#6b6478', { line: '#1d1438', shade: false });
      if (lv.stuck) stuckMark(g, bx, by - 40);
      // di dekat tuas: tanda tombol B berdenyut di atasnya
      if (S.g.nearLever === lv) {
        const k = 1 + Math.sin(M.t * 8) * 0.08, ty = by - (lv.stuck ? 62 : 44);
        g.save(); g.fillStyle = '#ffb347'; g.strokeStyle = '#2b1d52'; g.lineWidth = 3;
        g.beginPath(); g.arc(bx, ty, 11 * k, 0, 7); g.fill(); g.stroke();
        g.fillStyle = '#fff'; g.font = 'bold 14px Kleintenna, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('B', bx, ty + 1); g.restore();
      }
    }
    for (const pl of L.plates) if (pl.stuck) stuckMark(g, pl.x + pl.w / 2, pl.y - 26);
  }

  // Tanda benda macet: gembok kecil dengan tanda tanya yang berkedip pelan.
  function stuckMark(g, x, y) {
    const k = 0.75 + Math.sin(M.t * 4) * 0.25;
    g.globalAlpha = k;
    g.strokeStyle = '#1d1438'; g.lineWidth = 3; g.beginPath(); g.arc(x, y - 4, 6, Math.PI, 0); g.stroke();
    M.box(g, x - 10, y - 4, 20, 16, '#ffd54a', { line: '#1d1438', shade: false });
    M.text(g, '?', x, y + 10, { size: 13, align: 'center', color: '#2b1d52', outline: false });
    g.globalAlpha = 1;
  }

  function drawWorld(g) {
    const gm = S.g, L = gm.L, cam = S.cam, vw = M.VW / SC, vh = fullH() / SC;
    g.save(); g.beginPath(); g.rect(0, HUD, M.VW, fullH()); g.clip();
    g.translate(0, HUD); g.scale(SC, SC); g.translate(-Math.round(cam.x), -Math.round(cam.y));
    const c0 = Math.max(0, Math.floor(cam.x / T)), c1 = Math.min(L.cols - 1, Math.floor((cam.x + vw) / T) + 1);
    const r0 = Math.max(0, Math.floor(cam.y / T)), r1 = Math.floor((cam.y + vh) / T) + 1;
    // Ruang dalam (gua, terowongan): latar digelapkan dan diberi dinding belakang bata samar dengan warna tema.
    for (const q of S.def.inside || []) {
      const x = q[0] * T, y = q[1] * T, w = (q[2] - q[0] + 1) * T, h = (q[3] - q[1] + 1) * T;
      g.fillStyle = 'rgba(20,12,40,0.55)'; g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(255,255,255,0.05)';
      for (let r = 0; r < h / 16; r++) for (let c = (r & 1) * 12; c < w; c += 24) g.fillRect(x + c, y + r * 16, 22, 14);
    }
    for (const pp of L.pipes) drawPipe(g, pp);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const i = r * L.cols + c;
      if (L.lad[i]) drawLadder(g, c, r);
      // di bawah baris terakhir: lanjutkan kolom tanah sampai dasar layar (lubang tetap lubang)
      const t = r >= L.rows ? L.tiles[(L.rows - 1) * L.cols + c] : L.tiles[i];
      if (!t || S.gateCell.has(i)) continue;
      if (t === 2) { drawPlank(g, c * T, r * T, T); continue; }
      drawTile(g, L, c, r);
    }
    for (const k of L.cracks) {
      if (L.tiles[k.r * L.cols + k.c] !== 1) continue;
      const x = k.c * T, y = k.r * T;
      g.strokeStyle = 'rgba(29,20,56,0.75)'; g.lineWidth = 2; g.beginPath();
      g.moveTo(x + 6, y + 4); g.lineTo(x + 14, y + 14); g.lineTo(x + 10, y + 22); g.lineTo(x + 18, y + 29);
      g.moveTo(x + 14, y + 14); g.lineTo(x + 25, y + 11); g.stroke();
    }
    for (const d of S.decor) if (d.x > cam.x - 64 && d.x < cam.x + vw + 64 && d.y > cam.y - 8 && d.y < cam.y + vh + 80) M.art(g, d.art, d.x, d.y, 2, { anchor: d.hang ? undefined : 'feet', flip: d.flip, swap: d.swap });
    for (const gt of L.gates) drawGate(g, gt, L);
    for (const m of L.movers) {
      drawBoard(g, m.x, m.y, m.w);
      if (m.axis === 'y') { g.fillStyle = 'rgba(58,51,70,0.5)'; g.fillRect(m.x + m.w / 2 - 1, m.y0, 2, m.y1 - m.y0); }
    }
    for (const c of L.crumbles) {
      if (c.state === 'gone') continue;
      const j = c.state === 'shake' ? Math.round(Math.sin(M.t * 60) * 1.5) : 0;
      g.fillStyle = '#7a4a2a'; g.fillRect(c.x + j, c.y, T, 10); g.fillStyle = '#c48a4a'; g.fillRect(c.x + j, c.y, T, 4);
      g.fillStyle = '#4a2a14'; g.fillRect(c.x + j + 10, c.y + 4, 2, 6); g.fillRect(c.x + j + 22, c.y + 2, 2, 5);
    }
    for (const s of L.springs) M.spr1(g, 'trap1', s.t > 0 ? Math.floor((0.4 - s.t) / 0.4 * 7) : 0, s.x + s.w / 2, s.y + s.h, { scale: 1 });
    for (const d of L.dashes) {
      const by = d.y + d.h; // alas per samping (zona pemicunya lebih tinggi dari gambarnya)
      M.box(g, d.x, by - 22, d.w, 22, d.t > 0 ? '#ffd54a' : '#ff9f43', { line: '#1d1438' });
      M.text(g, d.dir > 0 ? '»' : '«', d.x + d.w / 2, by - 3, { size: 18, align: 'center' });
    }
    drawSwitches(g, L);
    for (const b of gm.boxes) M.spr1(g, 'box1_idle', 0, b.x + b.w / 2, b.y + b.h, { scale: 1.36 });
    for (const s of L.saws) M.spr1(g, 'trap2', Math.floor(M.t * 14) % 7, s.cx, s.cy, { scale: 1, anchor: 'center' });
    for (const s of L.spikes) drawSpike(g, s);
    for (const c of L.checkpoints) { g.fillStyle = '#3a3346'; g.fillRect(c.x - 2, c.y - 46, 4, 46); g.fillStyle = c.got ? '#5fd068' : '#ff6b6b'; g.fillRect(c.x + 2, c.y - 46, 20, 14); }
    for (const ch of L.chests) {
      if (ch.got) continue;
      const bob = Math.sin(M.t * 4 + ch.id) * 2;
      g.fillStyle = 'rgba(255,213,74,0.28)'; g.beginPath(); g.arc(ch.x + ch.w / 2, ch.y + ch.h / 2 + bob, 24, 0, 7); g.fill();
      M.box(g, ch.x + 2, ch.y + 8 + bob, ch.w - 4, ch.h - 12, ch.kind === 'power' ? '#ffb347' : '#64e3ff', { line: '#2b1d52' });
      M.text(g, ch.kind === 'power' ? '?' : '◆', ch.x + ch.w / 2, ch.y + ch.h / 2 + 8 + bob, { size: 18, align: 'center' });
    }
    for (const s of L.stars) if (!s.got) M.art(g, 'bintang', s.x - 11 * 1.3, s.y - 11 * 1.3 + Math.sin(M.t * 5 + s.id) * 2, 2.6);
    // tujuan: kristal
    { const gl = L.goal, bob = Math.sin(M.t * 3) * 3; g.fillStyle = 'rgba(100,227,255,0.25)'; g.beginPath(); g.arc(gl.x + gl.w / 2, gl.y + gl.h / 2, 36, 0, 7); g.fill(); M.art(g, 'kristal', gl.x + gl.w / 2 - 12 * 2.4, gl.y + 4 + bob, 4.5); }
    for (const e of gm.enemies) drawEnemy(g, e);
    for (const bl of gm.balls) M.spr1(g, 'cannonball1', 0, bl.x, bl.y, { scale: 2, anchor: 'center' });
    for (const sh of gm.shots) drawFireball(g, sh);
    const p = gm.p, hx = p.x + p.w / 2, hy = p.y + p.h / 2;
    if (gm.power === 'magnet' && !gm.pipe) {
      // aura emas berdenyut
      const r = 34 + Math.sin(M.t * 5) * 4, gr = g.createRadialGradient(hx, hy, 6, hx, hy, r);
      gr.addColorStop(0, 'rgba(255,213,74,0.35)'); gr.addColorStop(0.7, 'rgba(255,213,74,0.18)'); gr.addColorStop(1, 'rgba(255,213,74,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(hx, hy, r, 0, 7); g.fill();
    }
    if (gm.power === 'glide' && !gm.pipe) drawWings(g, gm, hx, p.y + 28);
    if (gm.lunge) {
      g.fillStyle = 'rgba(255,255,255,0.7)';
      for (let k = 0; k < 4; k++) g.fillRect(hx - gm.lunge.dir * (22 + k * 9), p.y + 10 + k * 9, 14, 3);
    }
    const blink = gm.invuln > 0 && Math.floor(M.t * 14) % 2;
    if (!gm.pipe && !blink) M.hero(g, heroKey(), gm.anim, M.t, hx, p.y + p.h + 2, { scale: 1.5, flip: gm.face < 0, frame: gm.climb && !p.vy ? 0 : undefined });
    if (gm.shield && !gm.pipe) {
      // gelembung perisai: kecil dan ungu saat mengisi, membesar sampai ukuran penuh dan biru muda saat siap
      const sd = gm.shield, k = sd.ready ? 1 : 1 - sd.t / 10, r = 12 + 26 * k;
      g.fillStyle = sd.ready ? 'rgba(100,227,255,0.16)' : 'rgba(179,140,255,0.14)'; g.beginPath(); g.arc(hx, hy, r, 0, 7); g.fill();
      g.strokeStyle = sd.ready ? 'rgba(100,227,255,0.85)' : 'rgba(179,140,255,0.7)'; g.lineWidth = sd.ready ? 3 : 2;
      g.beginPath(); g.arc(hx, hy, r, 0, 7); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(hx - r * 0.5, hy - r * 0.6, Math.max(2, r * 0.18), Math.max(2, r * 0.18));
    }
    g.restore();
  }

  // Musuh MH1 dengan sprite masing-masing. faces = arah hadap sprite asli (1 kanan, -1 kiri).
  const FOE_ART = {
    e: { run: 'enemy1_run', hit: 'enemy1_hit', faces: 1 }, a: { run: 'enemy2_run', hit: 'enemy2_hit', faces: 1 },
    r: { run: 'enemy3_walk', tele: 'enemy3_idle', charge: 'enemy3_charge', stun: 'enemy3_stun', hit: 'enemy3_hit', faces: 1 },
    f: { run: 'enemy5_fly', hit: 'enemy5_hit', faces: 1 }, n: { run: 'enemy4_idle', fire: 'enemy4_attack', hit: 'enemy4_hit', faces: -1 },
  };
  function drawEnemy(g, e) {
    const b = e.b, d = FOE_ART[e.type] || FOE_ART.e, f = M.t * 12 + e.id, fly = e.type === 'f';
    const x = b.x + b.w / 2, y = fly ? b.y + b.h / 2 : b.y + b.h + 2, o = { scale: 1.25, flip: e.dir !== d.faces, anchor: fly ? 'center' : undefined };
    if (e.dead) { if (e.timer > 0) M.spr1(g, d.hit, 2, x, y, Object.assign(o, { alpha: Math.max(0, e.timer * 2.5) })); return; }
    M.spr1(g, d[e.state] || d.run, f, x, y, o);
    if (e.state === 'tele') M.text(g, '!', x, b.y - 20, { size: 20, align: 'center', color: '#ff5d73' });
    if (e.state === 'stun') for (let k = 0; k < 3; k++) M.art(g, 'bintang', x - 6 + Math.cos(M.t * 6 + k * 2.1) * 14, b.y - 18 + Math.sin(M.t * 6 + k * 2.1) * 4, 1);
  }
  // Bola api: inti kuning, api jingga-merah, ekor yang memudar ke belakang.
  function drawFireball(g, s) {
    const d = Math.sign(s.vx) || 1;
    for (let k = 3; k >= 1; k--) { g.fillStyle = `rgba(255,${90 + k * 20},40,${0.5 - k * 0.12})`; g.beginPath(); g.arc(s.x - d * k * 7, s.y - k * 1.5, s.r - k, 0, 7); g.fill(); }
    g.fillStyle = '#ff3d2e'; g.beginPath(); g.arc(s.x, s.y, s.r + 1, 0, 7); g.fill();
    g.fillStyle = '#ff9f43'; g.beginPath(); g.arc(s.x + d, s.y, s.r - 2, 0, 7); g.fill();
    g.fillStyle = '#ffe98a'; g.beginPath(); g.arc(s.x + d * 2, s.y - 1, s.r - 4.5, 0, 7); g.fill();
  }
  // Sayap Meluncur: terlipat kecil di punggung, terbentang dan mengepak saat meluncur.
  function drawWings(g, gm, x, y) {
    const open = gm.glide, flap = open ? Math.sin(M.t * 16) * 0.25 : 0;
    for (const d of [-1, 1]) {
      g.save(); g.translate(x - gm.face * 8, y); g.scale(d, 1); g.rotate((open ? -0.25 : -0.6) + flap);
      const L = open ? 40 : 22;
      g.fillStyle = '#ffffff'; g.strokeStyle = '#1d1438'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(L * 0.6, -12, L, -4); g.lineTo(L * 0.8, 2); g.lineTo(L * 0.55, 0); g.lineTo(L * 0.35, 5); g.closePath();
      g.fill(); g.stroke();
      g.fillStyle = '#b8f4ff'; g.fillRect(L * 0.3, -5, L * 0.4, 2);
      g.restore();
    }
  }

  // ---------- Hiasan per tema ----------
  // Tanaman, batu, kristal, dan tiang di atas lantai kosong (bukan di dekat benda permainan), dipilih dari hash kolom
  // supaya sama setiap kali level dimainkan. Gua juga punya stalaktit di bawah atap.
  const DECOR = {
    padang: [['rumput', 30], ['bunga', 14], ['semak', 10], ['pohon', 6, 3], ['batu', 6], ['bunga', 6, 0, { r: '#ffffff', y: '#ffd54a' }], ['bunga', 5, 0, { r: '#4b9cff' }]],
    kebun: [['rumput', 24], ['bunga', 14, 0, { r: '#ff8fab' }], ['labu', 8], ['semak', 9], ['jamur', 6], ['pohon', 5, 3], ['bunga', 8, 0, { r: '#ffd54a', y: '#ff9f43' }]],
    gua: [['kristalKecil', 14], ['batu', 14], ['stalagmit', 10], ['jamur', 8, 0, { r: '#64e3ff', w: '#b8f4ff' }], ['kristalKecil', 8, 0, { l: '#e3d4ff', c: '#b38cff', C: '#8b5cf6' }]],
    langit: [['antena', 7, 1], ['bendera', 5, 1], ['batu', 6, 0, { n: '#c8d3e6', N: '#8a96b0', h: '#ffffff' }], ['bendera', 3, 1, { r: '#4b9cff' }]],
  };
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function buildDecor(L, def) {
    const out = [], busy = new Set(), mark = (x, y) => busy.add(Math.floor(y / T) * L.cols + Math.floor(x / T));
    for (const o of [...L.springs, ...L.levers, ...L.plates, ...L.chests, ...L.checkpoints, ...L.spikes, ...L.dashes, ...L.enemies]) mark(o.x + 8, o.y + 8);
    for (const o of L.pipes) { mark(o.a.x, o.a.y); mark(o.b.x, o.b.y); }
    for (const o of L.boxes) mark(o.x0, o.y0);
    for (const o of L.saws) mark(o.cx, o.cy);
    mark(L.start.x, L.start.y - 8); mark(L.goal.x, L.goal.y + T);
    const inside = (c, r) => (def.inside || []).some((q) => c >= q[0] && c <= q[2] && r >= q[1] && r <= q[3]);
    const set = DECOR[def.tema] || DECOR.padang, total = set.reduce((t, d) => t + d[1], 0);
    const free = (c, r) => c >= 0 && c < L.cols && r >= 0 && !L.tiles[r * L.cols + c] && !L.lad[r * L.cols + c] && !busy.has(r * L.cols + c);
    for (let r = 1; r < L.rows; r++) for (let c = 0; c < L.cols; c++) {
      const i = r * L.cols + c;
      if (L.tiles[i] !== 1 || L.cracks.some((k) => k.c === c && k.r === r) || L.gates.some((gt) => gt.c === c && gt.r === r)) continue;
      // stalaktit menggantung di bawah atap gua
      if (def.tema === 'gua' && r + 1 < L.rows && free(c, r + 1) && free(c, r + 2) && hash(c, r * 7) < 0.18) out.push({ art: 'stalaktit', x: c * T + 9, y: (r + 1) * T, hang: true });
      if (!free(c, r - 1) || hash(c, r) > 0.42) continue;
      let k = hash(r, c) * total, d = set[0];
      for (const x of set) { if ((k -= x[1]) < 0) { d = x; break; } }
      if (d[2] && (!free(c, r - 2) || !free(c, r - 3) || inside(c, r - 1) || (d[2] > 1 && (!free(c - 1, r - 1) || !free(c + 1, r - 1))))) continue;
      out.push({ art: d[0], x: c * T + T / 2 + (hash(c * 3, r) - 0.5) * 10, y: r * T, flip: hash(c, r * 3) < 0.5, swap: d[3] });
    }
    return out;
  }

  // ---------- Balon penjelasan ----------
  // Saat benda atau musuh baru pertama kali terlihat, balon teks singkat muncul di dekatnya selama beberapa detik.
  // Tiap jenis tampil sekali per permainan level, dan berhenti muncul setelah dilihat 3 kali di perangkat ini.
  const CRACK_TIP = { lempar: 'Blok retak! Tekan B: bola api memecahkannya.', terjang: 'Blok retak! Lompat, lalu tekan B untuk menukik.', hantam: 'Blok retak! Tekan B untuk menghantam tanah.' };
  const TIP = {
    tangga: 'Tangga! Tekan ▲ untuk naik, ▼ untuk turun.', per: 'Per! Injak untuk melambung tinggi.', samping: 'Per samping! Lewati untuk melesat jauh.',
    pipa: 'Pipa! Masuk dari mulut hijau.', gerak: 'Papan bergerak! Tunggu, lalu lompat naik.', lift: 'Lift! Berdiri di atasnya untuk naik.',
    rapuh: 'Papan rapuh! Cepat lewat, nanti runtuh.', kotak: 'Kotak! Dorong ke tombol.', tombol: 'Tombol! Injak, atau taruh kotak di atasnya.',
    tuas: 'Tuas! Berdiri di dekatnya, tekan B untuk menarik. Tekan B lagi untuk mengembalikan.', gerbang: 'Gerbang tertutup! Cari tuas atau tombol yang warnanya sama.', saklar: 'Blok saklar! Tarik tuas sewarna: blok padat hilang, blok garis putus-putus muncul.', macet: 'Tombol macet! Injak, lalu jawab soalnya.', macetTuas: 'Tuas macet! Tekan B di dekatnya, lalu jawab soalnya.', gergaji: 'Gergaji! Lompati, jangan disentuh.',
    e: 'Musuh! Injak kepalanya.', a: 'Musuh! Injak kepalanya.', r: 'Banteng! Bisa diinjak saat pusing, atau pakai B.',
    f: 'Lebah! Tidak bisa diinjak. Hindari atau pakai B.', n: 'Meriam! Lompati pelurunya, atau pakai B.', peti: 'Peti Kekuatan! Jawab soal, dapat kekuatan super.',
  };
  const TIP_KEY = 'mh3_tips_v1';
  function tipStore() { try { return JSON.parse(localStorage.getItem(TIP_KEY)) || {}; } catch (e) { return {}; } }
  function buildTips(L, skill) {
    const t = [], add = (key, x, y) => { if (!t.some((q) => q.key === key)) t.push({ key, x, y, text: key === 'retak' ? CRACK_TIP[skill] || CRACK_TIP.lempar : TIP[key] }); };
    L.lad.forEach((v, i) => { if (v && !t.some((q) => q.key === 'tangga')) add('tangga', (i % L.cols) * T + T / 2, Math.floor(i / L.cols) * T); });
    for (const o of L.springs) add('per', o.x + o.w / 2, o.y);
    for (const o of L.dashes) add('samping', o.x + o.w / 2, o.y + o.h - 24);
    for (const o of L.pipes) add('pipa', o.a.x + T / 2, o.a.y);
    for (const o of L.movers) add(o.axis === 'x' ? 'gerak' : 'lift', o.x + o.w / 2, o.axis === 'x' ? o.y : o.y1);
    for (const o of L.crumbles) add('rapuh', o.x + T / 2, o.y);
    for (const o of L.boxes) add('kotak', o.x0 + 15, o.y0);
    for (const o of L.levers) if (o.stuck) add('macetTuas', o.x + o.w / 2, o.y - 30);
    for (const o of L.plates) if (o.stuck) add('macet', o.x + o.w / 2, o.y - 30);
    for (const o of L.plates) if (!o.stuck) add('tombol', o.x + o.w / 2, o.y);
    for (const o of L.levers) if (!o.stuck) add('tuas', o.x + o.w / 2, o.y);
    for (const o of L.gates) if (blockGate(L, o)) add('saklar', o.c * T + T / 2, o.r * T - 8); else if (o.head === o) add('gerbang', o.c * T + T / 2, o.r * T - 8);
    for (const o of L.saws) add('gergaji', o.cx, o.cy - 14);
    for (const k of L.cracks) add('retak', k.c * T + T / 2, k.r * T);
    for (const o of L.enemies) add(o.type || 'e', o.x + 14, o.y - 8);
    for (const o of L.chests) if (o.kind === 'power') add('peti', o.x + o.w / 2, o.y);
    return t;
  }
  function updateTips(dt) {
    const tp = S.tip;
    if (tp) { tp.t -= dt; if (tp.t <= 0) S.tip = null; return; }
    const cam = S.cam, vw = M.VW / SC, vh = viewH() / SC, p = S.g.p;
    const seen = S.tipSeen;
    const q = S.tips.find((k) => !k.shown && (seen[k.key] || 0) < 3 && k.x > cam.x + 20 && k.x < cam.x + vw - 10 && k.y > cam.y + 20 && k.y < cam.y + vh && Math.abs(k.x - p.x) < vw * 0.75);
    if (!q) return;
    q.shown = true; S.tip = { k: q, t: 4.5 };
    seen[q.key] = (seen[q.key] || 0) + 1;
    try { localStorage.setItem(TIP_KEY, JSON.stringify(seen)); } catch (e) { /* tanpa penyimpanan: balon tetap tampil */ }
  }
  function drawTip(g) {
    const tp = S.tip;
    if (!tp) return;
    const k = tp.k, a = Math.min(1, tp.t * 3, (4.5 - tp.t) * 4), maxW = 200;
    g.font = `13px ${M.FONT}`;
    const lines = M.wrap(g, k.text, maxW), w = Math.max(...lines.map((l) => g.measureText(l).width)) + 20, h = lines.length * 17 + 14;
    // Balon tetap di atas layar (di bawah HUD) supaya tidak menutupi pemain dan rintangan.
    const bx = (M.VW - w) / 2, by = HUD + 6;
    g.globalAlpha = a;
    g.fillStyle = '#fff6dc'; g.strokeStyle = '#2b1d52'; g.lineWidth = 3;
    g.beginPath(); g.roundRect ? g.roundRect(bx, by, w, h, 8) : g.rect(bx, by, w, h); g.fill(); g.stroke();
    lines.forEach((l, i) => M.text(g, l, bx + w / 2, by + 15 + i * 17, { size: 13, align: 'center', color: '#2b1d52', outline: false }));
    g.globalAlpha = 1;
  }

  function drawHud(g) {
    const gm = S.g;
    M.box(g, 0, 0, M.VW, HUD - 6, '#2b1d52', { line: '#1d1438', shade: false });
    M.hearts(g, 8, 8, gm.hearts, S.endless ? En.HEARTS : Sim.HEARTS, S.endless ? 1.9 : 2.4);
    M.art(g, 'bintang', 10, 33, 2);
    M.text(g, `${gm.stars}/${gm.L.stars.length}`, 38, 43, { size: 18, color: '#ffd54a' });
    M.text(g, S.endless ? `Putaran ${S.endless.round} · Skor ${S.endless.total}` : S.def.nama, M.VW / 2 + 22, 30, { size: 14, align: 'center', color: '#b8f4ff' });
    if (gm.power) M.text(g, POWER_NAME[gm.power] + (gm.shield && !gm.shield.ready ? ` (${Math.ceil(gm.shield.t)})` : ''), M.VW / 2 + 22, 47, { size: 12, align: 'center', color: '#ffd54a' });
    M.button(g, { id: 'jeda', x: M.VW - 46, y: 4, w: 38, h: 38, color: 'purple', icon: 'pause', onTap: () => { if (S.state === 'play') S.state = 'pause'; } });
    M.text(g, `Bonus ${S.bonus.value()}`, M.VW - 8, 46, { size: 11, align: 'right', color: '#cbbcff' });
  }
  // ---------- Kejar tanpa batas: akhir putaran, hati habis, papan skor ----------
  const BEST_KEY = 'mh3_kejar_best';
  function bestStore() { try { return JSON.parse(localStorage.getItem(BEST_KEY)) || {}; } catch (e) { return {}; } }
  function saveBest(name, row) {
    const b = bestStore();
    if (!b[name] || b[name].score < row.score) b[name] = row;
    try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch (e) { /* tanpa penyimpanan: skor tetap dikirim ke papan bersama */ }
  }
  // Papan lokal (cadangan bila papan bersama tidak ada): skor terbaik tiap petualang di HP ini.
  function localBoard() {
    const b = bestStore();
    return Object.keys(b).map((n) => ({ name: n, score: b[n].score, hero: b[n].hero, note: 'Putaran ' + b[n].level })).sort((x, y) => y.score - x.score).slice(0, 10);
  }
  // Kirim skor permainan ini (sekali). Meta cukup untuk mengulang level yang sama: seed permainan + putaran.
  function submitRun(round, total) {
    const E = S.endless;
    if (E.sent || !(total > 0)) return;
    E.sent = true;
    const p = M.save && M.save.active;
    if (!p) return;
    const meta = { seed: E.runSeed, tingkat: En.tier(round), level: round, hero: p.hero };
    saveBest(p.nama, { score: total, level: round, hero: p.hero });
    if (window.Scores) window.Scores.submit('math-hero', En.BOARD, p.nama, total, meta);
  }
  function overNow() {
    const E = S.endless, gm = S.g;
    E.pts = 10 * gm.stars;          // bintang di putaran yang gagal tetap dihitung
    E.total += E.pts;
    S.state = 'over'; S.endT = 0; M.setControls(null);
    submitRun(E.round, E.total);
  }
  function nextRound() {
    const E = S.endless;
    M.go('plat', { endless: { round: E.round + 1, runSeed: E.runSeed, total: E.total, hearts: S.g.hearts, power: S.g.power, grade0: E.grade0 } });
  }
  function drawRoundEnd(g) {
    const E = S.endless, gm = S.g, k = M.ease(S.endT * 2);
    g.fillStyle = `rgba(29,20,56,${0.7 * k})`; g.fillRect(0, 0, M.VW, M.VH);
    const x = 30, y = M.VH * 0.2, w = M.VW - 60;
    M.panel(g, x, y, w, 330, { title: `Putaran ${E.round} selesai!` });
    const rows = [[`Bintang: ${gm.stars}`, 16], [`Bonus waktu: +${S.bonus.value()} (${window.TimeBonus.clock(S.bonus.seconds())})`, 14],
      [`Skor putaran: +${E.pts}`, 16], [`Skor total: ${E.total}`, 18]];
    rows.forEach((r, i) => M.text(g, r[0], M.VW / 2, y + 60 + i * 28, { size: r[1], align: 'center', color: i === 3 ? '#d65f82' : '#2b1d52', outline: false }));
    M.text(g, `Hati tersisa: ${gm.hearts}. Hati tidak bisa bertambah.`, M.VW / 2, y + 180, { size: 13, align: 'center', color: '#6b4fa8', outline: false, maxW: w - 20 });
    M.button(g, { id: 'lanjutend', x: x + 30, y: y + 204, w: w - 60, h: 52, label: `Putaran ${E.round + 1}`, color: 'green', onTap: nextRound });
    M.button(g, { id: 'berhenti', x: x + 30, y: y + 266, w: w - 60, h: 46, label: 'Berhenti, simpan skor', color: 'blue', size: 15, onTap: () => { submitRun(E.round, E.total); quit(true); } });
  }
  function drawOver(g) {
    const E = S.endless, k = M.ease(S.endT * 2);
    g.fillStyle = `rgba(29,20,56,${0.75 * k})`; g.fillRect(0, 0, M.VW, M.VH);
    const x = 30, y = M.VH * 0.18, w = M.VW - 60;
    M.panel(g, x, y, w, 380, { title: 'Hati habis!' });
    M.text(g, `Sampai putaran ${E.round}`, M.VW / 2, y + 66, { size: 18, align: 'center', color: '#2b1d52', outline: false });
    M.text(g, `Skor: ${E.total}`, M.VW / 2, y + 100, { size: 26, align: 'center', color: '#d65f82', outline: false });
    M.text(g, 'Skor tersimpan di Papan Juara Kejar.', M.VW / 2, y + 132, { size: 13, align: 'center', color: '#6b4fa8', outline: false, maxW: w - 20 });
    M.button(g, { id: 'ulang', x: x + 30, y: y + 160, w: w - 60, h: 52, label: 'Main lagi', color: 'green', onTap: () => M.go('plat', { endless: { round: 1, runSeed: En.newRunSeed(), total: 0, hearts: En.HEARTS, grade0: E.grade0 } }) });
    M.button(g, { id: 'juarak', x: x + 30, y: y + 224, w: w - 60, h: 46, label: 'Papan Juara Kejar', color: 'yellow', textColor: '#2b1d52', size: 16, onTap: () => M.go('juarakejar') });
    M.button(g, { id: 'peta', x: x + 30, y: y + 284, w: w - 60, h: 46, label: 'Ke peta', color: 'blue', size: 16, onTap: () => quit(true) });
  }

  function drawEnd(g) {
    if (S.endless) { drawRoundEnd(g); return; }
    const gm = S.g, k = M.ease(S.endT * 2);
    g.fillStyle = `rgba(29,20,56,${0.7 * k})`; g.fillRect(0, 0, M.VW, M.VH);
    const x = 30, y = M.VH * 0.2, w = M.VW - 60;
    // Sampai 4 baris info (bintang, bonus, jatuh, kunci) di atas; posisi tombol tetap.
    const info = [[`Bintang: ${gm.stars} dari ${gm.L.stars.length}`, 16, '#2b1d52'],
      [`Bonus waktu: +${S.bonus.value()} (${window.TimeBonus.clock(S.bonus.seconds())})`, 14, '#2b1d52']];
    if (gm.deaths) info.push([`Kamu jatuh ${gm.deaths}x, tapi tidak menyerah!`, 13, '#6b6478']);
    if (S.keys) info.push([`Kunci Kristal: ${S.keys}`, 14, '#8a5a00']);
    M.panel(g, x, y, w, 354, { title: 'Kristal direbut!' });
    M.stars(g, M.VW / 2, y + 40, Sim.rating(gm), 4);
    info.forEach((r, i) => M.text(g, r[0], M.VW / 2, y + 112 + i * 22, { size: r[1], align: 'center', color: r[2], outline: false }));
    M.button(g, { id: 'ulang', x: x + 30, y: y + 212, w: w - 60, h: 52, label: 'Main lagi', color: 'green', onTap: () => M.go('plat', S.params) });
    M.button(g, { id: 'lanjutend', x: x + 30, y: y + 280, w: w - 60, h: 52, label: S.params.onEnd || S.params.onWin ? 'Lanjut' : 'Ke judul', color: 'blue', onTap: finish });
  }
  function finish() {
    const gm = S.g, P = S.params;
    const res = { win: true, stars: Sim.rating(gm), collected: gm.stars, keys: S.keys, bonus: S.bonus.value(), seconds: S.bonus.seconds(), hearts: gm.hearts, deaths: gm.deaths, level: S.def.id };
    if (P.onEnd) P.onEnd(res); else if (P.onWin) P.onWin(res); else M.go('title');
  }
  function quit(done) {
    const P = S.params, gm = S.g;
    if (S.endless) {
      const E = S.endless;
      if (!done) submitRun(E.round, E.total);
      M.go('map', {}); return;
    }
    if (P.onLose) P.onLose({ win: false, level: S.def.id, collected: gm.stars }); else if (P.onEnd) P.onEnd({ win: false, stars: 0, level: S.def.id }); else M.go('title');
  }

  M.register('plat', {
    enter(p) {
      const E = p.endless ? Object.assign({ pts: 0, sent: false }, p.endless) : null;
      const def = p.def || (E ? En.level(E.round, E.runSeed) : Lv.level(p.level || 1));
      S = { def, params: p, opts: p, endless: E, g: Sim.create(def, E ? { hero: heroKey(), hearts: E.hearts, endless: true } : { hero: heroKey() }), cam: { x: 0, y: 0 }, state: 'play', endT: 0, shake: 0, keys: 0, bonus: window.TimeBonus.forGame(E ? 'mh3-kejar' : 'mh3') };
      if (E && E.power) Sim.grantPower(S.g, E.power);
      S.gateCell = new Set(S.g.L.gates.map((gt) => gt.r * S.g.L.cols + gt.c));
      S.decor = buildDecor(S.g.L, def);
      S.tips = buildTips(S.g.L, S.g.skill); S.tipSeen = tipStore(); S.tip = null;
      updateCam(0, true);
      M.setControls(controls());
      M.audio.music('padang');
    },
    exit() { M.setControls(null); M.audio.setPaused(false); },
    resize() { if (S) updateCam(0, true); },
    blur() { if (S && S.state === 'play') S.state = 'pause'; },
    update(dt) {
      if (!S) return;
      S.shake = Math.max(0, S.shake - dt);
      if (S.state === 'end' || S.state === 'over') { S.endT += dt; return; }
      if (S.state !== 'play') return;
      if (S.pan) { S.pan.t -= dt; updateCam(dt, false); if (S.pan.t <= 0) S.pan = null; return; }
      const I = M.input;
      if (I.pause) { S.state = 'pause'; return; }
      // Tombol Lompat: A; tombol B: skill jagoan, atau tarik tuas bila di dekatnya; layar tidak dipakai supaya jempol tidak meleset ke tombol lain.
      S.bonus.tick(dt); // hanya saat state 'play': kartu PR (overlay), jeda, pilih kekuatan, dan layar hasil tidak menghitung
      Sim.update(S.g, dt, { dir: (I.rHold ? 1 : 0) - (I.lHold ? 1 : 0) || Math.sign(I.x), jump: I.aHit, jumpHeld: I.a, skill: I.bHit, skillHeld: I.b, up: I.y < 0, down: I.y > 0 });
      for (const e of S.g.events) handle(e);
      S.g.events.length = 0;
      M.padLabels('Lompat', S.g.nearLever ? 'Tarik' : SKILL_LABEL[S.g.skill] || null);
      updateCam(dt, false);
      updateTips(dt);
      if (S.g.phase === 'won') {
        S.state = 'end'; S.endT = 0; M.setControls(null);
        if (S.endless) { const E = S.endless; E.pts = En.roundScore(E.round, S.g.stars, S.bonus.value()); E.total += E.pts; }
      } else if (S.g.phase === 'dead') overNow();
    },
    draw(g) {
      if (!S) return;
      M.drawBg(g, S.def.tema, S.cam.x, S.cam.y);
      g.save();
      if (S.shake > 0 && !M.reduceMotion) g.translate(Math.round((Math.random() - 0.5) * 6), Math.round((Math.random() - 0.5) * 5));
      drawWorld(g);
      M.fx.draw(g);
      g.restore();
      if (S.state === 'play') drawTip(g);
      drawHud(g);
      if (S.state === 'pause') {
        g.fillStyle = 'rgba(29,20,56,0.7)'; g.fillRect(0, 0, M.VW, M.VH);
        const x = 40, y = M.VH * 0.3, w = M.VW - 80, on = M.audio.prefs.music;
        M.panel(g, x, y, w, 240, { title: 'Jeda' });
        M.button(g, { id: 'lanjut', x: x + 30, y: y + 36, w: w - 60, h: 52, label: 'Lanjut', color: 'green', onTap: () => { S.state = 'play'; } });
        M.button(g, { id: 'suara', x: x + 30, y: y + 100, w: w - 60, h: 52, label: on ? 'Suara: nyala' : 'Suara: mati', color: on ? 'purple' : 'gray', size: 16, onTap: () => { M.audio.setMusicOn(!on); M.audio.setSfxOn(!on); } });
        M.button(g, { id: 'keluar', x: x + 30, y: y + 164, w: w - 60, h: 52, label: 'Keluar', color: 'blue', onTap: quit });
      }
      if (S.state === 'power') {
        g.fillStyle = 'rgba(29,20,56,0.7)'; g.fillRect(0, 0, M.VW, M.VH);
        const x = 24, y = M.VH * 0.22, w = M.VW - 48;
        M.panel(g, x, y, w, 330, { title: 'Pilih kekuatan!' });
        POWERS.forEach((p, i) => {
          M.button(g, { id: 'p_' + p.key, x: x + 16, y: y + 28 + i * 92, w: w - 32, h: 80, color: p.color, label: '', onTap: () => { Sim.grantPower(S.g, p.key); S.state = 'play'; },
            draw: (c, bx, by, bw) => { M.text(c, p.nama, bx + bw / 2, by + 26, { size: 22, align: 'center' }); M.text(c, p.info, bx + bw / 2, by + 56, { size: 13, align: 'center', maxW: bw - 20 }); } });
        });
      }
      if (S.state === 'end') drawEnd(g);
      if (S.state === 'over') drawOver(g);
      M.drawToast(g, HUD + 6);
    },
  });

  MH3.endlessLocalBoard = localBoard;
  MH3.plat = {
    state: () => S,
    start(def, onWin, onLose, extra) { M.go('plat', Object.assign({ def, onWin, onLose }, extra || {})); },
  };
})();
