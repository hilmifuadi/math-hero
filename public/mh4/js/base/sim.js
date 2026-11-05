// Math Hero 4: logika gerak di markas top down, tanpa DOM. Bisa diuji di Node.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./world.js'));
  else ((root.MH4 = root.MH4 || {}).baseSim = factory(root.MH4.world));
})(typeof self !== 'undefined' ? self : this, function (World) {
  const SPEED = 72, BOX = { w: 10, h: 8 };
  const MAPS = { kampung: World.kampung(), rumah: World.rumah() };

  // Peta kampung bergantung pada bangunan yang sudah dibeli, jadi disimpan per susunan.
  const built = {};
  function kampungFor(list) {
    const key = (list || []).join(',');
    if (!key) return MAPS.kampung;
    if (!built[key]) built[key] = World.kampung(list);
    return built[key];
  }

  // Titu: kucing yang mengikuti Arka. Manja tapi gengsi, suka tidur, dan penasaran pada ayam.
  const TITU_SAY = ['Meong.', 'Mrrr...', 'Hoaahm...', 'Meong! Lapar!', 'Prrr...', 'Meong?'];
  function makePet(x, y) {
    return { x: x - 14, y: y + 6, face: 'down', moving: false, t: 0, idle: 0, sleep: false, say: '', sayT: 0, nextSay: 6 };
  }

  function create(mapId, at, builtList) {
    const map = mapId === 'kampung' || !mapId ? kampungFor(builtList) : MAPS[mapId];
    const pos = at || map.spawn;
    const g = {
      map, x: pos.x, y: pos.y, face: 'down', flip: false, moving: false, t: 0,
      prevAct: false, near: null, events: [], tool: null,
      animals: map.animals.map((a, i) => Object.assign({}, a, { dir: i % 2 ? 1 : -1, wait: i * 0.4, flip: false })),
      pet: (builtList || []).includes('titu') ? makePet(pos.x, pos.y) : null,
    };
    return g;
  }

  function updatePet(g, dt) {
    const p = g.pet;
    if (!p) return;
    p.t += dt;
    const dx = g.x - p.x, dy = g.y - p.y, d = Math.hypot(dx, dy);
    if (d > 160) { p.x = g.x - 14; p.y = g.y + 6; }
    p.moving = d > 26;
    if (p.moving) {
      // Berlari kecil menyusul, sedikit lebih cepat dari Arka saat tertinggal jauh.
      const v = (d > 70 ? SPEED * 1.25 : SPEED * 0.9) * dt;
      p.x += dx / d * v; p.y += dy / d * v;
      p.face = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      p.idle = 0; p.sleep = false;
    } else {
      p.idle += g.moving ? 0 : dt;
      // Arka diam lama: Titu tertidur di dekatnya.
      if (p.idle > 6) p.sleep = true;
      if (g.moving) p.idle = 0;
    }
    p.sayT = Math.max(0, p.sayT - dt);
    p.nextSay -= dt;
    if (p.nextSay <= 0 && !p.sleep) {
      p.say = TITU_SAY[Math.floor(p.t * 7) % TITU_SAY.length];
      p.sayT = 1.8;
      p.nextSay = 12 + (Math.floor(p.t * 13) % 10);
    }
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
    const spots = g.map.spots.slice();
    // Hewan yang punya hasil ikut menjadi tempat interaksi, mengikuti posisinya.
    if (g.animalReady) {
      for (const a of g.animals) {
        if (!g.animalReady(a.sprite)) continue;
        spots.push({ id: 'ternak', kind: a.sprite, label: 'Ambil hasil', x: a.x - 10, y: a.y - 20, w: 24, h: 26 });
      }
    }
    for (const s of spots) {
      if (!hit(me, s)) continue;
      const d = Math.abs(s.x + s.w / 2 - g.x) + Math.abs(s.y + s.h / 2 - g.y);
      if (d < bestD) { bestD = d; best = s; }
    }
    // Titu selalu dekat, jadi hanya dipilih bila tidak ada tempat lain, supaya warga tetap bisa diajak bicara.
    if (!best && g.pet) {
      const s = { id: 'titu', label: g.pet.sleep ? 'Elus Titu yang tidur' : 'Elus Titu', x: g.pet.x - 12, y: g.pet.y - 18, w: 24, h: 24 };
      if (hit(me, s)) best = s;
    }
    return best;
  }

  function updateAnimals(g, dt) {
    for (const a of g.animals) {
      a.wait -= dt;
      if (a.wait > 0) continue;
      a.x += a.dir * 12 * dt;
      // Gambar semua hewan menghadap kiri, jadi dibalik saat berjalan ke kanan.
      a.flip = a.dir > 0;
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
    if (act && !g.prevAct && g.near && !g.tool) g.events.push({ type: 'interact', id: g.near.id, plot: g.near.plot, kind: g.near.kind });
    g.prevAct = act;
    updateAnimals(g, dt);
    updatePet(g, dt);
    return g;
  }

  function takeEvents(g) { const e = g.events; g.events = []; return e; }

  function useTool(g, name) { g.tool = { name, t: 0, dur: 0.45 }; }

  return { create, update, takeEvents, useTool, blocked, nearest, kampungFor, MAPS, SPEED, TITU_SAY };
});
