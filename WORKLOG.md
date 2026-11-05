# Worklog Math Hero

Papan kerja bersama untuk semua agen yang menyentuh repo ini. Tujuannya mencegah dua agen
mengerjakan area yang sama tanpa koordinasi.

**Wajib dibaca sebelum mengubah file.** File ini bukan dokumentasi arsitektur; dokumentasi
arsitektur ada di `AGENTS.md` dan `public/shared/LEVELGEN.md`.

**Status proyek saat worklog dibuat (2026-11-02):** Fase 0 dan Fase 1 selesai serta sudah
diverifikasi; perubahannya belum di-commit. Fase 2 belum dimulai. Keputusan Fase 2 yang
sudah dikunci: landscape 640x360, tile dunia 16 px, tema pertama Green zone. Detail lengkap
ada di `AGENTS.md`.

---

## 1. Aturan wajib

1. **Baca dulu.** Sebelum mulai, baca bagian "Klaim aktif" dan entri terbaru di "Riwayat".
2. **Cek tumpang tindih.** Jangan mengubah area yang sedang diklaim agen lain
   (`CLAIMED`, `IN_PROGRESS`, atau `BLOCKED`). Pilih area lain, pecah pekerjaan, atau tunggu.
3. **Tulis sebelum bekerja.** Tambahkan entri baru dengan status `CLAIMED` **sebelum**
   mengubah file. Setelah benar-benar mulai, ubah menjadi `IN_PROGRESS`.
4. **Selalu cantumkan nama agen.** Setiap entri, update status, dan catatan harus punya
   penanda nama (contoh: `opdi`). Jangan memakai nama samaran yang sama dengan agen lain.
5. **Klaim area secara eksplisit.** Tulis path atau kelompok file yang akan disentuh.
   Contoh: `public/mh4/js/gen/`, `tests/mh4_*.test.js`, `package.json`.
6. **Update status saat berubah.** Gunakan `BLOCKED` bila menunggu keputusan/izin, dan
   `RESOLVED` bila pekerjaan selesai serta sudah diverifikasi.
7. **Tandai resolved dengan bukti.** Entri `RESOLVED` wajib berisi ringkasan perubahan,
   tes yang dijalankan, dan status hash snapshot MH3 bila menyentuh generator.
8. **Jangan menghapus entri agen lain.** Hanya ubah entri milik sendiri. Riwayat bersifat
   append-only; koreksi ditulis sebagai catatan baru.
9. **Satu entri per tugas**, bukan per file. Satu tugas boleh menyentuh banyak file.
10. **Klaim kedaluwarsa.** Klaim tanpa update selama 24 jam boleh diambil alih. Agen baru
    wajib menulis entri baru yang menyebut klaim lama dan alasannya.
11. **Jangan commit/push** hanya karena worklog berubah. Ikuti aturan repo di `AGENTS.md`.

---

## 2. Status yang dipakai

| Status | Arti | Boleh ada di klaim aktif? |
|---|---|---|
| `CLAIMED` | Area sudah diklaim, belum ada perubahan kode | Ya |
| `IN_PROGRESS` | Sedang dikerjakan | Ya |
| `BLOCKED` | Menunggu keputusan, izin, atau agen lain | Ya |
| `RESOLVED` | Selesai dan sudah diverifikasi | Tidak |
| `ABANDONED` | Dibatalkan, area dilepas | Tidak |

---

## 3. Klaim aktif

| ID | Status | Agen | Area/klaim | Mulai | Update terakhir |
|---|---|---|---|---|---|
| WL-012 | IN_PROGRESS | opdi | `public/mh4/js/audio.js`, `public/mh4/js/main.js`, `public/mh4/index.html`, `tests/mh4_audio.test.js`, `package.json`, `public/mh4/README.md`, `AGENTS.md` | 2026-11-05 11:25 +07:00 | 2026-11-05 11:25 +07:00 |

Jika tabel hanya berisi tanda "—", tidak ada klaim aktif. Tetap cek "Riwayat" untuk
pekerjaan yang baru selesai agar tidak mengulang atau menimpa hasilnya.

---

## 4. Template entri baru

Salin ke bagian "Riwayat" paling atas, lalu isi. Jangan lupa menambahkan baris di tabel
"Klaim aktif" selama status masih aktif.

```markdown
### WL-XXX — Judul singkat
- **Agen:** nama-agen
- **Status:** CLAIMED
- **Area/klaim:** `path/ke/file/atau/folder/`
- **Rencana:** satu sampai tiga kalimat tentang apa yang akan dikerjakan
- **File disentuh:** daftar file (boleh diisi sambil jalan)
- **Tes:** perintah yang akan/ sudah dijalankan
- **Mulai:** YYYY-MM-DD HH:mm +07:00
- **Update terakhir:** YYYY-MM-DD HH:mm +07:00
- **Resolved:** -
- **Catatan:** risiko, keputusan, atau hal yang masih terbuka
- **Linimasa:**
  - HH:mm — nama-agen — CLAIMED: alasan singkat
  - HH:mm — nama-agen — IN_PROGRESS: apa yang mulai dikerjakan
```

Saat selesai:

```markdown
- **Status:** RESOLVED
- **Resolved:** YYYY-MM-DD HH:mm +07:00
- **Ringkasan:** apa yang berubah dan hasil akhirnya
- **Tes:** perintah + hasil (contoh: `npm run test:snapshot` — 8 hash sama)
- **Linimasa:**
  - ...
  - HH:mm — nama-agen — RESOLVED: alasan singkat
```

Lalu hapus baris entri itu dari tabel "Klaim aktif".

---

## 5. Riwayat

### WL-016 — Paket 4: markas top down, cerita, dan visual baru
- **Agen:** claude-opus
- **Status:** RESOLVED
- **Area/klaim:** `public/mh4/`, `public/assets/mh4/v2/`, `scripts/prepare_assets_mh4.js`,
  `scripts/pngtool.js`, `tests/mh4_base.test.js`, `tests/mh4_smoke.test.js`, `tests/mh4_layout_ui.js`,
  `tests/mh4_progress.test.js`, `tests/mh4_boss.test.js`, `package.json`, `docs/firestore.rules`
- **Ringkasan:** Mode markas Kampung Lumbung (peta, rumah, warga, ladang, papan misi), cerita
  "Bayu dan Kabut Kacau" dengan rute misi per bab, hero Bayu di kedua mode, musuh dan boss baru,
  UI papan kayu, parallax, tanah tidak lagi bergaris, dekorasi dipudarkan. Musuh aktif saat hero
  dekat, berbalik di tepi jurang, dan lebih padat. Soal berubah tiap hari, tombol 1 sampai 4 di laptop.
- **Tes:** `npm run test:mh4`, `npm run test:snapshot`, tampilan browser 844x390.
- **Mulai:** 2026-11-05 18:45 +07:00
- **Update terakhir:** 2026-11-05 19:30 +07:00
- **Resolved:** 2026-11-05 19:30 +07:00
- **Catatan:** Entri ditulis setelah kode diubah. Belum di-commit. Aset lama `boss/penjaga`, `boss/raja`,
  `enemies`, dan `hero` tidak lagi dipakai game; belum dihapus. Mekanik platforming baru belum dibuat.
- **Linimasa:**
  - 19:30 — claude-opus — RESOLVED: perintah pengguna untuk paket 4.
  - 19:35 — claude-opus — CATATAN: atas perintah pengguna, turunan Cute Fantasy dan Mystic Woods masuk
    `.gitignore`, README menjelaskan cara mengunduh, dan skrip aset melewati paket yang tidak ada.
  - 19:40 — claude-opus — CATATAN: pengguna membatalkan `.gitignore` itu; semua aset v2 tetap di repo.
    Paket tanpa berkas lisensi dianggap bebas dipakai atas keputusan pengguna.

### WL-015 — Paket 3: progresi, senjata, dan kurva kesulitan
- **Agen:** claude-opus
- **Status:** RESOLVED
- **Area/klaim:** `public/mh4/js/combat/weapons.js`, `public/mh4/js/{sim,scene,main,progress,shop}.js`,
  `public/mh4/js/gen/levels.js`, `public/mh4/index.html`, `docs/firestore.rules`,
  `tests/mh4_combat.test.js`, `tests/mh4_progress.test.js`, `public/mh4/README.md`, `AGENTS.md`
- **Ringkasan:**
  - Senjata baru Tombak, Palu, Pelontar (meledak), dan Pemantul, didapat dari peti level 2, 4, 7,
    dan 10. Hanya damage yang naik mengikuti level.
  - Upgrade point Health, Attack, Speed: satu poin tiap level baru, dua untuk boss, maksimal 6
    tingkat. Simpanan lama mendapat poin dari level yang sudah selesai.
  - `power` per level menggantikan tier 3 yang datar. HP dan serangan boss ikut sebagian kekuatan
    hero. Item toko kini umum per jenis senjata; `Pendingin` hanya untuk senjata jauh.
- **Tes:**
  - `npm run test:mh4` → **95 tes lulus** (16 combat, 16 progresi, 25 boss).
  - `npm run test:snapshot` → 8 hash MH3 sama.
  - Browser 844x390: kartu senjata baru, panel upgrade, dan efek langsung ke game; console tanpa error.
  - Belum diuji: keseimbangan lewat permainan nyata, HP sungguhan, audio, `npm test` penuh.
- **Mulai:** 2026-11-05 18:27 +07:00
- **Update terakhir:** 2026-11-05 19:00 +07:00
- **Resolved:** 2026-11-05 19:00 +07:00
- **Catatan:** Entri ini baru ditulis setelah kode diubah; seharusnya sebelum mulai. Aturan
  Firestore berubah dan belum dipublikasikan. Belum di-commit, menunggu izin pengguna.
- **Linimasa:**
  - 19:00 — claude-opus — RESOLVED: perintah pengguna "lanjut paket berikutnya".

### WL-014 — Paket 2: boss seru dan adil
- **Agen:** claude-opus
- **Status:** RESOLVED
- **Area/klaim:** `public/mh4/js/boss/`, `public/mh4/js/sim.js`, `public/mh4/js/scene.js`,
  `public/mh4/js/main.js`, `public/mh4/js/gen/levels.js`, `public/mh4/index.html`,
  `tests/mh4_boss.test.js`, `tests/mh4_levelgen.test.js`, `public/mh4/README.md`, `AGENTS.md`
- **Ringkasan:**
  - Kalah di arena mengulang encounter dari awal fase berjalan dan membersihkan semua serangan;
    setelah dua kali kalah damage ke hero 0,75x. Damage di luar celah 0,25x.
  - Sasaran serangan dikunci saat telegraph (`current.plan`), tiap jenis serangan punya tanda
    sendiri, dan damage/jarak charge mengikuti data. Slam tidak mengenai hero di platform.
  - Arena 27x15 dengan zoom 1,5: hero dan boss sebingkai, lantai di atas tombol sentuh.
  - Primitif baru `floor_burst` dan `summon`, weak point, tabrak dinding, `BossMachine.reset`.
  - Penjaga Mesin kini berciri kristal, Raja Bandit berciri serudukan ke dinding dan anak buah.
  - `boss/gen.js` merakit boss dari seed; level 17 `ACAK` memakai seed baru tiap main.
- **Tes:**
  - `npm run test:mh4` → **83 tes lulus** (25 boss, termasuk 200 seed BossGen x 3 kesulitan).
  - `npm run test:snapshot` → 8 hash MH3 sama.
  - Browser 844x390: tanda slam, semburan, batu, charge, celah kristal, dan pusing tampil; console
    tanpa error. Langkah waktu lewat `MH4.debug.step` karena panel tersembunyi.
  - Belum diuji: keseimbangan lewat permainan nyata, HP sungguhan, bunyi audio, `npm test` penuh.
- **Mulai:** 2026-11-05 15:40 +07:00
- **Update terakhir:** 2026-11-05 16:20 +07:00
- **Resolved:** 2026-11-05 16:20 +07:00
- **Catatan:** Perintah pengguna "lanjut paket perbaikan 2". Isi `audio.js` tidak diubah. Belum
  di-commit, menunggu izin pengguna.
- **Linimasa:**
  - 15:40 — claude-opus — CLAIMED: mulai dari aturan kalah dan telegraph.
  - 16:20 — claude-opus — RESOLVED: tes MH4, snapshot, dan tampilan browser lulus.

### WL-013 — Paket 1: game bisa dimainkan (beku saat lompat, tata letak HP)
- **Agen:** claude-opus
- **Status:** RESOLVED
- **Area/klaim:** `public/mh4/js/main.js`, `public/mh4/index.html`, `public/mh4/README.md`,
  `tests/mh4_smoke.test.js`, `tests/mh4_layout_ui.js`, `package.json`, `AGENTS.md`, `WORKLOG.md`
- **Ringkasan:** `playSfx` tidak lagi rekursif. Chip level, toko, suara, dan ulangi pindah ke menu
  jeda (tombol `Menu`, `Esc`, atau `P`). Layar tegak di perangkat sentuh menampilkan ajakan putar.
  Tombol sentuh hanya tampil di perangkat sentuh. Teks kartu ikut skala kanvas. Game memuat level
  terjauh yang terbuka, dan kartu menang punya tombol `Toko`.
- **Tes:**
  - `npm run test:mh4` → **73 tes lulus**, termasuk 5 tes asap baru yang memuat `main.js`.
  - `npm run test:snapshot` → 8 hash MH3 sama.
  - Browser 844x390, 375x812, 1562x1019: tidak ada tombol sentuh tertimpa, ajakan putar muncul,
    Esc membuka dan menutup menu, lompat/gerak/serang/ganti senjata tanpa error.
  - `tests/mh4_layout_ui.js` **belum pernah dijalankan** karena Playwright tidak terpasang di
    laptop ini. `npm test` penuh juga belum dijalankan.
- **Mulai:** 2026-11-05 14:58 +07:00
- **Update terakhir:** 2026-11-05 15:10 +07:00
- **Resolved:** 2026-11-05 15:10 +07:00
- **Catatan:** Menyentuh area klaim WL-012 (opdi) atas perintah langsung pengguna. Berkas WL-012
  tidak berubah sejak 11:32, tetapi klaimnya belum dilepas. Isi `audio.js` tidak diubah, dan
  `tests/mh4_audio.test.js` tetap belum ada. Belum diuji di HP sungguhan.
- **Linimasa:**
  - 14:58 — claude-opus — CLAIMED: perintah pengguna "lanjut kerjakan paket 1".
  - 15:10 — claude-opus — RESOLVED: tes MH4, snapshot, dan browser lulus; di-commit, belum di-push.

### WL-012 — Audio dan efek suara dasar MH4
- **Agen:** opdi
- **Status:** IN_PROGRESS
- **Area/klaim:** `public/mh4/js/audio.js`, `public/mh4/js/main.js`, `public/mh4/index.html`,
  `tests/mh4_audio.test.js`, `package.json`, `public/mh4/README.md`, `AGENTS.md`, `WORKLOG.md`
- **Rencana:** Menambah musik chiptune per tema dan efek suara lompat/serang/kena/bintang/
  menang/boss, plus tombol bisu yang tersimpan di `localStorage`. Tanpa file audio dan tanpa
  dependensi baru.
- **File disentuh:** `public/mh4/js/audio.js` (baru), `public/mh4/js/main.js`,
  `public/mh4/index.html`, `tests/mh4_audio.test.js` (baru), `package.json`
- **Tes:** `npm run test:mh4`, `npm run test:snapshot`, browser `/mh4/`
- **Mulai:** 2026-11-05 11:25 +07:00
- **Update terakhir:** 2026-11-05 11:25 +07:00
- **Resolved:** -
- **Catatan:** Hash MH3 tidak boleh berubah; audio hanya di `public/mh4/`.
- **Linimasa:**
  - 11:25 — opdi — CLAIMED: implementasi audio & SFX dasar.

### WL-011 — Perbaikan bintang/duri bertumpuk, objek melayang, dan equip instan
- **Agen:** opdi
- **Status:** RESOLVED
- **Area/klaim:** `public/mh4/js/gen/chunks.js`, `public/mh4/js/scene.js`, `public/mh4/js/main.js`,
  `public/mh4/js/sim.js`, `tests/mh4_*.test.js`, `public/mh4/README.md`, `WORKLOG.md`
- **Rencana:** (1) Rapikan `r-spike-run`, `r-triple-spike`, `r-crystal-bridge`, dan `r-maw`
  agar duri menempel tanah dan bintang tidak bertumpuk/berdekatan dengan duri.
  (2) Gambar peti menempel permukaan tanah. (3) Terapkan loadout equipment ke game aktif
  segera setelah ganti equip.
- **File disentuh:** `public/mh4/js/gen/chunks.js`, `public/mh4/js/scene.js`,
  `public/mh4/js/main.js`, `public/mh4/js/sim.js`, `tests/mh4_levelgen.test.js`,
  `tests/mh4_progress.test.js`, `public/mh4/README.md`, `AGENTS.md`
- **Ringkasan:**
  - `r-spike-run`, `r-triple-spike`, dan `r-crystal-bridge`: baris duri dipindah tepat di atas
    baris tanah `FULL`, dan bintang dipindah dua baris di atasnya sehingga tidak menempel duri.
  - `r-maw`: lengkungan dipendekkan, duri ditaruh di lantai di bawah lengkungan, dan bintang
    dipindah ke baris aman. Tidak ada lagi duri yang melayang.
  - `scene.js drawObjects`: dasar peti digambar di `ch.y + 15` (tepat `(r + 1) * 16`), jadi
    peti menempel permukaan tanah, bukan menggantung 3 px.
  - `sim.js` mendapat `applyLoadout(g, loadout)` yang memperbarui `g.loadout` dan `g.maxHp`
    serta menjaga rasio HP. `main.js` memanggilnya segera setelah beli/pasang equipment,
    sehingga perubahan stats langsung terasa di level berjalan.
- **Tes:**
  - `npm run test:mh4` → **68 tes lulus**: 13 generator, 13 simulasi, 8 combat, 7 musuh,
    15 boss, 12 progresi (tes baru: duri menempel tanah/bintang tidak bertumpuk, dan equip
    langsung berlaku pada game berjalan).
  - `npm run test:snapshot` → **8 hash MH3 sama**: `c24d78216314`, `a51223705754`,
    `04d5e663cfc7`, `41cc04504046`, `baa10cc1883e`, `e17f53c6eadc`, `a5fc860bf1c6`,
    `9371db1b489e`.
  - Browser `/mh4/?v=fix3`: pemindaian 64 chunk + 16 peta (14 level + 2 boss) tidak menemukan
    duri melayang atau bintang menempel duri; mengganti armor di toko langsung mengubah
    `maxHp` game berjalan (58 → 48); piksel badan peti menutup celah sampai garis tanah;
    console tanpa error.
  - `npm test` (seluruh suite) → lulus: skor, bonus, bank soal, snapshot + browser + bot,
    68 tes MH4, template, migrasi simpanan, MH2, seluruh MH3, dan 35 tes matematika.
- **Mulai:** 2026-11-05 11:10 +07:00
- **Update terakhir:** 2026-11-05 11:13 +07:00
- **Resolved:** 2026-11-05 11:13 +07:00
- **Catatan:** Hash MH3 tetap sama. Perubahan belum di-commit.
- **Linimasa:**
  - 11:10 — opdi — CLAIMED: tiga bug gameplay dari pengguna.
  - 11:11 — opdi — IN_PROGRESS: memperbaiki chunk, render peti, dan alur equip.
  - 11:13 — opdi — RESOLVED: 68 tes MH4 + snapshot + browser hijau.

### WL-010 — Fase 4f–4h: roster musuh, boss kedua, progresi + toko + equipment
- **Agen:** opdi
- **Status:** RESOLVED
- **Area/klaim:** `public/mh4/js/combat/`, `public/mh4/js/boss/`, `public/mh4/js/{sim,scene,main,theme}.js`,
  `public/mh4/js/gen/levels.js`, `public/mh4/index.html`, `public/assets/mh4/`, `tests/mh4_*`,
  `package.json`, `public/mh4/README.md`, `AGENTS.md`, `docs/firestore.rules`, `WORKLOG.md`
- **Rencana:** (4f) roster tiga musuh walker/jumper/shooter dengan sprite City Enemies;
  (4g) boss kedua **Raja Bandit** dengan sprite boss pack tipe 3 dan serangan gelombang tanah;
  (4h) progresi, toko, dan equipment penuh dengan penyimpanan Firebase Firestore + fallback
  localStorage. Hash snapshot MH3 wajib tetap sama.
- **Ringkasan:**
  - **4f:** `combat/enemies.js` mendefinisikan walker (`e`), jumper (`a`), dan shooter (`g`)
    dengan HP/damage yang diskalakan per tier. Sim mendukung lompatan musuh, tembakan musuh
    (`g.bullets`), stomp, dan knockback. Generator membuka tipe per tier (1 walker, 2 +jumper,
    3 +shooter) dan memilihnya deterministik dari seed. Renderer memuat lima state animasi
    tiap tipe dari `public/assets/mh4/enemies/`.
  - **4g:** `BossMachine` mendapat primitif `ground_wave`; `boss/bosses/raja-bandit.js` berisi
    Raja Bandit (280 HP, dua fase pada 55%, serangan slam/fan/wave/rocks/charge). Arena baru
    `BOSS2` (id 16, tema castle), `BOSSES`/`ALL` diekspor, `main.js` memakai `ALL`, chip
    `BOSS 2` ditambahkan, dan teks menang memakai nama boss aktif.
  - **4h:** `shop.js` (14 item, 4 slot: pedang/blaster/armor/jimat), `progress.js` (profil,
    koin, bintang terbaik, beli/equip, unlock berurutan, normalisasi data, localStorage),
    dan `cloud.js` (Firestore koleksi `saves`, SDK dinamis, fallback offline). `sim.js`
    menerima `loadout` untuk HP, damage, cooldown, dan kecepatan. `main.js` menambahkan panel
    toko, koin HUD, simpan otomatis saat menang, dan muat progres cloud. Aturan Firestore
    diperbarui di `docs/firestore.rules`.
- **Tes:**
  - `npm run test:mh4` → **66 tes lulus**: 12 generator, 13 simulasi, 8 combat, 7 musuh,
    15 boss, 11 progresi.
  - `npm run test:snapshot` → **8 hash MH3 sama**: `c24d78216314`, `a51223705754`,
    `04d5e663cfc7`, `41cc04504046`, `baa10cc1883e`, `e17f53c6eadc`, `a5fc860bf1c6`,
    `9371db1b489e`.
  - Browser `/mh4/?v=phase4h3`: tanpa error console; level 5 memuat empat musuh campuran
    (jumper/walker/shooter) dengan semua aset 200; BOSS 2 memuat Raja Bandit 280 HP dan
    gelombang tanah dibuat; menang level 1 memberi +20 koin dan membuka level 2; membeli
    Mata Baja memotong koin dan memasang equipment; semua aset `boss/raja/*` 200.
- **Mulai:** 2026-11-05 10:22 +07:00
- **Update terakhir:** 2026-11-05 10:31 +07:00
- **Resolved:** 2026-11-05 10:31 +07:00
- **Catatan:** Perubahan belum di-commit dan belum di-push. Sinkronisasi cloud memerlukan
  aturan `docs/firestore.rules` dipublikasikan manual di Firebase Console; sebelum itu
  `cloud.save()` mengembalikan `false` dan game tetap memakai localStorage. Level kini
  terbuka berurutan; untuk pengujian manual semua level tetap bisa dibuka lewat
  `window.MH4.debug.startLevel(i)`. Screenshot browser tidak bisa diambil karena jendela
  desktop tidak terlihat, tetapi canvas diperiksa non-kosong dan aset termuat 200.
- **Linimasa:**
  - 10:22 — opdi — CLAIMED: memulai roster musuh, boss kedua, dan progresi/toko/equipment
  - 10:22 — opdi — IN_PROGRESS: roster musuh selesai; lanjut boss kedua dan progresi
  - 10:29 — opdi — IN_PROGRESS: boss kedua, toko, equipment, Firebase, dan tes selesai
  - 10:31 — opdi — RESOLVED: 66 tes MH4 + 8 snapshot MH3 + browser lulus

### WL-009 — Fase 4e: tema Benteng Batu dan chunk baru MH4
- **Agen:** opdi
- **Status:** RESOLVED
- **Area/klaim:** `public/mh4/js/gen/`, `public/mh4/js/theme.js`, `public/mh4/index.html`,
  `public/assets/mh4/castle/`, `tests/mh4_levelgen.test.js`, `public/mh4/README.md`,
  `AGENTS.md`, `WORKLOG.md`
- **Rencana:** Menambah tema kedelapan **Benteng Batu** dari Medieval Tileset 32x32,
  8 chunk baru, serta level baru. Arena boss bergeser ke level terakhir. Snapshot MH3
  tidak berubah.
- **File disentuh:**
  - `public/mh4/js/theme.js` (entri `castle`, total 8 tema)
  - `public/mh4/js/gen/chunks.js` (8 chunk baru, total 64)
  - `public/mh4/js/gen/levels.js` (level 13 `Gerbang Benteng`, level 14 `Aula Bawah`,
    `BOSS.id` menjadi 15)
  - `public/mh4/index.html` (chip level 13–14, chip BOSS level 15, judul Delapan Zona)
  - `public/assets/mh4/castle/{bg,tiles,decor}/...`
  - `tests/mh4_levelgen.test.js` (14 level, 8 tema, seluruh 64 chunk terpakai)
  - `public/mh4/README.md`, `AGENTS.md`, `WORKLOG.md`
- **Ringkasan:** Tema `castle` memakai tile medieval 48x48: `top` berupa deretan bata merah,
  `fill` dinding bata penuh, `fillDark` dinding navy berbata jarang, dan `platform` batu biru.
  Latar 576x324 dibuat dari ubin dinding navy, pilar bata, lengkungan, dan cahaya obor. Dekor
  berupa barel, peti, dan obor. Delapan chunk baru menambah variasi benteng, rampart, gerbang,
  halaman, menara, tangga spiral, penjara bawah, dan gudang bawah. Level 13 (seed 201202)
  menutup seluruh 6 chunk yang belum terpakai dalam satu seed; level 14 hanya menambah
  kehadiran tema. Arena **Penjaga Mesin** sekarang level 15.
- **Tes:**
  - `npm run test:mh4` → **44 tes lulus**: 11 generator, 13 simulasi, 8 combat, 12 boss.
    Generator memverifikasi 14 level, 8 tema terpakai, dan seluruh 64 chunk terpakai.
  - `npm run test:snapshot` → **8 hash MH3 sama**: `c24d78216314`, `a51223705754`,
    `04d5e663cfc7`, `41cc04504046`, `baa10cc1883e`, `e17f53c6eadc`, `a5fc860bf1c6`,
    `9371db1b489e`.
  - Browser `/mh4/?v=phase4e`: tanpa error console; level 13 "Gerbang Benteng", level 14
    "Aula Bawah", dan chip BOSS memuat "Level 15: Penjaga Mesin".
- **Mulai:** 2026-11-05 01:40 +07:00
- **Update terakhir:** 2026-11-05 01:45 +07:00
- **Resolved:** 2026-11-05 01:45 +07:00
- **Catatan:** Perubahan belum di-commit dan belum di-push. Satu seed (201202) cukup menutup
  keenam chunk yang belum terpakai, jadi level 14 hanya untuk memperkuat tema. Tile sumber
  48x48 diperkecil ke 16 px dunia oleh renderer seperti tema lain.
- **Linimasa:**
  - 01:40 — opdi — CLAIMED: memulai tema Benteng Batu dan chunk baru
  - 01:42 — opdi — IN_PROGRESS: aset, 8 chunk, dan dua level baru siap
  - 01:44 — opdi — IN_PROGRESS: tes lulus; browser memuat level 13/14 dan BOSS 15
  - 01:45 — opdi — RESOLVED: dokumentasi dan worklog selesai

### WL-008 — Fase 4d: tema Kota Siang dan chunk baru MH4
- **Agen:** opdi
- **Status:** RESOLVED
- **Area/klaim:** `public/mh4/js/gen/`, `public/mh4/js/theme.js`, `public/mh4/index.html`,
  `public/assets/mh4/day/`, `tests/mh4_levelgen.test.js`, `public/mh4/README.md`,
  `AGENTS.md`, `WORKLOG.md`
- **Rencana:** Menambah tema ketujuh **Kota Siang** dari tileset urban 16x16 dan latar
  city-day, 8 chunk baru, serta level baru. Arena boss bergeser ke level terakhir.
  Snapshot MH3 tidak berubah.
- **File disentuh:**
  - `public/mh4/js/theme.js` (entri `day`, total 7 tema)
  - `public/mh4/js/gen/chunks.js` (8 chunk baru, total 56)
  - `public/mh4/js/gen/levels.js` (level 11 `Distrik Bata`, level 12 `Atap Kota`,
    `BOSS.id` menjadi 13)
  - `public/mh4/index.html` (chip level 11–12, chip BOSS level 13, judul Tujuh Zona)
  - `public/assets/mh4/day/{bg,tiles,decor}/...`
  - `tests/mh4_levelgen.test.js` (12 level, 7 tema, seluruh 56 chunk terpakai)
  - `public/mh4/README.md`, `AGENTS.md`, `WORKLOG.md`
- **Ringkasan:** Tema `day` memakai tile urban 16x16 (atap, bata, aspal, trotoar) dan latar
  city-day 576x324 hasil komposisi lima lapisan. Dekor berupa crate, box, dan cone. Delapan
  chunk baru menambah variasi jalan, penyeberangan, balkon, celah atap, lift, tangga darurat,
  manhole, dan tangga gedung. Level 11 (seed 13609) menutup hampir semua chunk kurang kecuali
  `r-balcony`; level 12 (seed 1000) menutup sisanya sehingga seluruh 56 chunk terpakai. Arena
  **Penjaga Mesin** sekarang level 13. Nama level sempat `Jalan Beton`/`Atap Baja` lalu diganti
  menjadi `Distrik Bata`/`Atap Kota` agar cocok dengan visual bata.
- **Tes:**
  - `npm run test:mh4` → **44 tes lulus**: 11 generator, 13 simulasi, 8 combat, 12 boss.
    Generator memverifikasi 12 level, 7 tema terpakai, dan seluruh 56 chunk terpakai.
  - `npm run test:snapshot` → **8 hash MH3 sama**: `c24d78216314`, `a51223705754`,
    `04d5e663cfc7`, `41cc04504046`, `baa10cc1883e`, `e17f53c6eadc`, `a5fc860bf1c6`,
    `9371db1b489e`.
  - Browser `/mh4/?v=phase4d2`: tanpa error console; level 11 "Distrik Bata", level 12
    "Atap Kota", dan chip BOSS memuat "Level 13: Penjaga Mesin".
- **Mulai:** 2026-11-05 01:23 +07:00
- **Update terakhir:** 2026-11-05 01:34 +07:00
- **Resolved:** 2026-11-05 01:34 +07:00
- **Catatan:** Perubahan belum di-commit dan belum di-push. Dua level dipakai karena satu
  seed belum cukup menutup semua chunk yang belum terpakai. Level 12 hanya punya satu baris
  tanah sehingga latar terlihat di bawahnya, tetapi tetap terbaca.
- **Linimasa:**
  - 01:23 — opdi — CLAIMED: memulai tema Kota Siang dan chunk baru
  - 01:25 — opdi — IN_PROGRESS: menyiapkan aset, 8 chunk, dan level baru
  - 01:31 — opdi — IN_PROGRESS: tes lulus; nama level disesuaikan dengan visual bata
  - 01:34 — opdi — RESOLVED: browser, dokumentasi, dan worklog selesai

### WL-007 — Fase 4c: tema Sarang Purba dan chunk baru MH4
- **Agen:** opdi
- **Status:** RESOLVED
- **Area/klaim:** `public/mh4/js/gen/`, `public/mh4/js/theme.js`, `public/mh4/index.html`,
  `public/assets/mh4/hive/`, `tests/mh4_levelgen.test.js`, `public/mh4/README.md`,
  `AGENTS.md`, `WORKLOG.md`
- **Rencana:** Menambah tema keenam **Sarang Purba** dari tile organik 32x32, 8 chunk baru,
  dan level baru. Arena boss bergeser ke level terakhir. Snapshot MH3 tidak berubah.
- **File disentuh:**
  - `public/mh4/js/theme.js` (entri `hive`, total 6 tema)
  - `public/mh4/js/gen/chunks.js` (8 chunk baru, total 48)
  - `public/mh4/js/gen/levels.js` (level 9 `Sarang Purba`, level 10 `Lorong Spora`,
    `BOSS.id` menjadi 11)
  - `public/mh4/index.html` (chip level 9–10, chip BOSS level 11, judul Enam Zona)
  - `public/assets/mh4/hive/{bg,tiles,decor}/...`
  - `tests/mh4_levelgen.test.js` (10 level, 6 tema, semua 48 chunk terpakai)
  - `public/mh4/README.md`, `AGENTS.md`, `WORKLOG.md`
- **Ringkasan:** Tema `hive` memakai tile organik 32x32, latar sarang 576x324 dengan sulur
  dan spora hijau, serta dekor batu dan pakis. Tile dan latar diberi kontras tambahan agar
  tanah tetap terbaca di atas latar. Delapan chunk baru menambah variasi spora, mulut sarang,
  sulur, sumur, dan lorong naik/turun. Level 9 dan 10 memakai seed 18325 dan 1005; kombinasi
  keduanya membuat seluruh 48 chunk terpakai. Arena **Penjaga Mesin** sekarang level 11.
- **Tes:**
  - `npm run test:mh4` → **44 tes lulus**: 11 generator, 13 simulasi, 8 combat, 12 boss.
    Generator memverifikasi 10 level, 6 tema terpakai, dan seluruh 48 chunk terpakai.
  - `npm run test:snapshot` → **8 hash MH3 sama**: `c24d78216314`, `a51223705754`,
    `04d5e663cfc7`, `41cc04504046`, `baa10cc1883e`, `e17f53c6eadc`, `a5fc860bf1c6`,
    `9371db1b489e`.
  - Browser `/mh4/?v=phase4c2`: tanpa error console; level 9 "Sarang Purba" dan level 10
    "Lorong Spora" tampil dengan tema organik yang kontras, chip BOSS memuat
    "Level 11: Penjaga Mesin".
- **Mulai:** 2026-11-05 01:08 +07:00
- **Update terakhir:** 2026-11-05 01:17 +07:00
- **Resolved:** 2026-11-05 01:17 +07:00
- **Catatan:** Perubahan belum di-commit dan belum di-push. Dua level dipakai karena satu
  seed belum cukup menutup semua chunk yang belum terpakai. Semua aset hive ada di dalam
  `public/assets/mh4/hive/`.
- **Linimasa:**
  - 01:08 — opdi — CLAIMED: memulai tema Sarang Purba dan chunk baru
  - 01:10 — opdi — IN_PROGRESS: menyiapkan aset, 8 chunk, dan level baru
  - 01:14 — opdi — IN_PROGRESS: tes lulus; kontras tile diperbaiki setelah cek browser
  - 01:17 — opdi — RESOLVED: browser, dokumentasi, dan worklog selesai

### WL-006 — Fase 4b: tema Gua Kristal dan chunk baru MH4
- **Agen:** opdi
- **Status:** RESOLVED
- **Area/klaim:** `public/mh4/js/gen/`, `public/mh4/js/theme.js`, `public/mh4/index.html`,
  `public/assets/mh4/crystal/`, `tests/mh4_levelgen.test.js`, `public/mh4/README.md`,
  `AGENTS.md`, `WORKLOG.md`
- **Rencana:** Menambah tema kelima **Gua Kristal** dari Dungeon Tileset 16x16, 8 chunk baru,
  dan level 8 bertema crystal. Arena boss bergeser ke level 9. Snapshot MH3 tidak berubah.
- **File disentuh:**
  - `public/mh4/js/theme.js` (entri `crystal`, total 5 tema)
  - `public/mh4/js/gen/chunks.js` (8 chunk baru, total 40)
  - `public/mh4/js/gen/levels.js` (`Jantung Gua` id 8, `BOSS.id` menjadi 9)
  - `public/mh4/index.html` (chip level 8, chip BOSS level 9, judul Lima Zona)
  - `public/assets/mh4/crystal/{bg,tiles,decor}/...`
  - `tests/mh4_levelgen.test.js` (8 level, 5 tema, semua 40 chunk terpakai)
  - `public/mh4/README.md`, `AGENTS.md`, `WORKLOG.md`
- **Ringkasan:** Tema `crystal` memakai tile batu biru 16x16 agar tetap tajam pada skala
  render 2x, latar gua 576x324 dengan pilar dan kristal, serta dekor rak, kotak, dan bokor.
  Delapan chunk baru menambah variasi jembatan kristal, kolom, jurang berduri, tangga naik,
  dan sumur turun. Level 8 **Jantung Gua** memakai seed 29529, dipilih lewat pencarian
  deterministik agar seluruh 40 chunk terpakai di delapan level. Arena **Penjaga Mesin**
  sekarang menjadi level 9.
- **Tes:**
  - `npm run test:mh4` → **44 tes lulus**: 11 generator, 13 simulasi, 8 combat, 12 boss.
    Generator memverifikasi 8 level, 5 tema terpakai, dan seluruh 40 chunk terpakai.
  - `npm run test:snapshot` → **8 hash MH3 sama**: `c24d78216314`, `a51223705754`,
    `04d5e663cfc7`, `41cc04504046`, `baa10cc1883e`, `e17f53c6eadc`, `a5fc860bf1c6`,
    `9371db1b489e`.
  - Browser `/mh4/?v=phase4b`: tanpa error console; level 8 menampilkan "Level 8: Jantung
    Gua" dengan latar/tile/dekor Gua Kristal, chip 8 ada, chip BOSS memuat
    "Level 9: Penjaga Mesin".
- **Mulai:** 2026-11-05 01:02 +07:00
- **Update terakhir:** 2026-11-05 01:05 +07:00
- **Resolved:** 2026-11-05 01:05 +07:00
- **Catatan:** Perubahan belum di-commit dan belum di-push. Semua aset crystal sudah berada
  di dalam `public/assets/mh4/crystal/`; tidak ada aset luar yang dimuat runtime.
- **Linimasa:**
  - 01:02 — opdi — CLAIMED: memulai tema Gua Kristal dan chunk baru
  - 01:02 — opdi — IN_PROGRESS: menyiapkan aset, 8 chunk, level `Jantung Gua`, dan tes
  - 01:04 — opdi — IN_PROGRESS: `test:mh4`, snapshot MH3, dan browser lulus
  - 01:05 — opdi — RESOLVED: dokumentasi diperbarui dan pekerjaan terverifikasi

### WL-005 - Fase 4a: tema Kota Malam dan chunk baru MH4
- **Agen:** opdi
- **Status:** RESOLVED
- **Area/klaim:** `public/mh4/js/gen/`, `public/mh4/js/theme.js`, `public/mh4/index.html`,
  `public/mh4/README.md`, `public/assets/mh4/night/`, `tests/mh4_levelgen.test.js`,
  `AGENTS.md`, `WORKLOG.md`
- **Rencana:** Menambah tema keempat **Kota Malam**, 8 chunk baru, dan satu level baru
  bertema night, lalu menggeser arena boss ke level 8. Snapshot MH3 tidak boleh berubah.
- **File disentuh:**
  - `public/mh4/js/theme.js` (entri `night`, total 4 tema)
  - `public/mh4/js/gen/chunks.js` (8 chunk baru, total 32)
  - `public/mh4/js/gen/levels.js` (`Atap Neon` id 7, `BOSS.id` menjadi 8)
  - `public/mh4/index.html` (chip level 7, chip BOSS level 8, judul Empat Zona)
  - `public/assets/mh4/night/{bg,tiles,decor}/...`
  - `tests/mh4_levelgen.test.js` (7 level, 4 tema, semua 32 chunk terpakai)
  - `public/mh4/README.md`, `AGENTS.md`, `WORKLOG.md`
- **Ringkasan:** Tema `night` memakai komposit latar city-night gaya 2 dan salinan tile/dekor
  Industrial yang diberi tint gelap saat aset disiapkan (bukan tint runtime). Delapan chunk
  baru menambah variasi atap, lorong, jurang, dan tangga. Level 7 **Atap Neon** memakai seed
  7220, dipilih lewat pencarian deterministik agar seluruh 32 chunk terpakai di tujuh level.
  Arena **Penjaga Mesin** tetap di tema Industrial tetapi sekarang menjadi level 8.
- **Tes:**
  - `npm run test:mh4` → **44 tes lulus**: 11 generator, 13 simulasi, 8 combat, 12 boss.
    Generator memverifikasi 7 level, 4 tema terpakai, dan seluruh 32 chunk terpakai.
  - `npm run test:snapshot` → **8 hash MH3 sama**: `c24d78216314`, `a51223705754`,
    `04d5e663cfc7`, `41cc04504046`, `baa10cc1883e`, `e17f53c6eadc`, `a5fc860bf1c6`,
    `9371db1b489e`.
  - Browser `/mh4/?v=phase4a`: tanpa error console; level 7 menampilkan "Level 7: Atap Neon"
    dengan latar/tile Kota Malam, chip 7 ada, chip BOSS memuat "Level 8: Penjaga Mesin".
- **Mulai:** 2026-11-05 00:20 +07:00
- **Update terakhir:** 2026-11-05 00:51 +07:00
- **Resolved:** 2026-11-05 00:51 +07:00
- **Catatan:** Perubahan belum di-commit dan belum di-push. Tema night memakai aset turunan
  Industrial; tidak ada aset sumber di luar `public/` yang dimuat runtime.
- **Linimasa:**
  - 00:20 — opdi — CLAIMED: memulai tema keempat dan chunk baru
  - 00:28 — opdi — IN_PROGRESS: membuat aset night, 8 chunk, level `Atap Neon`, dan tes
  - 00:45 — opdi — IN_PROGRESS: `test:mh4`, snapshot MH3, dan browser lulus
  - 00:51 — opdi — RESOLVED: dokumentasi diperbarui dan pekerjaan terverifikasi

### WL-004 - Fase 3: combat dan boss slice MH4
- **Agen:** opdi
- **Status:** RESOLVED
- **Area/klaim:** `public/mh4/js/combat/`, `public/mh4/js/boss/`, `public/mh4/js/{sim,scene,main}.js`,
  `public/mh4/js/gen/levels.js`, `public/mh4/index.html`, `public/assets/mh4/boss/`,
  `tests/mh4_*`, `package.json`, `AGENTS.md`
- **Rencana:** Menambah satu melee dan satu ranged, damage/knockback/cooldown, HP hero dan
  musuh, angka damage, satu boss data-driven (Penjaga Mesin) dengan arena, dua fase, telegraph,
  recovery, proyektil, dan cleanup. `BossMachine` murni diuji di Node.
- **File disentuh:**
  - `public/mh4/js/combat/{damage,weapons}.js`
  - `public/mh4/js/boss/{machine,schema}.js`, `public/mh4/js/boss/bosses/penjaga.js`
  - `public/mh4/js/{sim,scene,main}.js`, `public/mh4/index.html`
  - `public/mh4/js/gen/levels.js` (arena `BOSS` id 7 + penempatan musuh deterministik)
  - `public/assets/mh4/boss/penjaga/...`
  - `tests/mh4_combat.test.js`, `tests/mh4_boss.test.js`, `tests/mh4_sim.test.js`,
    `tests/mh4_levelgen.test.js`
  - `package.json`, `AGENTS.md`, `public/mh4/README.md`, `WORKLOG.md`
- **Tes:**
  - `npm run test:mh4` → **44 tes lulus**: 11 generator, 13 simulasi, 8 combat, 12 boss.
  - `npm run test:snapshot` → **8 hash MH3 sama**: `c24d78216314`, `a51223705754`,
    `04d5e663cfc7`, `41cc04504046`, `baa10cc1883e`, `e17f53c6eadc`, `a5fc860bf1c6`,
    `9371db1b489e`.
  - Browser `/mh4/?v=phase3e`: tanpa error console; level 1–6 tampil, musuh tier ≥ 1 ada,
    melee dan blaster mengenai musuh, ganti senjata bekerja, arena boss memuat sprite,
    fase 2 aktif pada 50% HP, boss bisa dikalahkan, tujuan terbuka setelah boss kalah,
    restart kembali ke level 1 dengan HP penuh.
- **Mulai:** 2026-11-02 17:37 +07:00
- **Update terakhir:** 2026-11-04 21:09 +07:00
- **Resolved:** 2026-11-04 21:09 +07:00
- **Catatan:** Tidak menyentuh generator/snapshot MH3. Perubahan belum di-commit dan belum
  di-push. Keputusan terbuka: roster sprite musuh reguler (saat ini musuh level biasa masih
  kotak placeholder ungu) dan apakah boss harus selalu menjadi level terakhir.
- **Linimasa:**
  - 2026-11-02 17:37 - opdi - CLAIMED: memulai combat dan boss slice
  - 2026-11-02 17:37 - opdi - IN_PROGRESS: memeriksa aset boss dan menyiapkan modul combat/boss
  - 2026-11-04 20:55 - opdi - IN_PROGRESS: sim, renderer, input, tes combat/boss, musuh level
  - 2026-11-04 21:09 - opdi - RESOLVED: 44 tes MH4 + 8 snapshot MH3 + verifikasi browser

### WL-003 — Variasi chunk, tema, dan kontrol atas/bawah MH4
- **Agen:** opdi
- **Status:** RESOLVED
- **Area/klaim:** `public/mh4/`, `public/assets/mh4/`, `tests/mh4_*`, `AGENTS.md`
- **Rencana:** Menambah 12 ruang tulis tangan baru (total 24), menambah tema Industrial dan
  Simple Platformer beserta asetnya, memberi tiap level tema bergilir, dan menambah kontrol
  atas/bawah: atas = lompat, bawah = turun dari platform `=` dan jatuh cepat.
- **File disentuh:**
  - `public/mh4/js/gen/{chunks,levels}.js`
  - `public/mh4/js/{physics,sim,theme,scene,main}.js`
  - `public/mh4/index.html`, `public/mh4/README.md`
  - `public/assets/mh4/{industrial,simple}/...`
  - `tests/mh4_levelgen.test.js`, `tests/mh4_sim.test.js`
  - `AGENTS.md`, `WORKLOG.md`
- **Ringkasan:** Pustaka ruang naik dari 12 menjadi 24 ruang 20x10 (jalur datar, jembatan,
  duri, plateau, tangga, langit-langit, pilar, tiga variasi naik, tiga variasi turun).
  Enam level seed tetap memakai tiga tema bergilir: Green zone, Industrial zone, dan Simple
  Platformer. Seluruh 24 ruang terpakai minimal sekali di enam level. Renderer bisa
  mengulang latar pola kecil (`bgTile`) dan memakai ukuran dekor per tema (`decorSize`).
  Kontrol baru: tombol ▲/panah atas = lompat, tombol ▼/panah bawah = menembus platform `=`
  dan jatuh lebih cepat. Tombol sentuh dan keyboard sudah diperbarui; README dan `AGENTS.md`
  ikut diperbarui.
- **Tes:**
  - `npm run test:mh4` — 9 tes generator + 12 tes simulasi lulus (termasuk tes drop-through,
    fast-fall, alias `up`, dan jalur UMD browser).
  - `npm run test:snapshot` — 8 hash kampanye MH3 sama:
    `c24d78216314`, `a51223705754`, `04d5e663cfc7`, `41cc04504046`, `baa10cc1883e`,
    `e17f53c6eadc`, `a5fc860bf1c6`, `9371db1b489e`.
  - Pemeriksaan browser `/mh4/` — tanpa error konsol; keenam level termuat; ketiga tema
    mencapai `ready()`; aset industrial (8) dan simple (8) diminta tanpa gagal; simulasi
    drop-through di browser berhenti di lantai (bukan menembus tanah) dan `up` melompat.
- **Mulai:** 2026-11-02 16:42 +07:00
- **Update terakhir:** 2026-11-02 16:52 +07:00
- **Resolved:** 2026-11-02 16:52 +07:00
- **Catatan:** Tidak menyentuh generator atau snapshot MH3. Perubahan belum di-commit.
  `u-mid` sempat dirapikan agar platform terakhir hanya 3 kolom dari dinding keluar, supaya
  lompatan ke pintu atas tetap terjangkau.
- **Linimasa:**
  - 16:42 — opdi — CLAIMED: menambah variasi chunk, tema, dan kontrol atas/bawah
  - 16:42 — opdi — IN_PROGRESS: memeriksa aset Industrial/Simple Platformer dan mulai menulis chunk
  - 16:48 — opdi — IN_PROGRESS: 24 chunk, 6 level, 3 tema, kontrol atas/bawah, dan tes selesai
  - 16:52 — opdi — RESOLVED: `test:mh4`, snapshot MH3, dan pemeriksaan browser lulus

### WL-002 — Fase 2 vertical slice MH4
- **Agen:** opdi
- **Status:** RESOLVED
- **Area/klaim:** `public/mh4/`, `public/assets/mh4/`, `tests/mh4_*`, `package.json`, `AGENTS.md`
- **Rencana:** Membuat LevelRules MH4, chunk pack Green zone, 3–5 level seed tetap, fisika
  T=16, sim platforming, renderer landscape 640x360, gerbang soal sebelum reward akhir, dan
  tes invariant. Tidak menyentuh generator MH3.
- **File disentuh:**
  - `public/mh4/index.html`, `public/mh4/README.md`
  - `public/mh4/js/{physics,theme,sim,scene,main}.js`
  - `public/mh4/js/gen/{chunks,rules,levels}.js`
  - `public/assets/mh4/{green,hero}/...`
  - `tests/mh4_levelgen.test.js`, `tests/mh4_sim.test.js`
  - `package.json` (`test:mh4`, masuk ke `npm test`)
  - `AGENTS.md` (status Fase 2, peta arsitektur MH4), `WORKLOG.md`
- **Ringkasan:** Vertical slice MH4 bisa dimainkan dari `http://localhost:8091/mh4/`.
  12 ruang tulis tangan 20x10, 4 level seed tetap (7–11 ruang per level), fisika T=16 dengan
  lompat 4 tile, checkpoint, bintang, duri, peti reward, portal tujuan, dan gerbang `G`
  yang terbuka setelah soal `Bank.soal` dijawab benar (salah tidak mengurangi hati).
  Renderer landscape 640x360 dengan kamera dunia 320x180, HUD, kontrol sentuh dan keyboard.
  Generator memakai `core.js` bersama; `rules.js` MH3 dan peta kampanye tidak diubah.
- **Tes:**
  - `npm run test:mh4` — 7 tes generator + 9 tes simulasi lulus (termasuk jalur UMD browser).
  - `npm run test:snapshot` — 8 hash kampanye MH3 sama:
    `c24d78216314`, `a51223705754`, `04d5e663cfc7`, `41cc04504046`, `baa10cc1883e`,
    `e17f53c6eadc`, `a5fc860bf1c6`, `9371db1b489e`.
  - `npm run test:levels` — snapshot, UMD MH3, bot_sanity, dan cek_level lulus.
  - `npm run test:mh3` — seluruh tes MH3 lulus (termasuk 52 pemeriksaan progres).
  - `node tests/math.test.js` — 35 tes lulus.
  - `npm test` — seluruh komponen sampai `test:mh4` lulus; shell timeout 10 menit saat
    `mh3_endless`. `npm run test:mh3` dijalankan terpisah dan lulus (~9 menit), jadi timeout
    adalah batas waktu shell, bukan kegagalan tes.
  - Pemeriksaan browser: `/mh4/` tanpa error konsol, level termuat, modal gerbang muncul,
    jawaban salah memberi petunjuk, jawaban benar membuka `G`.
- **Mulai:** 2026-11-02 15:20 +07:00
- **Update terakhir:** 2026-11-02 16:01 +07:00
- **Resolved:** 2026-11-02 16:01 +07:00
- **Catatan:**
  - Skala gambar 2x (dunia terlihat 320x180 unit) dan chunk baseline 20x10 dipakai sesuai
    kesepakatan. `GRAVITY` T=16 = 850 (bukan 1700); dengan 1700 lompatan hanya 2 tile.
  - `quiz` MH4 sengaja 0: gerbang ditempatkan oleh `place()`, bukan mekanisme benda macet
    milik MH3. Tanpa ini, core berhenti lebih awal karena `pickQuizHost` tidak ada.
  - Perubahan belum di-commit. Jangan push tanpa izin pengguna.
- **Linimasa:**
  - 15:20 — opdi — IN_PROGRESS: memetakan aset Green zone dan menyiapkan struktur `public/mh4/`
  - 15:24 — opdi — IN_PROGRESS: mengoreksi konstanta gravitasi T=16 di `AGENTS.md`
  - 15:50 — opdi — IN_PROGRESS: generator, sim, renderer, gerbang, dan tes MH4 selesai;
    snapshot MH3 tetap sama
  - 16:01 — opdi — RESOLVED: tes MH4, snapshot, levels, dan pemeriksaan browser lulus

- **Agen:** opdi
- **Status:** RESOLVED
- **Area/klaim:** `AGENTS.md`, `WORKLOG.md`
- **Rencana:** Membuat protokol worklog bersama dan menambahkan kewajiban mencatat ke
  `AGENTS.md`, supaya agen berikutnya tidak mengerjakan area yang sama tanpa koordinasi.
- **File disentuh:** `WORKLOG.md` (baru), `AGENTS.md` (bagian worklog, aturan kerja,
  dokumen sumber, dan format laporan)
- **Ringkasan:** Worklog berisi aturan klaim, tabel klaim aktif, template entri, status
  `CLAIMED`/`IN_PROGRESS`/`BLOCKED`/`RESOLVED`/`ABANDONED`, dan riwayat. `AGENTS.md` sekarang
  mewajibkan setiap agen membaca worklog, menulis klaim sebelum bekerja, mencantumkan nama,
  serta menandai `RESOLVED` saat selesai.
- **Tes:** tidak ada tes kode; ini perubahan dokumentasi. Tidak ada file kode yang berubah.
- **Mulai:** 2026-11-02 15:07 +07:00
- **Update terakhir:** 2026-11-02 15:08 +07:00
- **Resolved:** 2026-11-02 15:08 +07:00
- **Catatan:** Baris klaim aktif sudah dihapus. Agen berikutnya cukup menambah entri baru
  di bagian "Riwayat" dan baris di tabel "Klaim aktif" sebelum mulai bekerja.
- **Linimasa:**
  - 15:07 — opdi — IN_PROGRESS: menulis `WORKLOG.md` dan memperbarui `AGENTS.md`
  - 15:08 — opdi — RESOLVED: protokol worklog dan kewajiban di `AGENTS.md` selesai
