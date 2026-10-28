// Math Hero: inti permainan. Pemain, interaksi soal, aturan skor/nyawa, kamera, HUD, dan loop.
// Level ada di levels.js, fisika di physics.js, musuh dan bos di entities.js, gambar dunia di render.js.
(function () {
  const { C, T, stepBody, overlap, tileAt } = window.Physics;
  const LEVELS = window.Levels.LEVELS;
  window.AREAS = LEVELS; // nama lama, masih dipakai menu
  const A = window.Assets, R = window.Render, Ent = window.Ent;

  const canvas = document.getElementById('game');
  const appEl = document.getElementById('app');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('status');
  // Info teknis (ukuran layar, fps) hanya tampil jika alamat memakai ?debug=1; anak tidak perlu melihatnya.
  const DEBUG_STATUS = /[?&]debug=1(&|$)/.test(location.search);
  if (!DEBUG_STATUS) statusEl.style.display = 'none';
  const splash = document.getElementById('splash');
  const controls = document.getElementById('controls');
  const btnPause = document.getElementById('btn-pause');

  const MAX_HEALTH = 100, START_LIVES = 3;
  const TB = window.TimeBonus; // bonus level menyusut menurut waktu; kecepatannya diatur di shared/js/timebonus.js
  const BEST_KEY = 'mathHero.highScore', HERO_KEY = 'mathHero.hero';
  const HEROES = ['hero1', 'hero2', 'hero3'];

  function loadBest() { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch (e) { return 0; } }
  function loadHero() { try { return Math.min(3, Math.max(1, Number(localStorage.getItem(HERO_KEY)) || 1)); } catch (e) { return 1; } }
  function newStats() {
    return { soalBenar: 0, soalSalah: 0, pintu: 0, peti: 0, boss: 0, jembatan: 0, pilih: 0, bintang: 0, rahasia: 0, musuh: 0, area: 1 };
  }
  const game = { health: MAX_HEALTH, lives: START_LIVES, score: 0, best: loadBest(), over: false, ended: false, inMenu: true, stats: newStats(), hero: loadHero() };
  const state = { w: 0, h: 0, dpr: 1, zoom: 1, vw: 0, vh: 0, running: false, paused: false, fps: 0, frames: 0, fpsTimer: 0, last: 0 };
  const W = window.W = { t: 0, fx: [], toast: '', toastUntil: 0, cam: { x: 0, y: 0 }, L: null, levelIndex: 0, areaIndex: 0, clearing: false, hintMsgAt: 0 };
  const P = { x: 0, y: 0, w: C.PW, h: C.PH, vx: 0, vy: 0, onGround: false, face: 1, coy: 0, buf: 0, dj: true, hurt: 0, inv: 0, drop: 0, appear: 0, djAnim: 0, ride: null, lastPlat: null, prevJump: false, safe: null, safeT: 0, pose: null };

  function saveBest() {
    game.best = Math.max(game.best, game.score);
    try { localStorage.setItem(BEST_KEY, String(game.best)); } catch (e) { /* abaikan */ }
  }
  const grade = (lv) => Math.ceil(lv / 2);
  const bonusFor = (attempts) => (attempts === 0 ? 1 : 0.5);

  function resize() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Di laptop kolom permainan dibatasi selebar HP (seperti MH2 dan MH3); HP mendatar tetap penuh.
    const iw = window.innerWidth, ih = window.innerHeight;
    const colW = iw > 700 && ih > 480 ? Math.min(iw, Math.round(ih * 0.66)) : iw;
    appEl.style.width = colW + 'px';
    state.w = colW;
    state.h = ih;
    state.zoom = Math.max(1, Math.floor(Math.min(state.w / 380, state.h / 640) * 2) / 2);
    state.vw = state.w / state.zoom;
    state.vh = state.h / state.zoom;
    canvas.width = Math.floor(state.w * state.dpr);
    canvas.height = Math.floor(state.h * state.dpr);
  }

  function showToast(text, ms) { W.toast = text; W.toastUntil = performance.now() + (ms || 1500); }
  let storyToken = 0;
  function playStory(lines) {
    const token = ++storyToken;
    lines.forEach((line, i) => setTimeout(() => { if (token === storyToken) showToast(line, 2600); }, i * 2800));
  }

  // ---------- Efek partikel ----------
  function fx(kind, x, y, n, opt) {
    opt = opt || {};
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = (opt.speed || 120) * (0.4 + Math.random() * 0.8);
      W.fx.push({ kind, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opt.up || 60), life: 0, max: opt.life || 0.7, c: opt.color || '#fff' });
    }
  }
  function updateFx(dt) {
    for (const p of W.fx) {
      p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += (p.kind === 'puff' ? 40 : 700) * dt;
    }
    W.fx = W.fx.filter((p) => p.life < p.max);
  }
  function drawFx(cx, cy) {
    for (const p of W.fx) {
      const a = 1 - p.life / p.max;
      ctx.globalAlpha = Math.max(0, a);
      if (p.kind === 'star') A.draw(ctx, 'gem1', Math.floor(p.life * 14), p.x - cx - 16, p.y - cy - 16, 2, false);
      else if (p.kind === 'puff') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x - cx, p.y - cy, 4 + (1 - a) * 6, 0, 7); ctx.fill(); }
      else { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x - cx), Math.round(p.y - cy), 6, 6); }
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Level ----------
  function spawnPlayer(pos, appear) {
    P.x = pos.x - P.w / 2; P.y = pos.y - P.h;
    P.vx = 0; P.vy = 0; P.onGround = false; P.ride = null; P.hurt = 0; P.drop = 0; P.pose = null;
    P.appear = appear ? 0.7 : 0; P.inv = appear ? 1.5 : 0; P.dj = true;
    P.safe = { x: pos.x, y: pos.y }; P.safeT = 0;
  }

  const hooks = {
    bossStart(B) {
      W.cp = { x: P.x + P.w / 2, y: P.y + P.h };
      showToast(`${B.nama} muncul! Hindari seranganmu.`, 2400);
      setTimeout(() => showToast('Saat bos pusing, dekati dan tekan B!', 2600), 2600);
    },
    bossDefeated(B) {
      game.stats.boss++;
      game.score += 150 * grade(B.lv);
      Sfx.play('reward');
      fx('star', B.b.x + B.b.w / 2, B.b.y, 8, { speed: 220, life: 1.2 });
      showToast(`${B.nama} dikalahkan! Jalan menuju trofi terbuka.`, 2800);
    },
  };
  W.hooks = hooks;

  function loadLevel(i) {
    const L = LEVELS[i];
    W.levelIndex = i; W.areaIndex = i; W.L = L; W.t = 0; W.fx = []; W.clearing = false;
    W.stars = L.stars.map((s) => Object.assign({}, s, { got: false }));
    W.secrets = L.secrets.map((s) => Object.assign({}, s, { got: false }));
    W.hearts = L.hearts.map((s) => Object.assign({}, s, { got: false }));
    W.crates = L.crates.map((c) => Object.assign({}, c, { done: false }));
    W.gates = L.gates.map((g) => Object.assign({}, g, { open: false }));
    W.cps = L.checkpoints.map((c) => Object.assign({}, c, { on: false, t: 0 }));
    W.goal = Object.assign({}, L.goal, { won: false, t: 0 });
    W.cp = { x: L.start.x, y: L.start.y };
    W.startStats = Object.assign({}, game.stats);
    W.bonus = TB.forGame('mh1');
    Ent.init(W, L);
    spawnPlayer(W.cp, true);
    P.face = 1;
    W.cam.x = P.x - state.vw / 2; W.cam.y = P.y - state.vh * 0.45;
    clampCam(true);
    if (!game.inMenu) playStory([`Level ${L.id}: ${L.nama}`].concat(L.cerita || [], L.tip ? [L.tip] : []));
    if (window.Store) window.Store.onAreaStart(i, game.score);
  }

  function cratesLeft() { return W.crates.filter((c) => !c.done).length; }
  function bossAlive() { return !!W.boss && !W.boss.defeated; }
  function goalReady() { return cratesLeft() === 0 && !bossAlive(); }

  // ---------- Pemain: hidup dan mati ----------
  function damagePlayer(dmg, srcX) {
    if (P.inv > 0 || game.over || game.ended || W.clearing) return;
    Sfx.play('damage');
    game.health = Math.max(0, game.health - dmg);
    if (game.health === 0) { die(); return; }
    P.hurt = 0.35; P.inv = 1.3;
    P.vx = (P.x + P.w / 2 < srcX ? -1 : 1) * 210; P.vy = -320; P.onGround = false;
    fx('spark', P.x + P.w / 2, P.y + P.h / 2, 6, { color: '#ff8fab', speed: 140 });
  }

  function die() {
    game.lives--;
    if (game.lives <= 0) { gameOver(); return; }
    game.health = MAX_HEALTH;
    showToast(`Nyawa berkurang! Sisa ${game.lives}`, 1800);
    spawnPlayer(W.cp, true);
    if (window.Quiz.isOpen()) window.Quiz.close();
  }

  function fallReset() {
    if (game.over || game.ended) return;
    Sfx.play('damage');
    game.health = Math.max(0, game.health - 20);
    if (game.health === 0) { die(); return; }
    showToast('Awas jurang! Ayo coba lagi', 1400);
    spawnPlayer(P.safe || W.cp, true);
    P.appear = 0.5;
  }

  // ---------- Soal ----------
  function ask(spec, onCorrect, onWrongExtra) {
    let attempts = 0;
    const q = window.MathQuiz.generate(spec.op, spec.lv);
    window.Scratchpad.clear();
    window.Quiz.open(q, () => {
      game.stats.soalBenar++;
      Sfx.play('benar');
      onCorrect(bonusFor(attempts));
    }, () => {
      attempts++;
      game.stats.soalSalah++;
      Sfx.play('salah');
      if (onWrongExtra) onWrongExtra();
    });
  }

  function interactTarget() {
    const px = P.x + P.w / 2, py = P.y + P.h / 2, feet = P.y + P.h;
    for (const c of W.crates) {
      if (!c.done && Math.abs(px - c.x) < 56 && Math.abs(feet - c.y) < 64) return { kind: 'crate', o: c, x: c.x, y: c.y - 70 };
    }
    for (const g of W.gates) {
      if (g.open) continue;
      const gx = Math.max(g.x, Math.min(px, g.x + g.w));
      if (Math.abs(px - gx) < 58 && py > g.y - 30 && py < g.y + g.h + 40) return { kind: 'gate', o: g, x: g.x + g.w / 2, y: g.y - 12 };
    }
    for (const br of W.bridges) {
      if (br.built >= br.parts) continue;
      const sx = br.x + br.built * (br.len * T / br.parts);
      if (px > sx - 120 && px < sx + 36 && Math.abs(feet - br.y) < 70) return { kind: 'bridge', o: br, x: sx - 20, y: br.y - 100 };
    }
    const B = W.boss;
    if (Ent.bossStunned(B)) {
      const bx = B.b.x + B.b.w / 2;
      if (Math.abs(px - bx) < B.b.w / 2 + 100 && Math.abs(feet - (B.b.y + B.b.h)) < 70) return { kind: 'boss', o: B, x: bx, y: B.b.y - 78 };
    }
    return null;
  }

  // ---------- Gaya karakter: tombol B tanpa sasaran membuat karakter beraksi lucu (hiburan saja) ----------
  const POSES = [
    { kind: 'salto', dur: 0.85, say: ['Hup!', 'Yeay!', 'Wiii!'] },
    { kind: 'joget', dur: 1.1, say: ['Tralala!', 'Asyik!', 'Goyang!'] },
    { kind: 'tada', dur: 1.0, say: ['Ta-da!', 'Keren!', 'Sip!'] },
  ];
  let lastPose = -1;
  function startPose(kind) {
    if (P.pose || P.appear > 0 || P.hurt > 0) return false;
    let i = POSES.findIndex((d) => d.kind === kind);
    if (i < 0) { do { i = Math.floor(Math.random() * POSES.length); } while (i === lastPose); }
    lastPose = i;
    const d = POSES[i];
    P.pose = { kind: d.kind, t: 0, dur: d.dur, say: d.say[Math.floor(Math.random() * d.say.length)] };
    Sfx.play('gaya');
    const mx = P.x + P.w / 2, my = P.y + P.h / 2;
    if (d.kind === 'tada') fx('star', mx, my - 10, 6, { speed: 170, life: 0.9 });
    else if (d.kind === 'salto') fx('puff', mx, P.y + P.h, 4, { speed: 50, up: 0, life: 0.4 });
    else fx('spark', mx, my, 6, { color: '#ff8fab', speed: 110 });
    return true;
  }
  // Pose berhenti jika pemain bergerak, melompat, terluka, atau tidak lagi di tanah.
  function updatePose(dt, I) {
    const po = P.pose;
    if (!po) return;
    po.t += dt;
    const done = po.t >= po.dur;
    if (done || P.hurt > 0 || !P.onGround || Math.abs(I.joy.x) > 0.2 || I.jump) {
      if (done && po.kind === 'salto') fx('spark', P.x + P.w / 2, P.y + P.h, 5, { color: '#ffd54a', speed: 120 });
      P.pose = null;
    }
  }

  let prevAction = false;
  function checkInteract() {
    const pressed = window.Input.action && !prevAction;
    prevAction = window.Input.action;
    if (!pressed || window.Quiz.isOpen() || P.hurt > 0) return;
    const t = interactTarget();
    if (!t) { startPose(); return; }
    const o = t.o;
    if (t.kind === 'crate') {
      ask(o, (f) => {
        o.done = true; game.stats.peti++;
        const pts = Math.round(50 * grade(o.lv) * f);
        game.score += pts;
        Sfx.play('reward');
        fx('star', o.x, o.y - 24, 5, { speed: 200, life: 1 });
        const left = cratesLeft();
        showToast(left ? `Peti terbuka! +${pts} poin. Sisa peti: ${left}` : `Peti terakhir! +${pts} poin. Trofi terbuka!`, 2000);
      });
    } else if (t.kind === 'gate') {
      ask(o, (f) => {
        o.open = true; game.stats.pintu++;
        const pts = Math.round(100 * grade(o.lv) * f);
        game.score += pts;
        Sfx.play('crate');
        fx('wood', o.x + o.w / 2, o.y + o.h / 2, 16, { speed: 220, color: '#c98a4b', life: 0.9 });
        showToast(`Tumpukan peti pecah! +${pts} poin`, 1800);
      });
    } else if (t.kind === 'bridge') {
      ask(o, (f) => {
        o.built++;
        const pts = Math.round(60 * grade(o.lv) * f);
        game.score += pts;
        Sfx.play('crate');
        showToast(o.built >= o.parts ? `${o.nama} selesai! +${pts} poin` : `Satu bagian terpasang! +${pts} poin. Sisa ${o.parts - o.built}`, 1800);
        if (o.built >= o.parts) game.stats.jembatan++;
      });
    } else if (t.kind === 'boss') {
      ask(o, (f) => {
        const pts = Math.round(120 * grade(o.lv) * f);
        game.score += pts;
        Sfx.play('pukul');
        Ent.bossHit(W);
        fx('spark', o.b.x + o.b.w / 2, o.b.y + o.b.h / 2, 12, { color: '#ffd54a', speed: 220 });
        showToast(o.hp > 0 ? `Serangan kena! +${pts} poin. Sisa ${o.hp}` : `Serangan terakhir! +${pts} poin`, 1800);
      }, () => {
        game.health = Math.max(0, game.health - 10);
        showToast('Bos membalas! -10 health', 1400);
        if (game.health === 0) die();
      });
    }
  }

  // ---------- Pembaruan pemain ----------
  function standingOnOneWay() {
    const feet = P.y + P.h + 2;
    const r = Math.floor(feet / T);
    for (let x = P.x + 2; x < P.x + P.w; x += P.w - 5) {
      if (tileAt(W.L, Math.floor(x / T), r) === 1) return false;
    }
    if (tileAt(W.L, Math.floor((P.x + P.w / 2) / T), r) === 2) return true;
    return !!(P.lastPlat && P.lastPlat.ow);
  }

  function pilihLand(tile) {
    const pg = W.pilih.find((g) => g.tiles.includes(tile));
    if (!pg || tile.state !== 'ok') return;
    if (tile.correct) {
      tile.state = 'right';
      if (!pg.solved) {
        pg.solved = true; game.stats.pilih++;
        const pts = Math.round(30 * grade(pg.lv));
        game.score += pts;
        Sfx.play('pilih');
        for (let i = 0; i < 3; i++) W.stars.push({ x: tile.x + tile.w / 2 + (i - 1) * 30, y: tile.y - 56, got: false });
        showToast(`Tepat! Jawabannya ${tile.value}. +${pts} poin`, 1900);
      }
    } else if (!pg.solved) {
      tile.state = 'crack'; tile.timer = 0.5;
      Sfx.play('salah');
      showToast('Hampir! Hitung lagi, lalu coba platform lain', 1500);
    }
  }

  function updatePlayer(dt) {
    const I = window.Input;
    if (P.hurt > 0) P.hurt -= dt;
    else {
      P.vx = I.joy.x * C.MOVE;
      if (I.joy.x > 0.2) P.face = 1; else if (I.joy.x < -0.2) P.face = -1;
    }
    if (P.inv > 0) P.inv -= dt;
    if (P.drop > 0) P.drop -= dt;
    if (P.appear > 0) P.appear -= dt;
    if (P.djAnim > 0) P.djAnim -= dt;
    updatePose(dt, I);
    const jp = I.jump && !P.prevJump;
    P.prevJump = I.jump;
    if (P.onGround) { P.coy = C.COYOTE; P.dj = true; } else P.coy -= dt;
    if (jp) P.buf = C.BUFFER; else P.buf -= dt;
    if (P.hurt <= 0) {
      if (jp && I.joy.y > 0.6 && P.onGround && standingOnOneWay()) {
        P.drop = 0.25; P.y += 2; P.buf = 0; P.onGround = false; P.coy = 0;
      } else if (P.buf > 0 && P.coy > 0) {
        P.vy = C.JUMP; P.coy = 0; P.buf = 0; P.onGround = false;
        Sfx.play('lompat');
        fx('puff', P.x + P.w / 2, P.y + P.h, 3, { speed: 40, up: 0, life: 0.4 });
      } else if (jp && !P.onGround && P.coy <= 0 && P.dj) {
        P.vy = C.DJUMP; P.dj = false; P.djAnim = 0.3;
        Sfx.play('lompat');
        // Level 1 (tutorial): beri semangat saat pertama kali berhasil lompat 2x.
        if (W.levelIndex === 0 && !W.djPraised) { W.djPraised = true; showToast('Hebat! Itu lompat 2x!', 1600); }
        fx('puff', P.x + P.w / 2, P.y + P.h, 5, { speed: 60, up: 0, life: 0.4 });
      }
    }
    P.vy += C.GRAVITY * dt;
    if (P.ride) { P.x += P.ride.dx; P.y += P.ride.dy; }
    const prevBottom = P.y + P.h;
    const wasGround = P.onGround;
    const res = stepBody(P, dt, W.L, W.dyn);
    P.ride = null; P.lastPlat = res.platform;
    if (res.platform) {
      const r = res.platform.ref;
      if (r && r.axis) P.ride = r;
      if (r && r.touched !== undefined) r.touched = true;
      if (r && r.correct !== undefined && !wasGround) pilihLand(r);
    }
    // Titik aman terakhir untuk kembali setelah jatuh ke jurang.
    P.safeT += dt;
    if (P.onGround && !P.ride && P.hurt <= 0 && P.safeT > 0.25) {
      const rr = Math.floor((P.y + P.h + 2) / T);
      const a = tileAt(W.L, Math.floor((P.x + 2) / T), rr), b = tileAt(W.L, Math.floor((P.x + P.w - 2) / T), rr);
      if (a === 1 && b === 1) { P.safe = { x: P.x + P.w / 2, y: P.y + P.h }; P.safeT = 0; }
    }
    if (P.y > W.L.height + 60) fallReset();
    return prevBottom;
  }

  function checkWorld(prevBottom) {
    // Musuh dan jebakan.
    const out = Ent.checkPlayer(W, P, prevBottom);
    for (const e of out.stomped) {
      e.dead = true; e.timer = 0.45;
      P.vy = -430; P.dj = true;
      game.score += 20; game.stats.musuh++;
      Sfx.play('stomp');
      fx('puff', e.b.x + e.b.w / 2, e.b.y + e.b.h, 6, { speed: 90, up: 20, life: 0.5 });
    }
    if (out.hurt) damagePlayer(out.hurt.dmg, out.hurt.x);
    const px = P.x + P.w / 2, py = P.y + P.h / 2;
    const near = (o) => Math.hypot(px - o.x, py - o.y) < 30;
    for (const s of W.stars) if (!s.got && near(s)) { s.got = true; game.score += 10; game.stats.bintang++; Sfx.play('ambil'); fx('spark', s.x, s.y, 4, { color: '#ffd54a', speed: 90 }); }
    for (const s of W.secrets) if (!s.got && near(s)) {
      s.got = true; game.score += 50; game.stats.rahasia++; Sfx.play('reward');
      fx('star', s.x, s.y, 5, { speed: 160, life: 1 }); showToast('Permata rahasia! +50 poin', 1500);
    }
    for (const h of W.hearts) if (!h.got && near(h)) {
      h.got = true; game.health = Math.min(MAX_HEALTH, game.health + 25); Sfx.play('ambil');
      fx('spark', h.x, h.y, 6, { color: '#ff8fab', speed: 100 }); showToast('Buah segar! Health bertambah', 1200);
    }
    for (const c of W.cps) {
      if (c.on) { c.t += 1 / 60; continue; }
      if (Math.abs(px - c.x) < 28 && Math.abs((P.y + P.h) - c.y) < 90) {
        c.on = true; c.t = 0; W.cp = { x: c.x, y: c.y };
        game.health = Math.min(MAX_HEALTH, game.health + 30);
        Sfx.play('reward'); showToast('Checkpoint! Kamu mulai dari sini jika jatuh', 1800);
      }
    }
    // Trofi tujuan.
    const g = W.goal;
    if (!g.won && Math.abs(px - g.x) < 40 && Math.abs((P.y + P.h) - g.y) < 100) {
      if (goalReady()) { g.won = true; g.t = 0; Sfx.play('menang'); }
      else if (performance.now() - W.hintMsgAt > 2200) {
        W.hintMsgAt = performance.now();
        showToast(cratesLeft() ? `Buka dulu semua peti soal! Sisa ${cratesLeft()}` : 'Kalahkan bos dulu!', 1900);
      }
    }
    if (g.won) { g.t += 1 / 60; if (g.t > 1.1) clearLevel(); }
  }

  // ---------- Level selesai, kalah, tamat ----------
  function statsText() {
    const s = game.stats, total = LEVELS.length;
    return `Level: ${Math.min(s.area, total)} dari ${total} | Soal benar: ${s.soalBenar}, salah: ${s.soalSalah} | ` +
      `Peti: ${s.peti}, pintu: ${s.pintu}, jembatan: ${s.jembatan}, bos: ${s.boss} | Musuh: ${s.musuh}, bintang: ${s.bintang}, rahasia: ${s.rahasia}`;
  }

  function clearLevel() {
    if (W.clearing) return;
    W.clearing = true;
    Sfx.setMusic(null);
    const bonus = W.bonus.value();
    game.score += bonus;
    const s = game.stats, b = W.startStats, L = W.L;
    document.getElementById('clear-title').textContent = `Level ${L.id} selesai!`;
    document.getElementById('clear-name').textContent = L.nama;
    document.getElementById('clear-lines').innerHTML = [
      `Soal benar: ${s.soalBenar - b.soalBenar}, salah: ${s.soalSalah - b.soalSalah}`,
      `Peti soal: ${L.crates.length} dari ${L.crates.length}`,
      `Bintang: ${s.bintang - b.bintang}, permata rahasia: ${s.rahasia - b.rahasia}`,
      `Musuh dikalahkan: ${s.musuh - b.musuh}`,
      `Bonus level: +${bonus} (waktu ${TB.clock(W.bonus.seconds())})`,
    ].map((t) => `<li>${t}</li>`).join('');
    document.getElementById('clear-score').textContent = `Skor: ${game.score}`;
    document.getElementById('btn-next').textContent = W.levelIndex + 1 < LEVELS.length ? 'Lanjut' : 'Selesai';
    document.getElementById('clear').classList.remove('hidden');
  }

  function nextLevel() {
    document.getElementById('clear').classList.add('hidden');
    const next = W.levelIndex + 1;
    if (next < LEVELS.length) {
      game.stats.area = next + 1;
      loadLevel(next);
    } else endGame();
  }

  function gameOver() {
    game.over = true;
    Sfx.setMusic(null); Sfx.play('kalah');
    saveBest();
    if (window.Store) window.Store.onSessionEnd('kalah');
    document.getElementById('over-score').textContent = `Skor kamu: ${game.score}`;
    document.getElementById('over-best').textContent = `Skor terbaik: ${game.best}`;
    document.getElementById('over-stats').textContent = statsText();
    document.getElementById('over').classList.remove('hidden');
    if (window.Quiz.isOpen()) window.Quiz.close();
  }

  function endGame() {
    game.ended = true;
    Sfx.setMusic(null); Sfx.play('menang');
    saveBest();
    if (window.Store) window.Store.onSessionEnd('tamat');
    document.getElementById('end-score').textContent = `Skor akhir: ${game.score}`;
    document.getElementById('end-best').textContent = `Skor terbaik: ${game.best}`;
    document.getElementById('end-stats').textContent = statsText();
    document.getElementById('ending').classList.remove('hidden');
  }

  // ---------- Kamera ----------
  function clampCam(snap) {
    const L = W.L;
    const lookY = window.Input.joy.y < -0.6 ? -90 : window.Input.joy.y > 0.6 ? 90 : 0;
    let tx = P.x + P.w / 2 + Math.max(-60, Math.min(60, P.vx * 0.3)) - state.vw / 2;
    let ty = P.y + P.h / 2 - state.vh * 0.45 + lookY;
    // Saat bos muncul, kamera sebentar menyorot bos agar pemain tahu siapa lawannya.
    const B = W.boss;
    // Selama pertarungan, kamera condong ke bos tetapi pemain tetap berada di dalam layar.
    if (B && !B.defeated && B.state !== 'wait' && B.state !== 'intro' && B.state !== 'dead') {
      const pc = P.x + P.w / 2, bc = B.b.x + B.b.w / 2, lim = state.vw / 2 - 80;
      tx = Math.max(pc - lim, Math.min(pc + lim, (pc + bc) / 2)) - state.vw / 2;
    }
    if (B && B.state === 'intro') { tx = B.b.x + B.b.w / 2 - state.vw / 2; ty = B.b.y + B.b.h / 2 - state.vh * 0.5; }
    const k = snap ? 1 : 0.12;
    W.cam.x += (tx - W.cam.x) * (B && B.state === 'intro' ? 0.08 : k);
    W.cam.y += (ty - W.cam.y) * (snap ? 1 : 0.1);
    const maxX = L.width - state.vw, maxY = L.height - state.vh;
    W.cam.x = maxX < 0 ? maxX / 2 : Math.max(0, Math.min(maxX, W.cam.x));
    W.cam.y = maxY < 0 ? maxY : Math.max(0, Math.min(maxY, W.cam.y));
  }

  // ---------- Loop ----------
  function update(dt) {
    W.t += dt;
    if (!W.clearing && !W.goal.won) W.bonus.tick(dt); // hanya saat main: jeda, soal terbuka, dan menu tidak memanggil update
    Ent.update(W, dt, P);
    const prevBottom = updatePlayer(dt);
    if (!game.over && !game.ended && !W.clearing) checkWorld(prevBottom);
    updateFx(dt);
    clampCam(false);
  }

  // ---------- Gambar ----------
  const tintCache = {};
  function icon(name, color) {
    const key = name + color;
    if (tintCache[key]) return tintCache[key];
    const im = A.img[name];
    if (!im || !im.complete) return null;
    const c = document.createElement('canvas');
    c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    tintCache[key] = c;
    return c;
  }
  function drawIcon(name, color, x, y, s) {
    const c = icon(name, color);
    if (c) ctx.drawImage(c, Math.round(x), Math.round(y), c.width * s, c.height * s);
  }

  function drawItems(cx, cy, t) {
    for (const s of W.stars) if (!s.got) A.draw(ctx, 'gem1', Math.floor(t * 9 + s.x * 0.01), s.x - cx - 16, s.y - cy - 16 + Math.sin(t * 3 + s.x) * 3, 2, false);
    for (const s of W.secrets) if (!s.got) A.draw(ctx, 'gem3', Math.floor(t * 9), s.x - cx - 16, s.y - cy - 16 + Math.sin(t * 3) * 4, 2, false);
    for (const h of W.hearts) if (!h.got) window.Sprites.draw(ctx, 'apple', h.x - cx - 16, h.y - cy - 16 + Math.sin(t * 3 + h.x) * 3, 32, 32);
  }

  function drawObjects(cx, cy, t) {
    const L = W.L;
    // Checkpoint.
    for (const c of W.cps) {
      let name = 'checkpoint_no_flag', f = 0;
      if (c.on) { name = c.t < 0.7 ? 'checkpoint_flag_out1' : 'checkpoint_flag_idle1'; f = c.t < 0.7 ? Math.floor(c.t / 0.7 * 7) : A.at(name, t, 8); }
      A.drawFeet(ctx, name, f, c.x - cx, c.y - cy, 2, false);
    }
    // Trofi tujuan.
    const g = W.goal, ready = goalReady();
    ctx.globalAlpha = ready ? 1 : 0.5;
    if (g.won) A.drawFeet(ctx, 'end_pressed', Math.min(6, Math.floor(g.t * 8)), g.x - cx, g.y - cy, 1.5, false);
    else A.drawFeet(ctx, 'end_idle', ready ? A.at('end_idle', t, 8) : 0, g.x - cx, g.y - cy, 1.5, false);
    ctx.globalAlpha = 1;
    if (!ready && !g.won) drawIcon('icon06', '#4b2e83', g.x - cx - 13, g.y - cy - 130, 1.5);
    // Tumpukan peti penghalang.
    const th = R.THEMES.crates, im = A.img.tileset;
    for (const gt of W.gates) {
      if (gt.open || !im) continue;
      for (let r = 0; r < gt.h / T; r++) for (let c = 0; c < gt.w / T; c++) {
        const p = th.fill[(r + c) % th.fill.length];
        ctx.drawImage(im, p[0] * 16, p[1] * 16, 16, 16, Math.round(gt.x + c * T - cx), Math.round(gt.y + r * T - cy), T, T);
      }
      drawIcon('icon06', '#ffffff', gt.x + gt.w / 2 - cx - 13, gt.y + gt.h / 2 - cy - 13, 1.5);
    }
    // Peti soal.
    for (const c of W.crates) {
      if (c.done) continue;
      A.drawFeet(ctx, 'box1_idle', 0, c.x - cx, c.y - cy, 2, false);
      const bob = Math.sin(t * 4 + c.x) * 3;
      R.bubble(ctx, '?', c.x - cx, c.y - cy - 78 + bob, { size: 18, pad: 6, bg: 'rgba(255,240,170,0.97)' });
    }
  }

  function drawHints(cx, cy) {
    let best = null, bd = 1e9;
    const px = P.x + P.w / 2;
    for (const h of W.L.hints) { const d = Math.abs(px - h.x); if (d < bd) { bd = d; best = h; } }
    if (best && bd < 130 && !window.Quiz.isOpen()) R.bubble(ctx, best.text, best.x - cx, best.y - cy - 150, { size: 14, pad: 7 });
  }

  // Pose gaya: salto (sprite lompat ganda), joget (lari di tempat sambil menoleh), ta-da (membesar). Murni visual.
  function drawPose(po, hero, x, y, t) {
    const u = Math.min(1, po.t / po.dur), arc = Math.sin(Math.PI * u);
    let sheet, f = 0, scale = 2, lift = 0, flip = P.face < 0;
    if (po.kind === 'salto') { sheet = hero + '_double_jump'; f = Math.floor(u * 12) % A.frames(sheet); lift = arc * 46; }
    else if (po.kind === 'joget') { sheet = hero + '_run'; f = A.at(sheet, t, 18); flip = Math.floor(po.t / 0.11) % 2 === 0; lift = Math.abs(Math.sin(po.t * 18)) * 8; }
    else { sheet = hero + '_jump'; scale = 2 + 0.6 * arc; lift = arc * 16; flip = false; }
    A.drawFeet(ctx, sheet, f, x, y - lift, scale, flip);
    if (u < 0.85) R.bubble(ctx, po.say, x, y - 112 - lift * 0.5, { size: 16 });
  }

  function drawPlayer(cx, cy, t) {
    if (game.inMenu) return; // di balik menu hanya pemandangan; animasi muncul beku akan tampak sebagai lingkaran putih
    const hero = HEROES[game.hero - 1] || 'hero1';
    const fx0 = P.x + P.w / 2 - cx, fy0 = P.y + P.h - cy;
    if (P.appear > 0.2) { A.draw(ctx, 'appearing', Math.floor((0.7 - P.appear) / 0.7 * 7), fx0 - 72, fy0 - 96, 1.5, false); return; }
    if (P.inv > 0 && P.hurt <= 0 && Math.floor(P.inv * 14) % 2 === 0) return;
    if (P.pose) { drawPose(P.pose, hero, fx0, fy0, t); return; }
    let sheet = hero + '_idle', f = A.at(sheet, t, 10);
    if (P.hurt > 0) { sheet = hero + '_hit'; f = Math.min(6, Math.floor((0.35 - P.hurt) / 0.35 * 7)); }
    else if (!P.onGround) {
      if (P.vy < 0) { sheet = P.djAnim > 0 ? hero + '_double_jump' : hero + '_jump'; f = P.djAnim > 0 ? Math.floor((0.3 - P.djAnim) / 0.3 * A.frames(sheet)) : 0; }
      else { sheet = hero + '_fall'; f = 0; }
    } else if (Math.abs(P.vx) > 10) { sheet = hero + '_run'; f = A.at(sheet, t, 18); }
    A.drawFeet(ctx, sheet, f, fx0, fy0, 2, P.face < 0);
  }

  function drawHud() {
    const x = 12, y = 12, w = 176, h = 120;
    ctx.fillStyle = 'rgba(255,253,245,0.95)'; ctx.strokeStyle = '#4b2e83'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill(); ctx.stroke();
    ctx.font = '16px ' + R.FONT; ctx.fillStyle = '#2c1a52';
    ctx.fillText('HP', x + 10, y + 26);
    ctx.fillStyle = '#e5e5e5'; ctx.fillRect(x + 42, y + 14, 120, 14);
    ctx.fillStyle = game.health > 40 ? '#7bd389' : '#ff6f91'; ctx.fillRect(x + 42, y + 14, Math.round(120 * game.health / MAX_HEALTH), 14);
    ctx.strokeStyle = '#4b2e83'; ctx.lineWidth = 2; ctx.strokeRect(x + 42, y + 14, 120, 14);
    const hero = HEROES[game.hero - 1] || 'hero1';
    for (let i = 0; i < game.lives; i++) A.draw(ctx, hero + '_idle', 0, x + 6 + i * 26, y + 30, 0.75, false);
    drawIcon('icon03', '#b9692b', x + 98, y + 36, 1.4);
    ctx.fillStyle = '#2c1a52'; ctx.fillText(`${W.crates.filter((c) => c.done).length}/${W.crates.length}`, x + 128, y + 54);
    drawIcon('icon05', '#f2b705', x + 10, y + 68, 1.4);
    ctx.fillStyle = '#2c1a52'; ctx.fillText(String(game.score), x + 40, y + 86);
    ctx.font = '13px ' + R.FONT; ctx.fillStyle = '#7a5bb5'; ctx.fillText(`Bonus waktu ${W.bonus.value()}`, x + 10, y + 110);
  }

  function drawToast(now) {
    if (now > W.toastUntil || !W.toast) return;
    ctx.font = '16px ' + R.FONT;
    const maxW = Math.min(state.w - 32, 380);
    const lines = []; let line = '';
    for (const word of W.toast.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW - 24 && line) { lines.push(line); line = word; } else line = test;
    }
    if (line) lines.push(line);
    const bw = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 24), bh = lines.length * 24 + 14;
    const x = state.w / 2 - bw / 2, y = 144;
    ctx.fillStyle = 'rgba(255,253,245,0.95)'; ctx.strokeStyle = '#4b2e83'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(x, y, bw, bh, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2c1a52'; ctx.textAlign = 'center';
    lines.forEach((l, i) => ctx.fillText(l, state.w / 2, y + 22 + i * 24));
    ctx.textAlign = 'start';
  }

  function draw(ts) {
    const z = state.zoom, vw = state.vw, vh = state.vh, t = W.t;
    ctx.setTransform(state.dpr * z, 0, 0, state.dpr * z, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const cx = Math.round(W.cam.x), cy = Math.round(W.cam.y), L = W.L;
    R.drawBackground(ctx, L, cx, cy, vw, vh, t);
    R.drawTiles(ctx, L, cx, cy, vw, vh);
    for (const d of L.deko) {
      const dx = d.x - cx;
      if (dx < -80 || dx > vw + 80) continue;
      const bob = d.bob ? Math.sin(t * 2 + d.x) * 6 : 0;
      window.Sprites.draw(ctx, d.img, dx - d.h / 2, d.y - d.h - cy + bob, d.h, d.h);
    }
    drawObjects(cx, cy, t);
    Ent.drawPlanks(ctx, W, cx, cy, vw, vh);
    drawItems(cx, cy, t);
    Ent.drawHazards(ctx, W, cx, cy, t);
    Ent.drawEnemies(ctx, W, cx, cy, t);
    Ent.drawBoss(ctx, W, cx, cy, t);
    drawPlayer(cx, cy, t);
    Ent.drawArena(ctx, W, cx, cy, vh);
    drawFx(cx, cy);
    if (!game.inMenu) drawHints(cx, cy);
    const tg = game.inMenu ? null : interactTarget();
    if (tg && !window.Quiz.isOpen()) R.bubble(ctx, tg.kind === 'boss' ? 'Serang! Tekan B' : 'Tekan B', tg.x - cx, tg.y - cy, { size: 16 });
    // HUD dan pesan memakai koordinat layar (tanpa zoom).
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    if (!game.inMenu) { drawHud(); drawToast(performance.now()); }
    if (state.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, state.w, state.h);
      R.bubble(ctx, 'Jeda', state.w / 2, state.h / 2 - 28, { size: 24, pad: 12 });
    }
  }

  function handlePause() {
    if (window.Input.pausePressed) {
      window.Input.pausePressed = false;
      state.paused = !state.paused;
      Sfx.setPaused(state.paused);
      btnPause.textContent = state.paused ? 'Main' : 'Jeda';
      if (!state.paused) state.last = performance.now();
    }
  }

  function frame(ts) {
    if (!state.running) return;
    handlePause();
    // Pulau kertas coret hanya ada selama soal terbuka (waktu sudah berhenti, jadi game tidak dijeda).
    window.Scratchpad.setAvailable(window.Quiz.isOpen());
    const dt = Math.min((ts - state.last) / 1000, 0.033);
    state.last = ts;
    const frozen = state.paused || game.over || game.ended || game.inMenu || W.clearing;
    if (frozen) Sfx.setMusic(null);
    else {
      const B = W.boss;
      const boss = B && !B.defeated && B.state !== 'wait';
      Sfx.setMusic(boss ? 'boss' : W.L.musik);
    }
    if (!frozen) {
      checkInteract();
      if (!window.Quiz.isOpen()) update(dt);
    }
    draw(ts);
    state.frames++;
    if (ts - state.fpsTimer >= 1000) {
      state.fps = state.frames; state.frames = 0; state.fpsTimer = ts;
      if (DEBUG_STATUS) statusEl.textContent = `${Math.round(state.w)}x${Math.round(state.h)} | ${state.fps} fps | level ${W.levelIndex + 1}`;
    }
    requestAnimationFrame(frame);
  }

  function startLoop() {
    if (state.running) return;
    state.running = true;
    state.last = performance.now();
    state.fpsTimer = state.last;
    requestAnimationFrame(frame);
  }

  // Dipanggil menu: mulai game dari level tertentu dengan skor awal.
  function startGame(levelIndex, score, hero) {
    if (hero) setHero(hero);
    game.health = MAX_HEALTH; game.lives = START_LIVES; game.score = score || 0;
    game.over = false; game.ended = false; game.inMenu = false;
    state.paused = false; W.djPraised = false;
    game.stats = newStats(); game.stats.area = levelIndex + 1;
    for (const id of ['over', 'ending', 'clear']) document.getElementById(id).classList.add('hidden');
    splash.classList.add('hidden');
    controls.classList.add('active');
    loadLevel(levelIndex);
    startLoop();
    Sfx.unlock();
  }

  function showMenu() {
    game.inMenu = true; state.paused = false;
    Sfx.setMusic(null);
    btnPause.textContent = 'Jeda';
    for (const id of ['over', 'ending', 'clear']) document.getElementById(id).classList.add('hidden');
    splash.classList.remove('hidden');
    controls.classList.remove('active');
  }

  function setHero(n) {
    game.hero = Math.min(3, Math.max(1, n));
    try { localStorage.setItem(HERO_KEY, String(game.hero)); } catch (e) { /* abaikan */ }
  }

  const btnMute = document.getElementById('btn-mute');
  function refreshMute() { btnMute.textContent = Sfx.isMuted() ? 'Bersuara' : 'Senyap'; }
  btnMute.addEventListener('click', () => { Sfx.setMuted(!Sfx.isMuted()); refreshMute(); });
  refreshMute();
  document.getElementById('btn-next').addEventListener('click', nextLevel);

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  resize();

  window.__mathHero = {
    state, player: P, world: W, game, startGame, showMenu, setHero, loadLevel, clearLevel, damagePlayer, startPose,
    get ready() { return A.ready; },
  };

  // Mulai memuat aset; setelah siap, tampilkan level 1 di belakang menu dan jalankan loop.
  A.load().then(() => {
    loadLevel(0);
    startLoop();
    document.body.classList.add('loaded');
  });
})();
