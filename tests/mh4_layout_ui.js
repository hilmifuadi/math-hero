// Uji tata letak MH4 di browser:  node tests/mh4_layout_ui.js
// HP mendatar: tombol kontrol tidak tertimpa apa pun. HP tegak: ada ajakan putar layar.
// Laptop: tombol sentuh tersembunyi. Semua kartu muat di layar. Tanpa bot pemain.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', 'public');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' };
const srv = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (f.endsWith(path.sep)) f += 'index.html';
  fs.readFile(f, (e, d) => {
    if (e) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    r.end(d);
  });
});
const ok = (c, m) => { if (!c) { console.error('GAGAL: ' + m); process.exitCode = 1; } else console.log('ok: ' + m); };

// Titik tengah tiap tombol harus mengenai tombol itu sendiri, bukan elemen di atasnya.
const buttonsHit = () => [...document.querySelectorAll('#touch .btn')].filter((b) => {
  const q = b.getBoundingClientRect();
  return document.elementFromPoint(q.x + q.width / 2, q.y + q.height / 2) !== b;
}).map((b) => b.id);
const cardFits = (sel) => {
  const q = document.querySelector(sel).getBoundingClientRect();
  const w = document.getElementById('wrap').getBoundingClientRect();
  return q.top >= w.top - 1 && q.bottom <= w.bottom + 1;
};

(async () => {
  await new Promise((r) => srv.listen(0, r));
  const url = `http://localhost:${srv.address().port}/mh4/`;
  const b = await chromium.launch();
  const errs = [];
  const open = async (opts) => {
    const pg = await (await b.newContext(opts)).newPage();
    pg.on('pageerror', (e) => errs.push(e.message));
    await pg.goto(url);
    await pg.waitForFunction(() => window.MH4 && MH4.debug && MH4.debug.game);
    await pg.waitForTimeout(300);
    return pg;
  };
  const phone = { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true };

  // HP mendatar
  let pg = await open(phone);
  ok(await pg.evaluate(() => getComputedStyle(document.getElementById('touch')).display) === 'flex', 'HP: tombol sentuh tampil');
  const hit = await pg.evaluate(buttonsHit);
  ok(hit.length === 0, 'HP: tidak ada tombol tertimpa (' + hit.join(',') + ')');
  const gap = await pg.evaluate(() => {
    const m = document.getElementById('menubtn').getBoundingClientRect();
    return m.width >= 44 && m.height >= 44;
  });
  ok(gap, 'HP: tombol menu minimal 44 px');
  await pg.tap('#jump');
  await pg.waitForTimeout(100);
  await pg.tap('#menubtn');
  ok(await pg.evaluate(() => !document.getElementById('menu').classList.contains('hidden')), 'HP: menu terbuka');
  ok(await pg.evaluate(cardFits, '#menu .card'), 'HP: kartu menu muat');
  await pg.screenshot({ path: 'tests/shots/mh4_hp_menu.png' });
  await pg.tap('#shopbtn');
  ok(await pg.evaluate(cardFits, '#shop .card'), 'HP: kartu toko muat (boleh gulir)');
  await pg.tap('#shopclose');
  await pg.tap('#menuclose');
  await pg.screenshot({ path: 'tests/shots/mh4_hp_main.png' });
  await pg.context().close();

  // HP tegak
  pg = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  ok(await pg.evaluate(() => !document.getElementById('rotate').classList.contains('hidden')), 'tegak: ajakan putar layar muncul');
  const t = await pg.evaluate(() => MH4.debug.game.t);
  await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => MH4.debug.game.t) === t, 'tegak: game berjeda selama ajakan tampil');
  await pg.tap('#rotateskip');
  await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => MH4.debug.game.t) > t, 'tegak: bisa tetap main setelah ajakan ditutup');
  await pg.context().close();

  // Laptop
  pg = await open({ viewport: { width: 1562, height: 1019 } });
  ok(await pg.evaluate(() => getComputedStyle(document.getElementById('touch')).display) === 'none', 'laptop: tombol sentuh tersembunyi');
  await pg.keyboard.press('Escape');
  ok(await pg.evaluate(() => !document.getElementById('menu').classList.contains('hidden')), 'laptop: Esc membuka menu');
  const fs1 = await pg.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#menu .card')).fontSize));
  ok(fs1 >= 17, 'laptop: teks kartu ikut membesar (' + fs1 + ' px)');
  await pg.screenshot({ path: 'tests/shots/mh4_laptop_menu.png' });
  await pg.keyboard.press('Escape');
  await pg.keyboard.down('Space');
  await pg.waitForTimeout(150);
  await pg.keyboard.up('Space');
  const t1 = await pg.evaluate(() => MH4.debug.game.t);
  await pg.waitForTimeout(200);
  ok(await pg.evaluate(() => MH4.debug.game.t) > t1, 'laptop: game tetap berjalan setelah lompat');
  await pg.context().close();

  ok(errs.length === 0, 'tanpa error halaman ' + errs.join(' | '));
  await b.close();
  srv.close();
})();
