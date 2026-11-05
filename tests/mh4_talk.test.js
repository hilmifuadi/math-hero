// Tes dialog warga: mengenali waktu, lama bermain, keadaan Arka, dan tidak monoton.
const assert = require('assert');
const Talk = require('../public/mh4/js/base/talk.js');
const Farm = require('../public/mh4/js/base/farm.js');
const Progress = require('../public/mh4/js/progress.js');
let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok', name); };
const IDS = Object.keys(Talk.NAMA);
const mk = (extra) => {
  const profile = Progress.newProfile('A');
  profile.base = Farm.newBase();
  return Object.assign({ hour: 9, playMin: 5, profile, animalsReady: [], done: 3, story: [] }, extra);
};
const text = (lines) => lines.map((l) => l[1]).join(' ');

ok('semua warga menyapa sesuai waktu', () => {
  for (const id of IDS) {
    assert.match(text(Talk.compose(id, mk({ hour: 7 }), {})), /pagi|Pagi|sarapan/i, id);
    assert.match(text(Talk.compose(id, mk({ hour: 22 }), {})), /tidur|larut|malam/i, id + ' mengingatkan jam tidur');
  }
});

ok('setelah satu jam semua warga mengingatkan berhenti', () => {
  for (const id of IDS) assert.match(text(Talk.compose(id, mk({ playMin: 65 }), {})), /istirahat|berhenti|gantian|cukup/i, id);
});

ok('Aki Tyo selalu menutup dengan Bismillah', () => {
  const memo = {};
  for (const [hour, playMin] of [[7, 5], [13, 5], [16, 70], [19, 5], [23, 5], [7, 5]]) {
    const lines = Talk.compose('kakek', mk({ hour, playMin }), memo);
    assert.strictEqual(lines[lines.length - 1][1], 'Jangan lupa baca Bismillah sebelum pergi berpetualang!');
    assert.ok(lines.every((l) => l[0] === 'Aki Tyo'));
  }
});

ok('warga mengenali keadaan Arka', () => {
  const c = mk();
  c.profile.base.items.gandum = 4;
  assert.match(text(Talk.compose('sari', c, { greet: { sari: 9 } })), /4 gandum/);
  const d = mk({ animalsReady: ['Sapi'] });
  assert.match(text(Talk.compose('zahra', d, { greet: { zahra: 9 } })), /Sapi/);
  const e = mk();
  e.profile.points = 3;
  assert.match(text(Talk.compose('empu', e, { greet: { empu: 9 } })), /3 poin/);
  const g = mk({ nextMission: 'Jurang Hijau' });
  assert.match(text(Talk.compose('gapura', g, { greet: { gapura: 9 } })), /Jurang Hijau/);
});

ok('tidak monoton: bicara berulang memberi kalimat yang berbeda', () => {
  for (const id of IDS) {
    const memo = {}, seen = new Set();
    for (let i = 0; i < 12; i++) Talk.compose(id, mk(), memo).forEach((l) => seen.add(l[1]));
    assert.ok(seen.size >= 6, `${id} hanya punya ${seen.size} kalimat`);
  }
  assert.ok(Talk.NASIHAT.length >= 12, 'kumpulan nasihat cukup banyak');
});

ok('pesan cerita hanya sekali', () => {
  const memo = {}, story = [['Aki Tyo', 'Tanam benih dulu.']];
  assert.match(text(Talk.compose('kakek', mk({ story }), memo)), /Tanam benih/);
  assert.doesNotMatch(text(Talk.compose('kakek', mk({ story }), memo)), /Tanam benih/);
});

console.log(`\n${n} tes dialog warga MH4 lulus.`);
