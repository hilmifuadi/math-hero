// Math Hero 4: validasi BossSchema. Data boleh berbeda-beda, tetapi kontrak
// fairness tidak boleh dilanggar (telegraph, recovery, fase menurun, pool valid,
// ada celah menyerang, dan summon dibatasi).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).bossSchema = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  const KINDS = ['slam', 'projectile_fan', 'falling_hazard', 'charge', 'ground_wave', 'floor_burst', 'summon'];

  function validate(schema) {
    const bad = [];
    if (!schema || typeof schema !== 'object') return ['schema boss kosong'];
    if (!schema.id) bad.push('id wajib');
    if (!schema.nama) bad.push('nama wajib');
    if (!(schema.maxHp > 0)) bad.push('maxHp harus > 0');
    if (!Array.isArray(schema.phases) || !schema.phases.length) bad.push('phases wajib');
    if (!schema.attacks || typeof schema.attacks !== 'object') bad.push('attacks wajib');
    const fair = schema.fairness || {};
    const minTele = fair.minTelegraph === undefined ? 0.4 : fair.minTelegraph;
    const minRec = fair.minRecovery === undefined ? 0.5 : fair.minRecovery;
    const attacks = schema.attacks || {};
    for (const [id, a] of Object.entries(attacks)) {
      if (!a.kind) bad.push(`serangan ${id}: kind wajib`);
      else if (!KINDS.includes(a.kind)) bad.push(`serangan ${id}: kind ${a.kind} tidak dikenal`);
      if (!(a.telegraph >= minTele)) bad.push(`serangan ${id}: telegraph < ${minTele}`);
      if (!(a.active > 0)) bad.push(`serangan ${id}: active harus > 0`);
      if (!(a.recovery >= minRec)) bad.push(`serangan ${id}: recovery < ${minRec}`);
      if (!(a.damage >= 0)) bad.push(`serangan ${id}: damage tidak valid`);
      if (a.kind === 'charge' && !a.toWall && !(a.range > 0)) bad.push(`serangan ${id}: charge butuh range atau toWall`);
      if (a.kind === 'summon' && !(fair.maxSummons >= 1)) bad.push(`serangan ${id}: summon butuh fairness.maxSummons`);
    }
    let last = 1.01;
    const opening = fair.guaranteedOpeningAfter || 0;
    for (const ph of schema.phases || []) {
      if (!(ph.hpFrom > 0 && ph.hpFrom <= last)) bad.push(`fase ${ph.id}: hpFrom harus menurun`);
      last = ph.hpFrom;
      if (!Array.isArray(ph.pool) || !ph.pool.length) bad.push(`fase ${ph.id}: pool kosong`);
      let opens = false;
      for (const entry of ph.pool || []) {
        const a = attacks[entry.id];
        if (!a) { bad.push(`fase ${ph.id}: serangan ${entry.id} tidak ada`); continue; }
        if (!(entry.weight > 0)) bad.push(`fase ${ph.id}: weight ${entry.id} harus > 0`);
        if (a.opens === false) continue;
        opens = true;
        const rec = (a.wallStun || a.recovery) * (ph.recoveryMul || 1);
        if (rec < opening) bad.push(`fase ${ph.id}: celah ${entry.id} ${rec.toFixed(2)} < ${opening}`);
      }
      if ((ph.pool || []).length && !opens) bad.push(`fase ${ph.id}: tidak ada serangan yang membuka celah`);
    }
    if (!(schema.fairness && schema.fairness.maxActiveAttacks >= 1)) {
      bad.push('fairness.maxActiveAttacks minimal 1');
    }
    if (schema.weakPoint) {
      const wp = schema.weakPoint, b = schema.body || {};
      if (!(wp.w > 0 && wp.h > 0)) bad.push('weakPoint butuh ukuran');
      if (wp.oy < 0 || wp.oy + wp.h > b.h || wp.ox < 0 || wp.ox + wp.w > b.w) bad.push('weakPoint harus di dalam badan');
    }
    return bad;
  }

  return { validate, KINDS };
});
