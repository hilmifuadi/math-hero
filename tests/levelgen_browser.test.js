// Uji jalur browser level generator (UMD):  node tests/levelgen_browser.test.js
// Memuat chunks, core, rules, lalu wrapper lewat vm tanpa `module`, meniru urutan <script> di mh3/index.html.
// Hasil level 1 harus sama dengan jalur Node (yang dipakai tes snapshot).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Lv = require('../public/mh3/js/plat/levels.js');

const FILES = [
  'public/shared/js/levelgen.chunks.js',
  'public/shared/levelgen/core.js',
  'public/mh3/js/gen/rules.js',
  'public/shared/js/levelgen.js',
];
const ctx = { console, Math, JSON };
ctx.self = ctx;
ctx.window = ctx;
vm.createContext(ctx);
for (const f of FILES) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
}

assert.ok(ctx.MHKit && ctx.MHKit.levelgen, 'MHKit.levelgen terbentuk di jalur browser');
const plan = Lv.PLAN.find((p) => p.id === 1);
const d = ctx.MHKit.levelgen.generate(Object.assign({ tema: plan.tema }, plan.gen));
const expected = Lv.LEVELS[0];
// Bandingkan lewat JSON: array hasil vm berasal dari realm lain, jadi deepStrictEqual menolak prototipenya.
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
assert.ok(same(d.map, expected.map), 'peta browser sama dengan jalur Node');
assert.ok(same(d.inside, expected.inside), 'inside browser sama');
assert.ok(same(d.rooms, expected.rooms), 'rooms browser sama');
console.log(`ok: jalur browser UMD level 1 ${d.map[0].length}x${d.map.length}, ruang ${d.rooms.length}`);
