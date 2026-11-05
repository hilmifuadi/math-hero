// Kit Math Hero: API level generator platformer (spesifikasi: public/shared/LEVELGEN.md).
// File ini hanya wrapper tipis: inti generik ada di public/shared/levelgen/core.js, dan arti tile /
// mekanik khas MH3 ada di public/mh3/js/gen/rules.js. Hasil generate MH3 harus tetap sama persis.
// Deterministik: seed yang sama selalu menghasilkan level yang sama.
//   MHKit.levelgen.generate({ seed, tier, tema, mech: ['tangga', ...], intro: ['per'], foes: ['e', 'f'], quiz: 1, sec: 110 })
//   Opsi tambahan: uji: true = ikutkan ruang kombinasi yang masih diuji; fixed: ['id', ...] = rangkai ruang itu saja (halaman uji).
//   -> { map: [...string], inside: [[c0, r0, c1, r1]], tema, tier, seed, rooms: [{ id, c, w, dy }], est }
// Pemeriksaan bisa diselesaikan dilakukan di luar (shared/js/levelcheck.js); pickSeed() mencoba seed berurutan.
// Node: require('.../levelgen.js'); browser: window.MHKit.levelgen (muat core, chunks, dan rules lebih dulu).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../levelgen/core.js'), require('./levelgen.chunks.js'), require('../../mh3/js/gen/rules.js'));
  else ((root.MHKit = root.MHKit || {}).levelgen = factory(root.MHKit.levelgenCore, root.MHKit.levelChunks, root.MHKit.mh3LevelRules));
})(typeof self !== 'undefined' ? self : this, function (Core, Lib, Rules) {
  return Core.create(Object.assign({}, Rules, { chunks: Lib.CHUNKS }));
});
