// Math Hero 4: BossMachine murni. Tidak menyentuh canvas/DOM/Math.random.
// Data (BossSchema) memilih serangan; primitif di file ini yang menjalankan
// telegraph -> attack -> recovery, fase, proyektil, hazard, zona lantai, dan summon.
// Sasaran serangan dikunci saat telegraph (`current.plan`), jadi tanda yang digambar
// renderer selalu sama dengan hitbox yang benar-benar aktif.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).bossMachine = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  const GUARD_MUL = 0.25, OPEN_MUL = 1.6, WEAK_MUL = 2, IDLE_GAP = 1.3;

  function rng(seed) {
    let a = (seed >>> 0) || 1;
    const f = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    return f;
  }

  function create(schema, opts) {
    opts = opts || {};
    const body = schema.body || { w: 60, h: 76 };
    const x = opts.x === undefined ? 0 : opts.x, y = opts.y === undefined ? 0 : opts.y;
    return {
      schema, rng: opts.rng || rng(opts.seed || 1),
      t: 0, hp: schema.maxHp, maxHp: schema.maxHp,
      phaseIndex: 0, mode: 'idle', timer: opts.intro === undefined ? 1.0 : opts.intro,
      current: null, lastAttack: null, vulnerable: false, invuln: 0, stunned: false,
      x, y, spawnX: x, spawnY: y,
      w: body.w, h: body.h, facing: opts.facing || -1,
      projectiles: [], hazards: [], zones: [], attackCount: 0, defeated: false,
      props: [], clones: [], shield: false, dark: false, airborne: false, hop: null, fly: null, barkT: 0,
    };
  }

  function phaseOf(state) {
    return state.schema.phases[Math.min(state.phaseIndex, state.schema.phases.length - 1)];
  }

  function weightedPick(state, pool) {
    let total = 0;
    for (const e of pool) total += e.weight;
    let r = state.rng() * total;
    for (const e of pool) { r -= e.weight; if (r <= 0) return e.id; }
    return pool[pool.length - 1].id;
  }

  function pickAttack(state, ctx) {
    let pool = phaseOf(state).pool;
    // Summon tidak dipilih bila minion masih penuh, supaya layar tidak sesak.
    const room = ctx && ctx.minions !== undefined
      ? ctx.minions < ((state.schema.fairness && state.schema.fairness.maxSummons) || 0) : true;
    if (!room) {
      const rest = pool.filter((e) => state.schema.attacks[e.id].kind !== 'summon');
      if (rest.length) pool = rest;
    }
    // Mekanik yang masih berjalan tidak dipanggil ulang.
    const running = (e) => {
      const k = state.schema.attacks[e.id].kind;
      return (k === 'shield' && state.shield) || (k === 'split' && state.clones.length) || (k === 'lights' && state.dark);
    };
    if (pool.some(running)) {
      const rest = pool.filter((e) => !running(e));
      if (rest.length) pool = rest;
    }
    let id = weightedPick(state, pool);
    // Hindari dua serangan identik berurutan bila masih ada pilihan lain.
    if (id === state.lastAttack && pool.length > 1) id = weightedPick(state, pool);
    return id;
  }

  // Kunci sasaran serangan. Dipanggil saat telegraph, atau saat attack bila plan belum ada.
  function planAttack(state, def, ctx) {
    const player = (ctx && ctx.player) || { x: state.x, y: state.y, w: 1, h: 1 };
    const arena = (ctx && ctx.arena) || state.arena || { left: 0, right: 640, top: 0, groundY: 400 };
    const px = player.x + player.w / 2;
    const cx = state.x + state.w / 2;
    const plan = { dir: px >= cx ? 1 : -1 };
    if (def.kind === 'falling_hazard') {
      const n = def.count || 1;
      plan.targets = [];
      for (let i = 0; i < n; i++) {
        const hx = px + (i - (n - 1) / 2) * (def.spreadX || 50);
        plan.targets.push(Math.max(arena.left + 10, Math.min(arena.right - 28, hx - 9)));
      }
      plan.groundY = arena.groundY;
    } else if (def.kind === 'charge') {
      const hi = arena.right - state.w;
      const far = plan.dir > 0 ? hi : arena.left;
      const range = def.toWall ? Infinity : (def.range || 180);
      plan.targetX = plan.dir > 0 ? Math.min(far, state.x + range) : Math.max(far, state.x - range);
      plan.hitsWall = !!def.toWall;
    } else if (def.kind === 'floor_burst') {
      const n = def.count || 2, w = def.zoneW || 40, gap = def.gap || 72, h = def.zoneH || 44;
      plan.zones = [];
      for (let i = 0; i < n; i++) {
        const zx = px - w / 2 + (i - (n - 1) / 2) * (w + gap);
        const x = Math.max(arena.left, Math.min(arena.right - w, zx));
        plan.zones.push({ x, y: arena.groundY - h, w, h, damage: def.damage });
      }
    } else if (def.kind === 'hop') {
      plan.targetX = Math.max(arena.left, Math.min(arena.right - state.w, px - state.w / 2));
    } else if (def.kind === 'teleport') {
      // Pindah ke titik yang paling jauh dari hero.
      const list = state.schema.anchors || [{ x: arena.left + 20 }, { x: arena.right - state.w - 20 }];
      let best = list[0], bestD = -1;
      for (const a of list) {
        const d = Math.abs(a.x + state.w / 2 - px) + (a.x === state.x ? -1000 : 0);
        if (d > bestD) { bestD = d; best = a; }
      }
      plan.to = { x: best.x, y: best.y === undefined ? arena.groundY - state.h : best.y };
    } else if (def.kind === 'shield' || def.kind === 'lights') {
      const n = def.totems || def.lanterns || 2;
      plan.spots = [];
      for (let i = 0; i < n; i++) plan.spots.push(Math.round(arena.left + 40 + (i + 0.5) * ((arena.right - arena.left - 80) / n)));
      plan.groundY = arena.groundY;
    } else if (def.kind === 'summon') {
      const n = def.count || 1;
      plan.spots = [];
      for (let i = 0; i < n; i++) {
        const side = i % 2 === 0 ? plan.dir : -plan.dir;
        const off = side * (state.w / 2 + 34 + i * 18);
        plan.spots.push(Math.max(arena.left + 8, Math.min(arena.right - 22, cx + off)));
      }
      plan.groundY = arena.groundY;
    }
    return plan;
  }

  function startTelegraph(state, ctx) {
    const id = pickAttack(state, ctx);
    const def = state.schema.attacks[id];
    const plan = planAttack(state, def, ctx);
    state.current = { id, def, plan };
    state.lastAttack = id;
    state.mode = 'telegraph';
    state.timer = def.telegraph;
    state.facing = plan.dir;
    state.attackCount++;
    state.vulnerable = false;
    state.stunned = false;
    const barkEv = [];
    bark(state, 'attack', barkEv, id);
    return barkEv.concat([{
      type: 'bossTelegraph', attack: id, kind: def.kind,
      duration: def.telegraph, x: state.x + state.w / 2, y: state.y + state.h / 2,
      w: state.w, h: state.h, damage: def.damage,
    }]);
  }

  // Celetukan boss: satu kalimat pendek dengan jeda, supaya tidak ramai.
  function bark(state, key, events, sub) {
    const b = state.schema.barks;
    if (!b || state.barkT > 0) return;
    const list = sub ? (b[key] && b[key][sub]) : b[key];
    if (!list || !list.length) return;
    state.barkT = 3;
    events.push({ type: 'bossBark', text: list[Math.floor(state.rng() * list.length)] });
  }

  // Boss tumbang di tanah: celah serang panjang yang bisa dijangkau senjata dekat.
  function stagger(state, duration, events) {
    state.mode = 'recovery';
    state.timer = duration;
    state.vulnerable = true;
    state.stunned = true;
    state.airborne = false;
    state.hop = null; state.fly = null;
    if (state.arena) state.y = state.arena.groundY - state.h;
    else state.y = state.spawnY;
    state.current = null;
    events.push({ type: 'bossStun', x: state.x + state.w / 2, y: state.y + state.h / 2, duration });
    state.barkT = 0;
    bark(state, 'stun', events);
  }

  function spawnAttack(state, ctx) {
    const def = state.current.def;
    const id = state.current.id;
    if (!state.current.plan) state.current.plan = planAttack(state, def, ctx);
    const plan = state.current.plan;
    const events = [{
      type: 'bossAttack', attack: id, kind: def.kind,
      x: state.x + state.w / 2, y: state.y + state.h / 2, damage: def.damage,
    }];
    const player = (ctx && ctx.player) || { x: state.x, y: state.y, w: 1, h: 1 };
    const px = player.x + player.w / 2, py = player.y + player.h / 2;
    const cx = state.x + state.w / 2, cy = state.y + state.h / 2;
    state.mode = 'attack';
    state.timer = def.active;
    state.facing = plan.dir;
    if (def.kind === 'slam') {
      events.push({
        type: 'bossSlam', x: cx, y: state.y + state.h, radius: def.radius || 90, damage: def.damage,
      });
    } else if (def.kind === 'projectile_fan') {
      const angle = Math.atan2(py - cy, px - cx);
      const n = def.count || 1;
      for (let i = 0; i < n; i++) {
        const a = angle + (i - (n - 1) / 2) * (def.spread || 0);
        state.projectiles.push({
          x: cx - 4, y: cy - 3, w: 8, h: 8,
          vx: Math.cos(a) * def.speed, vy: Math.sin(a) * def.speed,
          gravity: def.gravity || 0, life: def.life || 2,
          damage: def.damage, kind: 'bossShot',
          reflectable: !!def.reflect, home: def.home || 0, color: def.color, stun: def.stun || 3,
        });
      }
      events.push({ type: 'bossFan', x: cx, y: cy, count: n });
    } else if (def.kind === 'falling_hazard') {
      const arena = (ctx && ctx.arena) || { left: 0, right: 640, top: 0, groundY: 400 };
      for (const x of plan.targets) {
        state.hazards.push({
          x, y: arena.top + 6, w: 18, h: 18, vy: def.fallSpeed || 200,
          damage: def.damage, targetY: arena.groundY - 18, kind: 'rock',
        });
        events.push({ type: 'bossHazardSpawn', x: x + 9, y: arena.top + 6, targetY: arena.groundY, damage: def.damage });
      }
    } else if (def.kind === 'charge') {
      // Durasi serang mengikuti jarak sebenarnya, jadi berhenti tepat di ujung garis peringatan.
      state.timer = Math.max(0.05, Math.abs(plan.targetX - state.x) / (def.speed || 180));
      events.push({ type: 'bossCharge', x: cx, y: cy, facing: plan.dir, damage: def.damage });
    } else if (def.kind === 'ground_wave') {
      const arena = (ctx && ctx.arena) || { left: 0, right: 640, top: 0, groundY: 400 };
      const h = def.height || 10;
      state.projectiles.push({
        x: cx - 7, y: arena.groundY - h, w: 14, h,
        vx: plan.dir * (def.speed || 130), vy: 0, gravity: 0,
        life: def.life || 2.4, damage: def.damage, kind: 'wave',
      });
      events.push({ type: 'bossWave', x: cx, y: arena.groundY, facing: plan.dir, damage: def.damage });
    } else if (def.kind === 'floor_burst') {
      state.zones = plan.zones.map((z) => Object.assign({}, z));
      events.push({ type: 'bossBurst', count: state.zones.length, damage: def.damage });
    } else if (def.kind === 'hop') {
      state.hop = { left: (def.count || 1) - 1, t: 0, dur: def.hopTime || 0.8, x0: state.x, x1: plan.targetX, rest: 0 };
      state.airborne = true;
      state.timer = 99;
    } else if (def.kind === 'teleport') {
      events.push({ type: 'bossBlink', x: cx, y: cy });
      state.x = plan.to.x; state.y = plan.to.y;
      events.push({ type: 'bossBlink', x: state.x + state.w / 2, y: state.y + state.h / 2 });
    } else if (def.kind === 'shield') {
      state.shield = true;
      state.shieldStun = def.stun || 3;
      state.props = state.props.filter((p) => p.kind !== 'totem');
      for (const x of plan.spots) state.props.push({ kind: 'totem', x: x - 7, y: plan.groundY - 22, w: 14, h: 22, meleeOnly: true });
      events.push({ type: 'bossShield' });
    } else if (def.kind === 'flight') {
      state.fly = { t: 0, dur: def.duration || 4, egg: 0.5, every: def.eggEvery || 0.9, hits: 0, need: def.shotsToDrop || 4, stun: def.stun || 3, damage: def.damage, x0: state.x };
      state.airborne = true;
      state.timer = 99;
    } else if (def.kind === 'split') {
      const arena = state.arena || { left: 0, right: 432, groundY: 160 };
      const n = def.fakes || 2, slots = [];
      for (let i = 0; i <= n; i++) slots.push(Math.round(arena.left + 30 + (i + 0.5) * ((arena.right - arena.left - 60 - state.w) / (n + 1))));
      // Kocok tempat, lalu yang asli mengambil salah satu.
      for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(state.rng() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
      state.x = slots[0];
      state.clones = slots.slice(1).map((x) => ({ x, y: arena.groundY - state.h, w: state.w, h: state.h, dir: state.rng() < 0.5 ? -1 : 1, t: state.rng() * 3 }));
      state.splitStun = def.stun || 3;
      events.push({ type: 'bossBlink', x: cx, y: cy });
    } else if (def.kind === 'lights') {
      state.dark = true;
      state.lightStun = def.stun || 3;
      state.lightRadius = def.radius || 90;
      state.props = state.props.filter((p) => p.kind !== 'lantern');
      for (const x of plan.spots) state.props.push({ kind: 'lantern', x: x - 6, y: plan.groundY - 26, w: 12, h: 26, lit: 0, meleeOnly: true });
      events.push({ type: 'bossLights' });
    } else if (def.kind === 'summon') {
      events.push({
        type: 'bossSummon', spots: plan.spots, y: plan.groundY, dir: plan.dir,
        hp: def.minionHp || 12, damage: def.damage,
      });
    }
    return events;
  }

  function updateProjectiles(state, dt, ctx, events) {
    const arena = state.arena || { left: -1e9, right: 1e9, top: -1e9, groundY: 1e9 };
    const bx = state.x + state.w / 2, by = state.y + state.h / 2;
    for (const p of state.projectiles) {
      if (p.reflected) {
        // Bola yang dipukul balik selalu kembali ke pemiliknya.
        const dx = bx - p.x, dy = by - p.y, d = Math.hypot(dx, dy) || 1;
        p.vx = (dx / d) * 300; p.vy = (dy / d) * 300; p.gravity = 0; p.life = Math.max(p.life, 1);
        if (overlaps(p, state) && !state.defeated) {
          p.life = 0;
          state.shield = false;
          state.props = state.props.filter((q) => q.kind !== 'totem');
          state.hp = Math.max(1, state.hp - (state.schema.reflectDamage || 40));
          events.push({ type: 'bossDamage', amount: state.schema.reflectDamage || 40, x: bx, y: by, vulnerable: true, weak: true, guarded: false });
          events.push({ type: 'bossReflectHit', x: bx, y: by });
          stagger(state, p.stun, events);
        }
      } else if (p.home && ctx && ctx.player) {
        const dx = ctx.player.x + ctx.player.w / 2 - p.x, dy = ctx.player.y + ctx.player.h / 2 - p.y, d = Math.hypot(dx, dy) || 1;
        p.vx += (dx / d) * p.home * dt; p.vy += (dy / d) * p.home * dt;
        const sp = Math.hypot(p.vx, p.vy), max = 95;
        if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }
      }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.gravity * dt; p.life -= dt;
    }
    state.projectiles = state.projectiles.filter((p) => p.life > 0 &&
      p.x > arena.left - 32 && p.x < arena.right + 32 && p.y < arena.groundY + 40);
  }

  function updateHazards(state, dt, events) {
    const arena = state.arena || { groundY: 1e9 };
    const keep = [];
    for (const h of state.hazards) {
      h.y += h.vy * dt;
      if (h.y + h.h >= (h.targetY === undefined ? arena.groundY : h.targetY)) {
        events.push({ type: 'bossHazardImpact', x: h.x + h.w / 2, y: h.targetY || arena.groundY, w: h.w, h: h.h, damage: h.damage });
      } else keep.push(h);
    }
    state.hazards = keep;
  }

  function startRecovery(state, events) {
    const ph = phaseOf(state);
    const def = state.current.def;
    const grabbed = state.current.grabbed;
    const hitWall = !grabbed && def.kind === 'charge' && state.current.plan && state.current.plan.hitsWall;
    state.mode = 'recovery';
    state.timer = (hitWall && def.wallStun ? def.wallStun : (def.recovery || 0.8)) * (ph.recoveryMul || 1);
    state.vulnerable = !grabbed && def.opens !== false;
    state.stunned = !!hitWall || !!(def.tired && state.vulnerable);
    state.zones = [];
    if (hitWall && (def.coins || def.crown)) {
      const ax = state.x + state.w / 2, ay = state.y + state.h;
      for (let i = 0; i < (def.coins || 0); i++) {
        state.props.push({ kind: 'coin', x: ax - 4 + (i - def.coins / 2) * 14, y: ay - 40, w: 8, h: 8, vy: -60 - i * 8, groundY: ay - 8, life: 8 });
      }
      if (def.crown) state.props.push({ kind: 'crown', x: ax - 8 - state.facing * 34, y: ay - 16, w: 16, h: 16, life: state.timer });
    }
    if (state.stunned) { state.barkT = 0; bark(state, 'stun', events); }
    if (hitWall) events.push({ type: 'bossStun', x: state.x + state.w / 2, y: state.y + state.h / 2, duration: state.timer });
    events.push({ type: 'bossRecovery', attack: state.current.id, duration: state.timer, open: state.vulnerable });
  }

  function update(state, dt, ctx) {
    ctx = ctx || {};
    const events = [];
    dt = Math.min(Math.max(dt || 0, 0), 1 / 30);
    if (dt <= 0 || state.defeated) return events;
    state.t += dt;
    if (state.invuln > 0) state.invuln = Math.max(0, state.invuln - dt);
    if (state.barkT > 0) state.barkT -= dt;
    if (ctx.player) state.lastPlayerX = ctx.player.x + (ctx.player.w || 0) / 2;
    if (ctx.arena) state.arena = ctx.arena;

    if (state.mode === 'idle') {
      // Boss berjalan menurut wataknya di sela serangan, jadi selalu tampak hidup.
      const roam = phaseOf(state).roam || state.schema.roam;
      if (roam && ctx.player && !state.introDone) { state.introDone = true; bark(state, 'intro', events); }
      if (roam && ctx.player && state.arena) {
        const px = ctx.player.x + ctx.player.w / 2, cx = state.x + state.w / 2;
        let dir = 0;
        if (roam.mode === 'chase') dir = Math.abs(px - cx) > 24 ? Math.sign(px - cx) : 0;
        else if (roam.mode === 'avoid') dir = Math.abs(px - cx) < 150 ? -Math.sign(px - cx || 1) : 0;
        else { state.paceDir = state.paceDir || 1; dir = state.paceDir; }
        const next = state.x + dir * roam.speed * dt;
        const lo = state.arena.left + 4, hi = state.arena.right - state.w - 4;
        if (next < lo || next > hi) state.paceDir = -(state.paceDir || 1);
        else if (state.y >= state.arena.groundY - state.h - 1) state.x = next;
        if (dir) state.facing = roam.mode === 'avoid' ? Math.sign(px - cx || 1) : dir;
      }
      state.timer -= dt;
      if (state.timer <= 0) events.push(...startTelegraph(state, ctx));
    } else if (state.mode === 'telegraph') {
      state.timer -= dt;
      if (state.timer <= 0) events.push(...spawnAttack(state, ctx));
    } else if (state.mode === 'attack') {
      const def = state.current.def;
      if (def.kind === 'charge') {
        const plan = state.current.plan;
        const next = state.x + plan.dir * (def.speed || 180) * dt;
        state.x = plan.dir > 0 ? Math.min(plan.targetX, next) : Math.max(plan.targetX, next);
      } else if (def.kind === 'hop' && state.hop) {
        const h = state.hop, ground = (state.arena ? state.arena.groundY : state.spawnY + state.h) - state.h;
        if (h.rest > 0) {
          h.rest -= dt;
          if (h.rest <= 0) {
            const px = ctx.player ? ctx.player.x + ctx.player.w / 2 : state.x;
            const a = state.arena || { left: 0, right: 640 };
            h.x0 = state.x; h.x1 = Math.max(a.left, Math.min(a.right - state.w, px - state.w / 2)); h.t = 0; state.airborne = true;
            state.facing = h.x1 >= h.x0 ? 1 : -1;
          }
        } else {
          h.t += dt;
          const u = Math.min(1, h.t / h.dur);
          state.x = h.x0 + (h.x1 - h.x0) * u;
          state.y = ground - Math.sin(u * Math.PI) * (def.height || 56);
          if (u >= 1) {
            state.y = ground; state.airborne = false;
            events.push({ type: 'bossSlam', x: state.x + state.w / 2, y: ground + state.h, radius: def.radius || 56, damage: def.damage });
            if (h.left > 0) { h.left--; h.rest = def.rest || 0.7; } else { state.hop = null; state.timer = 0; }
          }
        }
      } else if (def.kind === 'flight' && state.fly) {
        const f = state.fly, a = state.arena || { left: 0, right: 432, groundY: 160 };
        f.t += dt;
        const up = 26, ground = a.groundY - state.h;
        const rise = Math.min(1, f.t / 0.5), fall = Math.min(1, Math.max(0, f.t - f.dur) / 0.5);
        state.y = ground + (up - ground) * rise * (1 - fall);
        if (rise >= 1 && fall <= 0) {
          const mid = (a.left + a.right - state.w) / 2, span = (a.right - a.left - state.w) / 2 - 16;
          const nx = mid + Math.sin((f.t - 0.5) * 1.3 + 1.5 * (f.x0 > mid ? 1 : -1)) * span;
          state.facing = nx >= state.x ? 1 : -1;
          state.x = nx;
          f.egg -= dt;
          if (f.egg <= 0) {
            f.egg = f.every;
            state.props.push({ kind: 'egg', x: state.x + state.w / 2 - 6, y: state.y + state.h - 6, w: 12, h: 14, vy: 40, damage: f.damage, groundY: a.groundY - 14, hatch: 4.5 });
          }
        }
        if (f.t >= f.dur + 0.5) { state.fly = null; state.airborne = false; state.y = ground; state.timer = 0; }
      }
      if (!state.current) return events;
      state.timer -= dt;
      if (state.timer <= 0) startRecovery(state, events);
    } else if (state.mode === 'recovery') {
      state.timer -= dt;
      if (state.timer <= 0) {
        // Jeda antar serangan: pemain sempat membaca keadaan dan mengatur posisi.
        state.mode = 'idle';
        state.timer = state.schema.idleGap === undefined ? IDLE_GAP : state.schema.idleGap;
        state.vulnerable = false;
        state.stunned = false;
        state.current = null;
      }
    } else if (state.mode === 'transition') {
      state.timer -= dt;
      if (state.timer <= 0) {
        state.mode = 'idle';
        state.timer = 0.35;
        state.invuln = 0;
        state.vulnerable = false;
      }
    }

    updateProjectiles(state, dt, ctx, events);
    updateHazards(state, dt, events);
    updateProps(state, dt, ctx, events);
    return events;
  }

  // Benda di arena: telur, totem, lentera, koin, mahkota, kantong senjata, dan tiruan boss.
  function updateProps(state, dt, ctx, events) {
    const keep = [];
    for (const p of state.props) {
      if (p.life !== undefined) { p.life -= dt; if (p.life <= 0) continue; }
      if (p.kind === 'egg') {
        if (p.kicked) {
          const bx = state.x + state.w / 2, by = state.y + state.h / 2, dx = bx - p.x, dy = by - p.y, d = Math.hypot(dx, dy) || 1;
          p.x += (dx / d) * 320 * dt; p.y += (dy / d) * 320 * dt;
          if (overlaps(p, state)) {
            state.hp = Math.max(1, state.hp - 30);
            events.push({ type: 'bossDamage', amount: 30, x: bx, y: by, vulnerable: true, weak: true, guarded: false });
            events.push({ type: 'bossReflectHit', x: bx, y: by });
            stagger(state, state.fly ? state.fly.stun : 2.8, events);
            continue;
          }
        } else if (p.y < p.groundY) {
          p.vy = Math.min(p.vy + 400 * dt, 240);
          p.y = Math.min(p.groundY, p.y + p.vy * dt);
        } else {
          p.hatch -= dt;
          if (p.hatch <= 0) {
            events.push({ type: 'bossSummon', spots: [p.x], y: p.groundY + p.h, dir: 1, hp: 10, damage: 6 });
            continue;
          }
        }
      } else if (p.kind === 'coin') {
        if (p.y < p.groundY || p.vy < 0) {
          p.vy += 300 * dt; p.y = Math.min(p.groundY, p.y + p.vy * dt);
          if (p.y >= p.groundY) p.vy = 0;
        }
      } else if (p.kind === 'lantern' && p.lit > 0) {
        p.lit = Math.max(0, p.lit - dt);
      }
      keep.push(p);
    }
    state.props = keep;
    // Tiruan berjalan malas di tempatnya.
    for (const c of state.clones) {
      c.t += dt;
      c.x += c.dir * 12 * dt;
      if (state.arena && (c.x < state.arena.left + 8 || c.x > state.arena.right - c.w - 8)) c.dir *= -1;
    }
  }

  // Pukulan mengenai benda arena. Mengembalikan true bila kotak serangan habis terpakai.
  function hitProps(state, box, opts) {
    opts = opts || {};
    const events = [];
    for (let i = state.props.length - 1; i >= 0; i--) {
      const p = state.props[i];
      if (!overlaps(box, p)) continue;
      if (p.kind === 'totem' && opts.melee) {
        state.props.splice(i, 1);
        events.push({ type: 'bossPropBreak', x: p.x + p.w / 2, y: p.y + p.h / 2 });
        if (!state.props.some((q) => q.kind === 'totem')) {
          state.shield = false;
          stagger(state, state.shieldStun || 3, events);
        }
        return events;
      }
      if (p.kind === 'egg' && opts.melee && !p.kicked) {
        p.kicked = true;
        events.push({ type: 'bossPropBreak', x: p.x + p.w / 2, y: p.y + p.h / 2, kick: true });
        return events;
      }
      if (p.kind === 'lantern' && opts.melee) {
        // Lentera tidak pernah menghalangi: pukulan yang sama tetap bisa mengenai boss.
        if (p.lit > 0) continue;
        p.lit = 4;
        events.push({ type: 'bossFlash', x: p.x + p.w / 2, y: p.y + p.h / 2, radius: state.lightRadius || 90 });
        const d = Math.abs(state.x + state.w / 2 - (p.x + p.w / 2));
        if (d <= (state.lightRadius || 90) && !state.stunned) stagger(state, state.lightStun || 3, events);
        continue;
      }
    }
    for (let i = state.clones.length - 1; i >= 0; i--) {
      if (!overlaps(box, state.clones[i])) continue;
      const c = state.clones.splice(i, 1)[0];
      events.push({ type: 'bossClonePop', x: c.x + c.w / 2, y: c.y + c.h / 2 });
      bark(state, 'taunt', events);
      return events;
    }
    return events;
  }

  // Bola yang bisa dipantulkan: senjata dekat mengembalikannya kepada boss.
  function reflect(state, box) {
    const events = [];
    for (const p of state.projectiles) {
      if (!p.reflectable || p.reflected || !overlaps(box, p)) continue;
      p.reflected = true;
      p.damage = 0;
      events.push({ type: 'bossReflect', x: p.x, y: p.y });
    }
    return events;
  }

  // Kotak weak point di dunia, atau null bila boss ini tidak punya.
  function weakBox(state) {
    const wp = state.schema.weakPoint;
    if (!wp) return null;
    return { x: state.x + wp.ox, y: state.y + wp.oy, w: wp.w, h: wp.h };
  }

  function overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // opts.box = kotak serangan. Tanpa box dianggap mengenai badan dan weak point.
  // Di luar celah hanya sedikit damage, jadi memukul terus tidak mengalahkan boss.
  function damage(state, amount, opts) {
    opts = opts || {};
    const events = [];
    if (state.defeated || state.mode === 'transition' || state.invuln > 0) return events;
    const schema = state.schema;
    const guard = schema.guardMul === undefined ? GUARD_MUL : schema.guardMul;
    const wb = weakBox(state);
    let weak = false, mul = guard;
    const styled = schema.meleeOpen !== undefined;
    // Perisai menahan semua serangan sampai totem hancur.
    if (state.shield) {
      events.push({ type: 'bossDamage', amount: 0, x: state.x + state.w / 2, y: state.y + state.h * 0.45, vulnerable: false, weak: false, guarded: true });
      events.push({ type: 'bossBlocked' });
      return events;
    }
    // Yang asli kena saat membelah: semua tiruan pecah dan dia tumbang.
    if (state.clones.length) {
      for (const c of state.clones) events.push({ type: 'bossClonePop', x: c.x + c.w / 2, y: c.y + c.h / 2 });
      state.clones = [];
      stagger(state, state.splitStun || 3, events);
    }
    // Senjata jauh menjatuhkan yang sedang terbang.
    if (state.fly && !opts.melee) {
      state.fly.hits++;
      if (state.fly.hits >= state.fly.need) stagger(state, state.fly.stun, events);
    }
    if (styled) {
      mul = state.vulnerable
        ? (opts.melee ? schema.meleeOpen : schema.rangedOpen)
        : (opts.melee ? schema.meleeGuard : schema.rangedGuard);
      weak = !!(state.vulnerable && opts.melee);
    } else if (state.vulnerable) {
      if (wb) {
        weak = !opts.box || overlaps(opts.box, wb);
        if (weak) mul = schema.weakPoint.mul || WEAK_MUL;
      } else {
        mul = schema.openMul || OPEN_MUL;
      }
    }
    if (opts.multiplier !== undefined) mul = opts.multiplier;
    const dealt = Math.max(1, Math.round(amount * mul));
    state.hp = Math.max(0, state.hp - dealt);
    events.push({
      type: 'bossDamage', amount: dealt, x: state.x + state.w / 2,
      y: state.y + state.h * 0.45, vulnerable: state.vulnerable, weak,
      guarded: (styled ? !state.vulnerable : mul === guard) && opts.multiplier === undefined,
    });
    if (state.hp <= 0) {
      state.hp = 0; state.defeated = true; state.mode = 'defeated';
      state.projectiles = []; state.hazards = []; state.zones = []; state.vulnerable = false;
      state.props = []; state.clones = []; state.shield = false; state.dark = false; state.fly = null; state.hop = null;
      events.push({ type: 'bossDefeated', x: state.x + state.w / 2, y: state.y + state.h / 2 });
      return events;
    }
    const next = schema.phases[state.phaseIndex + 1];
    if (next && state.hp / state.maxHp <= next.hpFrom) {
      state.phaseIndex++;
      state.mode = 'transition';
      state.timer = next.transitionTime || 1;
      state.invuln = state.timer;
      state.projectiles = []; state.hazards = []; state.zones = [];
      state.vulnerable = false; state.stunned = false;
      state.current = null;
      state.props = []; state.clones = []; state.shield = false; state.dark = false; state.fly = null; state.hop = null; state.airborne = false;
      if (state.arena) state.y = state.arena.groundY - state.h;
      events.push({ type: 'bossPhase', id: next.id, duration: state.timer });
      state.barkT = 0;
      bark(state, 'phase', events);
    }
    return events;
  }

  // Ulang encounter dari awal fase berjalan: hero tidak kehilangan fase yang sudah lewat,
  // tetapi HP fase ini pulih dan semua serangan yang tertinggal dibersihkan.
  function reset(state, opts) {
    opts = opts || {};
    const ph = phaseOf(state);
    state.hp = Math.round(state.maxHp * ph.hpFrom);
    state.x = state.spawnX; state.y = state.spawnY;
    state.mode = 'idle';
    state.timer = opts.intro === undefined ? 1.6 : opts.intro;
    state.current = null; state.vulnerable = false; state.stunned = false; state.invuln = 0;
    state.projectiles = []; state.hazards = []; state.zones = [];
    state.props = []; state.clones = []; state.shield = false; state.dark = false; state.fly = null; state.hop = null; state.airborne = false;
    return state;
  }

  function validate(schema) {
    // Validasi data ada di boss/schema.js; dipertahankan di sini supaya pemanggil
    // cukup memegang satu modul.
    const S = (typeof require === 'function' && typeof module === 'object')
      ? require('./schema.js') : (typeof self !== 'undefined' && self.MH4 && self.MH4.bossSchema);
    return S ? S.validate(schema) : [];
  }

  return { create, update, damage, reset, weakBox, validate, rng, hitProps, reflect, stagger, bark };
});
