// Math Hero 4: BossMachine murni. Tidak menyentuh canvas/DOM/Math.random.
// Data (BossSchema) memilih serangan; primitif di file ini yang menjalankan
// telegraph -> attack -> recovery, fase, proyektil, dan hazard.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).bossMachine = factory());
})(typeof self !== 'undefined' ? self : this, function () {
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
    return {
      schema, rng: opts.rng || rng(opts.seed || 1),
      t: 0, hp: schema.maxHp, maxHp: schema.maxHp,
      phaseIndex: 0, mode: 'idle', timer: opts.intro === undefined ? 1.0 : opts.intro,
      current: null, lastAttack: null, vulnerable: false, invuln: 0,
      x: opts.x === undefined ? 0 : opts.x, y: opts.y === undefined ? 0 : opts.y,
      w: body.w, h: body.h, facing: opts.facing || -1,
      projectiles: [], hazards: [], attackCount: 0, defeated: false,
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

  function pickAttack(state) {
    const pool = phaseOf(state).pool;
    let id = weightedPick(state, pool);
    // Hindari dua serangan identik berurutan bila masih ada pilihan lain.
    if (id === state.lastAttack && pool.length > 1) id = weightedPick(state, pool);
    return id;
  }

  function startTelegraph(state) {
    const id = pickAttack(state);
    const def = state.schema.attacks[id];
    state.current = { id, def };
    state.lastAttack = id;
    state.mode = 'telegraph';
    state.timer = def.telegraph;
    state.facing = -1;
    if (def.kind === 'charge') state.facing = state.lastPlayerX !== undefined && state.lastPlayerX > state.x ? 1 : -1;
    state.attackCount++;
    state.vulnerable = false;
    return [{
      type: 'bossTelegraph', attack: id, kind: def.kind,
      duration: def.telegraph, x: state.x + state.w / 2, y: state.y + state.h / 2,
      w: state.w, h: state.h, damage: def.damage,
    }];
  }

  function spawnAttack(state, ctx) {
    const def = state.current.def;
    const id = state.current.id;
    const events = [{
      type: 'bossAttack', attack: id, kind: def.kind,
      x: state.x + state.w / 2, y: state.y + state.h / 2, damage: def.damage,
    }];
    const player = (ctx && ctx.player) || { x: state.x, y: state.y, w: 1, h: 1 };
    const px = player.x + player.w / 2, py = player.y + player.h / 2;
    const cx = state.x + state.w / 2, cy = state.y + state.h / 2;
    state.mode = 'attack';
    state.timer = def.active;
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
        });
      }
      events.push({ type: 'bossFan', x: cx, y: cy, count: n });
    } else if (def.kind === 'falling_hazard') {
      const arena = (ctx && ctx.arena) || { left: 0, right: 640, top: 0, groundY: 400 };
      const n = def.count || 1;
      const center = px;
      for (let i = 0; i < n; i++) {
        const hx = center + (i - (n - 1) / 2) * (def.spreadX || 50);
        const x = Math.max(arena.left + 10, Math.min(arena.right - 28, hx - 9));
        state.hazards.push({
          x, y: arena.top + 6, w: 18, h: 18, vy: def.fallSpeed || 200,
          damage: def.damage, targetY: arena.groundY - 18, kind: 'rock',
        });
        events.push({ type: 'bossHazardSpawn', x: x + 9, y: arena.top + 6, targetY: arena.groundY, damage: def.damage });
      }
    } else if (def.kind === 'charge') {
      state.facing = px >= cx ? 1 : -1;
      events.push({ type: 'bossCharge', x: cx, y: cy, facing: state.facing, damage: def.damage });
    } else if (def.kind === 'ground_wave') {
      // Gelombang rendah menyusur lantai: harus dilompati, bukan diblok.
      const arena = (ctx && ctx.arena) || { left: 0, right: 640, top: 0, groundY: 400 };
      const dir = px >= cx ? 1 : -1;
      const h = def.height || 10;
      state.projectiles.push({
        x: cx - 7, y: arena.groundY - h, w: 14, h,
        vx: dir * (def.speed || 130), vy: 0, gravity: 0,
        life: def.life || 2.4, damage: def.damage, kind: 'wave',
      });
      events.push({ type: 'bossWave', x: cx, y: arena.groundY, facing: dir, damage: def.damage });
    }
    return events;
  }

  function updateProjectiles(state, dt, events) {
    const arena = state.arena || { left: -1e9, right: 1e9, top: -1e9, groundY: 1e9 };
    for (const p of state.projectiles) {
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

  function update(state, dt, ctx) {
    ctx = ctx || {};
    const events = [];
    dt = Math.min(Math.max(dt || 0, 0), 1 / 30);
    if (dt <= 0 || state.defeated) return events;
    state.t += dt;
    if (state.invuln > 0) state.invuln = Math.max(0, state.invuln - dt);
    if (ctx.player) state.lastPlayerX = ctx.player.x + (ctx.player.w || 0) / 2;
    if (ctx.arena) state.arena = ctx.arena;

    if (state.mode === 'idle') {
      state.timer -= dt;
      if (state.timer <= 0) events.push(...startTelegraph(state));
    } else if (state.mode === 'telegraph') {
      state.timer -= dt;
      if (state.timer <= 0) events.push(...spawnAttack(state, ctx));
    } else if (state.mode === 'attack') {
      const def = state.current.def;
      if (def.kind === 'charge') {
        const arena = state.arena || {};
        const next = state.x + state.facing * (def.speed || 180) * dt;
        const lo = arena.left === undefined ? next : arena.left;
        const hi = arena.right === undefined ? next : arena.right - state.w;
        state.x = Math.max(lo, Math.min(hi, next));
      }
      state.timer -= dt;
      if (state.timer <= 0) {
        const ph = phaseOf(state);
        state.mode = 'recovery';
        state.timer = (state.current.def.recovery || 0.8) * (ph.recoveryMul || 1);
        state.vulnerable = true;
        events.push({ type: 'bossRecovery', attack: state.current.id, duration: state.timer });
      }
    } else if (state.mode === 'recovery') {
      state.timer -= dt;
      if (state.timer <= 0) {
        state.mode = 'idle';
        state.timer = 0.55;
        state.vulnerable = false;
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

    updateProjectiles(state, dt, events);
    updateHazards(state, dt, events);
    return events;
  }

  function damage(state, amount, opts) {
    opts = opts || {};
    const events = [];
    if (state.defeated || state.mode === 'transition' || state.invuln > 0) return events;
    const mul = state.vulnerable ? 1.6 : (opts.multiplier === undefined ? 0.8 : opts.multiplier);
    const dealt = Math.max(1, Math.round(amount * mul));
    state.hp = Math.max(0, state.hp - dealt);
    events.push({
      type: 'bossDamage', amount: dealt, x: state.x + state.w / 2,
      y: state.y + state.h * 0.45, vulnerable: state.vulnerable,
    });
    if (state.hp <= 0) {
      state.hp = 0; state.defeated = true; state.mode = 'defeated';
      state.projectiles = []; state.hazards = []; state.vulnerable = false;
      events.push({ type: 'bossDefeated', x: state.x + state.w / 2, y: state.y + state.h / 2 });
      return events;
    }
    const next = state.schema.phases[state.phaseIndex + 1];
    if (next && state.hp / state.maxHp <= next.hpFrom) {
      state.phaseIndex++;
      state.mode = 'transition';
      state.timer = next.transitionTime || 1;
      state.invuln = state.timer;
      state.projectiles = []; state.hazards = [];
      state.vulnerable = false;
      events.push({ type: 'bossPhase', id: next.id, duration: state.timer });
    }
    return events;
  }

  function validate(schema) {
    // Validasi data ada di boss/schema.js; dipertahankan di sini supaya pemanggil
    // cukup memegang satu modul.
    const S = (typeof require === 'function' && typeof module === 'object')
      ? require('./schema.js') : (typeof self !== 'undefined' && self.MH4 && self.MH4.bossSchema);
    return S ? S.validate(schema) : [];
  }

  return { create, update, damage, validate, rng };
});
