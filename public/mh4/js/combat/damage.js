// Math Hero 4: aturan damage murni. Tidak tahu canvas, DOM, atau jenis musuh.
// Semua angka damage dibulatkan ke bilangan bulat supaya HUD dan angka melayang mudah dibaca.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).damage = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  const MIN_DAMAGE = 1;

  // Target minimal punya { hp }. Bila punya invuln > 0, damage diabaikan.
  function hit(target, amount, opts) {
    opts = opts || {};
    if (!target || target.dead || target.hp === undefined) return 0;
    if (target.invuln > 0) return 0;
    const mul = opts.multiplier === undefined ? 1 : opts.multiplier;
    const dealt = Math.max(MIN_DAMAGE, Math.round(amount * mul));
    target.hp = Math.max(0, target.hp - dealt);
    if (target.hp <= 0) {
      target.hp = 0;
      target.dead = true;
    }
    if (target.hurtT !== undefined) target.hurtT = opts.hurtTime || 0.18;
    return dealt;
  }

  // Scaling ringan per tier: musuh naik HP, tetapi tidak eksponensial.
  function scale(base, tier, perTier) {
    return Math.round(base * (1 + (perTier === undefined ? 0.18 : perTier) * (tier || 0)));
  }

  function damageEvent(target, amount, x, y, extra) {
    return Object.assign({ type: 'damage', target, amount, x, y }, extra || {});
  }

  return { MIN_DAMAGE, hit, scale, damageEvent };
});
