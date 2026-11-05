// Math Hero 4: tutorial kontrol di misi pertama. Murni logika, tanpa DOM.
// Tiap langkah tampil sampai pemain benar-benar melakukannya, jadi anak tidak perlu membaca menu.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).tutor = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  const STEPS = [
    {
      keyboard: 'Tekan panah kanan untuk berjalan.',
      touch: 'Tahan tombol kanan untuk berjalan.',
      done: (g, s) => g.p.x > s.x0 + 40,
    },
    {
      keyboard: 'Tekan Spasi untuk melompat. Tahan supaya lebih tinggi.',
      touch: 'Tekan tombol hijau untuk melompat. Tahan supaya lebih tinggi.',
      done: (g) => !g.p.onGround && g.p.vy < 0,
    },
    {
      keyboard: 'Di udara, tekan Spasi sekali lagi untuk lompat ganda.',
      touch: 'Di udara, tekan tombol hijau sekali lagi untuk lompat ganda.',
      done: (g) => !!g.djumpUsed,
    },
    {
      keyboard: 'Tekan J untuk menyerang.',
      touch: 'Tekan tombol merah untuk menyerang.',
      done: (g) => g.cooldown > 0,
    },
    {
      keyboard: 'Tekan K untuk ganti senjata dekat dan jauh.',
      touch: 'Tekan tombol biru untuk ganti senjata dekat dan jauh.',
      skip: (g) => g.weapons.length < 2,
      done: (g, s) => g.weaponIndex !== s.weaponIndex,
    },
  ];

  const textOf = (step, touch) => (touch ? step.touch : step.keyboard);

  function create(game) {
    return { game, i: 0, x0: game.p.x, weaponIndex: game.weaponIndex };
  }

  // Mengembalikan teks langkah yang berjalan, atau null bila tutorial sudah habis.
  function update(state, touch) {
    const g = state.game;
    while (state.i < STEPS.length) {
      const step = STEPS[state.i];
      if (!(step.skip && step.skip(g)) && !step.done(g, state)) return textOf(step, touch);
      state.i++;
      state.x0 = g.p.x;
      state.weaponIndex = g.weaponIndex;
    }
    return null;
  }

  return { STEPS, create, update };
});
