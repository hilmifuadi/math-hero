// Uji snapshot peta kampanye MH3 Kejar:  node tests/levelgen_snapshot.test.js
// Peta kampanye dibuat ulang dari pustaka ruang + generator saat file dimuat. Tanpa snapshot, mengubah
// satu ruang atau probabilitas pemilihan diam-diam mengubah level yang sudah diuji manual.
// Jalankan dengan --update hanya bila perubahan peta memang disengaja:
//   node tests/levelgen_snapshot.test.js --update
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Lv = require('../public/mh3/js/plat/levels.js');

const FIXTURE = path.join(__dirname, 'fixtures', 'mh3-kejar.snapshot.json');
const UPDATE = process.argv.includes('--update');

// Stringify dengan urutan kunci tetap, supaya hash tidak berubah hanya karena urutan properti.
function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((k) => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function snapshot(lv) {
  return {
    id: lv.id,
    nama: lv.nama,
    seed: lv.seed,
    tier: lv.tier,
    tema: lv.tema,
    map: lv.map,
    inside: lv.inside,
    rooms: lv.rooms,
  };
}

function hash(lv) {
  return crypto.createHash('sha256').update(stable(snapshot(lv))).digest('hex');
}

function build() {
  return {
    catatan: 'Hash peta kampanye MH3 Kejar. Perubahan disengaja: node tests/levelgen_snapshot.test.js --update',
    versi: 1,
    levels: Lv.LEVELS.map((lv) => ({
      id: lv.id,
      nama: lv.nama,
      seed: lv.seed,
      lebar: lv.map[0].length,
      tinggi: lv.map.length,
      hash: hash(lv),
    })),
  };
}

if (UPDATE) {
  fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
  fs.writeFileSync(FIXTURE, JSON.stringify(build(), null, 2) + '\n');
  console.log('snapshot diperbarui:', path.relative(process.cwd(), FIXTURE));
  process.exit(0);
}

assert.ok(fs.existsSync(FIXTURE), 'snapshot belum ada; jalankan dengan --update setelah memeriksa peta');
const expected = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const actual = build();
assert.strictEqual(expected.versi, actual.versi, 'versi snapshot');
assert.strictEqual(expected.levels.length, Lv.LEVELS.length, 'jumlah level snapshot');
assert.strictEqual(Lv.LEVELS.length, 8, 'kampanye Kejar berisi 8 level');

for (let i = 0; i < actual.levels.length; i++) {
  const a = actual.levels[i], e = expected.levels[i];
  assert.strictEqual(a.id, e.id, `level ke-${i + 1} id`);
  assert.strictEqual(a.seed, e.seed, `level ${a.id} seed`);
  assert.strictEqual(a.lebar, e.lebar, `level ${a.id} lebar`);
  assert.strictEqual(a.tinggi, e.tinggi, `level ${a.id} tinggi`);
  assert.strictEqual(a.hash, e.hash, `level ${a.id} "${a.nama}" berubah; bila disengaja jalankan --update`);
  console.log(`ok: snapshot level ${a.id} "${a.nama}" ${a.lebar}x${a.tinggi} ${a.hash.slice(0, 12)}`);
}
console.log('semua snapshot kampanye Kejar sama');
