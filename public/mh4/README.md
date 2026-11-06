# Math Hero 4 — Vertical Slice

Halaman: `http://localhost:8091/mh4/` (jalankan `npm start` dari root repo).

## Alur

Layar judul, cerita pembuka, lalu markas top down Kampung Lumbung tempat Arka tinggal: berjalan,
bicara dengan warga, berladang, tidur di rumah, dan berangkat misi lewat Farah di seberang
sungai. Kampung punya empat rumah warga, alun-alun, ladang di barat, dan kandang di timur. Misi memakai platformer. Tanaman
yang disiram tumbuh saat pulang dari misi, dan kabut di kampung menipis tiap boss kalah.
Logika ada di `js/base/`, sumber aset di `assets/mh4/v2/SUMBER.md`.

## Kontrol

- Desktop: panah kiri/kanan atau `A`/`D` untuk bergerak, panah atas/`W`/`Spasi`/`Z` untuk
  lompat, panah bawah/`S`/`X` untuk turun, `J` untuk serang, `K` untuk ganti senjata.
- HP: tombol ◀ ▶ (jempol boleh bergeser tanpa diangkat), ▼ untuk turun, ⚔ untuk serang, ⇄ untuk
  ganti senjata, dan tombol lompat ⤒ di kanan bawah. ▲ hanya tampil di kampung. Lompat kedua tersedia
  di udara, dan makin lama tombol ditahan makin tinggi lompatannya.
- Panah atas = lompat. ▼/panah bawah = turun menembus platform `=` dan jatuh lebih cepat
  saat di udara.
- Tombol `Menu` di kanan atas (atau `Esc`/`P`) menjeda game dan berisi pilihan level,
  `BOSS`/`BOSS 2`, `Toko`, `Suara`, dan `Ulangi Level`. Tombol sentuh hanya tampil di perangkat
  sentuh, dan layar tegak menampilkan ajakan memutar HP. Level terbuka berurutan setelah level
  sebelumnya selesai; `window.MH4.debug.startLevel(i)` tetap bisa membuka level mana pun
  untuk pengujian manual.

## Combat dan boss

- Dua senjata: **Pedang** (melee, damage besar, jangkauan pendek) dan **Blaster** (ranged,
  proyektil, damage lebih kecil). Keduanya tersedia sejak awal dan diganti dengan `K`/⇄.
- Hero punya 30 HP (bisa ditambah equipment). Musuh punya HP, knockback, dan angka damage
  melayang. Menginjak musuh tetap bisa, seperti platformer klasik.
- Tiga tipe musuh level biasa: **Bandit** (`e`, berjalan), **Ninja** (`a`, melompat), dan
  **Penembak** (`g`, berhenti lalu menembak). Tipe dibuka per tier: tier 1 Bandit, tier 2
  menambah Ninja, tier 3 menambah Penembak. Level 1 tetap tanpa musuh sebagai tutorial.
- Enam senjata: Pedang, Tombak, Palu (dekat), Blaster, Pelontar, Pemantul (jauh). Hero membawa
  satu dekat dan satu jauh. Senjata baru ada di peti level 2, 4, 7, dan 10, dan bisa diganti di
  `Toko & Upgrade`. Hanya damage yang naik mengikuti `power` level.
- Upgrade point: +1 tiap level baru, +2 tiap boss (sekitar 41 poin). Health +2 HP, Attack +3%,
  Speed +1,2% per tingkat, maksimal 14 tingkat tiap atribut. Nomor misi yang tampil mengikuti urutan cerita.
- `BOSS` berisi **Penjaga Mesin** (320 HP): kristal di kepala terbuka saat recovery dan harus
  diserang sambil melompat. Fase 2 pada 50% menambah batu jatuh dan semburan lantai.
- `BOSS 2` berisi **Raja Bandit** (380 HP): serudukannya berhenti di dinding dan membuatnya
  pusing. Fase 2 pada 55% menambah anak buah yang menjatuhkan 4 HP saat dikalahkan.
- `ACAK` (level 17) memakai `boss/gen.js`: seed menentukan mekanisme, skin, tema arena, dan
  pola serangan. Seed baru tiap main. Kesulitan menambah mekanisme dan fase.
- Sasaran serangan dikunci saat telegraph, jadi tanda di layar sama dengan hitbox. Di luar
  celah damage ke boss hanya 0,25x.
- Kalah di arena mengulang encounter dari awal fase berjalan; setelah dua kali kalah damage ke
  hero menjadi 0,75x. Arena 27x15 tile tampil pada zoom 1,5.
- Tujuan di arena boss terkunci sampai boss kalah.

## Soal, kelas, dan isi level baru

- Nadiya di alun-alun menanyakan kelas Arka, dan Farah baru mengizinkan berangkat setelah itu.
  Kelas bisa diganti kapan saja. Tiap level punya tiga gerbang soal dari `js/soal.js`: untuk kelas K
  variasinya kelas K-2, K-1, dan K (kelas 1 sampai 6, minimal kelas 1).
- Mekanik peta di `js/mech.js`: `s` per, `~` papan runtuh, `-` platform gerak, `|` lift,
  `( )` pintu ajaib, `> <` pelontar samping, `o` gergaji, `L` kunci mini boss.
- Mini boss `Q` Orc Raksasa dan `Z` Raja Lendir muncul di tengah sebagian level. Jalan terkunci sampai
  ia kalah, lalu hero pulih 30% HP.
- Empat level menara (18, 21, 24, 28) dibuat `buildTower` di `gen/levels.js`: naik per lantai, 34 tile
  lebar, gerbang soal berupa pintu langit-langit. Total ada 26 misi dalam 7 bab pendek, tiap bab ditutup boss, ditambah boss acak.

## Skor dan PR

Skor level berasal dari soal gerbang (benar +100 sampai +200 menurut kelas soal, salah -30), PR, musuh yang
kalah, dan bonus waktu 1000 sampai 100. Mengulang misi hanya mengganti skor bila lebih baik, dan jumlah skor
terbaik semua misi dikirim ke papan `mh4`. Membuka peti memunculkan PR soal cerita yang diketik (+300, -50 tiap
salah, minimal +100, boleh dilewati). Balok soal hanya bisa dipilih dengan senjata dekat atau tombol angka.
Pintu ajaib masuk dengan tombol bawah dan dua arah. Ada empat jenis: ruang rahasia di bawah tanah, Pintu Langit ke pulau awan berbintang, Pintu Tembus melewati tembok setinggi delapan petak, dan Pintu Atap ke puncak tembok lebar. `addDoors` di `gen/levels.js` menaruh dua sampai empat pintu tiap level, dan `reachable()` ikut memperhitungkannya.

## Tutorial, ending, dan kredit

`js/tutor.js` memandu kontrol di misi 1 sampai tiap langkah dilakukan, lalu tidak muncul lagi. Setelah Raja
Goblin kalah pertama kali tampil `Story.ENDING` dan gulungan kredit (`Story.CREDITS`). Kredit juga bisa dibuka
dari layar judul, dan layar judul serta menu punya tautan ke beranda seri.

## Mode acak

Terbuka setelah Lendir Kabut kalah, di bab Tantangan Acak pada Papan Misi. `Levels.genLevel(seed, {tier, power})` memilih tema, bentuk (sekitar
seperempat menara), dan isi dari seed, lalu `Levels.reachable()` memastikan S sampai K dan E bisa ditempuh. Peta yang gagal diganti turunan seed
yang sama. `BossGen.build` merakit 9 makhluk, 12 mekanik, dan 3 watak; kesulitan menambah jumlah mekanik. Tingkat keduanya mengikuti jumlah boss
cerita yang sudah kalah. Seed tampil di layar menang dan bisa diketik di Papan Misi, Ulangi Misi memakai seed yang sama, Main Lagi memakai seed baru.

## Bangun kampung dan senjata pamungkas

Papan "Bangun" di barat alun-alun menjual 12 hiasan dan bangunan (`Farm.BUILDS`, 150 sampai 8.000 koin) yang tersimpan di
`profile.base.built`. `World.kampung(built)` menyusun peta: kampung kini 38 baris, dan tanah selatan dipakai bengkel, rumah ramuan,
sekolah, dan altar. Ternak tambahan menggandakan hasil kandang. Titu si kucing mengikuti Arka, tertidur bila Arka diam, bisa dielus,
dan disebut semua warga. Tiga senjata pamungkas (Pedang Angin, Bumerang, Panah Cahaya, 5.000 koin) dibeli di Perlengkapan setelah
Raja Goblin kalah; damage biasa, keunggulannya pola serang.

## Warga
Warga kampung: Aki Tyo, Bida (kios), Nadiya (guru), Farah (gerbang), Ayah Hilmi (senjata), dan Mamah Zahra
(nasihat, dekat kandang). Dialog disusun `js/base/talk.js` dari jam perangkat, lama bermain hari ini, isi
peti, ladang, ternak, koin, dan hasil misi terakhir. Setelah 60 menit dan saat larut malam warga mengingatkan
untuk berhenti. Efek senjata, kematian musuh, dan kemenangan boss ada di bagian Efek pada `js/scene.js`.

## Isi level

- `S` mulai, `C` checkpoint, `*` bintang, `^` duri, `K` peti reward, `E` portal tujuan,
  `e`/`a`/`g` musuh (jalan/lompat/tembak), `B` spawn boss (hanya arena boss).
- `=` adalah platform tembus: bisa dilompati dari bawah dan ditembus dengan tombol turun.
- `G` adalah gerbang matematika: dinding penuh yang terbuka setelah soal dijawab benar.
  Jawaban salah tidak mengurangi HP; soal bisa dicoba lagi.
- Jatuh, kena duri, atau HP habis mengembalikan hero ke checkpoint terakhir.

## Tema dan level

Ada 14 level seed tetap, 8 tema, dan 2 arena boss:

| Level | Nama | Tema |
|---|---|---|
| 1 | Langkah Pertama | Green zone |
| 2 | Pipa Berkarat | Industrial zone |
| 3 | Bukit Ceria | Simple Platformer |
| 4 | Jurang Hijau | Green zone |
| 5 | Gudang Tua | Industrial zone |
| 6 | Gerbang Matematika | Simple Platformer |
| 7 | Atap Neon | Kota Malam (night) |
| 8 | Jantung Gua | Gua Kristal (crystal) |
| 9 | Sarang Purba | Sarang Purba (hive) |
| 10 | Lorong Spora | Sarang Purba (hive) |
| 11 | Distrik Bata | Kota Siang (day) |
| 12 | Atap Kota | Kota Siang (day) |
| 13 | Gerbang Benteng | Benteng Batu (castle) |
| 14 | Aula Bawah | Benteng Batu (castle) |
| 15 | Penjaga Mesin (BOSS) | Industrial zone |
| 16 | Raja Bandit (BOSS 2) | Benteng Batu (castle) |

Semua tema memakai satu gaya dari `scripts/prepare_world_mh4.js` (hasilnya di
`assets/mh4/v2/world/`). Tanah memakai tekstur batu Pixel Crawler yang diwarnai per tema, atau
balok buatan kode untuk Kota Siang dan Benteng Batu, ditutup rumput, lumut, papan, atap, atau batu.
Latar berlapis digambar kode pada 320x180 dengan warna datar sehingga sama padat dengan hero di
zoom 2. Dekor dipotong dari paket yang sama dengan markas, dan semua gambar bergaris tepi gelap.

Pustaka ruang berisi 64 ruang tulis tangan 20x10: jalur datar, jurang, duri, bukit,
platform, langit-langit, pilar, tangga naik, turunan bercabang, atap, lorong gang, ruang
kristal, ruang organik, jalan kota, dan ruang benteng. Setiap level memilih ruang sesuai tier
dan tetap deterministik untuk seed yang sama. Seluruh 64 ruang terpakai minimal sekali di
empat belas level. Musuh level biasa ditempatkan setelah peta jadi, deterministik dari seed,
di tanah datar yang jauh dari gerbang/tujuan.

## Progresi, toko, dan penyimpanan

- Progres disimpan di `localStorage` (`mathHero4.save.v1`) dan disalin ke **Firebase
  Firestore** koleksi `saves` bila `public/js/firebase-config.js` terisi. Tanpa konfigurasi
  atau jaringan, game tetap memakai penyimpanan lokal.
- Bentuk data: `uid`, `nama`, `koin`, `owned`, `equipped`, `best`, `totalStars`, `updatedAt`.
  Semua data cloud dibersihkan lewat `progress.normalize()` sebelum dipakai.
- Level terbuka berurutan; level 1 selalu terbuka. Bintang memakai nilai terbaik per level.
- Level memberi sedikit koin: bintang di atas rekor (1/butir), peti pertama kali (+12), tamat
  pertama kali (+10), dan boss (+60 pertama / +10 ulangan). Item `Magnet Koin` menambah 25%.
  Pemasukan utama datang dari menjual hasil ladang dan ternak di peti.
- Toko punya empat slot: **Pedang**, **Blaster**, **Armor**, dan **Jimat**. Membeli item
  langsung memasangnya; satu item aktif per slot. Efeknya masuk ke `Sim.create(def, {loadout})`
  sebagai pengali damage/cooldown/kecepatan dan tambahan HP maksimal. Saat item diganti di
  tengah level, `Sim.applyLoadout()` langsung memperbarui stats hero yang sedang dipakai
  (HP dijaga proporsional), tanpa menunggu level berikutnya.
- Agar sinkronisasi cloud aktif, tempel isi `docs/firestore.rules` di Firebase Console >
  Firestore Database > Rules, lalu Publish. Aturan `saves` hanya mengizinkan pemain menulis
  dokumen dengan id miliknya sendiri; daftar semua simpanan ditutup.

## Struktur kode

```text
physics.js          fisika T=16 (gaya tetap, tanpa DOM)
combat/damage.js    aturan damage murni: HP, invuln, scaling
combat/weapons.js   data Pedang dan Blaster, kotak melee, damage per tier
combat/enemies.js   tiga tipe musuh: walker, jumper, shooter
boss/schema.js      validator BossSchema (telegraph/recovery/fase/pool)
boss/machine.js     BossMachine murni: pilih serangan, fase, proyektil, hazard, gelombang
boss/bosses/penjaga.js     data Penjaga Mesin (2 fase, 4 serangan)
boss/bosses/raja-bandit.js data Raja Bandit (2 fase, 5 serangan termasuk ground_wave)
gen/chunks.js       64 ruang 20x10
gen/rules.js        LevelRules MH4: run(), penempatan, gerbang
gen/levels.js       14 level seed tetap + arena BOSS dan BOSS 2 + validate()
theme.js            data aset Green, Industrial, Simple, Night, Crystal, Hive, Day, Castle
shop.js             katalog item toko dan efek equipment
progress.js         profil, koin, bintang, beli/equip, normalisasi, localStorage
cloud.js            sinkronisasi progres ke Firestore (fallback offline)
sim.js              parse + update + combat + boss + respawn + loadout (tanpa DOM)
scene.js            renderer 640x360, kamera 320x180, HUD, boss, damage numbers
main.js             input, loop, modal soal, event boss, toko, simpan progres
```

Semua modul memakai pola UMD: bisa dimuat `<script>` dan `require` di Node.
Generator memakai inti bersama `public/shared/levelgen/core.js`; peta kampanye MH3 tidak
disentuh.

## Tes

```powershell
npm run test:mh4       # generator + simulasi + combat + musuh + boss + progresi MH4
npm run test:snapshot  # hash 8 level MH3 harus tetap sama
npm test               # seluruh baseline
```

`npm test` lengkap bisa lebih dari 10 menit. Untuk iterasi cepat, pakai `test:mh4` dan
`test:snapshot`.

## Aset

Aset berasal dari CraftPix (Green Zone Tileset, Industrial Zone Tileset, Simple Platformer
Game Kit, Scrolling City Backgrounds, Dungeon Tileset, Roguelike Shoot-em-Up, Urban Shooter,
Medieval Tileset, Tiny Hero Sprites, City Enemies, dan Bosses Pixel Art Sprite Sheet Pack)
dan disalin ke `public/assets/mh4/`.
Jangan memuat aset dari luar `public/`.
