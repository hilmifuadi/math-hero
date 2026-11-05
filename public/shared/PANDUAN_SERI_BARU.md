# Panduan: membuat seri Math Hero baru (MH4 dan seterusnya)

Seri baru tidak menyalin kode seri lama. Ia memakai kit di `public/shared/` dan hanya menulis isinya sendiri: cerita, mode permainan, data level, grafis.

## 1. Buat kerangka (1 menit)

```
node scripts/buat_seri.js mh4 "Math Hero 4: Pulau Pecahan"
npm start            # lalu buka http://localhost:8091/mh4/
```

Perintah itu membuat `public/mh4/` berisi:

| Berkas | Asal | Fungsi |
| --- | --- | --- |
| `index.html` | `shared/template/index.html` | memuat kit (mesin, audio, bank soal, kredit, kertas coret) |
| `js/scenes.js` | `shared/template/js/scenes.js` | judul, lima soal dari bank soal, hasil. Ini yang kamu ganti |
| `js/gfx.js`, `assets/` | disalin dari MH3 | konfigurasi grafis seri (pahlawan dan syarat bintang, hiasan, latar) untuk mesin `shared/js/gfx.js`, plus atlas sprite seri |

Folder yang sudah ada tidak pernah ditimpa. Tambahkan kartu seri di `public/index.html` setelah game-nya layak.

## 2. Pilih modul kit yang dibutuhkan

Tambah `<script>` di `index.html` sesuai kebutuhan. Urutan: modul kit dulu, lalu berkas seri.

| Butuh | Muat | Dokumen |
| --- | --- | --- |
| Soal (semua seri) | `shared/js/concepts.js`, `shared/js/questionbank.js` | `Bank.soal(skill, tingkat, rng)`; `Bank.skills()` untuk katalog |
| Platformer | `shared/js/physics.js` (+ inti `shared/levelgen/core.js`, `shared/js/levelgen.chunks.js`, dan `LevelRules` seri; contoh `mh3/js/gen/rules.js`) | `LEVELGEN.md` |
| Pemeriksa level | `shared/js/levelcheck.js` (Node dan browser) | tulis adaptor seperti `fromKejar` |
| Skor bersama, bonus waktu, Papan Juara | `js/firebase-config.js` (milik penerapan), `shared/js/scores.js`, `timebonus.js`, `juara.js` | bagian "Merangkai layanan meta" di `shared/README.md` |
| Kertas coret | sudah ada di templat | panggil `Scratchpad.setAvailable(true)` saat soal menghentikan waktu |

## 3. Aturan yang berlaku untuk semua seri

- **Jangan menyalin lalu mengubah file kit.** Kalau butuh perilaku beda, tambahkan opsi atau kait di kit, lalu jalankan tes semua seri.
- **Tanpa build, tanpa CDN.** Satu modul satu file, API lewat `window.X` atau `window.MHKit.x`; di Node `module.exports`. Pustaka luar di-vendor ke `shared/vendor/` beserta lisensinya.
- **Anak tidak pernah dipaksa menjawab salah** dan tidak dihukum karena lambat: bonus waktu hanya tambahan. Tombol dan sentuhan minimal 44px.
- **Soal berseed.** Simpan soal atau level sebagai `{skill, tingkat, seed}` bukan hasil jadinya; progres di HP jadi kecil dan laporan "soal nomor sekian" bisa diulang.
- Komentar dan teks dalam bahasa Indonesia seperti seri yang ada.

## 4. Menambah soal

Keterampilan baru didaftarkan ke bank: `Bank.register({ id, kelas: [min, max], judul, tingkat: [1, 5], bentuk: 'int', make(tingkat, rng) { ...; return { teks, jawaban, pilihan, langkah } } })`. Pakai `rng.int`, `rng.pick`, `rng.shuffle` dari argumen (bukan `Math.random`) supaya soalnya berseed. Tambahkan ke `tests/questionbank.test.js` bila perlu aturan desain baru.

## 5. Tes sebelum membuka PR

```
npm test           # semua tes logika Node (tanpa browser), sekitar 20 detik, jalan di cloud
npm run test:ui    # tes sentuh Chromium (butuh paket playwright untuk Node)
npm run test:legacy  # tes Python MH1/MH2 lama (butuh Python + playwright Python, jalankan di laptop)
```

Tambahkan tes seri barumu ke skrip `test` (logika) dan `test:ui` (tampilan) di `package.json`. Templat sendiri diuji oleh `tests/template.test.js` dan `tests/template_ui.js`: keduanya membuat seri uji dari templat, membukanya, dan menyelesaikan lima soal tanpa galat konsol.

## 6. Yang belum jadi kit

Atlas sprite (per seri) dan aturan progres (MH2 dan MH3 berbeda; progres seri ada di `progress.js` seri itu). Sisanya sudah kit: `shared/js/save.js` (penyimpanan berversi, cadangan, filter nama; seri memberi `key`, `version`, `newPlayer`, `normPlayer`, `migrations`), `shared/js/gfx.js` (seri memberi pahlawan, hiasan, latar), `shared/js/scenes.js` (slot, nama, pilih pahlawan, pemutar dialog cerita, kredit; seri memberi `slotInfo`, `opening`, `cast`, `credits`). Mengubah bentuk data simpanan? Naikkan `version`, tambah `migrations[versiLama]`, dan tambahkan kasusnya di `tests/save_migrasi.test.js`.
