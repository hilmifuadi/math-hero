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
      require('./combat/enemies.js')
    );
  } else {
    (root.MH4 = root.MH4 || {}).sim = factory(
      root.MH4.physics, root.MH4.damage, root.MH4.weapons, root.MH4.bossMachine,
      root.MH4.enemies
    );
  }
})(typeof self !== 'undefined' ? self : this, function (Physics, Damage, Weapons, BossMachine, Enemies) {
  const { C, T, tileAt, overlap, stepBody } = Physics;
  const HEARTS = 3, MAX_HP = HEARTS * 10, INVULN = 1.2, FALL_PAD = 160;
  const COYOTE_T = C.COYOTE, BUFFER_T = C.BUFFER;
  const DROP_T = 0.22;
  const WAKE_RANGE = 260;
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
        else if (ch === 'e' || ch === 'a' || ch === 'g') {
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
    L.gateCol = L.gates.length ? Math.min(...L.gates.map((g) => g.c)) : -1;
    return L;
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
      stars: 0, starTotal: L.stars.length, chest: false, gateOpen: false, gateAsked: false,
      events: [], cp: { x: L.start.x, y: L.start.y }, coyote: 0, buffer: 0, djumpUsed: false,
      face: 1, anim: 'idle', prevJump: false, prevAttack: false, prevSwitch: false,
      weapons: weaponsOf(lo), weaponIndex: 0, weapon: null, weaponName: '', weaponColor: '',
      cooldown: 0, swing: null,
      shots: [], numbers: [], fx: [], boss: makeBoss(def, L, lo), bossDefeated: false, goalBlocked: false,
      bossTries: 0, assist: 1,
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
    const base = amount === undefined ? 10 : amount;
    // Serangan boss ikut sebagian HP maksimal hero, supaya armor tidak meniadakan ancamannya.
    const bossMul = g.boss ? g.assist * (1 + BOSS_DAMAGE_SHARE * (g.maxHp / MAX_HP - 1)) : 1;
    const dmg = Math.max(1, Math.round(base * bossMul));
    g.hp = Math.max(0, g.hp - dmg);
    number(g, 'hero', dmg, g.p.x + g.p.w / 2, g.p.y);
    g.events.push({ type: 'hurt', why, amount: dmg });
    if (g.hp <= 0) {
      g.hp = g.maxHp;
      g.deaths = (g.deaths || 0) + 1;
      if (g.boss && !g.boss.defeated) retryBoss(g);
      else respawn(g);
    } else if (why === 'jatuh') {
      respawn(g);
    } else {
      g.invuln = INVULN;
      g.p.vy = -160;
      g.p.vx = -g.face * 90;
    }
  }

  function openGate(g) {
    if (g.gateOpen) return;
    const L = g.L;
    for (const cell of L.gates) L.tiles[cell.r * L.cols + cell.c] = 0;
    g.gateOpen = true;
    g.events.push({ type: 'gateOpen', c: L.gateCol });
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
    return dealt;
  }

  function hitEnemies(g, box, amount, knockDir, knock) {
    for (const e of g.enemies) {
      if (!e.alive || e.dead || !overlap(box, e)) continue;
      const dealt = applyHit(g, e, amount, e.x + e.w / 2, e.y, { target: 'enemy' });
      if (!dealt) continue;
      if (e.hp <= 0) {
        enemyDown(g, e);
      } else {
        e.knock = 0.18; e.kx = knockDir * knock;
      }
    }
  }

  function enemyDown(g, e) {
    e.dead = true; e.alive = false;
    g.events.push({ type: 'enemyDown', x: e.x + e.w / 2, y: e.y });
    // Anak buah boss menjatuhkan sedikit HP: pilihan antara memulihkan diri atau mengejar boss.
    if (e.minion && g.hp < g.maxHp) {
      const heal = Math.min(MINION_HEAL, g.maxHp - g.hp);
      g.hp += heal;
      number(g, 'heal', heal, g.p.x + g.p.w / 2, g.p.y);
    }
  }

  function hitBoss(g, box, amount) {
    const b = g.boss;
    if (!b || b.defeated) return;
    if (!overlap(box, { x: b.x, y: b.y, w: b.w, h: b.h })) return;
    for (const ev of BossMachine.damage(b, amount, { box })) applyBossEvent(g, ev);
  }

  function startAttack(g) {
    const w = Weapons.get(g.weapon);
    const lo = g.loadout || {};
    const mul = w.type === 'melee' ? (lo.meleeMul || 1) : (lo.rangedMul || 1);
    const dmg = Weapons.damageFor(w, g.power) * mul;
    g.cooldown = w.cooldown * (lo.cooldownMul || 1) * (w.type === 'ranged' ? (lo.rangedCooldownMul || 1) : 1);
    g.events.push({ type: 'attack', weapon: w.id, kind: w.type });
    if (w.type === 'melee') {
      const box = Weapons.meleeBox(g.p, g.face, w);
      g.swing = { t: 0, dur: w.active, box, face: g.face, color: w.color };
      hitEnemies(g, box, dmg, g.face, w.knockback);
      hitBoss(g, box, dmg);
    } else {
      const proj = w.projectile || { w: 8, h: 5 };
      g.shots.push({
        x: g.face > 0 ? g.p.x + g.p.w : g.p.x - proj.w,
        y: g.p.y + g.p.h / 2 - proj.h / 2,
        w: proj.w, h: proj.h,
        vx: g.face * w.speed, vy: -(w.lift === undefined ? 12 : w.lift), gravity: w.gravity,
        life: w.life, damage: dmg, knock: w.knockback, color: w.color,
        bounce: w.bounce || 0, blast: w.blast || 0,
      });
    }
  }

  // Ledakan Pelontar: satu kali damage ke semua yang ada di dalam radius.
  function explode(g, s) {
    const cx = s.x + s.w / 2, cy = s.y + s.h / 2, r = s.blast;
    const box = { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
    hitEnemies(g, box, s.damage, Math.sign(s.vx) || 1, s.knock);
    hitBoss(g, box, s.damage);
    g.fx.push({ kind: 'blast', x: cx, y: cy, radius: r, life: 0.25, max: 0.25 });
    g.events.push({ type: 'blast', x: cx, y: cy });
  }

  function updateShots(g, dt) {
    const L = g.L;
    const keep = [];
    for (const s of g.shots) {
      const prevX = s.x;
      s.x += s.vx * dt; s.y += s.vy * dt; s.vy += s.gravity * dt; s.life -= dt;
      let hit = false;
      const c = Math.floor((s.x + s.w / 2) / T), r = Math.floor((s.y + s.h / 2) / T);
      if (tileAt(L, c, r) === 1) {
        if (s.bounce > 0) {
          // Pantul di dinding: kembali ke posisi sebelum menabrak, lalu berbalik arah.
          s.bounce--; s.x = prevX; s.vx = -s.vx;
        } else hit = true;
      }
      if (!hit && s.blast) {
        // Bom meledak saat menyentuh musuh atau boss, damage dibagikan oleh explode().
        const b = g.boss;
        hit = g.enemies.some((e) => e.alive && !e.dead && overlap(s, e))
          || !!(b && !b.defeated && overlap(s, { x: b.x, y: b.y, w: b.w, h: b.h }));
      }
      if (hit && s.blast) { explode(g, s); continue; }
      if (!hit) {
        for (const e of g.enemies) {
          if (!e.alive || e.dead || !overlap(s, e)) continue;
          const dealt = applyHit(g, e, s.damage, e.x + e.w / 2, e.y, { target: 'enemy' });
          if (!dealt) continue;
          e.knock = 0.16; e.kx = Math.sign(s.vx) * s.knock;
          if (e.hp <= 0) enemyDown(g, e);
          hit = true; break;
        }
      }
      if (!hit && g.boss && !g.boss.defeated) {
        const b = g.boss;
        if (overlap(s, { x: b.x, y: b.y, w: b.w, h: b.h })) {
          for (const ev of BossMachine.damage(b, s.damage, { box: s })) applyBossEvent(g, ev);
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
      || e.type === 'bossCharge' || e.type === 'bossStun' || e.type === 'bossBurst') {
      g.events.push(e);
    }
  }

  function summon(g, e) {
    const max = (g.boss.schema.fairness && g.boss.schema.fairness.maxSummons) || 0;
    const kind = Enemies.get('walker');
    let alive = g.enemies.filter((m) => m.minion && m.alive && !m.dead).length;
    for (const x of e.spots) {
      if (alive >= max) break;
      g.enemies.push({
        type: 'e', kind: kind.id, dir: e.dir, x, y: e.y - kind.h, w: kind.w, h: kind.h,
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
    if (overlap(g.p, { x: b.x, y: b.y, w: b.w, h: b.h })) hurt(g, 'boss', contact);
    for (const p of b.projectiles) {
      if (overlap(g.p, p)) { hurt(g, 'boss', p.damage); p.life = 0; }
    }
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
      w: b.w, h: b.h, vx: e.dir * b.speed, vy: 0, life: b.life, damage: e.damage,
    });
    g.events.push({ type: 'enemyShoot', x: e.x + e.w / 2, y: e.y + e.h / 2 });
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
      }

      if (e.knock > 0) {
        e.knock = Math.max(0, e.knock - dt);
        e.vx = e.kx;
      } else {
        e.vx = e.dir * move;
      }
      e.vy = Math.min(e.vy + C.GRAVITY * dt, C.MAXFALL);
      // Pejalan berbalik di tepi jurang. Terdorong serangan tetap bisa jatuh.
      if (e.onGround && !e.knock && k.behavior !== 'jump') {
        const front = Math.floor((e.dir > 0 ? e.x + e.w + 1 : e.x - 1) / T);
        const below = Math.floor((e.y + e.h + 1) / T);
        if (!tileAt(L, front, below)) { e.dir *= -1; e.vx = e.dir * move; }
      }
      const r = stepBody(e, dt, L, []);
      if (r.hitWall) { e.dir *= -1; e.knock = 0; }
      if (e.y > L.rows * T + FALL_PAD) e.dead = true;
      e.anim = e.hurtT > 0 ? 'hurt' : e.warnT > 0 ? 'attack' : e.knock > 0 ? 'hurt'
        : Math.abs(e.vx) > 1 ? 'walk' : 'idle';

      if (g.phase !== 'play' || g.invuln > 0) continue;
      if (overlap(g.p, e)) {
        const stomp = g.p.vy > 0 && g.p.y + g.p.h - g.p.vy * dt <= e.y + 6;
        if (stomp) {
          e.hp = 0;
          enemyDown(g, e);
          g.p.vy = -210;
          g.events.push({ type: 'stomp', x: e.x + e.w / 2, y: e.y });
        } else {
          hurt(g, 'musuh', e.damage);
        }
      }
    }
  }

  function updateBullets(g, dt) {
    const L = g.L;
    const keep = [];
    for (const b of g.bullets) {
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
        g.events.push({ type: 'jump' });
      } else if (!g.djumpUsed) {
        p.vy = C.DJUMP; g.djumpUsed = true; g.buffer = 0;
        g.events.push({ type: 'djump' });
      }
    }

    if (input.down) {
      if (p.onGround) p.drop = DROP_T;
      else p.vy += C.GRAVITY * dt;
    }
    p.vy = Math.min(p.vy + C.GRAVITY * dt, C.MAXFALL);
    stepBody(p, dt, g.L, []);
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
      if (c.cx > g.cp.x) g.cp = { x: c.cx, y: c.cy };
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
    if (!g.gateOpen && g.L.gateCol >= 0) {
      const gateX = g.L.gateCol * T;
      const near = p.x + p.w >= gateX - 22 && p.x < gateX;
      if (near && !g.gateAsked) { g.gateAsked = true; g.events.push({ type: 'gate', c: g.L.gateCol }); }
      if (!near && p.x + p.w < gateX - 40) g.gateAsked = false;
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

  return { parse, create, update, respawn, hurt, openGate, teleport, applyLoadout, takeEvents, HEARTS, MAX_HP };
});
