// Math Hero 3: adegan menu dan alur permainan. Judul, slot pemain, isi nama, pilih pahlawan, peta dunia (Bertahan/Kejar/Bos),
// Barak (pilih 4 pasukan dan upgrade), Buku PR, cerita, penyelamatan penduduk, kredit.
// Paling bawah: memuat aset lalu memulai di layar judul.
(function () {
  const M = window.MH2;
  const MH3 = window.MH3;
  const S = M.save;
  const PR = MH3.progress, ST = MH3.story, D = MH3.defenseData;

  // Slot, isi nama, pilih pahlawan, cerita, dan kredit ada di shared/js/scenes.js; di sini hanya isi khas MH3.
  window.MHKit.scenes.install(M, {
    slotInfo(g, p, x, y, w, h, txt) {
      const st = S.totalStars(p);
      M.art(g, 'bintang', x + 104, y + 56, 2);
      txt(g, `${st} / ${PR.LEVELS.length * 3}`, x + 132, y + 67, { size: 16 });
      txt(g, `Kelas ${p.grade}`, x + w - 16, y + 67, { size: 14, align: 'right', color: '#6b4fa8' });
      const crys = S.crystals(p), total = PR.LEVELS.filter((l) => l.kind === 'plat').length;
      for (let k = 0; k < total; k++) { g.globalAlpha = k < crys ? 1 : 0.25; M.art(g, 'kristal', x + 104 + k * 22, y + 84, 1.4); }
      g.globalAlpha = 1;
    },
    opening: () => ({ lines: ST.opening(), next: ['map', {}], seen: 'pembuka' }),
    // Kelas sekolah: menentukan jenis soal PR (kelas 2 sampai 5).
    heroesExtra(g) {
      const VW = M.VW;
      const gy = 104 + 3 * 160 + 40, bw = (VW - 30 - 3 * 10) / 4, grade = S.active ? S.active.grade : 2;
      M.text(g, 'Kelas sekolahmu?', VW / 2, gy, { size: 18, align: 'center', color: '#ffd54a', ow: 4 });
      [2, 3, 4, 5].forEach((k, i) => M.button(g, { id: 'kelas' + k, x: 15 + i * (bw + 10), y: gy + 14, w: bw, h: 48, label: 'Kelas ' + k, size: 15,
        color: grade === k ? 'yellow' : 'purple', onTap: () => { S.setGrade(k); M.sfx('benar'); this.msg = `Soal PR sekarang untuk kelas ${k}.`; } }));
    },
    cast(line, scene) {
      const W = PR.WORLDS[scene.world - 1];
      const dark = line.who === 'raja' || (line.who === 'kapten' && W.kapten.sprite === 'prof');
      const bg = dark ? 'benteng' : line.who === 'kapten' ? W.tema : 'langit';
      let who, fill = '#7b4bd6', draw;
      if (line.who === 'peri') { who = 'Peri Angka'; draw = (g, cx, cy) => M.art(g, 'peri', cx, cy + Math.sin(M.t * 3) * 6, 9, { anchor: 'feet' }); }
      else if (line.who === 'raja') { who = 'Raja Kabut'; fill = '#ff5d73'; draw = (g, cx, cy) => M.drawBoss(g, 'prof', cx, cy, 8, M.t); }
      else if (line.who === 'kapten') { who = W.kapten.nama; fill = '#ff5d73'; draw = (g, cx, cy) => M.drawBoss(g, W.kapten.sprite, cx, cy, W.kapten.sprite === 'prof' ? 8 : 5, M.t); }
      else if (line.who === 'warga') {
        const u = PR.ROSTER.find((r) => r.hero === line.hero);
        who = u ? u.warga : 'Penduduk'; fill = '#36c9b8';
        draw = (g, cx, cy) => M.hero(g, line.hero || 'owi', 'idle', M.t, cx, cy, { scale: 5 });
      } else { who = S.active ? S.active.nama : 'Pahlawan'; fill = '#4b9cff'; draw = (g, cx, cy) => M.hero(g, M.ui.heroKey(), 'idle', M.t, cx, cy, { scale: 5 }); }
      return { bg, who, fill, draw };
    },
    credits: [
      { head: 'MATH HERO 3', lines: ['Benteng Bintang'] },
      { lines: ['Seri Math Hero', 'game belajar matematika', 'untuk anak SD'] },
      { head: 'SPRITE', lines: ['CraftPix.net (lisensi gratis)', 'Tiny Hero Sprites', 'Top-Down Hunt Animals', 'Slime Mobs', 'Roguelike Shoot Em Up Kit', 'Simple Platformer Game Kit'] },
      { head: 'IKON BUAH', lines: ['SVG Repo'] },
      'font',
      { head: 'PIXEL ART TAMBAHAN', lines: ['Peri, kristal, bintang, hati:', 'dibuat untuk game ini'] },
      'musik',
      'animasi',
    ],
  });
  const { heroKey, backBtn, txt } = M.ui;

  // Setiap kartu PR yang selesai atau ditunda dicatat ke Buku PR, dari mana pun kartu itu dibuka.
  if (!MH3.homework.openRaw) {
    const raw = MH3.homework.open;
    MH3.homework.openRaw = raw;
    // Kartu baru (bukan lanjutan yang disimpan) memakai tingkat yang sudah disesuaikan dengan hasil PR terakhir.
    MH3.homework.open = (opts, cb) => {
      if (opts && opts.tier != null && !opts.id) opts = Object.assign({}, opts, { tier: S.adaptTier(opts.tier) });
      raw(opts, (r) => { S.logPR(r, opts && opts.title); if (cb) cb(r); });
    };
  }

  // ---------- Papan Juara ----------
  window.MHJuara.install(M, { board: 'mh3', back: 'title' });
  window.MHJuara.install(M, { board: 'mh3-kejar', scene: 'juarakejar', title: 'Juara Kejar', note: true, back: 'map', local: () => MH3.endlessLocalBoard() });

  // ---------- Judul ----------
  const LOGO_COLORS = ['#ffffff', '#ffd54a'];
  M.register('title', {
    enter() { M.audio.music('title'); this.t = 0; },
    update(dt) {
      this.t += dt;
      if (M.input.bHit || M.input.aHit) M.go('slots');
    },
    draw(g) {
      const t = this.t, VW = M.VW, VH = M.VH;
      M.drawBg(g, 'padang', t * 30, 0);
      // Tanah berumput di bawah.
      const gy = VH - 120;
      for (let x = -((t * 60) % 32); x < VW; x += 32) { M.tile1(g, 1, 0, x, gy); M.tile1(g, 1, 1, x, gy + 32); M.tile1(g, 1, 1, x, gy + 64); M.tile1(g, 1, 1, x, gy + 96); }
      // Logo.
      const bob = Math.sin(t * 2.4) * 5;
      M.text(g, 'MATH', VW / 2, 110 + bob, { size: 64, align: 'center', color: LOGO_COLORS[0], ow: 10, outline: '#2b1d52' });
      M.text(g, 'HERO', VW / 2 - 24, 172 + bob, { size: 64, align: 'center', color: LOGO_COLORS[1], ow: 10, outline: '#2b1d52' });
      // Angka 3 besar berkilau.
      const s2 = 1 + Math.sin(t * 5) * 0.06;
      g.save(); g.translate(VW / 2 + 104, 168 + bob); g.rotate(-0.12); g.scale(s2, s2);
      M.text(g, '3', 0, 0, { size: 84, align: 'center', color: '#64e3ff', ow: 12, outline: '#2b1d52' });
      g.restore();
      M.box(g, VW / 2 - 130, 214 + bob, 260, 32, '#7b4bd6', { line: '#2b1d52' });
      M.text(g, 'Benteng Bintang', VW / 2, 230 + bob, { size: 18, align: 'center' });
      // Bintang melayang.
      M.art(g, 'bintang', VW / 2 - 11 * 2, 270 + Math.sin(t * 3) * 6, 4);
      for (let i = 0; i < 6; i++) {
        const a = t * 1.2 + i * Math.PI / 3;
        M.art(g, 'bintang', VW / 2 + Math.cos(a) * 70 - 6, 300 + Math.sin(a) * 18, 1.4);
      }
      // Pahlawan berlari.
      const keys = ['pinki', 'owi', 'dudu', 'hero1', 'hero2', 'hero3'];
      keys.forEach((k, i) => {
        const x = ((t * 50 + i * 70) % (VW + 120)) - 60;
        M.hero(g, k, 'run', t + i * 0.3, x, gy, { scale: 2 });
      });
      M.button(g, { id: 'main', x: VW / 2 - 110, y: VH - 260, w: 220, h: 64, label: 'MAIN!', color: 'pink', size: 30, onTap: () => M.go('slots') });
      M.button(g, { id: 'juara', x: VW / 2 - 110, y: VH - 184, w: 220, h: 42, label: 'Papan Juara', color: 'yellow', textColor: '#2b1d52', size: 18, icon: 'trophy', onTap: () => M.go('juara') });
      M.button(g, { id: 'seri', x: 10, y: 10, w: 130, h: 44, label: 'Seri Math Hero', color: 'purple', size: 13, onTap: () => { location.href = '../'; } });
      M.button(g, { id: 'kredit', x: VW - 92, y: 10, w: 82, h: 44, label: 'Kredit', color: 'purple', size: 13, onTap: () => M.go('credits') });
      if (M.debug) M.button(g, { id: 'debugpr', x: 10, y: 62, w: 130, h: 34, label: 'Debug: PR', color: 'orange', size: 13, onTap: () => {
        const n = (this.dbg = (this.dbg || 0) + 1) - 1;
        MH3.homework.open({ grade: 2 + (n % 4), tier: n % 4, title: 'PR kelas ' + (2 + (n % 4)) }, (r) => M.toast(r.status === 'later' ? 'PR ditunda' : 'PR selesai: ' + r.stars + ' bintang', 2500));
      } });
      if (M.debug) M.button(g, { id: 'debugdef', x: 10, y: 102, w: 130, h: 34, label: 'Debug: Bertahan 1', color: 'orange', size: 13, onTap: () => M.go('defense', { level: 1 }) });
      if (M.debug) M.button(g, { id: 'debugplat', x: 10, y: 142, w: 130, h: 34, label: 'Debug: Kejar 1', color: 'orange', size: 13, onTap: () => M.go('plat', { level: 1 }) });
      const on = M.audio.prefs.music;
      M.drawToast(g, 250);
      M.button(g, { id: 'suara', x: VW - 140, y: 10, w: 44, h: 44, color: on ? 'purple' : 'gray', icon: on ? 'sound' : 'mute', onTap: () => { M.audio.setMusicOn(!on); M.audio.setSfxOn(!on); } });
    },
  });

  // ---------- Alur level: cerita -> (Barak) -> Bertahan/Kejar -> hasil -> cerita -> peta ----------
  // chain: rangkai langkah (cerita, penyelamatan) jadi satu rantai adegan yang berakhir di `end` = [nama, params].
  function chain(steps, end) {
    let nx = end;
    for (let i = steps.length - 1; i >= 0; i--) {
      const s = steps[i];
      nx = s.lines ? ['story', { lines: s.lines, seen: s.seen, world: s.world, musik: s.musik, next: nx }] : ['rescue', { unit: s.rescue, next: nx }];
    }
    return nx;
  }
  const goChain = (nx) => M.go(nx[0], nx[1]);

  // Definisi level lengkap untuk papan Bertahan: data dasar + nama/tema dunia, pasukan pilihan, upgrade, bonus kristal.
  function defenseParams(L) {
    const base = D.level(L.ref) || D.level(1);
    const loadout = S.loadout().filter((id) => D.UNITS[id]);
    const upg = {};
    S.owned().forEach((id) => { upg[id] = S.unitLevel(id); });
    const def = Object.assign({}, base, { nama: L.nama, tema: L.tema, tier: L.tier, loadout: loadout.length ? loadout : base.loadout, startStars: base.startStars + S.bonusStars(L.index), upg });
    return { def, onEnd: (res) => finishLevel(L, res) };
  }
  function platParams(L) {
    const base = MH3.platLevels.level(L.ref) || MH3.platLevels.level(1);
    return { def: Object.assign({}, base, { nama: L.nama, tema: L.tema, tier: L.tier }), onEnd: (res) => finishLevel(L, res) };
  }
  const launchTarget = (L) => (L.genre === 'defense' ? ['barak', { level: L, start: true }] : ['plat', platParams(L)]);

  function openLevel(L) {
    const steps = [];
    if (L.node === 0 && !S.seen('dunia' + L.world)) steps.push({ lines: ST.world(L.world), seen: 'dunia' + L.world, world: L.world });
    if (!S.seen('pra' + L.id)) steps.push({ lines: ST.before(L), seen: 'pra' + L.id, world: L.world });
    goChain(chain(steps, launchTarget(L)));
  }

  // Hasil level (dari papan Bertahan atau Kejar). Menang: catat bintang, cerita sesudah, penduduk bergabung, lanjut ke peta.
  function finishLevel(L, res) {
    if (!res || !res.win) { M.go('map', { stage: L.world }); return; }
    const r = S.record(L.id, Math.max(1, res.stars || 1), (res.hearts || 0) * 100 + (res.collected || 0) * 10 + (res.bonus || 0));
    // Papan skor bersama (opsional): total skor terbaik semua level.
    if (window.Scores && S.active) window.Scores.submit('math-hero', 'mh3', S.active.nama, S.totalScore(), { level: L.id, hero: S.active.hero, stars: S.totalStars() });
    const steps = [];
    if (r.first) {
      steps.push({ lines: ST.after(L), seen: 'pas' + L.id, world: L.world });
      const u = L.kind === 'plat' ? PR.rescueFor(L.ref) : null;
      if (u && S.rescue(u.id)) { steps.push({ lines: ST.rescue(u.id), world: L.world }); steps.push({ rescue: u.id }); }
    }
    const nx = PR.LEVELS[L.index + 1];
    if (L.final && r.first) { goChain(chain(steps, ['story', { lines: ST.ending(), next: ['credits', { ending: true }], musik: 'title' }])); return; }
    goChain(chain(steps, ['map', { stage: (nx || L).world }]));
  }

  // ---------- Peta dunia ----------
  const NODES = [[0.26, 0.9], [0.7, 0.74], [0.3, 0.58], [0.7, 0.42], [0.42, 0.22]];
  function nodePos(i) { return { x: NODES[i][0] * M.VW, y: 150 + NODES[i][1] * (M.VH - 230) }; }
  const worldOpen = (w) => S.unlocked(PR.LEVELS.find((l) => l.world === w).index);
  const KIND_COLOR = { defense: ['#4b9cff', '#2d6fc4'], plat: ['#36c9b8', '#1f8f84'], boss: ['#ff6b6b', '#c9414a'] };

  // Kartu PR yang masih terbuka saat HP dikunci atau tab ditutup muncul lagi saat pemain kembali ke peta.
  function resumePending() {
    if (!MH3.homework.pending()) return;
    const v = MH3.homework.pending();
    MH3.homework.resume((r) => {
      S.logPR(r, v.title);
      if (r.status === 'done' && PR.kindOf(v.title) === 'kunci') { const n = Math.max(1, Math.min(3, r.stars)); S.addKeys(n); M.toast(`Dapat ${n} Kunci Kristal!`, 2200, '#e3ffe6'); }
    });
  }

  M.register('map', {
    enter(p) {
      M.audio.music('peta');
      this.world = p.stage || S.current().world;
      this.slide = 0;
      this.dragX = null;
      resumePending();
    },
    pointerDown(x) { this.dragX = x; },
    pointerUp(x) {
      if (this.dragX === null) return;
      const dx = x - this.dragX; this.dragX = null;
      if (dx < -60) this.change(1); else if (dx > 60) this.change(-1);
    },
    change(d) {
      const n = M.clamp(this.world + d, 1, PR.WORLDS.length);
      if (n !== this.world) { this.world = n; this.slide = d; M.sfx('kartu'); }
    },
    update(dt) {
      this.slide *= Math.pow(0.001, dt);
      if (M.input.pause) M.go('slots');
      if (Math.abs(M.input.x) > 0.5 && !this.joyLock) { this.change(Math.sign(M.input.x)); this.joyLock = true; }
      if (Math.abs(M.input.x) < 0.2) this.joyLock = false;
    },
    draw(g) {
      const VW = M.VW, VH = M.VH;
      const W = PR.WORLDS[this.world - 1], levels = PR.LEVELS.filter((l) => l.world === W.id);
      const off = this.slide * 120;
      M.drawBg(g, W.tema, M.t * 8 + this.world * 300, 0);
      g.save(); g.translate(off, 0);
      // Judul dunia.
      M.box(g, 30, 82, VW - 60, 52, W.warna, { line: '#2b1d52' });
      M.text(g, `Dunia ${W.id}`, VW / 2, 97, { size: 13, align: 'center', color: '#fff' });
      M.text(g, W.nama, VW / 2, 119, { size: 22, align: 'center' });
      const open = worldOpen(W.id);
      // Jalur antar level: titik-titik berpiksel.
      for (let i = 0; i < 4; i++) {
        const a = nodePos(i), b = nodePos(i + 1), n = 10;
        for (let k = 1; k < n; k++) {
          const u = k / n, x = M.lerp(a.x, b.x, u) + Math.sin(u * Math.PI) * (i % 2 ? -20 : 20), y = M.lerp(a.y, b.y, u);
          const done = S.starsOf(levels[i].id) > 0;
          g.fillStyle = '#2b1d52'; g.fillRect(Math.round(x) - 4, Math.round(y) - 4, 8, 8);
          g.fillStyle = done ? '#ffd54a' : '#fff6dc'; g.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
        }
      }
      const cur = S.current();
      levels.forEach((L, i) => {
        const p = nodePos(i), unlocked = S.unlocked(L.index), stars = S.starsOf(L.id);
        const r = L.boss ? 38 : 30;
        const col = !unlocked ? ['#9aa0b4', '#666c80'] : stars ? ['#ffd54a', '#d1a21b'] : KIND_COLOR[L.kind];
        // Simpul level: cakram berpiksel dengan bayangan bawah.
        const pressed = M.pointer.down && Math.hypot(M.pointer.x - p.x, M.pointer.y - p.y) < r;
        const disc = M.lowres('node' + r + col[0], r * 2 + 8, r * 2 + 12, (cx) => {
          cx.fillStyle = '#2b1d52'; cx.beginPath(); cx.arc(r + 4, r + 8, r + 2, 0, 7); cx.fill();
          cx.fillStyle = col[1]; cx.beginPath(); cx.arc(r + 4, r + 8, r - 1, 0, 7); cx.fill();
          cx.fillStyle = '#2b1d52'; cx.beginPath(); cx.arc(r + 4, r + 4, r + 2, 0, 7); cx.fill();
          cx.fillStyle = col[0]; cx.beginPath(); cx.arc(r + 4, r + 4, r - 1, 0, 7); cx.fill();
          cx.fillStyle = 'rgba(255,255,255,0.4)'; cx.fillRect(r - 8, 8, 12, 4);
        });
        const dy = pressed ? 3 : 0;
        g.drawImage(disc, Math.round(p.x - r - 4), Math.round(p.y - r - 4 + dy));
        M.hit('lv' + L.id, p.x - Math.max(r, 24), p.y - Math.max(r, 24), Math.max(r, 24) * 2, Math.max(r, 24) * 2, () => {
          if (!unlocked) { M.toast('Selesaikan level sebelumnya dulu, ya!'); M.sfx('salah'); return; }
          openLevel(L);
        });
        if (!unlocked) M.icon(g, 'lock', p.x - 12, p.y - 12 + dy, 24, '#2b1d52');
        else if (L.boss) M.drawBoss(g, W.kapten.sprite, p.x, p.y + 24 + dy, W.kapten.sprite === 'prof' ? 2 : /^slime/.test(W.kapten.sprite) ? 2.2 : 1.6, M.t);
        else M.text(g, String(i + 1), p.x, p.y - 1 + dy, { size: 26, align: 'center' });
        if (unlocked) {
          M.text(g, L.nama, p.x, p.y + r + 14, { size: 13, align: 'center' });
          M.text(g, PR.KIND_LABEL[L.kind], p.x, p.y + r + 28, { size: 11, align: 'center', color: L.kind === 'plat' ? '#b8fff2' : L.kind === 'boss' ? '#ffd0d0' : '#cfe4ff' });
          if (stars || !L.boss) M.stars(g, p.x, p.y + r + 38, stars, 1.1);
        }
        // Pahlawan berdiri di level yang sedang dikerjakan.
        if (L === cur && unlocked) {
          const hop = Math.abs(Math.sin(M.t * 3)) * 8;
          M.hero(g, heroKey(), 'idle', M.t, p.x + r + 16, p.y + 10 - hop, { scale: 1.6 });
        }
      });
      // Kristal dunia: menyala bila level Kejar terakhir dunia ini sudah direbut.
      const got = levels.some((l) => l.kind === 'plat' && S.starsOf(l.id) > 0);
      g.globalAlpha = got ? 1 : 0.3;
      M.art(g, 'kristal', nodePos(4).x + 58, nodePos(4).y - 40 + Math.sin(M.t * 2) * 4, 2.6);
      g.globalAlpha = 1;
      if (!open) {
        M.box(g, 40, VH / 2 - 40, VW - 80, 80, '#2b1d52', { line: '#fff' });
        M.icon(g, 'lock', VW / 2 - 14, VH / 2 - 30, 28, '#fff');
        M.text(g, 'Kalahkan bos dunia sebelumnya!', VW / 2, VH / 2 + 18, { size: 14, align: 'center' });
      }
      g.restore();
      // Panel atas: pemain, Pasukan, Buku PR; di bawahnya bintang, kristal, Kunci.
      g.fillStyle = 'rgba(29,20,56,0.88)'; g.fillRect(0, 0, VW, 78);
      backBtn(g, () => M.go('slots'));
      M.button(g, { id: 'pahlawan', x: 58, y: 8, w: 46, h: 44, color: 'teal', label: '', onTap: () => M.go('heroes', {}), draw: (gg, x, y) => M.hero(gg, heroKey(), 'idle', M.t, x + 23, y + 36, { scale: 1 }) });
      M.text(g, S.active ? S.active.nama : '', 112, 30, { size: 16 });
      M.button(g, { id: 'pasukan', x: VW - 182, y: 8, w: 84, h: 44, label: 'Pasukan', size: 14, color: 'blue', onTap: () => M.go('barak', { back: ['map', { stage: this.world }] }) });
      M.button(g, { id: 'buku', x: VW - 92, y: 8, w: 84, h: 44, label: 'Buku PR', size: 14, color: 'orange', onTap: () => M.go('buku', { back: ['map', { stage: this.world }] }) });
      M.button(g, { id: 'tanpabatas', x: 8, y: 84, w: 150, h: 36, label: 'Kejar Tanpa Batas', size: 13, color: 'teal', onTap: () => M.go('plat', { endless: { round: 1, runSeed: MH3.endless.newRunSeed(), total: 0, hearts: MH3.endless.HEARTS, grade0: S.active ? S.active.grade : 2 } }) });
      M.button(g, { id: 'juarakejar', x: VW - 128, y: 84, w: 120, h: 36, label: 'Juara Kejar', size: 13, color: 'yellow', textColor: '#2b1d52', icon: 'trophy', onTap: () => M.go('juarakejar') });
      M.art(g, 'bintang', 12, 58, 1.6);
      M.text(g, `${S.totalStars()}/${PR.LEVELS.length * 3}`, 34, 66, { size: 13, color: '#ffd54a' });
      M.art(g, 'kristal', 110, 56, 1.3);
      M.text(g, `${S.crystals()}/${PR.LEVELS.filter((l) => l.kind === 'plat').length}`, 130, 66, { size: 13, color: '#64e3ff' });
      M.text(g, `Kunci ${S.keys()}`, VW - 12, 66, { size: 13, align: 'right', color: '#fff3c4' });
      // Panah ganti dunia.
      if (this.world > 1) M.button(g, { id: 'kiri', x: 4, y: VH / 2 - 26, w: 44, h: 52, color: 'purple', icon: 'left', onTap: () => this.change(-1) });
      if (this.world < PR.WORLDS.length) M.button(g, { id: 'kanan', x: VW - 48, y: VH / 2 - 26, w: 44, h: 52, color: 'purple', icon: 'right', onTap: () => this.change(1) });
      // Titik halaman.
      PR.WORLDS.forEach((s, i) => { g.fillStyle = i + 1 === this.world ? '#ffd54a' : 'rgba(255,255,255,0.5)'; g.fillRect(VW / 2 - 36 + i * 18, VH - 22, 10, 10); });
      M.drawToast(g, 160);
    },
  });

  // ---------- Barak: pilih 4 pasukan dan upgrade dengan Kunci Kristal ----------
  function unitIcon(g, id, cx, by, k) {
    if (id === 'pemanah') M.hero(g, 'pinki', 'idle', M.t, cx, by, { scale: 1.3 * k });
    else if (id === 'tembok') M.box(g, cx - 14 * k, by - 28 * k, 28 * k, 26 * k, '#a89f94', { line: '#3a3346' });
    else if (id === 'menara') {
      M.box(g, cx - 13 * k, by - 14 * k, 26 * k, 14 * k, '#7b4bd6', { line: '#2b1d52' });
      M.art(g, 'bintang', cx - 11 * k, by - 14 * k - 22 * k, 2 * k);
    } else M.hero(g, PR.unit(id).hero, 'idle', M.t, cx, by, { scale: 1.3 * k });
  }
  M.register('barak', {
    enter(p) { this.p = p; this.sel = S.loadout()[0]; M.audio.music('peta'); },
    leave() { M.go(...(this.p.start ? ['map', { stage: this.p.level.world }] : this.p.back || ['map', {}])); },
    update() { if (M.input.pause) this.leave(); },
    draw(g) {
      const VW = M.VW, VH = M.VH, p = this.p, own = S.owned(), lo = S.loadout();
      M.drawBg(g, 'langit', M.t * 12, 0);
      backBtn(g, () => this.leave());
      M.text(g, 'Pasukan', VW / 2, 30, { size: 26, align: 'center', color: '#ffd54a', ow: 6 });
      M.art(g, 'kristal', VW - 90, 12, 1.5); M.text(g, `Kunci ${S.keys()}`, VW - 12, 30, { size: 14, align: 'right', color: '#fff3c4' });
      M.text(g, `Pilih sampai ${PR.LOADOUT_MAX} pasukan untuk bertarung (${lo.length}/${PR.LOADOUT_MAX})`, VW / 2, 66, { size: 13, align: 'center', color: '#fff', maxW: VW - 24 });
      const gap = 8, cw = (VW - 24 - gap) / 2, ch = 64, y0 = 84;
      PR.ROSTER.forEach((u, i) => {
        const x = 12 + (i % 2) * (cw + gap), y = y0 + Math.floor(i / 2) * (ch + gap), has = own.includes(u.id), inLo = lo.includes(u.id);
        const lv = S.unitLevel(u.id);
        M.button(g, { id: 'u_' + u.id, x, y, w: cw, h: ch, color: !has ? 'gray' : inLo ? 'yellow' : 'white', selected: this.sel === u.id, label: '',
          onTap: () => {
            this.sel = u.id;
            if (!has) return;
            const why = S.toggleLoadout(u.id);
            if (why === 'penuh') M.toast(`Sudah ${PR.LOADOUT_MAX} pasukan. Lepas satu dulu, ya.`, 1800);
            else if (why === 'terakhir') M.toast('Harus ada minimal satu pasukan.', 1800);
          },
          draw: (c, bx, by) => {
            if (!has) c.globalAlpha = 0.45;
            unitIcon(c, u.id, bx + 30, by + 52, 1);
            c.globalAlpha = 1;
            txt(c, u.nama, bx + 58, by + 16, { size: 12, maxW: cw - 62 });
            if (has) {
              for (let k = 0; k < PR.MAX_LV; k++) { c.globalAlpha = k < lv ? 1 : 0.25; M.art(c, 'bintang', bx + 58 + k * 18, by + 26, 1.4); }
              c.globalAlpha = 1;
              txt(c, inLo ? 'Dipakai' : 'Ketuk untuk pakai', bx + 58, by + 54, { size: 11, color: inLo ? '#8a5a00' : '#6b4fa8' });
            } else {
              M.icon(c, 'lock', bx + 58, by + 28, 18, '#2b1d52');
              txt(c, `Kejar ${u.rescue}`, bx + 80, by + 40, { size: 11, color: '#2b1d52' });
            }
          } });
      });
      // Panel keterangan pasukan terpilih + tombol upgrade.
      const ys = y0 + 4 * (ch + gap), hs = VH - 76 - ys;
      const u = PR.unit(this.sel), has = own.includes(u.id), lv = S.unitLevel(u.id), cost = S.upgradeCost(u.id);
      M.box(g, 12, ys, VW - 24, hs, '#fff6dc', { line: '#2b1d52', shade: false });
      txt(g, u.nama + (has ? `  Lv ${lv}` : ''), 24, ys + 18, { size: 16 });
      const stat = D.UNITS[u.id] ? `Biaya ${D.UNITS[u.id].cost} Bintang. ` : `Biaya ${u.cost} Bintang. `;
      txt(g, stat + u.info + '.', 24, ys + 38, { size: 12, maxW: VW - 48, color: '#6b4fa8', base: 'top', lh: 15 });
      if (has && lv < PR.MAX_LV) {
        txt(g, `Level ${lv + 1}: lebih kuat dan tahan. Butuh ${cost} Kunci.`, 24, ys + hs - 62, { size: 12, color: '#2b1d52' });
        M.button(g, { id: 'upgrade', x: VW - 24 - 150, y: ys + hs - 52, w: 150, h: 44, label: `Upgrade (${cost})`, size: 15, color: S.keys() >= cost ? 'green' : 'gray', onTap: () => {
          const r = S.upgrade(u.id);
          if (r.ok) { M.sfx('benar'); M.fx.burst(VW - 100, ys + hs - 30, { n: 14, kind: 'sq', color: ['#ffd54a', '#fff'] }); M.toast(`${u.nama} naik ke Lv ${r.level}!`, 1800, '#e3ffe6'); }
          else { M.sfx('salah'); M.toast(r.why === 'kunci' ? 'Kuncinya belum cukup. Kerjakan PR untuk dapat Kunci!' : 'Belum bisa di-upgrade.', 2200); }
        } });
      } else if (has) txt(g, 'Level maksimal!', 24, ys + hs - 20, { size: 13, color: '#8a5a00' });
      else txt(g, `Selamatkan penduduknya di level Kejar ke-${u.rescue}.`, 24, ys + hs - 20, { size: 12, maxW: VW - 48 });
      if (p.start) {
        M.button(g, { id: 'mulai', x: 12, y: VH - 62, w: VW - 24, h: 54, label: `Mulai: ${p.level.nama}`, size: 20, color: 'green', onTap: () => M.go('defense', defenseParams(p.level)) });
      } else M.button(g, { id: 'selesai', x: 12, y: VH - 62, w: VW - 24, h: 54, label: 'Selesai', size: 20, color: 'blue', onTap: () => this.leave() });
      M.fx.draw(g);
      M.drawToast(g, 70);
    },
  });

  // ---------- Buku PR ----------
  // Daftar PR: yang ditunda (bisa dikerjakan di sini) dan yang selesai, plus hitungan minggu ini untuk orang tua.
  function questionOf(e) {
    try { return window.MH3Homework.generate(e.id, e.seed, e.tier).question; } catch (err) { return e.title; }
  }
  const KIND_NAME = { kunci: 'Peti Kunci', kuasa: 'Peti Kekuatan', perisai: 'Perisai Rumus' };
  M.register('buku', {
    enter(p) { this.back = p.back || ['map', {}]; this.tab = S.book().later.length ? 'later' : 'done'; this.page = 0; M.audio.music('peta'); },
    update() { if (M.input.pause) M.go(this.back[0], this.back[1]); },
    list() { const b = S.book(); return this.tab === 'later' ? b.later.slice().reverse() : b.done.slice().reverse(); },
    draw(g) {
      const VW = M.VW, VH = M.VH, b = S.book();
      M.drawBg(g, 'langit', M.t * 10, 0);
      backBtn(g, () => M.go(this.back[0], this.back[1]));
      M.text(g, 'Buku PR', VW / 2, 30, { size: 26, align: 'center', color: '#ffd54a', ow: 6 });
      M.box(g, 12, 60, VW - 24, 44, '#fff6dc', { line: '#2b1d52', shade: false });
      txt(g, `PR selesai minggu ini: ${S.weekCount()}`, 24, 76, { size: 14 });
      txt(g, `Semua PR selesai: ${b.done.length}  |  Kunci: ${S.keys()}`, 24, 94, { size: 12, color: '#6b4fa8' });
      const tw = (VW - 24 - 8) / 2;
      M.button(g, { id: 'tab_later', x: 12, y: 112, w: tw, h: 44, label: `Tertunda (${b.later.length})`, size: 15, color: this.tab === 'later' ? 'orange' : 'gray', onTap: () => { this.tab = 'later'; this.page = 0; } });
      M.button(g, { id: 'tab_done', x: 12 + tw + 8, y: 112, w: tw, h: 44, label: `Selesai (${b.done.length})`, size: 15, color: this.tab === 'done' ? 'green' : 'gray', onTap: () => { this.tab = 'done'; this.page = 0; } });
      const rowH = 66, y0 = 166, per = Math.max(1, Math.floor((VH - y0 - 70) / (rowH + 6)));
      const all = this.list(), pages = Math.max(1, Math.ceil(all.length / per));
      this.page = M.clamp(this.page, 0, pages - 1);
      if (!all.length) {
        txt(g, this.tab === 'later' ? 'Tidak ada PR yang tertunda. Hebat!' : 'Belum ada PR yang selesai. Buka peti di dalam level!', VW / 2, y0 + 50, { size: 14, align: 'center', color: '#fff', maxW: VW - 60 });
      }
      all.slice(this.page * per, this.page * per + per).forEach((e, i) => {
        const y = y0 + i * (rowH + 6);
        M.box(g, 12, y, VW - 24, rowH, '#fff6dc', { line: '#2b1d52', shade: false });
        txt(g, `${KIND_NAME[e.kind] || e.title}  Kelas ${e.grade}`, 22, y + 14, { size: 12, color: '#7b4bd6' });
        txt(g, questionOf(e), 22, y + 26, { size: 11, maxW: this.tab === 'later' ? VW - 130 : VW - 120, base: 'top', lh: 13 });
        if (this.tab === 'done') M.stars(g, VW - 62, y + 14, e.stars || 1, 1.2);
        else M.button(g, { id: 'kerja' + i, x: VW - 100, y: y + 11, w: 80, h: 44, label: 'Kerjakan', size: 13, color: 'green', onTap: () => {
          MH3.homework.openRaw({ id: e.id, seed: e.seed, tier: e.tier, title: e.title }, (r) => {
            const res = S.finishLater(e, r);
            if (res.keys) { M.fx.confetti(); M.toast(`Dapat ${res.keys} Kunci Kristal!`, 2200, '#e3ffe6'); }
            else if (r.status === 'done') M.toast('PR selesai!', 1800, '#e3ffe6');
          });
        } });
      });
      M.button(g, { id: 'sebelum', x: 12, y: VH - 58, w: 110, h: 48, label: 'Sebelum', size: 15, color: 'blue', disabled: this.page <= 0, onTap: () => { this.page--; } });
      M.text(g, `${this.page + 1} / ${pages}`, VW / 2, VH - 34, { size: 14, align: 'center' });
      M.button(g, { id: 'sesudah', x: VW - 122, y: VH - 58, w: 110, h: 48, label: 'Sesudah', size: 15, color: 'blue', disabled: this.page >= pages - 1, onTap: () => { this.page++; } });
      M.fx.draw(g);
      M.drawToast(g, 160);
    },
  });

  // ---------- Penduduk bergabung jadi pasukan ----------
  M.register('rescue', {
    enter(p) { this.u = PR.unit(p.unit); this.next = p.next; this.t = 0; M.audio.jingle('menang'); M.fx.confetti(); },
    update(dt) { this.t += dt; },
    draw(g) {
      const VW = M.VW, VH = M.VH, u = this.u;
      M.drawBg(g, 'langit', M.t * 20, 0);
      g.fillStyle = 'rgba(29,20,56,0.4)'; g.fillRect(0, 0, VW, VH);
      const w = VW - 30, h = 400, x = 15, y = (VH - h) / 2;
      M.panel(g, x, y, w, h, { title: 'Penduduk selamat!', titleFill: '#36c9b8' });
      g.fillStyle = 'rgba(100,227,255,0.25)'; g.beginPath(); g.arc(VW / 2, y + 150, 70 + Math.sin(M.t * 3) * 4, 0, 7); g.fill();
      M.hero(g, u.hero, 'run', M.t, VW / 2, y + 190, { scale: 4 });
      txt(g, u.warga, VW / 2, y + 224, { size: 24, align: 'center' });
      txt(g, 'bergabung jadi pasukan!', VW / 2, y + 252, { size: 16, align: 'center', color: '#d65f82' });
      txt(g, `Pasukan baru: ${u.nama}`, VW / 2, y + 290, { size: 16, align: 'center' });
      txt(g, u.info + '.', VW / 2, y + 314, { size: 13, align: 'center', color: '#6b4fa8', maxW: w - 30 });
      M.button(g, { id: 'lanjut', x: x + 30, y: y + h - 70, w: w - 60, h: 50, label: 'Lanjut', color: 'green', size: 20, disabled: this.t < 0.8, onTap: () => M.go(this.next[0], this.next[1]) });
    },
  });

  // ---------- Mulai ----------
  const bar = document.getElementById('load-bar');
  M.load((k) => { bar.style.width = Math.round(k * 100) + '%'; }).then(() => {
    document.body.classList.add('ready');
    M.start(/[?&]uji=1(&|$)/.test(location.search) && M.scenes.uji ? 'uji' : 'title');
  });

  MH3.flow = { openLevel, finishLevel, defenseParams, platParams };
})();
