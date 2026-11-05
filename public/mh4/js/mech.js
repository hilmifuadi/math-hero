// Math Hero 4: mekanik peta dari MH3, tanpa DOM. Dipakai sim.js.
//   s per   ~ papan runtuh   - lintasan platform mendatar   | lintasan lift   ( ) dua ujung pintu ajaib, tekan bawah untuk masuk
//   > < pelontar samping   o gergaji   L kunci yang terbuka setelah mini boss kalah
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./physics.js'));
  else ((root.MH4 = root.MH4 || {}).mech = factory(root.MH4.physics));
})(typeof self !== 'undefined' ? self : this, function (Physics) {
  const { T, overlap } = Physics;
  const SPRING_VY = -470, LAUNCH_VX = 300, LAUNCH_VY = -340, LAUNCH_MAX = 1.6, SHAKE_T = 0.45, BACK_T = 2.6, MOVER_V = 34, PIPE_CD = 0.8;
  const MOVER_W = 3 * T, MOVER_H = 7;

  function init(L) {
    Object.assign(L, { springs: [], crumbles: [], movers: [], pipesIn: [], pipesOut: [], doors: [], dashes: [], saws: [], locks: [] });
  }

  // Dipanggil untuk tiap sel saat peta dibaca. map dipakai untuk mengukur panjang lintasan.
  function cell(L, ch, c, r, map) {
    const x = c * T, y = r * T, at = (cc, rr) => (map[rr] ? map[rr][cc] : undefined);
    if (ch === 's') L.springs.push({ x: x + 2, y: y + T - 8, w: T - 4, h: 8, t: 0 });
    else if (ch === '~') {
      L.tiles[r * L.cols + c] = 2;
      L.crumbles.push({ c, r, x, y, state: 'idle', t: 0 });
    } else if (ch === '-' && at(c - 1, r) !== '-') {
      let n = 1;
      while (at(c + n, r) === '-') n++;
      L.movers.push({ ow: true, x, y, w: MOVER_W, h: MOVER_H, x0: x, x1: x + Math.max(0, n * T - MOVER_W), y0: y, y1: y, dir: 1, vx: 0, vy: 0 });
    } else if (ch === '|' && at(c, r - 1) !== '|') {
      let n = 1;
      while (at(c, r + n) === '|') n++;
      const yEnd = y + (n - 1) * T;
      L.movers.push({ ow: true, x, y: yEnd, w: MOVER_W, h: MOVER_H, x0: x, x1: x, y0: y, y1: yEnd, dir: -1, vx: 0, vy: 0 });
    } else if (ch === '(') L.pipesIn.push({ x: x + 2, y: y - 6, w: T - 4, h: T + 6, cx: x + T / 2, foot: y + T, c });
    else if (ch === ')') L.pipesOut.push({ x: x + 2, y: y - 6, w: T - 4, h: T + 6, cx: x + T / 2, foot: y + T, c });
    else if (ch === '>' || ch === '<') L.dashes.push({ x: x + 2, y: y - T, w: T - 4, h: 2 * T, dir: ch === '>' ? 1 : -1 });
    else if (ch === 'o') L.saws.push({ x: x + 2, y: y + 3, w: T - 4, h: T - 4, cx: x + T / 2, cy: y + T - 7 });
    else if (ch === 'L') { L.tiles[r * L.cols + c] = 1; L.locks.push({ c, r }); }
  }

  // Setiap mulut pintu berpasangan dengan ujung terdekat menurut kolom.
  function linkDoors(L) {
    const free = L.pipesOut.slice();
    for (const a of L.pipesIn) {
      let best = -1, bestD = 1e9;
      free.forEach((b, i) => { const d = Math.abs(b.c - a.c); if (d < bestD) { bestD = d; best = i; } });
      if (best < 0) continue;
      const b = free.splice(best, 1)[0];
      a.to = b; b.to = a;
      L.doors.push(a, b);
    }
  }

  // Sebelum fisika hero: gerakkan platform, proses papan runtuh, per, pad, dan gergaji.
  function before(g, dt, hurt, input) {
    const L = g.L, p = g.p;
    for (const m of L.movers) {
      const ox = m.x, oy = m.y;
      if (m.x1 !== m.x0) {
        m.x += m.dir * MOVER_V * dt;
        if (m.x <= m.x0) { m.x = m.x0; m.dir = 1; } else if (m.x >= m.x1) { m.x = m.x1; m.dir = -1; }
      } else if (m.y1 !== m.y0) {
        m.y += m.dir * MOVER_V * dt;
        if (m.y <= m.y0) { m.y = m.y0; m.dir = 1; } else if (m.y >= m.y1) { m.y = m.y1; m.dir = -1; }
      }
      m.vx = (m.x - ox) / dt; m.vy = (m.y - oy) / dt;
      // Hero yang berdiri ikut terbawa.
      if (g.rider === m) { p.x += m.x - ox; p.y += m.y - oy; }
    }
    for (const c of L.crumbles) {
      if (c.state === 'shake') {
        c.t -= dt;
        if (c.t <= 0) {
          c.state = 'gone'; c.t = BACK_T;
          L.tiles[c.r * L.cols + c.c] = 0;
          g.events.push({ type: 'crumble', x: c.x, y: c.y });
        }
      } else if (c.state === 'gone') {
        c.t -= dt;
        if (c.t <= 0) { c.state = 'idle'; L.tiles[c.r * L.cols + c.c] = 2; }
      }
    }
    for (const s of L.springs) {
      s.t = Math.max(0, s.t - dt);
      if (p.vy >= 0 && overlap(p, s)) {
        p.vy = SPRING_VY; p.onGround = false; g.djumpUsed = false; s.t = 0.25;
        g.events.push({ type: 'spring', x: s.x, y: s.y });
      }
    }
    // Pelontar samping: melempar hero jauh melewati lubang yang tidak terjangkau lompat ganda.
    if (g.dashT > 0) g.dashT += dt;
    for (const d of L.dashes) {
      if (g.dashT > 0 || p.vx * d.dir < 0 || !overlap(p, d)) continue;
      g.dashT = dt; g.dashDir = d.dir; g.face = d.dir;
      p.vy = LAUNCH_VY; p.onGround = false; g.djumpUsed = false;
      g.events.push({ type: 'dash', x: d.x, y: d.y });
    }
    if (g.dashT > 0) {
      p.vx = g.dashDir * LAUNCH_VX;
      if (g.dashT > LAUNCH_MAX) g.dashT = 0;
    }
    for (const s of L.saws) if (overlap(p, s)) { hurt(g, 'duri', 12); break; }
    g.pipeCd = Math.max(0, (g.pipeCd || 0) - dt);
    if (g.pipeCd <= 0) {
      // Pintu ajaib dua arah: hanya berpindah bila pemain menekan bawah, jadi tidak pernah tidak sengaja.
      g.nearDoor = null;
      for (const d of L.doors) {
        if (!overlap(p, d)) continue;
        g.nearDoor = d;
        if (input && input.down && d.to) {
          p.x = d.to.cx - p.w / 2; p.y = d.to.foot - p.h; p.vx = p.vy = 0; p.drop = 0;
          g.pipeCd = PIPE_CD;
          g.nearDoor = null;
          g.events.push({ type: 'pipe', x: d.to.cx, y: d.to.foot });
          break;
        }
      }
    }
  }

  // Sesudah fisika: papan mulai bergetar saat diinjak, dan catat platform yang diinjak.
  function after(g, res) {
    const L = g.L, p = g.p;
    g.rider = res && res.platform ? res.platform : null;
    if (p.onGround && g.dashT > 0.1) g.dashT = 0;
    if (!p.onGround) return;
    const feet = Math.round((p.y + p.h) / T);
    for (const c of L.crumbles) {
      if (c.state !== 'idle' || c.r !== feet) continue;
      if (p.x < c.x + T && p.x + p.w > c.x) { c.state = 'shake'; c.t = SHAKE_T; }
    }
  }

  function unlock(g) {
    for (const k of g.L.locks) g.L.tiles[k.r * g.L.cols + k.c] = 0;
    g.lockOpen = true;
  }

  return { init, cell, linkDoors, before, after, unlock, SPRING_VY };
});
