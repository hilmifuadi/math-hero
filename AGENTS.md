# Prompt Agen: Lanjutkan Math Hero 4 (Level Generator + Vertical Slice)

Anda adalah agen coding yang melanjutkan pekerjaan pada proyek **Math Hero** di
`C:\Users\SCC1202201146\Documents\Ngoding\math-hero-levelgen`.

Baca file ini sampai habis sebelum menyentuh kode. File ini adalah knowledge base ringkas
dan prompt kerja. Dokumen sumber yang lebih panjang tetap harus dibaca bila bagian terkait
akan diubah.

Bahasa kerja dengan pengguna: **Indonesia**. Jawaban singkat, jelas, dan berbasis hasil uji.
Jangan bertele-tele dan jangan mengklaim sesuatu lulus tanpa menjalankan tesnya.

---

## 0. Worklog wajib (baca sebelum mulai)

Semua agen wajib memakai `WORKLOG.md` di root repo. Worklog adalah papan klaim bersama,
bukan catatan opsional.

- **Sebelum mengubah file:** baca "Klaim aktif". Jangan menyentuh area yang sedang diklaim
  agen lain (`CLAIMED`, `IN_PROGRESS`, atau `BLOCKED`).
- **Sebelum bekerja:** tulis entri baru berstatus `CLAIMED`, lalu ubah ke `IN_PROGRESS`
  saat benar-benar mulai.
- **Selalu cantumkan nama agen** di setiap entri dan update status.
- **Saat terhalang:** ubah status ke `BLOCKED` dan tulis alasannya.
- **Saat selesai:** ubah status ke `RESOLVED`, isi ringkasan, tes yang dijalankan, dan
  status snapshot MH3 bila relevan. Hapus baris dari tabel klaim aktif.
- **Jangan menghapus entri agen lain.** Riwayat bersifat append-only.
- **Klaim kedaluwarsa setelah 24 jam tanpa update.** Pengambil alih wajib menulis entri baru
  yang menyebut klaim lama.

Nama agen untuk sesi yang menulis file ini: **opdi**. Agen berikutnya memakai nama yang
diberikan pengguna dan menuliskannya di worklog.

---

## 1. Misi yang sedang dikerjakan

Tujuan besar: memakai kembali level generator MH3 yang sudah terbukti untuk **MH4**, tanpa
mengubah satu byte pun peta kampanye MH3.

Urutan pekerjaan:

- **Fase 0 (selesai):** baseline, snapshot hash peta MH3, keluarkan bot pemain dari `npm test`, CI.
- **Fase 1 (selesai):** ekstrak inti generik ke `core.js`, pindahkan aturan MH3 ke `rules.js`,
  pertahankan API lama `MHKit.levelgen`.
- **Fase 2 (selesai dan sudah diuji manual):** `public/mh4/` berisi LevelRules, 24 chunk
  tulis tangan, 6 level seed tetap, 3 tema (Green, Industrial, Simple Platformer), fisika
  T=16, sim dengan kontrol atas/bawah, renderer landscape, dan gerbang soal. Tes
  `npm run test:mh4` lulus; hash MH3 tidak berubah.
- **Fase 3 (selesai dan sudah diuji Node + browser):** combat satu melee (Pedang) dan satu
  ranged (Blaster), HP/knockback/angka damage, musuh jalan di level tier ≥ 1, serta satu boss
  data-driven **Penjaga Mesin** dengan arena, dua fase, telegraph, recovery, proyektil, hazard,
  dan cleanup. `BossMachine` murni diuji di Node. Hash MH3 tetap sama.
- **Fase 4a (selesai dan sudah diuji Node + browser):** tema keempat **Kota Malam** dengan
  latar city-night dan tile/dekor Industrial bertint gelap, 8 chunk baru (total 32), dan
  level 7 **Atap Neon**. Arena boss bergeser ke level 8. Hash MH3 tetap sama.
- **Fase 4b (selesai dan sudah diuji Node + browser):** tema kelima **Gua Kristal** dengan
  tile batu 16x16, latar gua berpilar, 8 chunk baru (total 40), dan level 8 **Jantung Gua**.
  Arena boss bergeser ke level 9. Hash MH3 tetap sama.
- **Fase 4c (selesai dan sudah diuji Node + browser):** tema keenam **Sarang Purba** dengan
  tile organik 32x32, latar sarang bersulur, 8 chunk baru (total 48), dan level 9–10
  **Sarang Purba** / **Lorong Spora**. Arena boss bergeser ke level 11. Hash MH3 tetap sama.
- **Fase 4d (selesai dan sudah diuji Node + browser):** tema ketujuh **Kota Siang** dengan
  tile urban 16x16 dan latar city-day, 8 chunk baru (total 56), serta level 11–12
  **Distrik Bata** / **Atap Kota**. Arena boss bergeser ke level 13. Hash MH3 tetap sama.
- **Fase 4e (selesai dan sudah diuji Node + browser):** tema kedelapan **Benteng Batu**
  dengan tile medieval 48x48 dan latar aula berpilar, 8 chunk baru (total 64), serta level
  13–14 **Gerbang Benteng** / **Aula Bawah**. Arena boss bergeser ke level 15. Hash MH3
  tetap sama.
- **Fase 4f (selesai dan sudah diuji Node + browser):** roster tiga musuh level biasa
  **walker/jumper/shooter** dengan sprite City Enemies, tembakan musuh, dan pembukaan tipe
  per tier (tier 1 walker, tier 2 + jumper, tier 3 + shooter).
- **Fase 4g (selesai dan sudah diuji Node + browser):** boss kedua **Raja Bandit** (280 HP,
  dua fase, sprite boss pack tipe 3) dengan serangan baru `ground_wave` yang menyusur lantai,
  plus `BOSSES`/`ALL` agar `main.js` mendukung banyak arena boss.
- **Fase 4h (selesai dan sudah diuji Node + browser):** progresi, toko empat slot, dan
  equipment penuh. Profil disimpan di `localStorage` dan disalin ke Firebase Firestore
  koleksi `saves` bila `public/js/firebase-config.js` terisi; tanpa jaringan game tetap
  berjalan lokal. Level terbuka berurutan; koin dari bintang/peti/boss dipakai membeli item.
- **Paket 1 review (selesai):** perbaikan beku saat lompat, menu jeda menggantikan chip di atas
  tombol, ajakan putar layar, dan tes asap `tests/mh4_smoke.test.js`. Rincian di WL-013.
- **Paket 2 review (selesai):** kalah mengulang encounter, telegraph sama dengan hitbox, arena
  27x15 pada zoom 1,5, weak point, summon, semburan lantai, tabrak dinding, dan generator boss
  `public/mh4/js/boss/gen.js` (level 17 `ACAK`). Rincian di WL-014.
- **Paket 3 review (selesai):** enam senjata dengan identitas nyata dari peti, upgrade point,
  dan `power` per level. Rincian di WL-015.
- **Paket 4 review (selesai):** markas top down `public/mh4/js/base/`, cerita per bab, hero Bayu,
  aset `public/assets/mh4/v2/`. Game kini mulai dari judul dan markas. Rincian di WL-016.
- **Fase 4:** perluasan tema, chunk, senjata, boss, progresi.

Jangan melompat ke Fase 4 sebelum Fase 3 stabil dan bisa dimainkan.

---

## 2. Aturan kerja yang tidak boleh dilanggar

1. **Jangan mengubah hasil generate MH3.** Snapshot hash 8 level Kejar harus tetap sama.
   Jalankan `npm run test:snapshot` setiap kali menyentuh generator.
2. **Jangan mengubah urutan pemilihan chunk MH3** (`chooseChunk`) tanpa alasan yang sangat kuat.
   Perubahan kecil di sana bisa mengubah seluruh peta kampanye.
3. **Jangan memakai bot pemain untuk menggating tes.** Bot sengaja tidak dikembangkan lagi.
   Pengguna menguji gameplay secara manual. `tests/bot_sanity.js` bukan bot pemain; itu uji
   kewarasan pemeriksa level dan tetap dipakai.
4. **Tanpa build step.** Semua modul memakai pola UMD yang bisa dimuat `<script>` dan
   `require` di Node. Jangan menambah bundler, framework, atau dependensi npm baru.
5. **Jangan commit atau push tanpa izin pengguna.** Saat ini perubahan Fase 0/1 masih
   uncommitted. Jaringan kantor pengguna memblokir GitHub, jadi push ditunda.
6. **Jangan menyentuh aset di luar `public/` untuk kode game.** Server statis hanya menyajikan
   `public/`. Aset dari `games/assets/craftpix/` harus disalin dulu ke `public/assets/mh4/...`.
7. **Jangan memakai `levelcheck.js` MH3 langsung untuk MH4.** Pemeriksa itu memahami mekanik
   MH3. MH4 butuh adapter/invariant checker sendiri.
8. **Jangan menghapus atau menimpa pekerjaan pengguna yang belum jelas.** Selidiki dulu.
9. **Jangan menambah telemetry, jaringan eksternal, atau skrip obfuscated.** Proyek ini
   sempat kena false positive antivirus; jaga kode tetap transparan.
10. **Jangan menganggap dokumen ini menggantikan dokumen sumber.** Bila mengubah kontrak,
    perbarui juga dokumen terkait.
11. **Wajib mencatat di `WORKLOG.md`.** Tulis klaim sebelum bekerja, update status saat
    berjalan, dan tandai `RESOLVED` saat selesai. Sertakan nama agen. Jangan mengerjakan
    area yang sedang diklaim agen lain.

---

## 3. Kondisi repo saat ini (2026-11-02)

- Repo: `C:\Users\SCC1202201146\Documents\Ngoding\math-hero-levelgen`
- Branch: `claude/project-thread-uckexj`
- Perubahan Fase 0/1/2 **belum di-commit**.
- `public/mh4/` sudah ada dan bisa dibuka di `http://localhost:8091/mh4/`.
- Fase 2, Fase 3, dan Fase 4a–4h sudah lulus `npm run test:mh4` (13 generator + 13 sim +
  8 combat + 7 musuh + 15 boss + 12 progresi = 68 tes) dan `npm run test:snapshot`
  (8 hash MH3 sama).
- Semua komponen `npm test` sudah lulus setelah Fase 2/3. Karena rangkaian lengkap bisa lebih
  dari 10 menit, jalankan `npm run test:mh4` dan `npm run test:snapshot` saat iterasi cepat.
- Hash 8 level kampanye MH3 tidak berubah.

File baru/berubah yang belum di-commit:

```text
M  package.json
M  public/mh3/index.html
M  public/shared/LEVELGEN.md
M  public/shared/PANDUAN_SERI_BARU.md
M  public/shared/js/levelgen.js
M  tests/mh3_plat.test.js
?? .github/workflows/test.yml
?? public/mh3/js/gen/
?? public/shared/levelgen/
?? public/mh4/
?? public/assets/mh4/
?? tests/fixtures/
?? tests/levelgen_browser.test.js
?? tests/levelgen_snapshot.test.js
?? tests/mh4_levelgen.test.js
?? tests/mh4_sim.test.js
?? tests/mh4_combat.test.js
?? tests/mh4_boss.test.js
```

Jangan kehilangan file-file ini. `.github/workflows/test.yml` dan
`games/arsitektur-mh4-levelgen.md` pernah hilang karena karantina antivirus dan sudah dibuat ulang.

---

## 4. Peta arsitektur yang sudah ada

### Generator

```text
public/shared/levelgen/core.js       inti generik: RNG, jalur makro, pilih chunk, pintu, rakit peta
public/mh3/js/gen/rules.js           LevelRules MH3: SOLID, gate/lever/plate, run(), quiz, kanal, placement
public/shared/js/levelgen.js         wrapper tipis -> Core.create(rules MH3 + chunks MH3), API lama
public/shared/js/levelgen.chunks.js  46 ruang tulis tangan MH3 (jangan ubah urutan)
public/mh3/js/plat/levels.js         8 level kampanye Kejar, seed tetap
```

MH4 (vertical slice Fase 2 + Fase 3 + Fase 4a–4h):

```text
public/mh4/index.html                halaman landscape 640x360
public/mh4/js/physics.js             fisika T=16 (gravitasi 850, lompat 4 tile)
public/mh4/js/combat/damage.js       aturan damage murni: HP, invuln, scaling
public/mh4/js/combat/weapons.js      Pedang (melee) + Blaster (ranged), kotak melee
public/mh4/js/combat/enemies.js      tiga tipe musuh: walker, jumper, shooter
public/mh4/js/boss/schema.js         validator BossSchema
public/mh4/js/boss/machine.js        BossMachine murni: telegraph/attack/recovery, fase, ground_wave
public/mh4/js/boss/bosses/penjaga.js data Penjaga Mesin (2 fase, 4 serangan)
public/mh4/js/boss/bosses/raja-bandit.js data Raja Bandit (2 fase, 5 serangan)
public/mh4/js/shop.js                katalog item toko (4 slot) dan efek equipment
public/mh4/js/progress.js            profil, koin, bintang, beli/equip, localStorage
public/mh4/js/cloud.js               sinkronisasi Firestore koleksi "saves"
public/mh4/js/gen/chunks.js          64 ruang tulis tangan 20x10
public/mh4/js/gen/rules.js           LevelRules MH4 + penempatan gerbang/checkpoint/reward
public/mh4/js/gen/levels.js          14 level seed tetap + BOSS/BOSS 2 + BOSSES/ALL + validate()
public/mh4/js/theme.js               ThemeRegistry green, industrial, simple, night, crystal, hive, day, castle
public/mh4/js/sim.js                 parse + update + combat + boss + respawn, tanpa DOM
public/mh4/js/scene.js               renderer landscape, kamera, HUD, boss, damage numbers
public/mh4/js/main.js                bootstrap, input, modal soal, event boss
public/assets/mh4/green/...          salinan aset Green zone
public/assets/mh4/industrial/...     salinan aset Industrial zone
public/assets/mh4/simple/...         salinan aset Simple Platformer
public/assets/mh4/night/...          latar city-night + tile/dekor Industrial bertint gelap
public/assets/mh4/crystal/...        tile batu 16x16 + latar gua + dekor rak/bokor
public/assets/mh4/hive/...           tile organik 32x32 + latar sarang + dekor batu/pakis
public/assets/mh4/day/...            tile urban 16x16 + latar city-day + dekor kota
public/assets/mh4/castle/...         tile medieval 48x48 + latar aula benteng + dekor benteng
public/assets/mh4/hero/...           sprite Pink Monster
public/assets/mh4/enemies/...        sprite City Enemies: walker, jumper, shooter
public/assets/mh4/boss/penjaga/...   sprite + proyektil Factory Boss
public/assets/mh4/boss/raja/...      sprite + proyektil Bosses pack tipe 3
tests/mh4_levelgen.test.js           determinisme + invariant + tema + musuh + jalur UMD
tests/mh4_sim.test.js                parse, lompat, atas/bawah, bintang, checkpoint, gerbang, HP
tests/mh4_combat.test.js             damage, melee, ranged, switch, cooldown, knockback
tests/mh4_enemies.test.js            tipe musuh, scaling tier, lompat, tembakan
tests/mh4_boss.test.js               schema, siklus serangan, fase, cleanup, gating tujuan
tests/mh4_progress.test.js           toko, equipment, koin, unlock, localStorage, data cloud
```

Kontrak inti (`core.js`):

- `Core.create(rules)` -> `{ generate, pickSeed, doors, rng, CHUNKS }`.
- `rules` wajib punya `isSolid(ch)` dan `chunks`.
- Hook opsional: `defaults`, `vertical`, `up`, `kombo`, `run(ctx)`, `estimateRun(w, o)`,
  `estimateChunk(d, ch, o)`, `startBlock()`, `endBlock()`, `quizHost(ch)`,
  `pickQuizHost(chunks, o, st)`, `remapChannels(rows, k)`, `channelStep(rows)`,
  `applyQuiz(ctx)`, `place(ctx)`.
- `place(ctx)` mengembalikan jumlah checkpoint.
- Hasil `generate()`:

```js
{ map, inside, tema, tier, seed, est, rooms, checkpoints }
```

- `run(ctx)` menerima `{ rng, w, tier, mech, foes, flat }` dan mengembalikan chunk
  `{ id, rows, gen: true }`.
- Pintu = sel solid di kolom 0 / kolom terakhir dengan dua sel kosong di atasnya.
  `rules.isSolid()` yang menentukan, bukan karakter `#` hardcoded.

### Fisika dan pemeriksa

```text
public/shared/js/physics.js     fisika murni, T = 32, dipakai MH1/MH3 dan tes Node
public/shared/js/levelcheck.js  pemeriksa level MH3 (paham mekanik MH3)
public/mh3/js/plat/sim.js       simulasi Kejar MH3, event-based, murni logika
public/mh3/js/plat/scene.js     renderer + kamera + input MH3
```

### Tes yang relevan

```text
tests/levelgen_snapshot.test.js        hash 8 level Kejar vs fixtures
tests/levelgen_browser.test.js         jalur UMD browser (chunks -> core -> rules -> wrapper)
tests/mh3_plat.test.js                 determinisme, isi wajib, 24 seed generator, tanpa bot
tests/bot_sanity.js                    kewarasan pemeriksa level, bukan bot pemain
scripts/cek_level.js                   pemeriksa level MH1 + Kejar
```

Catatan teknis: `tests/levelgen_browser.test.js` membandingkan hasil lewat `JSON.stringify`,
bukan `deepStrictEqual`, karena array dari konteks `vm` punya prototipe realm lain.

---

## 5. Keputusan yang sudah dikunci pengguna

### Umum

- MH4 **melanjutkan basis kode MH3**, bukan proyek baru dari nol.
- Kamera MH4 **lebih zoomed out** daripada MH3.
- Unsur matematika ada di **platforming** dan **sebelum mengambil reward akhir**,
  bukan di boss.
- Boss memakai kombinasi **primitif kode + komposisi data**, dengan unsur acak dari seed.
- Jumlah tema rilis pertama: **sebanyak mungkin**, tetapi vertical slice dimulai dari satu tema.
- Engine tetap tanpa build step.

### Fase 4 (dikunci pengguna)

- Progresi memakai penyimpanan yang sama seperti seri MH sebelumnya: **Firebase Firestore**,
  dengan fallback `localStorage` bila jaringan/konfigurasi tidak tersedia.
- Cakupan toko dan equipment **penuh** (banyak item, empat slot, efek nyata ke simulasi).
- Level terbuka berurutan; bintang menyimpan nilai terbaik per level.
- Firebase hanya untuk menyimpan progres dan papan skor yang sudah ada. Tidak ada telemetry
  tambahan, tidak ada SDK lain, dan tanpa build step. Aturan Firestore ada di
  `docs/firestore.rules` dan wajib dipublikasikan manual oleh pemilik proyek.

### Fase 2 (baru dikunci)

- Orientasi: **landscape, kanvas logis 640 x 360**.
- Ukuran tile dunia: **16 px**.
- Tema pertama: **Green zone** dari `games/assets/craftpix/craftpix-net-846754-free-green-zone-tileset-pixel-art`.
- Level awal: 3–5 level dengan seed tetap, plus satu mode seed acak bila sempat.

Interpretasi teknis yang **masih perlu dikonfirmasi sebelum chunk ditulis**:

- Karena tile dunia 16 px dan aset Green zone 32 px, gunakan **skala gambar 2x**.
  Artinya dunia terlihat 320 x 180 unit (20 x 11,25 tile) dan aset 32 px tampil 1:1 di layar.
  Ini menjaga karakter tetap terbaca di HP. Jika pengguna ingin benar-benar 640 unit dunia
  terlihat, skala gambar 1x membuat karakter terlalu kecil; konfirmasi dulu.
- Baseline chunk yang disarankan: **20 x 10 tile** = 320 x 160 unit = satu layar penuh
  pada skala 2x. Ruang vertikal boleh lebih tinggi (mis. 20 x 16).

---

## 6. Tugas berikutnya: Fase 2 vertical slice

### Tujuan

Level MH4 bisa dimainkan dari awal sampai akhir, tanpa softlock, dengan tema Green zone
yang konsisten. Belum ada combat penuh dan belum ada boss.

### Struktur file yang disarankan

```text
public/mh4/index.html
public/mh4/js/gen/rules.js      LevelRules MH4
public/mh4/js/gen/chunks.js     ChunkPack MH4 (24 ruang)
public/mh4/js/gen/levels.js     6 level seed tetap
public/mh4/js/theme.js          ThemeRegistry Green/Industrial/Simple Platformer
public/mh4/js/physics.js        fisika T=16 (turunan dari shared/js/physics.js)
public/mh4/js/sim.js            parse + update murni, tanpa DOM
public/mh4/js/scene.js          renderer landscape + kamera + input
public/mh4/js/main.js           bootstrap halaman
public/assets/mh4/green/...     salinan aset terpilih dari CraftPix
tests/mh4_levelgen.test.js      determinisme + invariant level
tests/mh4_sim.test.js           parse, respawn, gate, kemenangan
```

### Kosakata tile MH4 (usulan, kunci sebelum menulis chunk)

```text
#  solid / tanah
=  platform tembus dari bawah
^  duri / hazard
*  bintang / koleksi
S  titik awal
E  tujuan / portal
C  checkpoint
K  peti reward akhir
G  gerbang soal (solid sampai soal dijawab benar)
e  musuh berjalan sederhana (opsional; bisa diinjak seperti platformer klasik)
```

Jangan memakai arti karakter MH3 seperti gate `1/4`, tuas `t/y/u`, atau tombol `_/,/;`
untuk MH4. Itu milik adapter MH3.

### LevelRules MH4

Implementasikan minimal:

- `id: 'mh4-platformer'`
- `defaults`: seed, tier, tema, mech, quiz, sec
- `chunks`
- `isSolid`
- `run(ctx)`: potongan datar dengan jurang, platform, duri, bintang, dan musuh sesuai tier
- `estimateRun` / `estimateChunk`
- `startBlock` / `endBlock`
- `place(ctx)`: start, goal, checkpoint, chest, dan gerbang soal
- `validate` atau checker terpisah untuk invariant

Invariant minimal:

- `S` ada di awal dan `E` ada di akhir.
- `G` berada sebelum `K` dan `E` di jalan utama.
- Checkpoint tidak menempel di hazard atau di tengah jurang.
- Reward dan goal bisa dicapai tanpa skill opsional.
- Tidak ada ruang yang hanya bisa dilewati dengan lompatan mustahil.
- Determinisme: seed sama = peta sama.

### Fisika T=16

`shared/js/physics.js` memakai `T = 32`, `PW = 28`, `PH = 52`, `GRAVITY = 1700`,
`MOVE = 190`, `JUMP = -660`, `DJUMP = -560`, `MAXFALL = 880`.

Untuk T=16, turunkan setengahnya agar rasio tile dan feel tetap:

```text
PW = 14, PH = 26
GRAVITY = 850, MOVE = 95
JUMP = -330, DJUMP = -280, MAXFALL = 440
COYOTE = 0.1, BUFFER = 0.12
```

Gravitasi **harus ikut dibagi dua** (1700 -> 850), bukan dipertahankan 1700. Dengan
`GRAVITY = 1700` dan `JUMP = -330`, tinggi lompatan hanya 32 px (2 tile 16 px). Dengan
`GRAVITY = 850`, tinggi lompatan 64 px (4 tile 16 px), sama seperti rasio MH3 (128 px = 4 tile
32 px).

Jangan mengubah `shared/js/physics.js` dengan cara yang bisa mengubah MH1/MH3. Bila ingin
menggeneralisasi, pertahankan API default T=32 tetap identik dan tambahkan jalur konfigurasi
yang tidak mengubah perilaku lama. Lebih aman menulis `public/mh4/js/physics.js` dulu.

### Renderer landscape

- Kanvas logis 640 x 360, letterbox agar tetap 16:9 di HP/laptop.
- Kamera mengikuti hero dan dijepit ke batas peta.
- Gambar tile tema aktif dengan skala 2x; tema dipilih per level lewat `ThemeRegistry`.
- HUD minimal: nama level, bintang, HP/nyawa, dan tombol kontrol sentuh.
- Kontrol: kiri, kanan, atas (lompat), bawah (tembus platform `=` dan jatuh cepat), lompat.
  Keyboard: panah/A-D, panah atas/W/Spasi/Z, panah bawah/S/X.
- Jangan memakai core portrait `shared/js/core.js` apa adanya karena `VW = 360` dan
  asumsi rasio tegak. Buat bootstrap MH4 sendiri atau generalisasi core dengan hati-hati
  tanpa mengubah MH3.

### Gerbang matematika

- Muat `public/shared/js/questionbank.js` (`window.MHKit.bank`).
- Daftarkan template soal lewat adapter (`Bank.useConcepts`, `Bank.useHomework`) atau
  `Bank.register` sebelum memanggil `Bank.soal`.
- Gunakan `Bank.soal(skill, tingkat, rng)` dan `Bank.periksa(soal, jawaban)`.
- Tampilkan modal sederhana di DOM/kanvas; jangan memakai `mh3/js/homework_ui.js` karena
  terikat alur MH3.
- Jawaban benar membuka `G`. Usulan: jawaban salah tidak menghukum HP, cukup beri
  kesempatan lagi; konfirmasi ke pengguna sebelum mengunci aturan ini.
- Gerbang wajib berada di jalan utama sebelum `K` dan `E`.

### Aset Green zone

Sumber di luar repo:

```text
games/assets/craftpix/craftpix-net-846754-free-green-zone-tileset-pixel-art/
  1 Tiles/               96 PNG 32x32
  2 Background/Day/      5 lapisan + Background.png
  3 Objects/             bench, bush, fence, flower, rock, tree, dll.
```

Salin hanya yang dipakai ke `public/assets/mh4/green/`. Jangan menyalin seluruh paket
(PSD, file besar) ke `public/`.

### Acceptance criteria Fase 2

- 3–5 level bisa dimainkan dari `S` sampai `E`.
- Tidak ada softlock; jatuh/duri mengembalikan ke checkpoint terakhir.
- Gerbang soal muncul sebelum reward akhir dan bisa dibuka.
- Tema Green zone tampil konsisten (tanah, platform, latar, dekorasi).
- `npm test` tetap hijau, termasuk snapshot MH3.
- Tes MH4 baru lulus dan deterministik.
- Tidak ada perubahan hash 8 level Kejar MH3.

---

## 7. Perintah dan cara verifikasi

Jalankan dari `C:\Users\SCC1202201146\Documents\Ngoding\math-hero-levelgen`.

```powershell
npm run test:snapshot     # hash 8 level Kejar, paling cepat untuk regresi generator
npm run test:levels       # snapshot + browser UMD + bot_sanity + cek_level
npm run test:mh3          # semua tes MH3
npm test                  # seluruh baseline
npm start                 # server di http://localhost:8091
```

Halaman MH3: `http://localhost:8091/mh3/`
Halaman MH4 nanti: `http://localhost:8091/mh4/`

Tes UI memakai server lokal dan `child_process`; jalankan hanya bila perlu:

```powershell
npm run test:ui
```

Jika menambah tes MH4, tambahkan ke `package.json`:

- `test:mh4` untuk tes murni Node.
- Masukkan `test:mh4` ke rantai `npm test`.
- Jangan menambahkan tes bot pemain.

Saat memeriksa jalur browser/UMD, ingat perbedaan realm `vm`: bandingkan hasil dengan
`JSON.stringify`, bukan `deepStrictEqual`.

---

## 8. Jebakan yang sudah pernah terjadi

1. **Snapshot MH3 berubah** berarti ekstraksi merusak perilaku. Perbaiki kode, jangan
   meng-update snapshot, kecuali perubahan memang disengaja dan disetujui.
2. **Karantina antivirus** pernah menghapus `.github/workflows/test.yml` dan
   `games/arsitektur-mh4-levelgen.md`. OpenCode dianggap aman dan false positive dianggap
   selesai; pengguna tidak bisa meminta allowlist. Jangan menambah kode yang terlihat
   seperti malware (obfuscation, eval, downloader, persistence).
3. **Jalur UMD** mudah rusak saat menambah `<script>`. Urutan MH3 sekarang:
   `levelgen.chunks.js` -> `levelgen/core.js` -> `mh3/js/gen/rules.js` -> `shared/js/levelgen.js`.
4. **Core portrait** tidak cocok langsung untuk MH4 landscape. Jangan hack `M.VW` global
   tanpa memahami `resize()` di `shared/js/core.js`.
5. **Aset di luar `public/`** tidak bisa dimuat browser lewat server. Salin dulu.
6. **Tile 16 px** membuat karakter setengah ukuran MH3. Pastikan skala gambar dan hitbox
   konsisten; jangan mencampur T=32 dan T=16 dalam satu simulasi.

---

## 9. Dokumen sumber yang wajib dibaca bila perlu

| Dokumen | Isi |
|---|---|
| `math-hero-levelgen/README.md` | gambaran seri, cara menjalankan, kontrol, tes, hosting |
| `math-hero-levelgen/brief_ai_agent_game_matematika.md` | brief produk, target anak, kontrol mobile, UX, testing |
| `math-hero-levelgen/public/shared/LEVELGEN.md` | spesifikasi generator, format chunk, tema, riwayat G1–G5 |
| `math-hero-levelgen/public/shared/README.md` | bank aset bersama, cara memuat modul, kredit |
| `math-hero-levelgen/public/shared/PANDUAN_SERI_BARU.md` | panduan membuat seri baru dari kit |
| `games/ide-mh4.md` | ide MH4: kamera, HP/damage, senjata, boss, tema, pertanyaan terbuka |
| `games/arsitektur-mh4-levelgen.md` | arsitektur target, kontrak `LevelRules`/`ChunkPack`/`ThemeRegistry`/`BossSchema`, fase 0–4 |
| `games/brief-boss-fight-system.md` | katalog mekanisme boss dan prinsip fairness |
| `math-hero-levelgen/WORKLOG.md` | papan klaim dan riwayat pekerjaan semua agen (wajib diisi) |

Jangan menyalin seluruh dokumen ke kode. Dokumen ini adalah ringkasan kerja; dokumen sumber
tetap acuan bila ada konflik.

---

## 10. Format laporan akhir sesi

Saat menyelesaikan satu tahap, laporkan:

1. Apa yang diubah dan di file mana.
2. Tes apa yang dijalankan dan hasilnya.
3. Apakah hash snapshot MH3 masih sama.
4. Risiko atau keputusan yang masih terbuka.
5. Apakah perubahan sudah di-commit (default: belum, tunggu izin).
6. Status worklog: apakah entri sudah diperbarui dan ditandai `RESOLVED`.

Jika ragu di antara dua pendekatan arsitektur, berhenti dan tanyakan pengguna. Jangan
menebak pada hal yang mengunci ukuran chunk, orientasi, atau format save.
