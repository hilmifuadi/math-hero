// Math Hero 4: logika gerak di markas top down, tanpa DOM. Bisa diuji di Node.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./world.js'));
  else ((root.MH4 = root.MH4 || {}).baseSim = factory(root.MH4.world));
})(typeof self !== 'undefined' ? self : this, function (World) {
  const SPEED = 72, BOX = { w: 10, h: 8 };
  const MAPS = { kampung: World.kampung(), rumah: World.rumah() };

  function create(mapId, at) {
    const map = MAPS[mapId || 'kampung'];
    const pos = at || map.spawn;
    return {
      map, x: pos.x, y: pos.y, face: 'down', flip: false, moving: false, t: 0,
      prevAct: false, near: null, events: [], tool: null,
      animals: map.animals.map((a, i) => Object.assign({}, a, { dir: i % 2 ? 1 : -1, wait: i * 0.4, flip: false })),
    };
  }

  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const boxAt = (x, y) => ({ x: x - BOX.w / 2, y: y - BOX.h / 2, w: BOX.w, h: BOX.h });
  function blocked(map, x, y) {
    const b = boxAt(x, y);
    if (b.x < 0 || b.y < 0 || b.x + b.w > map.W * World.T || b.y + b.h > map.H * World.T) return true;
    return map.solids.some((s) => hit(b, s));
  }

  function nearest(g) {
    const me = { x: g.x - 8, y: g.y - 8, w: 16, h: 16 };
    let best = null, bestD = 1e9;
    for (const s of g.map.spots) {
      if (!hit(me, s)) continue;
      const d = Math.abs(s.x + s.w / 2 - g.x) + Math.abs(s.y + s.h / 2 - g.y);
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  function updateAnimals(g, dt) {
    for (const a of g.animals) {
      a.wait -= dt;
      if (a.wait > 0) continue;
      a.x += a.dir * 12 * dt;
      a.flip = a.dir < 0;
      if (a.x < a.pen.x || a.x > a.pen.x + a.pen.w - 16 || a.wait < -2.4) {
        a.x = Math.max(a.pen.x, Math.min(a.pen.x + a.pen.w - 16, a.x));
        a.dir *= -1;
        a.wait = 1.2 + (Math.abs(Math.round(a.y)) % 3) * 0.6;
      }
    }
  }

  // input: { left, right, up, down, act }. Satu tekan act = satu event interaksi.
  function update(g, dt, input) {
    dt = Math.min(Math.max(dt || 0, 0), 1 / 30);
    input = input || {};
    g.t += dt;
    if (g.tool) {
      g.tool.t += dt;
      if (g.tool.t >= g.tool.dur) g.tool = null;
    }
    const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    g.moving = !g.tool && !!(dx || dy);
    if (g.moving) {
      const k = dx && dy ? 0.7071 : 1;
      const nx = g.x + dx * SPEED * k * dt, ny = g.y + dy * SPEED * k * dt;
      if (!blocked(g.map, nx, g.y)) g.x = nx;
      if (!blocked(g.map, g.x, ny)) g.y = ny;
      if (dx) { g.face = 'side'; g.flip = dx < 0; }
      else g.face = dy < 0 ? 'up' : 'down';
    }
    g.near = nearest(g);
    const act = !!input.act;
    if (act && !g.prevAct && g.near && !g.tool) g.events.push({ type: 'interact', id: g.near.id, plot: g.near.plot });
    g.prevAct = act;
    updateAnimals(g, dt);
    return g;
  }

  function takeEvents(g) { const e = g.events; g.events = []; return e; }

  function useTool(g, name) { g.tool = { name, t: 0, dur: 0.45 }; }

  return { create, update, takeEvents, useTool, blocked, nearest, MAPS, SPEED };
});
