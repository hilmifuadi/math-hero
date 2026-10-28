// Uji tata letak laptop 1562x1019 dan keyboard MH1:  node tests/layout_laptop_ui.js
// MH3: dasar dunia tidak terpotong dan teks soal panjang muat di kartu PR. MH1: kolom selebar HP dan keyboard jalan.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', 'public');
const srv = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf' }[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
});
const ok = (c, m) => { if (!c) { console.error('GAGAL: ' + m); process.exitCode = 1; } else console.log('ok: ' + m); };
(async () => {
  await new Promise((r) => srv.listen(0, r));
  const base = `http://localhost:${srv.address().port}`;
  const b = await chromium.launch();
  const pg = await (await b.newContext({ viewport: { width: 1562, height: 1019 } })).newPage();
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  // MH3: level Kejar, lalu kartu PR dengan soal panjang.
  await pg.goto(`${base}/mh3/index.html?debug=1`);
  await pg.waitForFunction(() => window.MH2 && MH2.sceneName === 'title', null, { timeout: 20000 });
  await pg.waitForTimeout(400);
  let s = await pg.evaluate(() => MH2.scale);
  await pg.mouse.click(await pg.evaluate(() => document.getElementById('screen').getBoundingClientRect().x) + 70 * s, 151 * s);
  await pg.waitForTimeout(900);
  ok(await pg.evaluate(() => MH2.sceneName) === 'plat', 'MH3 level terbuka di laptop');
  await pg.screenshot({ path: 'tests/shots/laptop_mh3_plat.png' });
  await pg.evaluate(() => MH3.homework.open({ grade: 4, tier: 3, title: 'Tuas macet!' }, () => {}));
  await pg.waitForTimeout(300);
  await pg.screenshot({ path: 'tests/shots/laptop_mh3_pr.png' });
  // MH1: lebar kolom + keyboard.
  await pg.goto(`${base}/mh1/index.html?debug=1`);
  await pg.waitForTimeout(1500);
  const w = await pg.evaluate(() => document.getElementById('app').getBoundingClientRect().width);
  ok(w <= 700 && w >= 600, 'MH1 kolom selebar HP di laptop (' + Math.round(w) + 'px)');
  await pg.evaluate(() => document.getElementById('splash').classList.add('hidden'));
  await pg.keyboard.down('ArrowRight');
  ok(await pg.evaluate(() => Input.joy.x === 1 && Input.right), 'panah kanan menggerakkan MH1');
  await pg.keyboard.up('ArrowRight');
  ok(await pg.evaluate(() => Input.joy.x === 0), 'lepas panah berhenti');
  await pg.keyboard.down('Space'); ok(await pg.evaluate(() => Input.jump), 'Spasi lompat'); await pg.keyboard.up('Space');
  await pg.keyboard.down('KeyB'); ok(await pg.evaluate(() => Input.action), 'B aksi'); await pg.keyboard.up('KeyB');
  await pg.screenshot({ path: 'tests/shots/laptop_mh1.png' });
  ok(errs.length === 0, 'tanpa galat konsol ' + errs.join(' | '));
  await b.close(); srv.close();
})();
