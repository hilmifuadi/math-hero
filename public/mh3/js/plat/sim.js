// Math Hero 3: logika level Kejar (platformer MH1 versi layar tegak). Tanpa DOM supaya bisa diuji di Node.
// Level ditulis sebagai peta teks (satu string per baris, atas ke bawah, tile 32 px):
//   # padat   = tembus dari bawah   S awal   E tujuan (kristal)   c checkpoint   * bintang
//   ^ duri   P Peti Kekuatan (PR, tidak menghalangi)   K Peti Kristal (PR, tidak menghalangi)
// Musuh (jenis sama dengan MH1): e jalan cepat, a jalan lambat (keduanya bisa diinjak), r banteng (menyeruduk saat
//   melihat hero; bisa diinjak hanya saat pusing setelah menabrak dinding), f lebah terbang (tidak bisa diinjak),
//   n N meriam menembak ke kiri/kanan (tidak bisa diinjak). Semua musuh kalah oleh skill jagoan.
// Mekanik lanjutan (spesifikasi: public/shared/LEVELGEN.md):
//   H tangga (H paling atas sebaris dengan lantai atas, jadi bisa dipijak)   s per (lontar ke atas)
//   > < per samping (lontar mendatar)   ( ) pipa: masuk di (, keluar di ) yang berpasangan (urut kolom)
//   - deretan mendatar = lintasan platform gerak   | deretan tegak = lintasan lift   ~ papan rapuh
//   B kotak dorong   _ , ; tombol injak kanal 1/2/3   t y u tuas kanal 1/2/3   1 2 3 gerbang kanal 1/2/3
//   x blok retak (padat; dipecahkan skill jagoan: bola api, terjang, atau hantam)   o gergaji diam   O gergaji bolak-balik
//   T Y U tuas macet kanal 1/2/3   j k l tombol macet kanal 1/2/3: menyentuhnya memunculkan soal (event 'quiz');
//   setelah soal selesai (solveQuiz) benda itu bekerja seperti biasa. Ditunda = tetap macet, bisa dicoba lagi.
// Kolom di luar peta = dinding, baris di bawah peta = jurang.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../../shared/js/physics.js'));
  else (root.MH3 = root.MH3 || {}).platSim = factory(root.Physics);
})(typeof self !== 'undefined' ? self : this, function (Physics) {
  const { C, T, stepBody, overlap } = Physics;
  const HEARTS = 3, INVULN = 1.4, RESPAWN_FALL = 140;
  const SPRING = -1000, DASH = 470, DASH_T = 0.8, DASH_VY = -700, CLIMB = 150, PUSH = 105, MOVER = 70, LIFT = 64;
  const CRUMBLE_SHAKE = 0.5, CRUMBLE_BACK = 3, PIPE_SPEED = 520;
  // Lompat ganda selalu ada (seperti MH1). Kekuatan super dari Peti Kekuatan: meluncur (tahan Lompat setelah lompat
  // ganda), magnet bintang, perisai (pulih sendiri SHIELD_BACK detik setelah menahan pukulan).
  const GLIDE_FALL = 95, SHIELD_BACK = 10;
  // Skill jagoan (tombol B), semuanya bisa memecah blok retak dan mengalahkan musuh. Jalan utama tidak pernah
  // membutuhkan skill; skill membuka bonus. lempar: bola api memantul; terjang: melesat (di udara menukik); hantam.
  const SKILLS = { pinki: 'lempar', owi: 'terjang', dudu: 'hantam' };
  const SHOT_SPEED = 300, SHOT_LIFE = 1.6, SHOT_CD = 0.35, SHOT_BOUNCE = -260, SHOT_G = 1400, SLAM = 900;
  const LUNGE = 0.28, LUNGE_VX = 520, LUNGE_DIVE = [380, 480];
  // Musuh: kecepatan jalan dan apakah bisa diinjak (seperti MH1).
  const FOES = { e: { speed: 55, stomp: true }, a: { speed: 38, stomp: true }, r: { speed: 36, stomp: false }, f: { speed: 0, stomp: false }, n: { speed: 0, stomp: false } };
  const CHARGE = 250, BALL = 150, BALL_EVERY = 2.6;
  const PLATE = '_,;', LEVER = 'tyu', GATE = '123', GATE_INV = '456', LEVER_Q = 'TYU', PLATE_Q = 'jkl';

  function parse(def) {
    const rows = def.map.length, cols = Math.max(...def.map.map((r) => r.length));
    const L = { cols, rows, tiles: new Uint8Array(cols * rows), stars: [], enemies: [], spikes: [], checkpoints: [], chests: [], start: null, goal: null,
      lad: new Uint8Array(cols * rows), ladTops: [], springs: [], dashes: [], pipes: [], movers: [], crumbles: [], boxes: [], plates: [], levers: [], gates: [], cracks: [], saws: [] };
    const at = (c, r) => (def.map[r] && def.map[r][c]) || '.';
    const mouthsIn = [], mouthsOut = [];
    def.map.forEach((line, r) => {
      for (let c = 0; c < cols; c++) {
        const ch = line[c] || '.', x = c * T, y = r * T;
        if (ch === '#') L.tiles[r * cols + c] = 1;
        else if (ch === '=') L.tiles[r * cols + c] = 2;
        else if (ch === 'x') { L.tiles[r * cols + c] = 1; L.cracks.push({ c, r }); }
        else if (ch === 'S') L.start = { x: x + T / 2, y: y + T };
        else if (ch === 'E') L.goal = { x: x + 4, y: y - T, w: T - 8, h: T * 2 };
        else if (ch === 'c') L.checkpoints.push({ x: x + T / 2, y: y + T, got: false, id: L.checkpoints.length });
        else if (ch === '*') L.stars.push({ x: x + T / 2, y: y + T / 2, got: false, id: L.stars.length });
        else if ('earf'.includes(ch)) L.enemies.push({ type: ch, x: x + 2, y: y + T - 30, id: L.enemies.length });
        else if (ch === 'n' || ch === 'N') L.enemies.push({ type: 'n', x: x + 2, y: y + T - 30, dir: ch === 'N' ? 1 : -1, id: L.enemies.length });
        else if (ch === '^') L.spikes.push({ x: x + 3, y: y + 12, w: T - 6, h: T - 12 });
        else if (ch === 'P' || ch === 'K') L.chests.push({ kind: ch === 'P' ? 'power' : 'crystal', x: x - 4, y: y - 8, w: T + 8, h: T + 8, got: false, id: L.chests.length });
        else if (ch === 'H') {
          L.lad[r * cols + c] = 1;
          if (at(c, r - 1) !== 'H') L.ladTops.push({ x, y, w: T, h: 8, ow: true, ladder: true });
        }
        else if (ch === 's') L.springs.push({ x: x + 4, y: y + T - 12, w: T - 8, h: 12, t: 0 });
        else if (ch === '>' || ch === '<') L.dashes.push({ x: x + 2, y: y - 2 * T, w: T - 4, h: 3 * T, dir: ch === '>' ? 1 : -1, t: 0 }); // zona tinggi: tetap kena walau anak melompat di atasnya
        else if (ch === '(') mouthsIn.push({ c, r });
        else if (ch === ')') mouthsOut.push({ c, r });
        else if (ch === '-' && at(c - 1, r) !== '-') {
          let c1 = c; while (at(c1 + 1, r) === '-') c1++;
          const w = Math.min(2, c1 - c + 1) * T;
          L.movers.push({ axis: 'x', x0: x, x1: (c1 + 1) * T - w, y0: y, y1: y, x, y, w, h: 12, ow: true, dir: 1, vx: 0, vy: 0, dx: 0, dy: 0, speed: MOVER });
        }
        else if (ch === '|' && at(c, r - 1) !== '|') {
          let r1 = r; while (at(c, r1 + 1) === '|') r1++;
          const w = 2 * T, lx = x - T / 2;
          L.movers.push({ axis: 'y', x0: lx, x1: lx, y0: y, y1: r1 * T, x: lx, y: r1 * T, w, h: 12, ow: true, dir: -1, vx: 0, vy: 0, dx: 0, dy: 0, speed: LIFT });
        }
        else if (ch === '~') L.crumbles.push({ x, y, w: T, h: 12, ow: true, state: 'idle', t: 0, id: L.crumbles.length });
        else if (ch === 'B') L.boxes.push({ x0: x + 1, y0: y + 2, id: L.boxes.length });
        else if (PLATE.includes(ch) || PLATE_Q.includes(ch)) L.plates.push({ x: x + 3, y: y + T - 6, w: T - 6, h: 6, ch: Math.max(PLATE.indexOf(ch), PLATE_Q.indexOf(ch)), down: false, stuck: PLATE_Q.includes(ch), id: L.plates.length });
        else if (LEVER.includes(ch) || LEVER_Q.includes(ch)) L.levers.push({ x: x + 4, y: y + 4, w: T - 8, h: T - 4, ch: Math.max(LEVER.indexOf(ch), LEVER_Q.indexOf(ch)), on: false, stuck: LEVER_Q.includes(ch), id: L.levers.length });
        else if (GATE.includes(ch)) { L.gates.push({ c, r, ch: GATE.indexOf(ch), open: false }); L.tiles[r * cols + c] = 1; }
        // blok saklar terbalik: padat saat tuasnya menyala, hilang saat mati
        else if (GATE_INV.includes(ch)) { L.gates.push({ c, r, ch: GATE_INV.indexOf(ch), inv: true, open: false }); L.tiles[r * cols + c] = 1; }
        else if (ch === 'o' || ch === 'O') L.saws.push({ cx: x + T / 2, cy: y + T / 2, x0: x + T / 2, move: ch === 'O', r: 13 });
      }
    });
    // Pipa: mulut masuk ke-k berpasangan dengan mulut keluar ke-k, diurutkan per kolom lalu baris.
    const ord = (a, b) => a.c - b.c || a.r - b.r;
    mouthsIn.sort(ord); mouthsOut.sort(ord);
    mouthsIn.forEach((m, i) => {
      const o = mouthsOut[i];
      if (!o) throw new Error('Pipa tanpa mulut keluar di kolom ' + m.c);
      L.pipes.push({ a: { x: m.c * T, y: m.r * T, w: T, h: T }, b: { x: o.c * T, y: o.r * T, w: T, h: T }, id: L.pipes.length,
        dist: Math.abs(o.c - m.c) * T + Math.abs(o.r - m.r) * T });
    });
    // Gerbang terhubung ke tuas/tombol berwarna sama yang terdekat (bukan semua tuas sewarna di level), jadi tuas dari
    // teka-teki sebelumnya tidak membuka gerbang teka-teki berikutnya. Gerbang sederet berbagi satu kepala (head).
    const sws = [...L.levers.map((o) => Object.assign(o, { key: 'l' + o.id })), ...L.plates.map((o) => Object.assign(o, { key: 'p' + o.id }))];
    for (const gt of L.gates) {
      let best = null, bd = 1e9;
      for (const sw of sws) {
        if (sw.ch !== gt.ch) continue;
        const d = Math.abs(sw.x / T - gt.c) + Math.abs(sw.y / T - gt.r) * 0.25;
        if (d < bd) { bd = d; best = sw; }
      }
      gt.link = best ? best.key : null;
      const above = L.gates.find((o) => o.c === gt.c && o.r === gt.r - 1 && o.ch === gt.ch && !o.inv === !gt.inv);
      gt.head = above ? above.head : gt;
    }
    if (!L.start) throw new Error('Level tanpa S');
    if (!L.goal) throw new Error('Level tanpa E');
    return L;
  }

  // opts.hero: kunci jagoan (menentukan skill); opts.skill menimpa langsung ('lempar' | 'terjang' | 'hantam' | null).
  function create(def, opts) {
    opts = opts || {};
    const L = parse(def);
    const g = {
      def, L, t: 0, phase: 'play', hearts: opts.hearts || HEARTS, endless: !!opts.endless, invuln: 0, stars: 0, deaths: 0, hurts: 0, events: [], power: null,
      cp: { x: L.start.x, y: L.start.y, levers: L.levers.map(() => false) }, coyote: 0, buffer: 0, face: 1, anim: 'idle', djumpUsed: false, enemies: [],
      skill: opts.skill !== undefined ? opts.skill : SKILLS[opts.hero] || 'lempar', skillCd: 0, shots: [], balls: [], slam: 0, lunge: null, glide: false, throwT: 0, shield: null, nearLever: null,
      climb: false, boost: 0, dash: null, pipe: null, pipeCool: 0, ride: null, pushing: false, chans: [false, false, false],
      boxes: L.boxes.map((b) => ({ id: b.id, x0: b.x0, y0: b.y0, x: b.x0, y: b.y0, w: 30, h: 30, vx: 0, vy: 0, onGround: false })),
      p: { x: 0, y: 0, w: C.PW, h: C.PH, vx: 0, vy: 0, onGround: false },
    };
    g.enemies = L.enemies.map((e) => ({ id: e.id, type: e.type, dir: e.dir || -1, state: 'walk', dead: false, timer: 0, t: e.id * 0.7, x0: e.x, y0: e.y,
      b: e.type === 'f' ? { x: e.x - 2, y: e.y - 18, w: 30, h: 28 } : { x: e.x, y: e.y, w: 28, h: 30, vx: 0, vy: 0, onGround: false } }));
    updateGates(g, true);
    place(g, g.cp);
    return g;
  }
  function place(g, pt) {
    const p = g.p; p.x = pt.x - p.w / 2; p.y = pt.y - p.h; p.vx = p.vy = 0; p.onGround = false;
    g.climb = false; g.dash = null; g.pipe = null; g.ride = null; g.boost = 0; g.slam = 0; g.lunge = null; g.glide = false;
  }

  function hurt(g, why) {
    if (g.invuln > 0 || g.phase !== 'play') return;
    if (g.shield && g.shield.ready && why !== 'jatuh') {
      g.shield.ready = false; g.shield.t = SHIELD_BACK; g.invuln = INVULN; g.events.push({ type: 'shieldBreak' }); return;
    }
    g.hearts--; g.hurts++; g.invuln = INVULN; g.events.push({ type: 'hurt', why });
    if (g.hearts <= 0 && g.endless) {
      // Tanpa batas: hati tidak pernah pulih, habis = putaran berakhir.
      g.hearts = 0; g.phase = 'dead'; g.events.push({ type: 'dead' });
    } else if (g.hearts <= 0) {
      // Habis hati: ulang dari checkpoint terakhir dengan hati penuh. Level tidak pernah macet.
      g.deaths++; g.hearts = HEARTS; respawn(g); g.invuln = INVULN + 0.6; g.events.push({ type: 'respawn' });
    } else if (why === 'jatuh') respawn(g);
  }

  // Tanpa batas: jawaban salah di kartu PR mengurangi hati (tidak bisa pulih). Mengembalikan true bila hati habis.
  function loseHearts(g, n) {
    if (g.phase !== 'play' || !(n > 0)) return false;
    g.hearts = Math.max(0, g.hearts - n); g.hurts++; g.events.push({ type: 'hurt', why: 'soal' });
    if (g.hearts <= 0) { g.phase = 'dead'; g.events.push({ type: 'dead' }); return true; }
    return false;
  }

  function grantPower(g, key) {
    g.power = key; g.shield = key === 'shield' ? { ready: true, t: 0 } : null;
    g.events.push({ type: 'power', key });
  }
  const defeat = (g, e) => { e.dead = true; e.timer = 0.4; g.events.push({ type: 'stomp', x: e.b.x + e.b.w / 2, y: e.b.y }); };

  // Benda padat/pijakan dinamis untuk fisika: platform gerak, papan rapuh, puncak tangga, kotak.
  function dynFor(g, self) {
    const L = g.L, d = [];
    for (const m of L.movers) d.push(m);
    for (const c of L.crumbles) if (c.state !== 'gone') d.push(c);
    if (self !== g.p || !g.climb) for (const t of L.ladTops) d.push(t);
    for (const b of g.boxes) if (b !== self) d.push(b);
    return d;
  }

  // Gerbang terbuka bila tuas/tombol yang terhubung dengannya menyala atau sedang ditekan; gerbang terbalik (inv)
  // sebaliknya. Gerbang tertutup = tile padat.
  function updateGates(g, init) {
    const L = g.L, bodies = [g.p, ...g.boxes, ...g.enemies.filter((e) => !e.dead).map((e) => e.b)];
    const on = {};
    for (const l of L.levers) if (l.on) on[l.key] = true;
    for (const p of L.plates) if (p.down) on[p.key] = true;
    for (const gt of L.gates) {
      const want = !!on[gt.link] !== !!gt.inv;
      if (want === gt.open) continue;
      const cell = { x: gt.c * T, y: gt.r * T, w: T, h: T };
      // Gerbang tidak menutup di atas benda (anak atau kotak tidak pernah terjepit).
      if (!want && !init && bodies.some((b) => overlap(b, cell))) continue;
      gt.open = want;
      L.tiles[gt.r * L.cols + gt.c] = want ? 0 : 1;
      gt.anim = init ? (want ? 1 : 0) : gt.anim;
      if (!init && gt.head === gt) g.events.push({ type: want ? 'gateOpen' : 'gateClose', ch: gt.ch, x: cell.x, y: cell.y, c: gt.c, r: gt.r });
    }
    g.chans = [0, 1, 2].map((k) => L.gates.some((gt) => gt.ch === k && gt.open));
  }

  const ladderAt = (L, c, r) => c >= 0 && c < L.cols && r >= 0 && r < L.rows && L.lad[r * L.cols + c] === 1;
  function touchLadder(g) {
    const p = g.p, c = Math.floor((p.x + p.w / 2) / T);
    for (let r = Math.floor(p.y / T); r <= Math.floor((p.y + p.h - 2) / T); r++) if (ladderAt(g.L, c, r)) return true;
    return false;
  }

  // Tuas: ditarik dengan tombol B (atau kena bola api), bisa dibolak-balik nyala/mati.
  // Tuas macet meminta soal dulu; setelah soal selesai tuas menyala dan bekerja biasa.
  function leverNear(g) {
    const p = g.p, near = { x: p.x - 8, y: p.y, w: p.w + 16, h: p.h };
    return g.L.levers.find((lv) => overlap(near, lv)) || null;
  }
  function pullLever(g, lv) {
    const at = { ch: lv.ch, x: lv.x + lv.w / 2, y: lv.y };
    if (lv.stuck) { g.events.push(Object.assign({ type: 'quiz', what: 'lever', id: lv.id }, at)); return; }
    lv.on = !lv.on; g.events.push(Object.assign({ type: 'lever', on: lv.on }, at));
  }
  // Kembali ke checkpoint: tuas kembali ke keadaan saat checkpoint diambil, jadi teka-teki saklar tidak pernah macet.
  function respawn(g) {
    place(g, g.cp);
    if (g.cp.levers) { g.L.levers.forEach((l, i) => { l.on = g.cp.levers[i]; }); updateGates(g, false); }
  }
  function useSkill(g, input) {
    const p = g.p;
    if (!input.skill || g.skillCd > 0) return;
    if (g.skill === 'lempar') {
      if (g.shots.length >= 2) return;
      g.shots.push({ x: p.x + p.w / 2 + g.face * 12, y: p.y + 22, vx: g.face * SHOT_SPEED, vy: SHOT_BOUNCE, t: SHOT_LIFE, r: 7 });
      g.skillCd = SHOT_CD; g.throwT = 0.25; g.events.push({ type: 'throw' });
    } else if (g.skill === 'terjang' && !g.lunge) {
      g.lunge = { dir: g.face, t: LUNGE, dive: !p.onGround }; g.ride = null; g.climb = false;
      g.skillCd = 0.5; g.events.push({ type: 'lunge' });
    } else if (g.skill === 'hantam' && !g.slam) {
      // Di tanah: loncat kecil lalu menghantam. Di udara: langsung menghantam ke bawah.
      if (p.onGround) { p.vy = -480; g.slam = 1; g.ride = null; } else { g.slam = 2; p.vy = SLAM; }
      g.skillCd = 0.3; g.events.push({ type: 'slamStart' });
    }
  }
  // Hantam mendarat: pecahkan blok retak tepat di bawah kaki, kalahkan musuh di dekatnya. Bila ada blok pecah, hantaman
  // berlanjut ke bawah (bisa menembus beberapa lapis).
  function landSlam(g) {
    const p = g.p, r = Math.floor((p.y + p.h + 2) / T);
    let broke = false;
    for (let c = Math.floor((p.x + 2) / T); c <= Math.floor((p.x + p.w - 2) / T); c++) broke = breakCrack(g, c, r) || broke;
    for (const e of g.enemies) {
      if (e.dead) continue;
      const b = e.b;
      if (Math.abs(b.x + b.w / 2 - (p.x + p.w / 2)) < 70 && Math.abs(b.y + b.h - (p.y + p.h)) < 24) defeat(g, e);
    }
    g.events.push({ type: 'slam', x: p.x + p.w / 2, y: p.y + p.h, broke });
    if (broke) { p.onGround = false; p.vy = SLAM * 0.6; } else g.slam = 0;
  }
  function breakCrack(g, c, r) {
    const L = g.L, k = L.cracks.find((x) => x.c === c && x.r === r && !x.broken);
    if (!k) return false;
    k.broken = true; L.tiles[r * L.cols + c] = 0;
    g.events.push({ type: 'crack', x: c * T + T / 2, y: r * T + T / 2 });
    return true;
  }
  // Terjang Owi: sebelum bergerak, pecahkan blok retak yang akan dilewati (depan, dan bawah saat menukik).
  function lungeBreak(g) {
    const p = g.p, ln = g.lunge, fx = Math.floor((ln.dir > 0 ? p.x + p.w + 6 : p.x - 6) / T);
    for (let r = Math.floor(p.y / T); r <= Math.floor((p.y + p.h - 2) / T); r++) breakCrack(g, fx, r);
    if (ln.dive) for (let c = Math.floor((p.x + 2) / T); c <= Math.floor((p.x + p.w + 4) / T); c++) breakCrack(g, c, Math.floor((p.y + p.h + 6) / T));
  }
  // Bola api Pinki: memantul di lantai, mengalahkan musuh, menyalakan tuas, memecah blok retak yang ditabraknya.
  function updateShots(g, dt) {
    const L = g.L, solid = (x, y) => Physics.tileAt(L, Math.floor(x / T), Math.floor(y / T));
    const crackAt = (x, y) => breakCrack(g, Math.floor(x / T), Math.floor(y / T));
    for (const s of g.shots) {
      s.t -= dt; s.x += s.vx * dt;
      if (solid(s.x + Math.sign(s.vx) * s.r, s.y) === 1) { crackAt(s.x + Math.sign(s.vx) * s.r, s.y); s.t = 0; g.events.push({ type: 'shotHit', x: s.x, y: s.y }); continue; }
      s.vy += SHOT_G * dt; s.y += s.vy * dt;
      // blok retak di lantai yang dilewati bola api (bola memantul rendah) ikut pecah
      if (crackAt(s.x, s.y + s.r + 18)) { s.t = 0; continue; }
      const under = solid(s.x, s.y + s.r);
      if (s.vy > 0 && under) {
        if (crackAt(s.x, s.y + s.r)) { s.t = 0; continue; }
        if (under === 1 || (s.y + s.r) % T < 12) { s.y = Math.floor((s.y + s.r) / T) * T - s.r; s.vy = SHOT_BOUNCE; }
      }
      if (s.vy > 0) for (const m of L.movers.concat(L.crumbles.filter((c) => c.state !== 'gone'))) {
        if (s.x > m.x && s.x < m.x + m.w && s.y + s.r >= m.y && s.y + s.r < m.y + 12) { s.y = m.y - s.r; s.vy = SHOT_BOUNCE; }
      }
      const box = { x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 };
      for (const e of g.enemies) if (!e.dead && overlap(box, e.b)) { defeat(g, e); s.t = 0; }
      for (const lv of L.levers) if (overlap(box, lv)) { s.t = 0; pullLever(g, lv); break; }
      if (s.y > L.rows * T + 64) s.t = 0;
    }
    g.shots = g.shots.filter((s) => s.t > 0);
  }

  // Musuh (perilaku sama dengan MH1): jalan bolak-balik di lantai, banteng menyeruduk, lebah terbang, meriam menembak.
  function updateEnemies(g, dt, input) {
    const p = g.p, L = g.L;
    for (const e of g.enemies) {
      if (e.dead) { e.timer -= dt; continue; }
      e.t += dt;
      const b = e.b, f = FOES[e.type] || FOES.e;
      if (e.type === 'f') {
        const ph = e.t * 0.35 * Math.PI * 2;
        b.x = e.x0 - 2 + Math.sin(ph) * 3 * T; b.y = e.y0 - 18 + Math.sin(e.t * 2.3) * 14; e.dir = Math.cos(ph) >= 0 ? 1 : -1;
      } else if (e.type === 'n') {
        b.vx = 0; b.vy += C.GRAVITY * dt; stepBody(b, dt, L, g.boxes);
        if ((e.timer -= dt) <= 0 && Math.abs(p.x - b.x) < 12 * T) {
          e.timer = BALL_EVERY; e.state = 'fire'; e.fire = 0.35;
          g.balls.push({ x: b.x + b.w / 2 + e.dir * 18, y: b.y + 10, vx: e.dir * BALL, r: 9, t: 6 });
          g.events.push({ type: 'cannon', x: b.x + b.w / 2, y: b.y });
        }
        if (e.fire > 0 && (e.fire -= dt) <= 0) e.state = 'walk';
      } else {
        if (e.type === 'r') {
          const dx = p.x + p.w / 2 - (b.x + b.w / 2);
          if (e.state === 'walk' && Math.sign(dx) === e.dir && Math.abs(dx) < 230 && Math.abs(p.y + p.h - (b.y + b.h)) < 70) { e.state = 'tele'; e.timer = 0.45; }
          else if (e.state === 'tele' && (e.timer -= dt) <= 0) e.state = 'charge';
          else if (e.state === 'stun' && (e.timer -= dt) <= 0) e.state = 'walk';
        }
        b.vx = e.state === 'charge' ? e.dir * CHARGE : e.state === 'walk' ? e.dir * f.speed : 0;
        b.vy += C.GRAVITY * dt;
        const hit = stepBody(b, dt, L, dynFor(g, b));
        const ahead = Math.floor((b.x + (e.dir > 0 ? b.w + 2 : -2)) / T), below = Math.floor((b.y + b.h + 2) / T);
        const edge = b.onGround && Physics.tileAt(L, ahead, below) === 0 && !dynFor(g, b).some((r) => ahead * T + T / 2 > r.x && ahead * T + T / 2 < r.x + r.w && Math.abs(b.y + b.h - r.y) < 8);
        if (hit.hitWall) { if (e.state === 'charge') { e.state = 'stun'; e.timer = 1.6; } e.dir = -e.dir; }
        else if (edge) { if (e.state === 'charge') { e.state = 'stun'; e.timer = 1.6; } e.dir = -e.dir; }
        if (b.y > L.rows * T + 200) e.dead = true;
      }
      if (e.dead || !overlap(p, b)) continue;
      if (g.lunge || g.slam === 2) { defeat(g, e); continue; }
      const canStomp = f.stomp || (e.type === 'r' && e.state === 'stun');
      if (canStomp && p.vy > 60 && p.y + p.h - b.y < 22) {
        defeat(g, e); p.vy = input.jumpHeld ? C.JUMP * 0.85 : C.JUMP * 0.6; g.djumpUsed = false;
      } else hurt(g, 'musuh');
    }
    for (const bl of g.balls) {
      bl.x += bl.vx * dt; bl.t -= dt;
      if (Physics.tileAt(L, Math.floor((bl.x + Math.sign(bl.vx) * bl.r) / T), Math.floor(bl.y / T)) === 1) { bl.t = 0; g.events.push({ type: 'shotHit', x: bl.x, y: bl.y }); continue; }
      const box = { x: bl.x - bl.r, y: bl.y - bl.r, w: bl.r * 2, h: bl.r * 2 };
      if (overlap(p, box)) { if (g.lunge) bl.t = 0; else { hurt(g, 'peluru'); bl.t = 0; } }
      for (const s of g.shots) if (overlap(box, { x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 })) { bl.t = 0; s.t = 0; g.events.push({ type: 'shotHit', x: bl.x, y: bl.y }); }
    }
    g.balls = g.balls.filter((b) => b.t > 0);
  }

  // Benda macet: sentuhan pertama memunculkan soal satu kali. Sesudah ditunda, soal muncul lagi setelah hero menjauh.
  function quizTouch(g, o, touch, what) {
    if (!touch) { o.asked = false; return false; }
    if (o.asked) return false;
    o.asked = true; g.events.push({ type: 'quiz', what, id: o.id, ch: o.ch, x: o.x + o.w / 2, y: o.y });
    return true;
  }
  // Soal selesai: tuas langsung menyala, tombol kembali bekerja biasa.
  function solveQuiz(g, what, id) {
    const o = (what === 'lever' ? g.L.levers : g.L.plates)[id];
    if (!o || !o.stuck) return;
    o.stuck = false;
    if (what === 'lever') { o.on = true; g.events.push({ type: 'lever', ch: o.ch, x: o.x + o.w / 2, y: o.y }); }
    updateGates(g, false);
  }

  // in: { dir: -1|0|1, jump: tombol lompat baru ditekan, jumpHeld: masih ditahan, up, down }
  function update(g, dt, input) {
    if (g.phase !== 'play') return;
    dt = Math.min(dt, 1 / 30);
    g.t += dt;
    const p = g.p, L = g.L;
    g.invuln = Math.max(0, g.invuln - dt);
    g.boost = Math.max(0, g.boost - dt);
    g.pipeCool = Math.max(0, g.pipeCool - dt);
    g.skillCd = Math.max(0, g.skillCd - dt);
    g.throwT = Math.max(0, g.throwT - dt);
    if (g.shield && !g.shield.ready && (g.shield.t -= dt) <= 0) { g.shield.ready = true; g.events.push({ type: 'shieldReady' }); }
    updateShots(g, dt);

    // --- benda bergerak (lebih dulu supaya pemain ikut terbawa) ---
    for (const m of L.movers) {
      const ox = m.x, oy = m.y;
      if (m.axis === 'x') { m.x += m.dir * m.speed * dt; if (m.x >= m.x1) { m.x = m.x1; m.dir = -1; } else if (m.x <= m.x0) { m.x = m.x0; m.dir = 1; } }
      else { m.y += m.dir * m.speed * dt; if (m.y <= m.y0) { m.y = m.y0; m.dir = 1; } else if (m.y >= m.y1) { m.y = m.y1; m.dir = -1; } }
      m.dx = m.x - ox; m.dy = m.y - oy; m.vy = m.dy / dt;
    }
    for (const c of L.crumbles) {
      if (c.state === 'shake' && (c.t -= dt) <= 0) { c.state = 'gone'; c.t = CRUMBLE_BACK; g.events.push({ type: 'crumble', x: c.x, y: c.y }); }
      else if (c.state === 'gone' && (c.t -= dt) <= 0 && !overlap(p, { x: c.x, y: c.y - 4, w: c.w, h: c.h + 8 })) c.state = 'idle';
    }
    for (const s of L.saws) if (s.move) s.cx = s.x0 + Math.sin(g.t * 1.6) * T * 1.5;
    for (const s of L.springs) s.t = Math.max(0, s.t - dt);

    // --- di dalam pipa: pemain tidak terlihat dan tidak dikendalikan ---
    if (g.pipe) {
      const pp = g.pipe; pp.t += dt;
      if (pp.t >= pp.dur) {
        const b = L.pipes[pp.id].b;
        p.x = b.x + T / 2 - p.w / 2; p.y = b.y + T - p.h; p.vx = 0; p.vy = -420; g.boost = 0.25;
        g.pipe = null; g.pipeCool = 0.6; g.events.push({ type: 'pipeOut', x: b.x + T / 2, y: b.y });
      }
      return;
    }

    // --- naik ke platform: bawa pemain sebesar gerak platform ---
    if (g.ride && p.onGround) { p.x += g.ride.dx; if (g.ride.dy) p.y += g.ride.dy; }

    // --- gerak pemain ---
    const dir = input.dir || 0;
    if (dir) g.face = dir;
    if (input.jump) g.buffer = C.BUFFER; else g.buffer = Math.max(0, g.buffer - dt);

    // Tangga: tekan atas saat menyentuh tangga untuk memanjat (bawah di puncak tangga untuk turun). Diam = berpegangan.
    // Lompat saat memanjat = melompat lepas dari tangga.
    const onLadder = touchLadder(g);
    const feetLadder = ladderAt(L, Math.floor((p.x + p.w / 2) / T), Math.floor((p.y + p.h + 2) / T));
    if (!g.climb && !g.lunge && ((onLadder && input.up) || (feetLadder && p.onGround && input.down))) {
      g.climb = true; g.dash = null; g.slam = 0; p.vy = 0; g.djumpUsed = false;
    }
    if (g.climb) {
      if (input.jump) { g.climb = false; p.vy = C.JUMP * 0.8; g.buffer = 0; g.events.push({ type: 'jump' }); }
      else if (!onLadder && !(feetLadder && input.down)) g.climb = false;
    }
    if (g.climb) {
      // Tetap di tengah tangga supaya tidak tersangkut di tepi lubang lantai.
      const cx = (Math.floor((p.x + p.w / 2) / T) + 0.5) * T - p.w / 2;
      p.x += (cx - p.x) * Math.min(1, dt * 12);
      p.vx = dir * 60;
      p.vy = input.up ? -CLIMB : input.down ? CLIMB : 0;
      const r = stepBody(p, dt, L, dynFor(g, p));
      // Sampai di puncak: kaki di atas tangga paling atas -> berdiri.
      const c = Math.floor((p.x + p.w / 2) / T), below = Math.floor((p.y + p.h - 1) / T);
      if (p.vy < 0 && !ladderAt(L, c, below) && ladderAt(L, c, below + 1)) { p.y = (below + 1) * T - p.h; p.vy = 0; p.onGround = true; g.climb = false; }
      if (r.landed && p.vy >= 0 && input.down) g.climb = false;
      g.anim = 'climb';
      g.buffer = 0;
    } else {
      g.pushing = false;
      if (g.lunge) {
        const ln = g.lunge;
        p.vx = ln.dir * (ln.dive ? LUNGE_DIVE[0] : LUNGE_VX); p.vy = ln.dive ? LUNGE_DIVE[1] : 0; g.face = ln.dir;
        lungeBreak(g);
        if ((ln.t -= dt) <= 0) g.lunge = null;
      } else if (g.dash) {
        p.vx = g.dash.dir * DASH; g.face = g.dash.dir;
        if ((g.dash.t -= dt) <= 0 || (dir && dir !== g.dash.dir)) g.dash = null;
      } else p.vx = dir * C.MOVE;
      // Dorong kotak: berjalan menempel ke sisi kotak di lantai yang sama.
      if (dir && p.onGround && !g.dash) {
        for (const b of g.boxes) {
          const side = dir > 0 ? Math.abs(p.x + p.w - b.x) < 3 : Math.abs(b.x + b.w - p.x) < 3;
          if (!side || p.y + p.h <= b.y + 6 || p.y >= b.y + b.h - 4) continue;
          const bx = b.x; b.vx = dir * PUSH; b.vy = 0;
          stepBody(b, dt, L, dynFor(g, b));
          b.vx = 0;
          if (Math.abs(b.x - bx) > 0.01) { g.pushing = true; p.vx = dir * PUSH; }
        }
      }
      g.coyote = p.onGround ? C.COYOTE : Math.max(0, g.coyote - dt);
      if (g.buffer > 0) {
        if (g.coyote > 0) { p.vy = C.JUMP; g.coyote = 0; g.buffer = 0; g.djumpUsed = false; g.ride = null; g.events.push({ type: 'jump' }); }
        else if (!g.djumpUsed && !p.onGround) { p.vy = C.DJUMP; g.djumpUsed = true; g.buffer = 0; g.slam = 0; g.events.push({ type: 'djump' }); }
      }
      // Tombol B di dekat tuas menarik tuas; di tempat lain memakai skill jagoan.
      g.nearLever = leverNear(g);
      if (g.nearLever) { if (input.skill) pullLever(g, g.nearLever); } else useSkill(g, input);
      // lompat pendek jika tombol dilepas lebih awal (tidak berlaku saat dilontar per)
      if (!input.jumpHeld && p.vy < -200 && g.boost <= 0) p.vy += C.GRAVITY * dt * 1.5;
      if (!g.lunge) p.vy += C.GRAVITY * dt;
      if (g.slam === 2) p.vy = SLAM, p.vx *= 0.3;
      if (g.slam === 1 && p.vy >= 0) { g.slam = 2; p.vy = SLAM; }
      // Meluncur: setelah lompat ganda, tahan Lompat saat turun.
      g.glide = g.power === 'glide' && g.djumpUsed && !!input.jumpHeld && !p.onGround && !g.slam && !g.lunge && p.vy > GLIDE_FALL;
      if (g.glide) p.vy = GLIDE_FALL;
      const wasGround = p.onGround;
      const r = stepBody(p, dt, L, dynFor(g, p));
      if (g.lunge && r.hitWall) g.lunge = null;
      if (g.lunge && g.lunge.dive && r.landed) g.lunge = null;
      g.ride = r.platform && L.movers.includes(r.platform) ? r.platform : null;
      if (r.landed && !wasGround) g.events.push({ type: 'land' });
      if (r.landed && g.slam === 2) landSlam(g);
      if (r.platform && r.platform.state === 'idle' && L.crumbles.includes(r.platform)) { r.platform.state = 'shake'; r.platform.t = CRUMBLE_SHAKE; }
      if (r.hitWall && g.dash) g.dash = null;
      g.anim = g.lunge ? 'jump' : g.throwT > 0 ? 'throw' : g.pushing ? 'push' : !p.onGround ? (p.vy < 0 ? 'jump' : 'fall') : dir ? 'run' : 'idle';
    }
    if (p.y > L.rows * T + RESPAWN_FALL) hurt(g, 'jatuh');

    // --- per, per samping, pipa ---
    for (const s of L.springs) {
      if (p.vy >= 0 && !g.climb && overlap(p, s) && p.y + p.h <= s.y + s.h + 4) {
        p.vy = SPRING; p.y = s.y - p.h; p.onGround = false; g.boost = 0.6; g.djumpUsed = false; g.ride = null; s.t = 0.4;
        g.events.push({ type: 'spring', x: s.x + s.w / 2, y: s.y });
      }
    }
    for (const d of L.dashes) {
      if (!g.climb && overlap(p, d) && !(g.dash && g.dash.dir === d.dir)) {
        g.dash = { dir: d.dir, t: DASH_T }; p.vy = Math.min(p.vy, DASH_VY); g.boost = 0.3; d.t = 0.4;
        g.events.push({ type: 'dash', x: d.x + d.w / 2, y: d.y });
      }
    }
    for (const pp of L.pipes) {
      if (g.pipeCool > 0 || !overlap(p, { x: pp.a.x + 6, y: pp.a.y + 4, w: T - 12, h: T - 4 })) continue;
      g.pipe = { id: pp.id, t: 0, dur: 0.25 + pp.dist / PIPE_SPEED }; g.climb = false; g.dash = null; p.vx = p.vy = 0;
      g.events.push({ type: 'pipeIn', x: pp.a.x + T / 2, y: pp.a.y + T / 2 });
      return;
    }

    // --- kotak: jatuh oleh gravitasi, muncul lagi bila jatuh ke jurang ---
    for (const b of g.boxes) {
      b.vx = 0; b.vy += C.GRAVITY * dt;
      const r = stepBody(b, dt, L, dynFor(g, b));
      if (r.platform && L.movers.includes(r.platform)) b.x += r.platform.dx;
      if (b.y > L.rows * T + 100) { b.x = b.x0; b.y = b.y0; b.vy = 0; g.events.push({ type: 'boxReset', x: b.x, y: b.y }); }
    }

    // --- tombol, tuas, gerbang ---
    for (const pl of L.plates) {
      // Ditekan bila tengah benda (hero atau kotak) berada di atas tombol.
      const on = (b) => b.x + b.w / 2 > pl.x - 2 && b.x + b.w / 2 < pl.x + pl.w + 2 && b.y + b.h >= pl.y - 4 && b.y + b.h <= pl.y + pl.h + 2;
      // Tombol macet: soal muncul saat hero di dekatnya (juga saat berdiri di atas kotak yang menutupi tombol).
      if (pl.stuck) { if (quizTouch(g, pl, overlap(p, { x: pl.x, y: pl.y - 48, w: pl.w, h: pl.h + 48 }), 'plate')) return; pl.down = false; continue; }
      const down = on(p) || g.boxes.some(on);
      if (down && !pl.down) g.events.push({ type: 'plate', ch: pl.ch, x: pl.x + pl.w / 2, y: pl.y });
      pl.down = down;
    }
    updateGates(g, false);

    updateEnemies(g, dt, input);
    for (const s of L.spikes) if (overlap(p, s)) hurt(g, 'duri');
    for (const s of L.saws) if (overlap(p, { x: s.cx - s.r, y: s.cy - s.r, w: s.r * 2, h: s.r * 2 })) hurt(g, 'gergaji');

    // --- benda ambil ---
    const mag = g.power === 'magnet' ? 120 : 0, pc = { x: p.x + p.w / 2, y: p.y + p.h / 2 };
    for (const s of L.stars) {
      if (s.got) continue;
      const d = Math.hypot(s.x - pc.x, s.y - pc.y);
      if (d < 24 || (mag && d < mag)) { if (mag && d >= 24) { s.x += (pc.x - s.x) * Math.min(1, dt * 10); s.y += (pc.y - s.y) * Math.min(1, dt * 10); if (Math.hypot(s.x - pc.x, s.y - pc.y) > 24) continue; } s.got = true; g.stars++; g.events.push({ type: 'star', x: s.x, y: s.y }); }
    }
    for (const c of L.checkpoints) if (!c.got && Math.abs(c.x - pc.x) < 28 && Math.abs(c.y - (p.y + p.h)) < 70) { c.got = true; g.cp = { x: c.x, y: c.y, levers: L.levers.map((l) => l.on) }; g.events.push({ type: 'checkpoint', x: c.x, y: c.y }); }
    for (const ch of L.chests) {
      const on = overlap(p, ch);
      if (!on) ch.skip = false; // peti yang ditunda terbuka lagi setelah hero menjauh
      else if (!ch.got && !ch.skip) { ch.got = true; g.events.push({ type: 'chest', kind: ch.kind, id: ch.id }); }
    }
    if (overlap(p, L.goal)) { g.phase = 'won'; g.events.push({ type: 'win' }); }
  }

  // Bintang 1-3: 3 dari hati utuh dan bintang banyak, minimal 1 jika selesai.
  function rating(g) {
    const total = g.L.stars.length || 1, frac = g.stars / total;
    return Math.max(1, Math.min(3, 1 + (g.hurts === 0 && g.deaths === 0 ? 1 : 0) + (frac >= 0.7 ? 1 : 0)));
  }

  // K: nilai lontaran untuk pemeriksa level (levelcheck.fromKejar).
  const K = { springVy: SPRING, dashVx: DASH, dashVy: DASH_VY, dashT: DASH_T, djump: true };
  return { HEARTS, SKILLS, K, parse, create, update, hurt, grantPower, loseHearts, rating, place, solveQuiz };
});
