// Math Hero 4: logika level platformer (tanpa DOM) untuk diuji di Node dan dipakai renderer.
// Peta teks satu string per baris, tile 16 px:
//   # padat   = platform tembus dari bawah   ^ duri   * bintang
//   S mulai   E tujuan   C checkpoint   K peti reward   G gerbang soal (padat sampai dibuka)
//   e musuh jalan sederhana   B spawn boss (hanya di arena boss)
// Jatuh atau kena duri mengembalikan hero ke checkpoint terakhir. HP habis = isi ulang
// dan kembali ke checkpoint; level tidak pernah macet.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./physics.js'), require('./combat/damage.js'),
      require('./combat/weapons.js'), require('./boss/machine.js'),
      require('./combat/enemies.js'), require('./mech.js')
    );
  } else {
    (root.MH4 = root.MH4 || {}).sim = factory(
      root.MH4.physics, root.MH4.damage, root.MH4.weapons, root.MH4.bossMachine,
      root.MH4.enemies, root.MH4.mech
    );
  }
})(typeof self !== 'undefined' ? self : this, function (Physics, Damage, Weapons, BossMachine, Enemies, Mech) {
  const { C, T, tileAt, overlap, stepBody } = Physics;
  const HEARTS = 3, MAX_HP = HEARTS * 10, INVULN = 1.2, FALL_PAD = 160, DYING_T = 1.4;
  const COYOTE_T = C.COYOTE, BUFFER_T = C.BUFFER;
  const JUMP_CUT = 0.5;
  const DROP_T = 0.22;
  const WAKE_RANGE = 260, QUIZ_RANGE = 170;
  const ASSIST_AFTER = 2, ASSIST_MUL = 0.75, MINION_HEAL = 4, CONTACT_DAMAGE = 6;
  const ENEMY_DAMAGE_RATE = 0.1, BOSS_HP_SHARE = 0.5, BOSS_DAMAGE_SHARE = 0.5;

  function parse(def) {
    const map = def.map || def;
    const rows = map.length, cols = Math.max(...map.map((r) => r.length));
    const L = {
      cols, rows, tiles: new Uint8Array(cols * rows),
      start: null, goal: null, chests: [], checkpoints: [], stars: [], spikes: [],
      gates: [], enemies: [], bossSpawn: null,
    };
    Mech.init(L);
    map.forEach((line, r) => {
      for (let c = 0; c < cols; c++) {
        const ch = line[c] || '.', x = c * T, y = r * T;
        if (ch === '#') L.tiles[r * cols + c] = 1;
        else if (ch === '=') L.tiles[r * cols + c] = 2;
        else if (ch === 'G') { L.tiles[r * cols + c] = 1; L.gates.push({ c, r }); }
        else if (ch === 'S') L.start = { x: x + T / 2, y: y + T, c, r };
        else if (ch === 'B') L.bossSpawn = { x: x + T / 2, y: y + T, c, r };
        else if (ch === 'E') L.goal = { x: x + 2, y: y + 2, w: T - 4, h: T - 4, c, r };
        else if (ch === 'K') L.chests.push({ x: x + 1, y: y + 1, w: T - 2, h: T - 2, kind: 'reward', got: false, id: L.chests.length, c, r });
        else if (ch === 'C') L.checkpoints.push({ x: x + 2, y: y + 2, w: T - 4, h: T - 4, got: false, id: L.checkpoints.length, cx: x + T / 2, cy: y + T, c, r });
        else if (ch === '*') L.stars.push({ x: x + 4, y: y + 4, w: T - 8, h: T - 8, cx: x + T / 2, cy: y + T / 2, got: false, id: L.stars.length, c, r });
        else if (ch === '^') L.spikes.push({ x: x + 2, y: y + T - 7, w: T - 4, h: 7, c, r });
        else if ('s~-|()><oL'.includes(ch)) Mech.cell(L, ch, c, r, map);
        else if (Enemies.byChar(ch)) {
          const kind = Enemies.byChar(ch) || Enemies.get('walker');
          L.enemies.push({
            type: ch, kind: kind.id, dir: -1, x: x + 1, y: y + T - kind.h,
            w: kind.w, h: kind.h, vx: 0, vy: 0, onGround: false, dead: false,
            id: L.enemies.length, c, r,
          });
        }
      }
    });
    if (!L.start) throw new Error('Level MH4 tanpa S');
    if (!L.goal) throw new Error('Level MH4 tanpa E');
    L.gateGroups = groupGates(L.gates, def.tower);
    L.gateCol = L.gateGroups.length ? L.gateGroups[0].col : -1;
    Mech.linkDoors(L);
    return L;
  }

  // Sel gerbang yang bersentuhan menjadi satu gerbang. Tegak menghalangi jalan mendatar, mendatar
  // menjadi pintu langit-langit di menara. Urutan mengikuti arah perjalanan.
  function groupGates(cells, tower) {
    const left = cells.slice(), groups = [];
    while (left.length) {
      const seed = left.pop(), g = [seed];
      for (let i = 0; i < g.length; i++) {
        for (let j = left.length - 1; j >= 0; j--) {
          if (Math.abs(left[j].c - g[i].c) + Math.abs(left[j].r - g[i].r) === 1) g.push(left.splice(j, 1)[0]);
        }
      }
      const hatch = g.length > 1 && g.every((x) => x.r === g[0].r);
      groups.push({ cells: g, hatch, col: Math.min(...g.map((x) => x.c)), row: Math.max(...g.map((x) => x.r)) });
    }
    return groups.sort((a, b) => (tower ? b.row - a.row : a.col - b.col));
  }

  const LOADOUT_BASE = {
    meleeMul: 1, rangedMul: 1, maxHp: 0, cooldownMul: 1, rangedCooldownMul: 1,
    speedMul: 1, coinMul: 1, melee: 'pedang', ranged: 'blaster',
  };

  // HP boss ikut sebagian kekuatan serangan hero, jadi upgrade tetap terasa tanpa membuat
  // boss tamat dalam tiga pukulan. Kesulitan utama tetap dari mekanisme, bukan angka.
  function makeBoss(def, L, lo) {
    if (!def.bossDef || !L.bossSpawn) return null;
    const schema = def.bossDef;
    const body = schema.body || { w: 60, h: 76 };
    const atk = Math.max(lo.meleeMul || 1, lo.rangedMul || 1);
    const boss = BossMachine.create(schema, {
      seed: (def.seed || 1) * 17 + 11,
      x: L.bossSpawn.x - body.w / 2,
      y: L.bossSpawn.y - body.h,
      facing: -1,
    });
    boss.maxHp = Math.round(schema.maxHp * (1 + BOSS_HP_SHARE * (atk - 1)));
    boss.hp = boss.maxHp;
    return boss;
  }

  const weaponsOf = (lo) => [lo.melee || 'pedang', lo.ranged || 'blaster'];

  function setWeapon(g, index) {
    g.weaponIndex = index;
    g.weapon = g.weapons[index];
    const w = Weapons.get(g.weapon);
    g.weaponName = w.nama;
    g.weaponColor = w.color;
  }

  function create(def, opts) {
    opts = opts || {};
    const L = parse(def);
    const tier = def.tier || 0;
    // `power` memberi kenaikan halus per level; definisi tanpa power memakai tier.
    const power = def.power === undefined ? tier : def.power;
    const lo = Object.assign({}, LOADOUT_BASE, opts.loadout || {});
    const maxHp = MAX_HP + Math.max(0, Math.round(lo.maxHp || 0));
    const g = {
      def, L, t: 0, phase: 'play', hp: maxHp, maxHp, invuln: 0, loadout: lo, power,
      stars: 0, starTotal: L.stars.length, chest: false, gateOpen: false, gateAsked: false, gateIdx: 0, dashT: 0, dashDir: 1, rider: null, lockOpen: false,
      events: [], cp: { x: L.start.x, y: L.start.y }, coyote: 0, buffer: 0, djumpUsed: false,
      face: 1, anim: 'idle', rising: false, prevJump: false, prevAttack: false, prevSwitch: false,
      weapons: weaponsOf(lo), weaponIndex: 0, weapon: null, weaponName: '', weaponColor: '',
      cooldown: 0, cooldownMax: 0, swing: null,
      shots: [], numbers: [], fx: [], boss: makeBoss(def, L, lo), bossDefeated: false, goalBlocked: false,
      bossTries: 0, assist: 1, vfx: [], dying: 0, score: 0, scoreKill: 0, scoreQuiz: 0,
      p: { x: 0, y: 0, w: C.PW, h: C.PH, vx: 0, vy: 0, onGround: false, drop: 0 },
      enemies: L.enemies.map((e) => {
        const kind = Enemies.get(e.kind);
        return Object.assign({}, e, {
          alive: true,
          hp: Damage.scale(kind.hp, power), maxHp: Damage.scale(kind.hp, power),
          damage: Damage.scale(kind.damage, power, ENEMY_DAMAGE_RATE),
          hurtT: 0, knock: 0, kx: 0, jumpCd: 0.6 + (e.id % 3) * 0.25,
          fireCd: 0.8 + (e.id % 4) * 0.2, warnT: 0, anim: 'idle', animT: 0,
        });
      }),
      bullets: [],
    };
    setWeapon(g, 0);
    place(g);
    return g;
  }

  function place(g) {
    const p = g.p;
    p.x = g.cp.x - p.w / 2; p.y = g.cp.y - p.h;
    p.vx = p.vy = 0; p.onGround = false; p.drop = 0;
    g.djumpUsed = false; g.coyote = 0; g.buffer = 0;
    g.shots = []; g.swing = null; g.goalBlocked = false; g.bullets = [];
  }

  function respawn(g) {
    place(g);
    g.invuln = Math.max(g.invuln, INVULN);
    g.events.push({ type: 'respawn' });
  }

  function number(g, target, amount, x, y) {
    g.numbers.push({ target, amount, x, y, life: 0.8, max: 0.8 });
  }

  // Kalah di arena: encounter diulang dari awal fase berjalan dan semua serangan dibersihkan.
  // Setelah beberapa kali kalah, damage ke hero berkurang sebagai bantuan ringan.
  function retryBoss(g) {
    const b = g.boss;
    g.bossTries++;
    g.assist = g.bossTries >= ASSIST_AFTER ? ASSIST_MUL : 1;
    g.enemies = g.enemies.filter((e) => !e.minion);
    g.cp = { x: g.L.start.x, y: g.L.start.y };
    BossMachine.reset(b);
    returnWeapon(g);
    g.fx = [];
    place(g);
    g.invuln = Math.max(g.invuln, INVULN);
    g.events.push({
      type: 'bossRetry', tries: g.bossTries, phase: b.schema.phases[b.phaseIndex].id,
      assist: g.assist < 1, hint: b.schema.hint,
    });
  }

  function hurt(g, why, amount) {
    if (g.invuln > 0 || g.phase !== 'play') return;
    if (g.boss && !g.boss.defeated && why === 'boss') {
      const evs = [];
      BossMachine.bark(g.boss, 'taunt', evs);
      for (const ev of evs) if (ev.type === 'bossBark') g.bark = { text: ev.text, t: 2.2 };
    }
    const base = amount === undefined ? 10 : amount;
    // Serangan boss ikut sebagian HP maksimal hero, supaya armor tidak meniadakan ancamannya.
    const bossMul = g.boss ? g.assist * (1 + BOSS_DAMAGE_SHARE * (g.maxHp / MAX_HP - 1)) : 1;
    const dmg = Math.max(1, Math.round(base * bossMul));
    g.hp = Math.max(0, g.hp - dmg);
    number(g, 'hero', dmg, g.p.x + g.p.w / 2, g.p.y);
    g.events.push({ type: 'hurt', why, amount: dmg });
    if (g.hp <= 0) {
      // Arka jatuh dulu, layar menggelap, baru bangkit lagi. Tidak langsung hidup.
      g.dying = DYING_T;
      g.swing = null;
      g.p.vx = 0;
      g.events.push({ type: 'heroDown' });
    } else if (why === 'jatuh') {
      respawn(g);
    } else {
      g.invuln = INVULN;
      g.p.vy = -160;
      g.p.vx = -g.face * 90;
    }
  }

  // Soal gerbang tampil sebagai balok angka di udara. Arka menyundul atau memukul jawabannya,
  // jadi menghitung terjadi di dalam permainan, tanpa jendela yang menghentikan langkah.
  // quiz: { teks, values: [angka...] }
  function setQuiz(g, quiz) {
    const L = g.L;
    const G = L.gateGroups[g.gateIdx];
    if (!G || g.gateOpen) return;
    // Di menara balok tergantung di bawah langit-langit, menjauh dari lubang ke arah tengah.
    let floorRow = G.row + 1;
    if (G.hatch) { let f = G.row + 1; while (f < L.rows && tileAt(L, G.col, f) === 0) f++; floorRow = f; }
    const side = G.hatch && G.col < L.cols / 2 ? 1 : -1;
    const n = quiz.values.length;
    g.quiz = {
      teks: quiz.teks, hint: '', wrong: 0,
      blocks: quiz.values.map((value, i) => {
        const c = side < 0 ? G.col - 3 - (n - 1 - i) * 3 : G.col + 5 + i * 3;
        let r = G.hatch ? G.row + 2 : floorRow - 3;
        while (r > 0 && tileAt(L, c, r) === 1) r--;
        return { value, index: i, x: c * T, y: r * T, w: T, h: T, dead: false, shake: 0 };
      }),
    };
  }

  function hitQuizBlock(g, box) {
    if (!g.quiz) return false;
    // Hanya pukulan senjata dekat yang memilih jawaban. Bila kena dua balok, yang terdekat dipilih.
    const cx = g.p.x + g.p.w / 2;
    let best = null;
    for (const b of g.quiz.blocks) {
      if (b.dead || !overlap(box, b)) continue;
      if (!best || Math.abs(b.x + 8 - cx) < Math.abs(best.x + 8 - cx)) best = b;
    }
    if (!best) return false;
    g.events.push({ type: 'quizHit', index: best.index, value: best.value });
    return true;
  }

  // Dipanggil main.js setelah memeriksa jawaban lewat bank soal. Salah tidak mengurangi HP.
  function answerQuiz(g, index, correct, hint) {
    if (!g.quiz) return;
    const b = g.quiz.blocks[index];
    if (correct) {
      g.fx.push({ kind: 'blast', x: b.x + 8, y: b.y + 8, radius: 22, life: 0.3, max: 0.3 });
      openGate(g);
      return;
    }
    b.dead = true;
    g.quiz.wrong++;
    g.quiz.hint = hint || 'Coba hitung sekali lagi.';
    // Semua pilihan salah sudah habis: hidupkan lagi supaya tidak pernah macet.
    if (g.quiz.blocks.filter((x) => !x.dead).length <= 1) g.quiz.blocks.forEach((x) => { x.dead = false; });
  }

  function openGate(g) {
    if (g.gateOpen) return;
    const L = g.L, G = L.gateGroups[g.gateIdx];
    if (!G) return;
    for (const cell of G.cells) L.tiles[cell.r * L.cols + cell.c] = 0;
    const opened = G.col;
    g.gateIdx++;
    const next = L.gateGroups[g.gateIdx];
    g.gateOpen = !next;
    g.gateAsked = false;
    L.gateCol = next ? next.col : L.gateCol;
    g.quiz = null;
    g.events.push({ type: 'gateOpen', c: opened });
  }

  // Skor dari soal: bisa berkurang karena salah, tetapi tidak di bawah nol.
  function addScore(g, n, field) {
    g.score = Math.max(0, g.score + n);
    if (field) g[field] = (g[field] || 0) + n;
    return g.score;
  }
  // Bonus waktu: 1000 saat sangat cepat, turun lurus sampai 100.
  function timeBonus(g) {
    const par = g.def.par || 150;
    return Math.round(100 + 900 * Math.max(0, 1 - g.t / par));
  }

  function teleport(g, c, r) {
    const p = g.p;
    p.x = c * T + (T - p.w) / 2;
    p.y = (r + 1) * T - p.h;
    p.vx = p.vy = 0; p.onGround = true;
  }

  function applyHit(g, target, amount, x, y, opts) {
    const dealt = Damage.hit(target, amount, opts);
    if (!dealt) return 0;
    number(g, opts && opts.target ? opts.target : 'enemy', dealt, x, y);
    g.vfx.push({ t: 'hit', x, y: y + 6 });
    g.events.push({ type: 'enemyHit' });
    return dealt;
  }

  // Tulang Bertameng menahan serangan dari depan. Serang dari belakang atau injak dari atas.
  function guarded(g, e, amount) {
    if (!Enemies.get(e.kind).guard) return amount;
    const front = ((g.p.x + g.p.w / 2) - (e.x + e.w / 2)) * e.dir > 0;
    if (!front) return amount;
    g.vfx.push({ t: 'bounce', x: e.x + e.w / 2 + e.dir * 8, y: e.y + 6 });
    return amount * 0.15;
  }

  function hitEnemies(g, box, amount, knockDir, knock) {
    for (const e of g.enemies) {
      if (!e.alive || e.dead || !overlap(box, e)) continue;
      const dealt = applyHit(g, e, guarded(g, e, amount), e.x + e.w / 2, e.y, { target: 'enemy' });
      if (!dealt) continue;
      if (e.hp <= 0) {
        enemyDown(g, e);
      } else {
        if (!Enemies.get(e.kind).boss) { e.knock = 0.18; e.kx = knockDir * knock; }
      }
    }
  }

  function enemyDown(g, e) {
    e.dead = true; e.alive = false;
    g.events.push({ type: 'enemyDown', x: e.x + e.w / 2, y: e.y });
    const killed = Enemies.get(e.kind);
    addScore(g, killed.boss ? 300 : Math.round(10 + killed.hp / 2), 'scoreKill');
    g.vfx.push({ t: 'die', kind: e.kind, x: e.x + e.w / 2, y: e.y + e.h, dir: e.dir, boss: !!Enemies.get(e.kind).boss });
    // Mini boss kalah: jalan terbuka dan hero pulih sebagian.
    if (Enemies.get(e.kind).boss) {
      Mech.unlock(g);
      const heal = Math.min(Math.round(g.maxHp * 0.3), g.maxHp - g.hp);
      if (heal > 0) { g.hp += heal; number(g, 'heal', heal, g.p.x + g.p.w / 2, g.p.y); }
      g.events.push({ type: 'miniDown', x: e.x, y: e.y });
    }
    // Anak buah boss menjatuhkan sedikit HP: pilihan antara memulihkan diri atau mengejar boss.
    if (e.minion && g.hp < g.maxHp) {
      const heal = Math.min(MINION_HEAL, g.maxHp - g.hp);
      g.hp += heal;
      number(g, 'heal', heal, g.p.x + g.p.w / 2, g.p.y);
    }
  }

  function hitBoss(g, box, amount, melee) {
    const b = g.boss;
    if (!b || b.defeated) return;
    // Benda arena dan bola sihir lebih dulu, baru badan boss.
    const props = BossMachine.hitProps(b, box, { melee });
    if (melee) for (const ev of BossMachine.reflect(b, box)) applyBossEvent(g, ev);
    for (const ev of props) applyBossEvent(g, ev);
    // Totem, telur, dan tiruan menahan pukulan. Lentera tidak.
    if (props.some((ev) => ev.type === 'bossPropBreak' || ev.type === 'bossClonePop')) return;
    if (!overlap(box, { x: b.x, y: b.y, w: b.w, h: b.h })) return;
    for (const ev of BossMachine.damage(b, amount, { box, melee })) applyBossEvent(g, ev);
  }

  // Goblin Merah mencuri senjata jauh. Kantongnya jatuh di arena dan bisa diambil lagi.
  function stealWeapon(g) {
    const b = g.boss;
    if (g.stolen || g.weapons.length < 2) return;
    g.stolen = g.weapons[1];
    g.weapons = [g.weapons[0]];
    setWeapon(g, 0);
    const a = arenaOf(g), left = g.p.x > (a.left + a.right) / 2;
    b.props.push({ kind: 'bag', x: left ? a.left + 30 : a.right - 46, y: a.groundY - 14, w: 16, h: 14 });
    g.events.push({ type: 'bossSteal', nama: Weapons.get(g.stolen).nama });
    b.barkT = 0;
    const evs = [];
    BossMachine.bark(b, 'taunt', evs);
    for (const ev of evs) applyBossEvent(g, ev);
  }
  function returnWeapon(g) {
    if (!g.stolen) return;
    g.weapons = [g.weapons[0], g.stolen];
    g.stolen = null;
    g.events.push({ type: 'bossReturn' });
  }

  function startAttack(g) {
    const w = Weapons.get(g.weapon);
    const lo = g.loadout || {};
    const mul = w.type === 'melee' ? (lo.meleeMul || 1) : (lo.rangedMul || 1);
    const dmg = Weapons.damageFor(w, g.power) * mul;
    g.cooldown = w.cooldown * (lo.cooldownMul || 1) * (w.type === 'ranged' ? (lo.rangedCooldownMul || 1) : 1);
    g.cooldownMax = g.cooldown;
    g.events.push({ type: 'attack', weapon: w.id, kind: w.type });
    if (w.type === 'melee') {
      const box = Weapons.meleeBox(g.p, g.face, w);
      g.swing = { t: 0, dur: w.active, box, face: g.face, color: w.color, weapon: w.id, both: !!w.both };
      hitEnemies(g, box, dmg, g.face, w.knockback);
      hitBoss(g, box, dmg, true);
      hitQuizBlock(g, box);
    } else {
      const proj = w.projectile || { w: 8, h: 5 };
      g.shots.push({
        x: g.face > 0 ? g.p.x + g.p.w : g.p.x - proj.w,
        y: g.p.y + g.p.h / 2 - proj.h / 2,
        w: proj.w, h: proj.h,
        vx: g.face * w.speed, vy: -(w.lift === undefined ? 12 : w.lift), gravity: w.gravity,
        life: w.life, damage: dmg, knock: w.knockback, color: w.color, weapon: w.id,
        bounce: w.bounce || 0, blast: w.blast || 0,
        pierce: !!w.pierce, boomerang: !!w.boomerang, speed: w.speed, hits: [], hitBoss: false, back: false, lifeMax: w.life,
      });
    }
  }

  // Ledakan Pelontar: satu kali damage ke semua yang ada di dalam radius.
  function explode(g, s) {
    const cx = s.x + s.w / 2, cy = s.y + s.h / 2, r = s.blast;
    const box = { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
    hitEnemies(g, box, s.damage, Math.sign(s.vx) || 1, s.knock);
    hitBoss(g, box, s.damage, false);
    g.vfx.push({ t: 'boom', x: cx, y: cy, r });
    g.events.push({ type: 'blast', x: cx, y: cy });
  }

  function updateShots(g, dt) {
    const L = g.L;
    const keep = [];
    for (const s of g.shots) {
      const prevX = s.x;
      s.x += s.vx * dt; s.y += s.vy * dt; s.vy += s.gravity * dt; s.life -= dt;
      let hit = false;
      // Bumerang: separuh jalan berbalik dan mengejar tangan Arka, menembus dinding saat pulang.
      if (s.boomerang) {
        if (!s.back && s.life < s.lifeMax / 2) { s.back = true; s.hits = []; s.hitBoss = false; s.life = 2.5; }
        if (s.back) {
          const dx = g.p.x + g.p.w / 2 - (s.x + s.w / 2), dy = g.p.y + g.p.h / 2 - (s.y + s.h / 2), d = Math.hypot(dx, dy) || 1;
          s.vx = dx / d * s.speed; s.vy = dy / d * s.speed;
          if (d < 10) continue;
        }
      }
      const c = Math.floor((s.x + s.w / 2) / T), r = Math.floor((s.y + s.h / 2) / T);
      if (tileAt(L, c, r) === 1 && s.boomerang) {
        if (!s.back) { s.back = true; s.x = prevX; s.hits = []; s.hitBoss = false; s.life = 2.5; }
      } else if (tileAt(L, c, r) === 1) {
        if (s.bounce > 0) {
          // Pantul di dinding: kembali ke posisi sebelum menabrak, lalu berbalik arah.
          s.bounce--; s.x = prevX; s.vx = -s.vx;
          g.vfx.push({ t: 'bounce', x: s.x + s.w / 2, y: s.y + s.h / 2 });
        } else hit = true;
      }
      if (!hit && s.blast) {
        // Bom meledak saat menyentuh musuh atau boss, damage dibagikan oleh explode().
        const b = g.boss;
        hit = g.enemies.some((e) => e.alive && !e.dead && overlap(s, e))
          || !!(b && !b.defeated && overlap(s, { x: b.x, y: b.y, w: b.w, h: b.h }));
      }
      if (hit && s.blast) { explode(g, s); continue; }
      if (!hit && s.pierce) {
        // Tembus: tiap musuh hanya kena sekali per lintasan, peluru terus terbang.
        for (const e of g.enemies) {
          if (!e.alive || e.dead || s.hits.includes(e.id) || !overlap(s, e)) continue;
          s.hits.push(e.id);
          const dealt = applyHit(g, e, guarded(g, e, s.damage), e.x + e.w / 2, e.y, { target: 'enemy' });
          if (!dealt) continue;
          e.knock = 0.16; e.kx = Math.sign(s.vx) * s.knock;
          if (e.hp <= 0) enemyDown(g, e);
        }
        const b = g.boss;
        if (b && !b.defeated && !s.hitBoss && overlap(s, { x: b.x, y: b.y, w: b.w, h: b.h })) {
          s.hitBoss = true;
          for (const ev of BossMachine.damage(b, s.damage, { box: s, melee: false })) applyBossEvent(g, ev);
        }
        if (s.life > 0 && s.y < L.rows * T + 40) keep.push(s);
        continue;
      }
      if (!hit) {
        for (const e of g.enemies) {
          if (!e.alive || e.dead || !overlap(s, e)) continue;
          const dealt = applyHit(g, e, guarded(g, e, s.damage), e.x + e.w / 2, e.y, { target: 'enemy' });
          if (!dealt) continue;
          e.knock = 0.16; e.kx = Math.sign(s.vx) * s.knock;
          if (e.hp <= 0) enemyDown(g, e);
          hit = true; break;
        }
      }
      if (!hit && g.boss && !g.boss.defeated) {
        const pr = BossMachine.hitProps(g.boss, s, { melee: false });
        if (pr.some((ev) => ev.type === 'bossClonePop')) { for (const ev of pr) applyBossEvent(g, ev); hit = true; }
      }
      if (!hit && g.boss && !g.boss.defeated) {
        const b = g.boss;
        if (overlap(s, { x: b.x, y: b.y, w: b.w, h: b.h })) {
          for (const ev of BossMachine.damage(b, s.damage, { box: s, melee: false })) applyBossEvent(g, ev);
          hit = true;
        }
      }
      if (!hit && s.life > 0 && s.y < L.rows * T + 40) keep.push(s);
    }
    g.shots = keep;
  }

  function applyBossEvent(g, e) {
    if (!e) return;
    if (e.type === 'bossDamage') {
      number(g, e.guarded ? 'guard' : e.weak ? 'weak' : 'boss', e.amount, e.x, e.y);
      if (e.guarded) g.events.push({ type: 'bossGuard' });
    } else if (e.type === 'bossPhase') {
      g.fx = [];
      g.enemies = g.enemies.filter((m) => !m.minion);
      g.events.push(e);
    } else if (e.type === 'bossDefeated') {
      g.bossDefeated = true;
      returnWeapon(g);
      addScore(g, 1000, 'scoreKill');
      g.invuln = Math.max(g.invuln, 5);
      g.vfx.push({ t: 'bossdie' });
      g.fx = [];
      g.enemies = g.enemies.filter((m) => !m.minion);
      g.events.push(e);
    } else if (e.type === 'bossSlam') {
      g.events.push({ type: 'bossSlam', x: e.x, y: e.y, radius: e.radius });
      g.fx.push({ kind: 'slam', x: e.x, y: e.y, radius: e.radius, life: 0.3, max: 0.3 });
      const p = g.p;
      const dx = Math.abs(p.x + p.w / 2 - e.x);
      // Hanya mengenai yang berdiri di lantai boss; platform di atas adalah tempat aman.
      if (p.onGround && Math.abs(p.y + p.h - e.y) <= 2 && dx <= e.radius) hurt(g, 'boss', e.damage);
    } else if (e.type === 'bossHazardImpact') {
      g.events.push(e);
      const box = { x: e.x - e.w / 2, y: e.y - 26, w: e.w, h: 26 };
      if (overlap(g.p, box)) hurt(g, 'boss', e.damage);
    } else if (e.type === 'bossSummon') {
      summon(g, e);
      g.events.push({ type: 'bossSummon' });
    } else if (e.type === 'bossTelegraph' || e.type === 'bossAttack' || e.type === 'bossRecovery'
      || e.type === 'bossCharge' || e.type === 'bossBurst' || e.type === 'bossShield' || e.type === 'bossLights'
      || e.type === 'bossBlocked') {
      g.events.push(e);
    } else if (e.type === 'bossStun') {
      g.events.push(e);
      g.vfx.push({ t: 'boom', x: e.x, y: e.y, r: 14 });
    } else if (e.type === 'bossBark') {
      g.bark = { text: e.text, t: 2.6 };
    } else if (e.type === 'bossReflect' || e.type === 'bossReflectHit') {
      g.events.push(e);
      g.vfx.push({ t: e.type === 'bossReflect' ? 'bounce' : 'boom', x: e.x, y: e.y, r: 22 });
    } else if (e.type === 'bossPropBreak' || e.type === 'bossClonePop' || e.type === 'bossBlink') {
      g.events.push(e);
      g.vfx.push({ t: 'boom', x: e.x, y: e.y, r: e.type === 'bossBlink' ? 12 : 16 });
    } else if (e.type === 'bossFlash') {
      g.events.push(e);
      g.vfx.push({ t: 'flash', x: e.x, y: e.y, r: e.radius });
    }
  }

  function summon(g, e) {
    const max = (g.boss.schema.fairness && g.boss.schema.fairness.maxSummons) || 0;
    const kind = Enemies.get(g.boss.schema.minion || 'walker');
    let alive = g.enemies.filter((m) => m.minion && m.alive && !m.dead).length;
    for (const x of e.spots) {
      if (alive >= max) break;
      g.enemies.push({
        type: 'e', kind: kind.id, awake: true, dir: e.dir, x, y: e.y - kind.h, w: kind.w, h: kind.h,
        vx: 0, vy: 0, onGround: false, dead: false, id: g.enemies.length, c: 0, r: 0,
        alive: true, minion: true, hp: e.hp, maxHp: e.hp, damage: e.damage,
        hurtT: 0, knock: 0, kx: 0, jumpCd: 0, fireCd: 0, warnT: 0, anim: 'walk', animT: 0,
      });
      alive++;
    }
  }

  function arenaOf(g) {
    const L = g.L;
    const groundY = L.bossSpawn ? L.bossSpawn.y : (L.rows - 1) * T;
    return { left: 0, right: L.cols * T, top: 0, groundY };
  }

  function updateFx(g, dt) {
    for (const f of g.fx) f.life -= dt;
    g.fx = g.fx.filter((f) => f.life > 0);
  }

  function updateBoss(g, dt) {
    updateFx(g, dt);
    const b = g.boss;
    if (!b || b.defeated) return;
    const minions = g.enemies.filter((m) => m.minion && m.alive && !m.dead).length;
    for (const e of BossMachine.update(b, dt, { player: g.p, arena: arenaOf(g), minions })) applyBossEvent(g, e);
    // Kontak badan selalu berbahaya; saat menyeruduk damage mengikuti data serangan.
    const charging = b.mode === 'attack' && b.current && b.current.def.kind === 'charge';
    const contact = charging ? b.current.def.damage : (b.schema.contactDamage || CONTACT_DAMAGE);
    if (g.bark) { g.bark.t -= dt; if (g.bark.t <= 0) g.bark = null; }
    const grabbing = charging && b.current.def.grab;
    if (overlap(g.p, { x: b.x, y: b.y, w: b.w, h: b.h })) {
      if (grabbing && !b.current.grabbed && g.invuln <= 0) { b.current.grabbed = true; stealWeapon(g); }
      // Boss yang tumbang tidak melukai; saatnya memukul dari dekat.
      if (!b.stunned) hurt(g, 'boss', contact);
    }
    for (const p of b.projectiles) {
      if (!p.reflected && overlap(g.p, p)) { hurt(g, 'boss', p.damage); p.life = 0; }
    }
    // Benda arena yang menyentuh hero.
    b.props = b.props.filter((o) => {
      if (!overlap(g.p, o)) return true;
      if (o.kind === 'egg' && !o.kicked && o.y < o.groundY) { hurt(g, 'boss', o.damage); return false; }
      if (o.kind === 'coin') { g.events.push({ type: 'star' }); addScore(g, 25, 'scoreKill'); return false; }
      if (o.kind === 'bag') { returnWeapon(g); return false; }
      if (o.kind === 'crown') {
        // Mahkota direbut: raja panik, celah serang bertambah.
        b.timer += 2.5; b.barkT = 0;
        g.bark = { text: 'MAHKOTAKU! Kembalikan!', t: 2.6 };
        g.events.push({ type: 'bossPropBreak', x: o.x, y: o.y });
        addScore(g, 100, 'scoreKill');
        return false;
      }
      return true;
    });
    for (const h of b.hazards) {
      if (overlap(g.p, h)) hurt(g, 'boss', h.damage);
    }
    for (const z of b.zones) {
      if (overlap(g.p, z)) hurt(g, 'boss', z.damage);
    }
  }

  function enemyFires(g, e) {
    const k = Enemies.get(e.kind);
    if (!k.bullet) return;
    const b = k.bullet;
    g.bullets.push({
      x: e.x + e.w / 2 + e.dir * (e.w / 2), y: e.y + e.h / 2 - b.h / 2,
      w: b.w, h: b.h, vx: e.dir * b.speed, vy: -(b.lob || 0), g: b.g || 0, home: b.home || 0, color: b.color, life: b.life, damage: e.damage,
    });
    g.events.push({ type: 'enemyShoot', x: e.x + e.w / 2, y: e.y + e.h / 2 });
  }

  function updateFlyer(g, e, k, dt) {
    const p = g.p;
    if (e.homeY === undefined) { e.homeY = e.y - k.hover; e.homeX = e.x; e.y = e.homeY; e.state = 'hover'; e.stateT = k.rest; }
    const hx = p.x + p.w / 2, hy = p.y + p.h / 2, cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    e.stateT = Math.max(0, e.stateT - dt);
    if (e.state === 'hover') {
      e.x += e.dir * k.speed * dt;
      if (Math.abs(e.x - e.homeX) > 48) e.dir = e.x < e.homeX ? 1 : -1;
      e.y = e.homeY + Math.sin(e.animT * 3) * 8;
      if (e.stateT <= 0 && Math.hypot(hx - cx, hy - cy) < k.sight) {
        e.state = 'wind'; e.stateT = k.wind; e.dir = hx < cx ? -1 : 1;
        g.events.push({ type: 'enemyWarn', x: e.x, y: e.y });
      }
    } else if (e.state === 'wind') {
      // Sasaran tukikan dikunci di sini, jadi ancang-ancang bisa dibaca dan dihindari.
      e.warnT = e.stateT;
      const d = Math.max(1, Math.hypot(hx - cx, hy - cy));
      e.diveX = (hx - cx) / d * k.dive; e.diveY = (hy - cy) / d * k.dive;
      if (e.stateT <= 0) { e.state = 'dive'; e.stateT = k.diveTime; e.warnT = 0; }
    } else if (e.state === 'dive') {
      e.x += e.diveX * dt; e.y += e.diveY * dt;
      if (e.stateT <= 0) { e.state = 'back'; }
    } else {
      // Kembali ke ketinggian semula; tidak menembus layar bawah.
      const dy = e.homeY - e.y;
      e.y += Math.sign(dy) * Math.min(Math.abs(dy), 60 * dt);
      e.homeX = e.x;
      if (Math.abs(dy) < 2) { e.state = 'hover'; e.stateT = k.rest; }
    }
    if (e.knock > 0) { e.knock = Math.max(0, e.knock - dt); e.x += e.kx * dt; }
  }

  // Kontak dengan hero: injak mengikuti aturan tiap jenis, selain itu hero terluka.
  function touchHero(g, e, k, dt) {
    if (g.phase !== 'play' || g.invuln > 0 || !overlap(g.p, e)) return;
    const fromAbove = g.p.vy > 0 && g.p.y + g.p.h - g.p.vy * dt <= e.y + 6;
    const can = k.stomp === 'kill' || k.stomp === 'hit' || (k.stomp === 'stun' && e.state === 'stun');
    if (fromAbove && can) {
      g.p.vy = -210;
      g.events.push({ type: 'stomp', x: e.x + e.w / 2, y: e.y });
      if (k.stomp === 'hit') {
        const dealt = applyHit(g, e, k.stompDamage || 20, e.x + e.w / 2, e.y, { target: 'enemy' });
        if (dealt && e.hp <= 0) enemyDown(g, e);
      } else {
        e.hp = 0;
        enemyDown(g, e);
      }
    } else {
      hurt(g, 'musuh', e.damage);
    }
  }

  function updateEnemies(g, dt) {
    const L = g.L, p = g.p;
    for (const e of g.enemies) {
      if (!e.alive || e.dead) continue;
      const k = Enemies.get(e.kind);
      // Musuh baru hidup saat hero mendekat, jadi tidak jatuh ke jurang sebelum bertemu.
      if (!e.minion && !e.awake) {
        if (Math.abs(e.x - p.x) > WAKE_RANGE) continue;
        e.awake = true;
      }
      if (e.hurtT > 0) e.hurtT = Math.max(0, e.hurtT - dt);
      e.animT += dt;
      let move = k.speed;

      if (k.behavior === 'jump') {
        // Pelompat: bergerak pelan dan melompat ke arah hero secara berkala.
        e.jumpCd = Math.max(0, e.jumpCd - dt);
        if (e.onGround && e.jumpCd <= 0) {
          const dx = (p.x + p.w / 2) - (e.x + e.w / 2);
          if (Math.abs(dx) <= k.hopRange * 3) e.dir = dx < 0 ? -1 : 1;
          e.vy = -k.jump; e.onGround = false; e.jumpCd = k.jumpEvery;
          g.events.push({ type: 'enemyJump', x: e.x + e.w / 2, y: e.y + e.h });
        }
      } else if (k.behavior === 'shoot') {
        // Penembak: berhenti, membidik, lalu menembak bila hero sejajar.
        const dx = (p.x + p.w / 2) - (e.x + e.w / 2);
        const dy = Math.abs((p.y + p.h / 2) - (e.y + e.h / 2));
        const inSight = Math.abs(dx) <= k.sight && dy <= 34;
        if (inSight) {
          e.dir = dx < 0 ? -1 : 1;
          move = 0;
          e.fireCd = Math.max(0, e.fireCd - dt);
          e.warnT = e.fireCd <= k.telegraph ? Math.max(0, e.fireCd) : 0;
          if (e.fireCd <= 0) {
            enemyFires(g, e); e.fireCd = k.fireEvery; e.warnT = 0;
          }
        } else {
          e.warnT = 0;
        }
      } else if (k.behavior === 'charge') {
        // Penyeruduk: melihat hero, ancang-ancang, menyeruduk, lalu pusing. Saat pusing bisa diinjak.
        const dx = (p.x + p.w / 2) - (e.x + e.w / 2);
        const dy = Math.abs((p.y + p.h) - (e.y + e.h));
        e.state = e.state || 'patrol';
        e.stateT = Math.max(0, (e.stateT || 0) - dt);
        if (e.state === 'patrol' && Math.abs(dx) <= k.sight && dy <= 24) {
          e.state = 'wind'; e.stateT = k.wind; e.dir = dx < 0 ? -1 : 1;
          g.events.push({ type: 'enemyWarn', x: e.x, y: e.y });
        } else if (e.state === 'wind') {
          move = 0; e.warnT = e.stateT;
          if (e.stateT <= 0) { e.state = 'dash'; e.stateT = k.dashTime; e.warnT = 0; }
        } else if (e.state === 'dash') {
          move = k.dash;
          if (e.stateT <= 0) { e.state = 'stun'; e.stateT = k.stun * 0.5; }
        } else if (e.state === 'stun') {
          move = 0; e.hurtT = 0.05;
          if (e.stateT <= 0) e.state = 'patrol';
        }
      } else if (k.behavior === 'guard') {
        // Berbalik menghadap hero berkala, jadi ada celah untuk menyerang dari belakang.
        e.turnT = (e.turnT || 0) - dt;
        if (e.turnT <= 0) { e.turnT = 1.8; e.dir = (p.x + p.w / 2) < (e.x + e.w / 2) ? -1 : 1; }
      } else if (k.behavior === 'chase') {
        const dx = (p.x + p.w / 2) - (e.x + e.w / 2);
        if (Math.abs(dx) <= k.sight && Math.abs(p.y - e.y) <= 60) {
          e.dir = dx < 0 ? -1 : 1;
          const front = Math.floor((e.dir > 0 ? e.x + e.w + 4 : e.x - 4) / T);
          const below = Math.floor((e.y + e.h + 1) / T);
          if (e.onGround && !tileAt(L, front, below)) { e.vy = -k.jump; e.onGround = false; }
        } else move = k.speed * 0.4;
      } else if (k.behavior === 'fly') {
        // Kelelawar: melayang naik turun tanpa gravitasi, sesekali menukik ke arah hero.
        updateFlyer(g, e, k, dt);
        e.anim = e.hurtT > 0 ? 'hurt' : e.warnT > 0 ? 'attack' : 'walk';
        touchHero(g, e, k, dt);
        continue;
      }

      if (e.knock > 0) {
        e.knock = Math.max(0, e.knock - dt);
        e.vx = e.kx;
      } else {
        e.vx = e.dir * move;
      }
      e.vy = Math.min(e.vy + C.GRAVITY * dt, C.MAXFALL);
      // Pejalan berbalik di tepi jurang. Terdorong serangan tetap bisa jatuh.
      if (e.onGround && !e.knock && k.behavior !== 'jump' && k.behavior !== 'chase') {
        const front = Math.floor((e.dir > 0 ? e.x + e.w + 1 : e.x - 1) / T);
        const below = Math.floor((e.y + e.h + 1) / T);
        if (!tileAt(L, front, below)) {
          if (e.state === 'dash') { e.state = 'stun'; e.stateT = k.stun; move = 0; }
          else e.dir *= -1;
          e.vx = e.dir * move;
        }
      }
      const r = stepBody(e, dt, L, []);
      if (r.hitWall && k.behavior === 'chase') {
        if (e.onGround) { e.vy = -k.jump; e.onGround = false; }
      } else if (r.hitWall) {
        if (e.state === 'dash') {
          e.state = 'stun'; e.stateT = k.stun;
          g.events.push({ type: 'enemyStun', x: e.x, y: e.y });
        }
        e.dir *= -1; e.knock = 0;
      }
      if (e.y > L.rows * T + FALL_PAD) { if (k.boss) enemyDown(g, e); else e.dead = true; }
      e.anim = e.hurtT > 0 ? 'hurt' : e.warnT > 0 ? 'attack' : e.knock > 0 ? 'hurt'
        : Math.abs(e.vx) > 1 ? 'walk' : 'idle';
      touchHero(g, e, k, dt);
    }
  }

  function updateBullets(g, dt) {
    const L = g.L;
    const keep = [];
    for (const b of g.bullets) {
      if (b.g) b.vy += b.g * dt;
      if (b.home) {
        // Bola dukun membelok pelan menuju hero.
        const dx = g.p.x + g.p.w / 2 - b.x, dy = g.p.y + g.p.h / 2 - b.y, d = Math.hypot(dx, dy) || 1;
        b.vx += (dx / d) * b.home * dt; b.vy += (dy / d) * b.home * dt;
      }
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0) continue;
      const c = Math.floor((b.x + b.w / 2) / T), r = Math.floor((b.y + b.h / 2) / T);
      if (tileAt(L, c, r) === 1) continue;
      if (g.invuln <= 0 && overlap(g.p, b)) { hurt(g, 'tembakan', b.damage); continue; }
      keep.push(b);
    }
    g.bullets = keep;
  }

  function updateNumbers(g, dt) {
    for (const n of g.numbers) { n.life -= dt; n.y -= 22 * dt; }
    g.numbers = g.numbers.filter((n) => n.life > 0);
  }

  // input: { left, right, up, down, jump, attack, switch } — jump/up adalah status tombol.
  // Atas = lompat. Bawah = turun menembus platform `=` dan jatuh lebih cepat.
  function update(g, dt, input) {
    if (g.phase !== 'play') return g;
    dt = Math.min(Math.max(dt || 0, 0), 1 / 30);
    if (dt <= 0) return g;
    if (g.dying > 0) {
      // Selama transisi semua berhenti, jadi hero tidak terkena apa pun lagi.
      g.dying -= dt;
      g.t += 0;
      updateNumbers(g, dt);
      if (g.dying <= 0) {
        g.dying = 0;
        g.hp = g.maxHp;
        g.deaths = (g.deaths || 0) + 1;
        if (g.boss && !g.boss.defeated) retryBoss(g);
        else respawn(g);
      }
      return g;
    }
    input = input || {};
    const p = g.p;
    g.t += dt;
    if (g.invuln > 0) g.invuln = Math.max(0, g.invuln - dt);
    if (p.drop > 0) p.drop = Math.max(0, p.drop - dt);
    if (g.cooldown > 0) g.cooldown = Math.max(0, g.cooldown - dt);
    if (g.swing) {
      g.swing.t += dt;
      if (g.swing.t >= g.swing.dur) g.swing = null;
    }

    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir) g.face = dir;
    p.vx = dir * C.MOVE * ((g.loadout && g.loadout.speedMul) || 1);

    // Coyote time dan buffer lompat supaya kontrol terasa adil di layar kecil.
    if (p.onGround) g.coyote = COYOTE_T; else g.coyote = Math.max(0, g.coyote - dt);
    if (g.buffer > 0) g.buffer = Math.max(0, g.buffer - dt);
    const jumpHeld = !!(input.jump || input.up);
    const pressed = jumpHeld && !g.prevJump;
    g.prevJump = jumpHeld;
    if (pressed) g.buffer = BUFFER_T;

    if (g.buffer > 0) {
      if (p.onGround || g.coyote > 0) {
        p.vy = C.JUMP; p.onGround = false; g.coyote = 0; g.buffer = 0; g.djumpUsed = false;
        g.rising = true;
        g.events.push({ type: 'jump' });
      } else if (!g.djumpUsed) {
        p.vy = C.DJUMP; g.djumpUsed = true; g.buffer = 0;
        g.rising = true;
        g.events.push({ type: 'djump' });
      }
    }

    // Tombol dilepas saat naik: lompatan terpotong. Pantulan per dan pelontar lebih kuat dari lompat, jadi tidak ikut.
    if (g.rising) {
      if (p.onGround || p.vy >= 0 || p.vy < C.JUMP - 1) g.rising = false;
      else if (!jumpHeld) { p.vy *= JUMP_CUT; g.rising = false; }
    }

    // Setelah masuk pintu, tombol bawah yang masih ditahan tidak menembus pijakan di ujung pintu.
    if (g.doorHold && !input.down) g.doorHold = false;
    if (input.down && !g.doorHold) {
      if (p.onGround) p.drop = DROP_T;
      else p.vy += C.GRAVITY * dt;
    }
    p.vy = Math.min(p.vy + C.GRAVITY * dt, C.MAXFALL);
    Mech.before(g, dt, hurt, input);
    const stepRes = stepBody(p, dt, g.L, g.L.movers);
    Mech.after(g, stepRes);
    if (p.onGround) { g.djumpUsed = false; p.drop = 0; }

    // Ganti senjata dan serang.
    if (input.switch && !g.prevSwitch) {
      setWeapon(g, (g.weaponIndex + 1) % g.weapons.length);
      g.events.push({ type: 'weapon', id: g.weapon, nama: g.weaponName });
    }
    g.prevSwitch = !!input.switch;
    const attackPressed = !!input.attack && !g.prevAttack;
    g.prevAttack = !!input.attack;
    if (attackPressed && g.cooldown <= 0) startAttack(g);
    updateShots(g, dt);

    // Animasi ringan untuk renderer.
    g.anim = !p.onGround ? 'jump' : dir ? 'run' : 'idle';

    // Bintang.
    for (const s of g.L.stars) {
      if (s.got || !overlap(p, s)) continue;
      s.got = true; g.stars++;
      g.events.push({ type: 'star', x: s.cx, y: s.cy, count: g.stars });
    }

    // Checkpoint: hanya maju, tidak pernah mundur.
    for (const c of g.L.checkpoints) {
      if (c.got || !overlap(p, c)) continue;
      c.got = true;
      if (g.def.tower ? c.cy < g.cp.y : c.cx > g.cp.x) g.cp = { x: c.cx, y: c.cy };
      g.events.push({ type: 'checkpoint', x: c.cx, y: c.cy });
    }

    // Duri dan jurang.
    for (const s of g.L.spikes) if (overlap(p, s)) { hurt(g, 'duri', 10); break; }
    if (p.y > g.L.rows * T + FALL_PAD) hurt(g, 'jatuh', 10);

    // Peti reward dan tujuan.
    for (const ch of g.L.chests) {
      if (ch.got || !overlap(p, ch)) continue;
      ch.got = true; g.chest = true;
      g.events.push({ type: 'reward', x: ch.x + ch.w / 2, y: ch.y });
    }
    if (g.L.goal && overlap(p, g.L.goal)) {
      if (g.boss && !g.boss.defeated) {
        if (!g.goalBlocked) { g.goalBlocked = true; g.events.push({ type: 'goalBlocked' }); }
      } else {
        g.phase = 'win';
        g.events.push({ type: 'win', stars: g.stars, chest: g.chest });
      }
    }

    // Gerbang: beri sinyal sekali saat hero mendekat dari kiri.
    const curGate = g.L.gateGroups[g.gateIdx];
    if (!g.gateOpen && curGate) {
      const gateX = curGate.col * T;
      const near = curGate.hatch
        ? p.y > curGate.row * T && p.y < (curGate.row + 8) * T
        : p.x + p.w >= gateX - QUIZ_RANGE && p.x < gateX;
      if (near && !g.gateAsked) { g.gateAsked = true; g.events.push({ type: 'gate', c: g.L.gateCol }); }
    }

    updateEnemies(g, dt);
    updateBullets(g, dt);
    updateBoss(g, dt);
    updateNumbers(g, dt);
    return g;
  }

  function takeEvents(g) {
    const out = g.events;
    g.events = [];
    return out;
  }

  // Terapkan loadout baru ke game yang sedang berjalan, mis. setelah ganti equipment.
  // HP dijaga proporsional agar pemain tidak diuntungkan/dirugikan saat max HP berubah.
  function applyLoadout(g, loadout) {
    const lo = Object.assign({}, LOADOUT_BASE, loadout || {});
    const maxHp = MAX_HP + Math.max(0, Math.round(lo.maxHp || 0));
    const ratio = g.maxHp > 0 ? g.hp / g.maxHp : 1;
    g.loadout = lo;
    g.maxHp = maxHp;
    g.weapons = weaponsOf(lo);
    setWeapon(g, g.weaponIndex);
    g.hp = Math.max(1, Math.min(maxHp, Math.round(maxHp * ratio)));
    return g;
  }

  return { addScore, timeBonus, parse, create, update, respawn, hurt, openGate, setQuiz, answerQuiz, teleport, applyLoadout, takeEvents, HEARTS, MAX_HP };
});
