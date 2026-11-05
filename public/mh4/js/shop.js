// Math Hero 4: katalog toko dan equipment. Data murni: tidak tahu DOM maupun Firebase.
// Empat slot: asahan, laras, armor, dan benda berguna (kunci data: jimat). Satu item per slot; efeknya dijumlahkan
// oleh progress.loadout() lalu dipakai Sim.create().
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).shop = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  // Efek yang dikenal: meleeMul, rangedMul, maxHp, cooldownMul (semua senjata),
  // rangedCooldownMul (senjata jauh), speedMul, coinMul.
  const ITEMS = [
    { id: 'pedang-biasa', slot: 'pedang', nama: 'Tanpa Asahan', price: 0, desc: 'Bawaan awal.', effects: {} },
    { id: 'blaster-biasa', slot: 'blaster', nama: 'Tanpa Laras', price: 0, desc: 'Bawaan awal.', effects: {} },
    { id: 'mata-baja', slot: 'pedang', nama: 'Mata Baja', price: 90, desc: 'Senjata dekat +20% damage.', effects: { meleeMul: 1.2 } },
    { id: 'bilah-api', slot: 'pedang', nama: 'Bilah Api', price: 220, desc: 'Senjata dekat +45% damage.', effects: { meleeMul: 1.45 } },
    { id: 'pedang-kristal', slot: 'pedang', nama: 'Asahan Kristal', price: 380, desc: 'Senjata dekat +70% damage.', effects: { meleeMul: 1.7 } },
    { id: 'laras-panjang', slot: 'blaster', nama: 'Laras Panjang', price: 100, desc: 'Senjata jauh +20% damage.', effects: { rangedMul: 1.2 } },
    { id: 'pendingin', slot: 'blaster', nama: 'Pendingin', price: 200, desc: 'Senjata jauh 20% lebih cepat.', effects: { rangedCooldownMul: 0.8 } },
    { id: 'blaster-plasma', slot: 'blaster', nama: 'Laras Plasma', price: 360, desc: 'Senjata jauh +50% damage, 10% lebih cepat.', effects: { rangedMul: 1.5, rangedCooldownMul: 0.9 } },
    { id: 'rompi-kulit', slot: 'armor', nama: 'Rompi Kulit', price: 80, desc: 'HP maksimal +10.', effects: { maxHp: 10 } },
    { id: 'zirah-besi', slot: 'armor', nama: 'Zirah Besi', price: 190, desc: 'HP maksimal +20.', effects: { maxHp: 20 } },
    { id: 'jubah-bintang', slot: 'armor', nama: 'Jubah Bintang', price: 320, desc: 'HP +12 dan gerak 5% lebih cepat.', effects: { maxHp: 12, speedMul: 1.05 } },
    { id: 'magnet-koin', slot: 'jimat', nama: 'Magnet Koin', price: 110, desc: 'Koin dari level +25%.', effects: { coinMul: 1.25 } },
    { id: 'sepatu-angin', slot: 'jimat', nama: 'Sepatu Angin', price: 150, desc: 'Gerak 12% lebih cepat.', effects: { speedMul: 1.12 } },
    { id: 'jimat-hati', slot: 'jimat', nama: 'Kalung Hati', price: 240, desc: 'HP +8 dan serangan 5% lebih cepat.', effects: { maxHp: 8, cooldownMul: 0.95 } },
  ];

  const BY_ID = {};
  for (const it of ITEMS) BY_ID[it.id] = it;
  const SLOTS = ['pedang', 'blaster', 'armor', 'jimat'];
  const BASE_OWNED = ['pedang-biasa', 'blaster-biasa'];
  const BASE_EQUIPPED = { pedang: 'pedang-biasa', blaster: 'blaster-biasa', armor: null, jimat: null };

  function get(id) { return BY_ID[id] || null; }
  function bySlot(slot) { return ITEMS.filter((it) => it.slot === slot); }
  function baseLoadout() {
    return { meleeMul: 1, rangedMul: 1, maxHp: 0, cooldownMul: 1, rangedCooldownMul: 1, speedMul: 1, coinMul: 1 };
  }

  return { ITEMS, BY_ID, SLOTS, BASE_OWNED, BASE_EQUIPPED, get, bySlot, baseLoadout };
});
