// Tes asap MH4: memuat main.js sungguhan dengan DOM tiruan, lalu menjalankan frame dan
// memicu semua event suara. Menangkap bug jalur main.js yang tidak terlihat oleh tes sim,
// misalnya playSfx rekursif yang membekukan game pada lompatan pertama. Bukan bot pemain.
//   node tests/mh4_smoke.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..', 'public');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const html = read('mh4/index.html');

function fakeEl(id) {
  const classes = new Set(new RegExp(`id="${id}" class="hidden"`).test(html) ? ['hidden'] : []);
  return {
    id, dataset: {}, style: {}, children: [], disabled: false, textContent: '', innerHTML: '', className: '',
    classList: {
      add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c),
      toggle: (c, on) => { if (on === undefined ? !classes.has(c) : on) classes.add(c); else classes.delete(c); },
    },
    listeners: {},
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
    appendChild(c) { this.children.push(c); return c; },
    click() { (this.listeners.click || []).forEach((f) => f({ preventDefault() {} })); },
    getContext: () => new Proxy({}, {
      get: (t, k) => (k === 'measureText' ? () => ({ width: 10 }) : t[k] !== undefined ? t[k] : () => {}),
      set: (t, k, v) => { t[k] = v; return true; },
    }),
  };
}

const els = {};
const getEl = (id) => { if (!els[id]) els[id] = fakeEl(id); return els[id]; };
const winL = {};
const store = {};
const raf = [];
const sandbox = {
  console, Math, JSON, Date, Promise, Set, Map, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => {},
  localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
  document: {
    getElementById: getEl,
    querySelectorAll: () => [],
    createElement: () => fakeEl('anon'),
    documentElement: fakeEl('html'),
  },
  Image: function Image() { this.complete = false; this.naturalWidth = 0; },
  requestAnimationFrame: (f) => { raf.push(f); return raf.length; },
  addEventListener: (t, f) => { (winL[t] = winL[t] || []).push(f); },
  matchMedia: () => ({ matches: false, addEventListener() {} }),
};
sandbox.window = sandbox;
sandbox.self = sandbox;
vm.createContext(sandbox);

// Urutan <script> diambil dari halaman, jadi berkas baru otomatis ikut diuji.
for (const [, src] of html.matchAll(/<script src="([^"]+)"/g)) {
  const rel = path.posix.normalize('mh4/' + src);
  vm.runInContext(read(rel), sandbox, { filename: rel });
}

function runFrames(n) {
  for (let i = 0; i < n; i++) {
    const f = raf.shift();
    assert.ok(f, 'loop frame harus terus berjalan');
    f(1000 + i * 16.7);
  }
}

const dbg = sandbox.MH4.debug;
runFrames(3);
const g = dbg.game;
const t0 = g.t;

// Lompat lewat tombol: bug lama melempar RangeError di sini.
dbg.setInput({ jump: true });
runFrames(5);
assert.ok(g.t > t0, 'waktu game maju setelah lompat');
assert.ok(!g.p.onGround, 'hero melompat');
dbg.setInput({ jump: false });
console.log('ok lompatan pertama tidak membekukan game');

// Semua event yang memutar suara harus aman, termasuk nama efek yang benar-benar ada.
for (const type of ['checkpoint', 'reward', 'respawn', 'hurt', 'weapon', 'bossPhase', 'bossDefeated', 'bossSlam',
  'goalBlocked', 'enemyDown', 'stomp', 'enemyShoot', 'gateOpen', 'jump', 'djump', 'attack', 'star']) {
  g.events.push({ type, why: 'duri', nama: 'Pedang', id: 2, kind: 'melee' });
  runFrames(1);
}
console.log('ok semua event suara berjalan tanpa error');

const audioSrc = read('mh4/js/audio.js');
const table = audioSrc.slice(audioSrc.indexOf('SFX'));
for (const [, name] of read('mh4/js/main.js').matchAll(/playSfx\('(\w+)'\)/g)) {
  assert.ok(new RegExp(`\\b${name}\\s*[:(]`).test(table), `efek suara "${name}" ada di audio.js`);
}
console.log('ok semua nama efek suara dikenal audio.js');

// Lapisan menu menjeda game dan melanjutkannya lagi.
getEl('menubtn').click();
runFrames(1);
const tMenu = g.t;
runFrames(3);
assert.strictEqual(g.t, tMenu, 'menu menjeda game');
getEl('menuclose').click();
runFrames(3);
assert.ok(g.t > tMenu, 'menutup menu melanjutkan game');
console.log('ok menu menjeda dan melanjutkan game');

// Toko yang dibuka dari menu kembali ke menu, game tetap berjeda.
getEl('menubtn').click();
getEl('shopbtn').click();
getEl('shopclose').click();
runFrames(1);
const tShop = g.t;
runFrames(3);
assert.strictEqual(g.t, tShop, 'menutup toko dari menu tetap berjeda');
getEl('menuclose').click();
runFrames(1);
console.log('ok toko kembali ke menu tanpa melanjutkan game');

console.log('5 tes asap MH4 lulus.');
