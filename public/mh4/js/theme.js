// Math Hero 4: registri tema. Tema hanya berisi data: path aset, warna, dan nama.
// Renderer (scene.js) yang tahu cara menggambar. Semua aset dibuat satu gaya oleh
// scripts/prepare_world_mh4.js ke public/assets/mh4/v2/world/<tema>/.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).themes = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  const A = '../assets/mh4/v2/world/';
  const hero = {
    idle: '../assets/mh4/v2/hero/player.png', run: '../assets/mh4/v2/hero/player.png',
    jump: '../assets/mh4/v2/hero/player.png', hurt: '../assets/mh4/v2/hero/player.png', frame: 32,
  };
  // layers: lapisan latar dari jauh ke dekat dengan kecepatan geser masing-masing.
  // decor: nama potongan dekor -> [lebar, tinggi] gambar.
  function theme(id, nama, layers, decor, palette) {
    return {
      id, nama, hero, palette,
      bg: `${A}${id}/bg_s.png`,
      layers: layers.map(([k, f]) => ({ src: `${A}${id}/bg_${k}.png`, f })),
      tiles: { top: `${A}${id}/top.png`, fill: `${A}${id}/fill.png`, platform: `${A}${id}/platform.png` },
      decor: Object.fromEntries(Object.keys(decor).map((k) => [k, `${A}${id}/decor_${k}.png`])),
      decorSize: decor,
    };
  }
  const OPEN = [['c', 0.05], ['far', 0.12], ['mid', 0.25], ['near', 0.45]];
  const DEEP = [['far', 0.12], ['mid', 0.25], ['near', 0.45]];

  const THEMES = {
    green: theme('green', 'Padang Hijau', OPEN,
      { oak: [41, 63], pine: [25, 31], bush: [29, 27], mush: [10, 9], stump: [19, 16] },
      { sky: '#7fc8ee', ground: '#6fbe45', groundDark: '#3f2a1c', star: '#ffd84a', gold: '#f6b93b', text: '#ffffff' }),
    simple: theme('simple', 'Bukit Ceria', OPEN,
      { tree: [28, 36], bush: [29, 27], rock: [16, 14], flower: [11, 10], stump: [19, 16] },
      { sky: '#ffcf9e', ground: '#bdb94e', groundDark: '#4a3320', star: '#ffe066', gold: '#f6b93b', text: '#ffffff' }),
    industrial: theme('industrial', 'Zona Tua', OPEN,
      { crate: [16, 16], jar: [14, 16], rock: [16, 14], lamp: [10, 40] },
      { sky: '#b9a68f', ground: '#936036', groundDark: '#2e2a2a', star: '#ffd84a', gold: '#f6b93b', text: '#ffffff' }),
    night: theme('night', 'Kota Malam', DEEP,
      { lamp: [10, 40], crate: [16, 16], jar: [14, 16] },
      { sky: '#141a38', ground: '#48558f', groundDark: '#161a30', star: '#ffe066', gold: '#ffc94a', text: '#eef4ff' }),
    crystal: theme('crystal', 'Gua Kristal', DEEP,
      { shard: [12, 25], rock: [16, 14], gem: [14, 14] },
      { sky: '#121a2e', ground: '#7fb0c6', groundDark: '#141e30', star: '#8fe6ff', gold: '#ffd166', text: '#eaf2ff' }),
    hive: theme('hive', 'Sarang Purba', DEEP,
      { dead: [39, 46], rock: [16, 14], fern: [32, 26], mush: [10, 9] },
      { sky: '#22122a', ground: '#86b83e', groundDark: '#1c1022', star: '#c8ff6a', gold: '#ffd166', text: '#ffeaf2' }),
    day: theme('day', 'Kota Siang', OPEN,
      { lamp: [10, 40], crate: [16, 16], pot: [7, 14], tree: [28, 36] },
      { sky: '#8ed0f0', ground: '#c4533e', groundDark: '#3a2018', star: '#ffe066', gold: '#f6b93b', text: '#ffffff' }),
    castle: theme('castle', 'Benteng Batu', DEEP,
      { lamp: [10, 40], jar: [14, 16], crate: [16, 16], rock: [16, 14] },
      { sky: '#241d33', ground: '#9c98b4', groundDark: '#1c1828', star: '#ffe066', gold: '#f2b53c', text: '#ffeef2' }),
  };

  return { THEMES, get: (id) => THEMES[id] || THEMES.green };
});
