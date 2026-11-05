// Math Hero 4: registri tema. Tema hanya berisi data: path aset, warna, dan nama.
// Renderer (scene.js) yang tahu cara menggambar. Menambah tema baru = menambah entri di sini
// dan menyalin asetnya ke public/assets/mh4/<tema>/.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).themes = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  const green = {
    id: 'green',
    nama: 'Padang Hijau',
    bg: '../assets/mh4/green/bg/day.png',
    tiles: {
      top: '../assets/mh4/green/tiles/top.png',
      fill: '../assets/mh4/green/tiles/fill.png',
      fillDark: '../assets/mh4/green/tiles/fill_dark.png',
      platform: '../assets/mh4/green/tiles/platform.png',
    },
    decor: {
      tree: '../assets/mh4/green/decor/tree1.png',
      bush: '../assets/mh4/green/decor/bush1.png',
      grass: '../assets/mh4/green/decor/grass1.png',
      box: '../assets/mh4/green/decor/box.png',
    },
    decorSize: { tree: [40, 52], bush: [16, 15], grass: [8, 6] },
    hero: {
      idle: '../assets/mh4/hero/idle.png',
      run: '../assets/mh4/hero/run.png',
      jump: '../assets/mh4/hero/jump.png',
      hurt: '../assets/mh4/hero/hurt.png',
      frame: 32,
    },
    palette: {
      sky: '#9fd7ff',
      ground: '#2f8f4e',
      groundDark: '#1d6135',
      spike: '#d94a4a',
      star: '#ffd84a',
      gold: '#f6b93b',
      text: '#ffffff',
      panel: 'rgba(10, 28, 20, .78)',
    },
  };

  // Tema kedua: zona industri. Struktur aset sengaja sama dengan Green zone supaya
  // renderer tidak perlu tahu tema mana yang sedang dipakai.
  const industrial = {
    id: 'industrial',
    nama: 'Zona Industri',
    bg: '../assets/mh4/industrial/bg/scene.png',
    tiles: {
      top: '../assets/mh4/industrial/tiles/top.png',
      fill: '../assets/mh4/industrial/tiles/fill.png',
      fillDark: '../assets/mh4/industrial/tiles/fill_dark.png',
      platform: '../assets/mh4/industrial/tiles/platform.png',
    },
    decor: {
      tree: '../assets/mh4/industrial/decor/barrel1.png',
      bush: '../assets/mh4/industrial/decor/barrel2.png',
      grass: '../assets/mh4/industrial/decor/crate.png',
    },
    decorSize: { tree: [18, 26], bush: [18, 26], grass: [16, 16] },
    hero: green.hero,
    palette: {
      sky: '#aab2c8',
      ground: '#3d4270',
      groundDark: '#252949',
      spike: '#ff6b4a',
      star: '#ffd84a',
      gold: '#f6b93b',
      text: '#ffffff',
      panel: 'rgba(16, 20, 42, .82)',
    },
  };

  // Tema ketiga: Simple Platformer. Latar berupa pola 64x64 sehingga renderer
  // mengulangnya (bgTile) alih-alih meregangkannya ke seluruh layar.
  const simple = {
    id: 'simple',
    nama: 'Bukit Ceria',
    bg: '../assets/mh4/simple/bg/pattern.png',
    bgTile: 64,
    tiles: {
      top: '../assets/mh4/simple/tiles/top.png',
      fill: '../assets/mh4/simple/tiles/fill.png',
      fillDark: '../assets/mh4/simple/tiles/fill_dark.png',
      platform: '../assets/mh4/simple/tiles/platform.png',
    },
    decor: {
      tree: '../assets/mh4/simple/decor/crate1.png',
      bush: '../assets/mh4/simple/decor/crate2.png',
      grass: '../assets/mh4/simple/decor/gem1.png',
    },
    decorSize: { tree: [26, 26], bush: [18, 18], grass: [8, 10] },
    hero: green.hero,
    palette: {
      sky: '#9fd7ff',
      ground: '#c77b4a',
      groundDark: '#8a4f2e',
      spike: '#e4572e',
      star: '#ffe066',
      gold: '#f6b93b',
      text: '#ffffff',
      panel: 'rgba(38, 26, 18, .8)',
    },
  };

  const THEMES = { green, industrial, simple };

  // Tema keempat: kota malam. Memakai latar city-night baru dan tile/dekor industri
  // yang sudah diberi tint gelap saat disalin, sehingga tidak perlu tint runtime.
  const night = {
    id: 'night',
    nama: 'Kota Malam',
    bg: '../assets/mh4/night/bg/scene.png',
    tiles: {
      top: '../assets/mh4/night/tiles/top.png',
      fill: '../assets/mh4/night/tiles/fill.png',
      fillDark: '../assets/mh4/night/tiles/fill_dark.png',
      platform: '../assets/mh4/night/tiles/platform.png',
    },
    decor: {
      tree: '../assets/mh4/night/decor/barrel1.png',
      bush: '../assets/mh4/night/decor/barrel2.png',
      grass: '../assets/mh4/night/decor/crate.png',
    },
    decorSize: { tree: [18, 26], bush: [18, 26], grass: [16, 16] },
    hero: green.hero,
    palette: {
      sky: '#141a2e',
      ground: '#2f3555',
      groundDark: '#1c2038',
      spike: '#ff7a4a',
      star: '#ffe066',
      gold: '#ffc94a',
      text: '#eef4ff',
      panel: 'rgba(9, 12, 26, .86)',
    },
  };
  THEMES.night = night;

  // Tema kelima: gua kristal. Tile batu biru 16x16 dari Dungeon Tileset,
  // latar gua gelap dengan pilar dan kristal, dekor rak/bokor.
  const crystal = {
    id: 'crystal',
    nama: 'Gua Kristal',
    bg: '../assets/mh4/crystal/bg/scene.png',
    tiles: {
      top: '../assets/mh4/crystal/tiles/top.png',
      fill: '../assets/mh4/crystal/tiles/fill.png',
      fillDark: '../assets/mh4/crystal/tiles/fill_dark.png',
      platform: '../assets/mh4/crystal/tiles/platform.png',
    },
    decor: {
      tree: '../assets/mh4/crystal/decor/shelf.png',
      bush: '../assets/mh4/crystal/decor/box.png',
      grass: '../assets/mh4/crystal/decor/torch.png',
    },
    decorSize: { tree: [20, 46], bush: [18, 22], grass: [10, 20] },
    hero: green.hero,
    palette: {
      sky: '#0a1020',
      ground: '#6f8fc0',
      groundDark: '#2b3d5c',
      spike: '#ff6b9d',
      star: '#8fe6ff',
      gold: '#ffd166',
      text: '#eaf2ff',
      panel: 'rgba(8, 14, 30, .86)',
    },
  };
  THEMES.crystal = crystal;

  // Tema keenam: sarang purba. Tile organik 32x32, latar sarang gelap dengan
  // sulur dan spora hijau, dekor batu dan pakis.
  const hive = {
    id: 'hive',
    nama: 'Sarang Purba',
    bg: '../assets/mh4/hive/bg/scene.png',
    tiles: {
      top: '../assets/mh4/hive/tiles/top.png',
      fill: '../assets/mh4/hive/tiles/fill.png',
      fillDark: '../assets/mh4/hive/tiles/fill_dark.png',
      platform: '../assets/mh4/hive/tiles/platform.png',
    },
    decor: {
      tree: '../assets/mh4/hive/decor/boulder.png',
      bush: '../assets/mh4/hive/decor/rock.png',
      grass: '../assets/mh4/hive/decor/fern.png',
    },
    decorSize: { tree: [32, 30], bush: [22, 20], grass: [24, 24] },
    hero: green.hero,
    palette: {
      sky: '#1a0c14',
      ground: '#8f5a6a',
      groundDark: '#4a2833',
      spike: '#caff5a',
      star: '#c8ff6a',
      gold: '#ffd166',
      text: '#ffeaf2',
      panel: 'rgba(30, 12, 20, .86)',
    },
  };
  THEMES.hive = hive;

  // Tema ketujuh: kota siang. Tile urban 16x16 (atap, bata, aspal) dan latar city-day.
  const day = {
    id: 'day',
    nama: 'Kota Siang',
    bg: '../assets/mh4/day/bg/scene.png',
    tiles: {
      top: '../assets/mh4/day/tiles/top.png',
      fill: '../assets/mh4/day/tiles/fill.png',
      fillDark: '../assets/mh4/day/tiles/fill_dark.png',
      platform: '../assets/mh4/day/tiles/platform.png',
    },
    decor: {
      tree: '../assets/mh4/day/decor/crate.png',
      bush: '../assets/mh4/day/decor/box.png',
      grass: '../assets/mh4/day/decor/cone.png',
    },
    decorSize: { tree: [38, 38], bush: [20, 20], grass: [14, 14] },
    hero: green.hero,
    palette: {
      sky: '#a9c8e0',
      ground: '#8a4a4a',
      groundDark: '#4a2a30',
      spike: '#e4572e',
      star: '#ffe066',
      gold: '#f6b93b',
      text: '#ffffff',
      panel: 'rgba(24, 32, 52, .82)',
    },
  };
  THEMES.day = day;

  // Tema kedelapan: benteng batu. Bata merah di atas dinding navy dari Medieval Tileset,
  // latar aula berpilar dengan cahaya obor.
  const castle = {
    id: 'castle',
    nama: 'Benteng Batu',
    bg: '../assets/mh4/castle/bg/scene.png',
    tiles: {
      top: '../assets/mh4/castle/tiles/top.png',
      fill: '../assets/mh4/castle/tiles/fill.png',
      fillDark: '../assets/mh4/castle/tiles/fill_dark.png',
      platform: '../assets/mh4/castle/tiles/platform.png',
    },
    decor: {
      tree: '../assets/mh4/castle/decor/barrel.png',
      bush: '../assets/mh4/castle/decor/chest.png',
      grass: '../assets/mh4/castle/decor/torch.png',
    },
    decorSize: { tree: [22, 22], bush: [20, 18], grass: [18, 18] },
    hero: green.hero,
    palette: {
      sky: '#16112a',
      ground: '#a03750',
      groundDark: '#3a2036',
      spike: '#7b8cff',
      star: '#ffe066',
      gold: '#f2b53c',
      text: '#ffeef2',
      panel: 'rgba(24, 16, 40, .86)',
    },
  };
  THEMES.castle = castle;

  return { THEMES, get: (id) => THEMES[id] || green };
});
