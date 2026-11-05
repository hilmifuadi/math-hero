// Math Hero 4: validasi BossSchema. Data boleh berbeda-beda, tetapi kontrak
// fairness tidak boleh dilanggar (telegraph, recovery, fase menurun, pool valid).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).bossSchema = factory());
})(typeof self !== 'undefined' ? self : this, function () {
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
      if (!(a.telegraph >= minTele)) bad.push(`serangan ${id}: telegraph < ${minTele}`);
      if (!(a.active > 0)) bad.push(`serangan ${id}: active harus > 0`);
      if (!(a.recovery >= minRec)) bad.push(`serangan ${id}: recovery < ${minRec}`);
      if (!(a.damage >= 0)) bad.push(`serangan ${id}: damage tidak valid`);
    }
    let last = 1.01;
    for (const ph of schema.phases || []) {
      if (!(ph.hpFrom > 0 && ph.hpFrom <= last)) bad.push(`fase ${ph.id}: hpFrom harus menurun`);
      last = ph.hpFrom;
      if (!Array.isArray(ph.pool) || !ph.pool.length) bad.push(`fase ${ph.id}: pool kosong`);
      for (const entry of ph.pool || []) {
        if (!attacks[entry.id]) bad.push(`fase ${ph.id}: serangan ${entry.id} tidak ada`);
        if (!(entry.weight > 0)) bad.push(`fase ${ph.id}: weight ${entry.id} harus > 0`);
      }
    }
    if (!(schema.fairness && schema.fairness.maxActiveAttacks >= 1)) {
      bad.push('fairness.maxActiveAttacks minimal 1');
    }
    return bad;
  }

  return { validate };
});
