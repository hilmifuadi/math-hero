// Math Hero 4: soal per kelas (1-6), tanpa DOM. Jawaban selalu punya empat pilihan untuk balok angka.
// Kelas pemain K memberi variasi kelas K-2, K-1, dan K: soal pertama di level paling mudah.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).soal = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  function makeRng(seed) {
    let s = (seed >>> 0) || 1;
    const next = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    return { next, int: (a, b) => a + Math.floor(next() * (b - a + 1)), pick: (arr) => arr[Math.floor(next() * arr.length)] };
  }
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const lcm = (a, b) => (a * b) / gcd(a, b);

  // Tiap pembuat mengembalikan [teks, jawaban, petunjuk, pengecoh?]. Teks dibuat pendek agar muat di HUD.
  const TEMPLATES = {
    1: [
      (r) => { const a = r.int(1, 9), b = r.int(1, 9); return [`${a} + ${b} = ?`, a + b, 'Hitung maju dari angka yang lebih besar.']; },
      (r) => { const a = r.int(5, 19), b = r.int(1, Math.min(9, a)); return [`${a} - ${b} = ?`, a - b, 'Hitung mundur satu per satu.']; },
      (r) => { const a = r.int(2, 8), b = r.int(1, 10 - a); return [`${a} + ? = ${a + b}`, b, 'Berapa lagi supaya pas?']; },
      (r) => { const n = r.int(1, 15), s = r.pick([1, 2]); return [`${n}, ${n + s}, ${n + 2 * s}, ?`, n + 3 * s, `Tiap langkah bertambah ${s}.`]; },
      (r) => { const a = r.int(1, 20), b = a + r.int(1, 4), c = b + r.int(1, 4), d = c + r.int(1, 3); return ['Mana yang terbesar?', d, 'Angka terbesar ada paling kanan di garis bilangan.', [a, b, c]]; },
    ],
    2: [
      (r) => { const a = r.int(12, 58), b = r.int(11, 39); return [`${a} + ${b} = ?`, a + b, 'Jumlahkan puluhan, lalu satuan.']; },
      (r) => { const a = r.int(30, 99), b = r.int(11, a - 5); return [`${a} - ${b} = ?`, a - b, 'Kurangi puluhan, lalu satuan.']; },
      (r) => { const a = r.pick([2, 3, 4, 5, 10]), b = r.int(2, 9); return [`${a} x ${b} = ?`, a * b, `Jumlahkan ${a} sebanyak ${b} kali.`]; },
      (r) => { const s = r.pick([2, 5, 10]), n = s * r.int(1, 6); return [`${n}, ${n + s}, ${n + 2 * s}, ?`, n + 3 * s, `Loncat ${s}.`]; },
      (r) => { const b = r.pick([2, 5]), h = r.int(2, 6); return [`${b * h} : ${b} = ?`, h, `Bagi rata ${b * h} menjadi ${b} kelompok.`]; },
    ],
    3: [
      (r) => { const a = r.int(2, 10), b = r.int(2, 10); return [`${a} x ${b} = ?`, a * b, 'Pakai perkalian yang sudah dihafal.']; },
      (r) => { const b = r.int(2, 9), h = r.int(2, 9); return [`${b * h} : ${b} = ?`, h, `${b} x berapa = ${b * h}?`]; },
      (r) => { const a = r.int(120, 650), b = r.int(110, 340); return [`${a} + ${b} = ?`, a + b, 'Jumlahkan ratusan, puluhan, satuan.']; },
      (r) => { const a = r.int(300, 900), b = r.int(110, a - 50); return [`${a} - ${b} = ?`, a - b, 'Kurangi ratusan, puluhan, satuan.']; },
      (r) => { const d = r.pick([2, 3, 4]), n = d * r.int(2, 9); return [`1/${d} dari ${n} = ?`, n / d, `Bagi ${n} dengan ${d}.`]; },
      (r) => { const s = r.int(3, 12); return [`Keliling persegi sisi ${s}?`, 4 * s, 'Keliling persegi = 4 x sisi.']; },
    ],
    4: [
      (r) => { const a = r.int(12, 49), b = r.int(3, 9); return [`${a} x ${b} = ?`, a * b, 'Kalikan puluhan dan satuan terpisah.']; },
      (r) => { const b = r.int(3, 9), h = r.int(12, 60); return [`${b * h} : ${b} = ?`, h, 'Bagi bersusun dari kiri.']; },
      (r) => { const a = r.pick([2, 3, 4, 6]), b = r.pick([3, 4, 5, 6, 8]); return [`KPK ${a} dan ${b} = ?`, lcm(a, b), 'Tulis kelipatan keduanya, cari yang sama.']; },
      (r) => { const k = r.pick([2, 3, 4, 6]), a = k * r.int(2, 5), b = k * r.int(2, 7); return [`FPB ${a} dan ${b} = ?`, gcd(a, b), 'Tulis faktor keduanya, cari yang terbesar.']; },
      (r) => { const p = r.int(4, 12), l = r.int(3, 9); return [`Luas ${p} x ${l} = ?`, p * l, 'Luas persegi panjang = p x l.']; },
      (r) => { const d = r.pick([2, 3, 4, 5]), k = r.int(2, 5); return [`1/${d} = ?/${d * k}`, k, `Kalikan atas dan bawah dengan ${k}.`]; },
    ],
    5: [
      (r) => { const d = r.pick([5, 7, 8, 9]), a = r.int(1, 3), b = r.int(1, d - a - 1); return [`${a}/${d} + ${b}/${d} = ?`, `${a + b}/${d}`, 'Penyebut sama: jumlahkan pembilangnya.', [`${a + b}/${2 * d}`, `${a + b + 1}/${d}`, `${Math.abs(a + b - 1)}/${d}`]]; },
      (r) => { const pc = r.pick([10, 20, 25, 50]), n = r.pick([40, 60, 80, 100, 120, 200]); return [`${pc}% dari ${n} = ?`, (pc * n) / 100, `${pc}% artinya ${pc} per 100.`]; },
      (r) => { const a = r.int(11, 39), b = r.int(11, 39); return [`${(a / 10).toFixed(1).replace('.', ',')} + ${(b / 10).toFixed(1).replace('.', ',')} = ?`, ((a + b) / 10).toFixed(1).replace('.', ','), 'Jumlahkan seperti biasa, koma sejajar.', [((a + b + 1) / 10).toFixed(1).replace('.', ','), ((a + b - 1) / 10).toFixed(1).replace('.', ','), ((a + b + 10) / 10).toFixed(1).replace('.', ',')]]; },
      (r) => { const s = r.int(2, 6); return [`Volume kubus sisi ${s}?`, s * s * s, 'Volume kubus = s x s x s.']; },
      (r) => { const a = 2 * r.int(2, 8), t = r.int(3, 9); return [`Luas segitiga a=${a}, t=${t}?`, (a * t) / 2, 'Luas segitiga = a x t : 2.']; },
      (r) => { const a = r.int(11, 25), b = r.int(11, 19); return [`${a} x ${b} = ?`, a * b, 'Pecah salah satu angka menjadi puluhan dan satuan.']; },
    ],
    6: [
      (r) => { const a = r.int(3, 15), b = r.int(a + 1, 25); return [`-${a} + ${b} = ?`, b - a, 'Mulai dari -' + a + ', maju ' + b + ' langkah.']; },
      (r) => { const a = r.int(2, 12), b = r.int(2, 12); return [`-${a} - ${b} = ?`, -a - b, 'Mengurangi berarti mundur di garis bilangan.']; },
      (r) => { const a = r.int(2, 9), b = r.int(2, 6), c = r.int(2, 6); return [`${a} + ${b} x ${c} = ?`, a + b * c, 'Kali dulu, baru tambah.', [(a + b) * c, a + b + c, a + b * c + 1]]; },
      (r) => { const x = [2, 3, 4, 5, 6][r.int(0, 4)], y = [4, 6, 8, 9, 10][r.int(0, 4)], z = r.pick([3, 5, 12]); return [`KPK ${x}, ${y}, ${z} = ?`, lcm(lcm(x, y), z), 'Cari kelipatan yang sama dari ketiganya.']; },
      (r) => { const n = r.int(3, 9), a = n * 5 + r.pick([-4, -2, 2, 4]), b = n * 5 - (a - n * 5), c = n * 5; return [`Rata-rata ${a}, ${b}, ${c - n}, ${c + n}?`, c, 'Jumlahkan semua, lalu bagi 4.']; },
      (r) => { const a = r.int(2, 12); return [`${a * a} akar kuadrat = ?`, a, `Berapa x dirinya sendiri = ${a * a}?`]; },
      (r) => { const a = r.int(2, 9), k = r.int(2, 6); return [`${a}:${a * k} = 2:?`, 2 * k, 'Perbandingan senilai: kalikan dengan angka yang sama.']; },
    ],
  };

  // Tiga pengecoh yang dekat dengan jawaban dan tidak kembar.
  function distract(ans, given, r) {
    const out = (given || []).filter((x) => String(x) !== String(ans));
    const num = typeof ans === 'number' ? ans : null;
    for (let d = 1; out.length < 3 && num !== null; d++) {
      const c = r.next() < 0.5 ? num + d * (d > 2 ? 2 : 1) : num - d;
      if (!out.some((x) => String(x) === String(c)) && String(c) !== String(ans) && (c >= 0 || ans < 0)) out.push(c);
      else if (!out.some((x) => String(x) === String(num + d + 10))) out.push(num + d + 10);
    }
    return out.slice(0, 3);
  }

  function buat(kelas, seed) {
    const k = Math.max(1, Math.min(6, kelas | 0 || 1));
    const r = makeRng(seed);
    r.next();
    const [teks, jawaban, hint, given] = r.pick(TEMPLATES[k])(r);
    const pilihan = [jawaban].concat(distract(jawaban, given, r));
    // Acak urutan dengan rng supaya tetap sama untuk seed yang sama.
    for (let i = pilihan.length - 1; i > 0; i--) {
      const j = Math.floor(r.next() * (i + 1));
      [pilihan[i], pilihan[j]] = [pilihan[j], pilihan[i]];
    }
    return { kelas: k, teks, ekspresi: teks, jawaban, pilihan, langkah: [hint] };
  }

  // Kelas soal ke-i dalam level untuk pemain kelas K. Kelas 5 -> 3, 4, 5. Kelas 1 -> 1, 1, 1.
  function kelasSoal(kelas, i) {
    const k = Math.max(1, Math.min(6, kelas | 0 || 1));
    return Math.max(1, k - 2 + (i % 3));
  }

  // Soal cerita PR di peti. Jawaban selalu bilangan bulat dan diketik. Tiap pembuat: [cerita, jawaban, langkah].
  const CERITA = {
    1: [
      (r) => { const a = r.int(3, 9), b = r.int(2, 9); return [`Aki Tyo memetik ${a} wortel pagi ini dan ${b} wortel sore ini. Berapa wortel yang dipetik Aki?`, a + b, [`Jumlahkan ${a} dan ${b}.`]]; },
      (r) => { const a = r.int(8, 18), b = r.int(2, 7); return [`Di kandang ada ${a} telur. Mamah Zahra mengambil ${b} telur. Berapa telur yang tersisa?`, a - b, [`Kurangi ${a} dengan ${b}.`]]; },
      (r) => { const a = r.int(2, 6), b = r.int(2, 6), c = r.int(1, 5); return [`Arka punya ${a} bintang merah, ${b} bintang biru, dan ${c} bintang hijau. Berapa semua bintangnya?`, a + b + c, [`Jumlahkan ${a} + ${b} dulu, lalu tambah ${c}.`]]; },
      (r) => { const a = r.int(3, 9), b = r.int(2, 8); return [`Ada ${a} ayam di kandang. Datang lagi ${b} ayam. Berapa ayam sekarang?`, a + b, [`Jumlahkan ${a} dan ${b}.`]]; },
      (r) => { const a = r.int(6, 15), b = r.int(1, 5); return [`Farah punya ${a} kelereng. Ia memberi ${b} kelereng kepada Arka. Berapa kelereng Farah sekarang?`, a - b, [`Kurangi ${a} dengan ${b}.`]]; },
      (r) => { const a = r.int(7, 14), b = r.int(2, 6); return [`Di sungai ada ${a} teratai. Sebanyak ${b} teratai sudah berbunga. Berapa teratai yang belum berbunga?`, a - b, [`Semua dikurangi yang berbunga: ${a} - ${b}.`]]; },
      (r) => { const a = r.int(4, 9), b = r.int(3, 9); return [`Arka melompat ${a} kali, lalu melompat lagi ${b} kali. Berapa kali Arka melompat?`, a + b, [`Hitung maju ${b} langkah dari ${a}.`]]; },
      (r) => { const a = r.int(3, 8), b = r.int(3, 8); return [`Bida menyusun ${a} apel di rak atas dan ${b} apel di rak bawah. Berapa apel semuanya?`, a + b, [`Jumlahkan apel di kedua rak.`]]; },
      (r) => { const a = r.int(9, 16), s = r.int(2, 7); return [`Ada ${a} burung di pohon. Beberapa burung terbang, tinggal ${s} burung. Berapa burung yang terbang?`, a - s, [`Yang terbang = ${a} - ${s}.`]]; },
      (r) => { const a = r.int(3, 9), b = r.int(2, 6); return [`Nadiya membawa ${a} buku. Arka membawa ${b} buku lebih banyak dari Nadiya. Berapa buku yang dibawa Arka?`, a + b, [`"Lebih banyak" berarti ditambah: ${a} + ${b}.`]]; },
      (r) => { const a = r.int(5, 12), b = r.int(1, 4); return [`Titu punya ${a} bola benang. Sebanyak ${b} bola menggelinding ke kolong. Berapa bola yang masih terlihat?`, a - b, [`Kurangi ${a} dengan ${b}.`]]; },
      (r) => { const a = r.int(4, 9), b = r.int(3, 9); return [`Ayah Hilmi menempa ${a} paku pagi hari dan ${b} paku siang hari. Berapa paku semuanya?`, a + b, [`Jumlahkan paku pagi dan siang.`]]; },
      (r) => { const a = r.int(8, 12), b = r.int(2, 7); return [`Di jalan kampung ada ${a} lampu. Sebanyak ${b} lampu sudah menyala. Berapa lampu yang belum menyala?`, a - b, [`Semua lampu dikurangi yang menyala.`]]; },
      (r) => { const b = r.int(2, 8); return [`Arka punya 10 koin. Ia membeli benih seharga ${b} koin. Berapa koin sisanya?`, 10 - b, [`Hitung mundur ${b} dari 10.`]]; },
      (r) => { const a = r.int(2, 7), b = r.int(2, 7); return [`Sapi minum ${a} ember air pagi hari dan ${b} ember sore hari. Berapa ember semuanya?`, a + b, [`Jumlahkan ${a} dan ${b}.`]]; },
    ],
    2: [
      (r) => { const a = r.int(5, 9), b = r.pick([2, 3, 4, 5]); return [`Ada ${b} keranjang. Tiap keranjang berisi ${a} telur. Berapa semua telurnya?`, a * b, [`${b} kali ${a}, atau jumlahkan ${a} sebanyak ${b} kali.`]]; },
      (r) => { const a = r.int(35, 80), b = r.int(12, 30); return [`Bida punya ${a} benih. Terjual ${b} benih. Berapa benih yang tersisa?`, a - b, ['Kurangi puluhan, lalu satuan.']]; },
      (r) => { const b = r.pick([2, 5, 10]), h = r.int(2, 9); return [`${b * h} kue dibagi rata kepada ${b} anak. Berapa kue yang didapat tiap anak?`, h, [`Bagi ${b * h} dengan ${b}.`]]; },
      (r) => { const b = r.int(2, 5), n = r.int(2, 9); return [`Satu bangku di alun-alun muat ${b} anak. Ada ${n} bangku. Berapa anak yang bisa duduk?`, n * b, [`${n} kali ${b}.`]]; },
      (r) => { const a = r.int(15, 45), b = r.int(12, 40); return [`Arka mengumpulkan ${a} bintang di misi pertama dan ${b} bintang di misi kedua. Berapa bintang semuanya?`, a + b, ['Jumlahkan puluhan, lalu satuan.']]; },
      (r) => { const a = r.int(40, 90), b = r.int(11, 35); return [`Ada ${a} ikan di sungai. Sebanyak ${b} ikan berenang ke hilir. Berapa ikan yang tersisa?`, a - b, ['Kurangi puluhan, lalu satuan.']]; },
      (r) => { const b = r.pick([2, 3, 4, 5]), h = r.int(3, 9); return [`Mamah Zahra membuat ${b * h} kue dan menaruhnya di ${b} piring sama banyak. Berapa kue di tiap piring?`, h, [`Bagi ${b * h} menjadi ${b} kelompok.`]]; },
      (r) => { const n = r.int(3, 9); return [`Tiap ayam bertelur 2 butir seminggu. Ada ${n} ayam. Berapa telur dalam seminggu?`, 2 * n, [`${n} kali 2.`]]; },
      (r) => { const n = r.int(2, 9); return [`Farah menghitung kaki ${n} ekor domba. Berapa kaki semuanya?`, 4 * n, [`Tiap domba punya 4 kaki: ${n} x 4.`]]; },
      (r) => { const n = r.int(2, 9); return [`Harga satu wortel 5 koin. Arka membeli ${n} wortel. Berapa koin yang dibayar?`, 5 * n, [`Loncat 5 sebanyak ${n} kali.`]]; },
      (r) => { const a = r.int(20, 40), b = r.int(5, 15), c = r.int(5, 15); return [`Ada ${a} anak di alun-alun. Sebanyak ${b} anak pulang, lalu ${c} anak datang. Berapa anak sekarang?`, a - b + c, [`Kurangi ${b} dulu, lalu tambah ${c}.`]]; },
      (r) => { const a = r.int(20, 50), b = r.int(15, 40); return [`Titu tidur ${a} menit pagi hari dan ${b} menit siang hari. Berapa menit Titu tidur?`, a + b, ['Jumlahkan kedua waktu tidur.']]; },
      (r) => { const n = r.int(3, 6), b = r.int(2, 5); return [`Ada ${n} anak. Masing-masing membawa ${b} apel. Berapa apel semuanya?`, n * b, [`${n} kali ${b}.`]]; },
      (r) => { const b = r.int(12, 38); return [`Bida punya 50 koin. Ia membeli benih seharga ${b} koin. Berapa sisa koinnya?`, 50 - b, [`50 dikurangi ${b}.`]]; },
      (r) => { const b = r.pick([2, 3, 4, 5]), h = r.int(2, 8); return [`Ada ${b * h} bunga ditanam dalam ${b} baris sama banyak. Berapa bunga di tiap baris?`, h, [`${b} x berapa = ${b * h}?`]]; },
    ],
    3: [
      (r) => { const n = r.int(3, 9), h = r.int(4, 9); return [`Farah membeli ${n} ikat gandum, satu ikat harganya ${h} koin. Ia membayar dengan ${n * h + 10} koin. Berapa kembaliannya?`, 10, [`Harga semua: ${n} x ${h} = ${n * h}.`, `Kembalian: ${n * h + 10} - ${n * h}.`]]; },
      (r) => { const s = r.int(6, 15), l = r.int(3, 5); return [`Pagar ladang berbentuk persegi panjang, panjangnya ${s} meter dan lebarnya ${l} meter. Berapa meter pagar yang dibutuhkan?`, 2 * (s + l), ['Keliling = 2 x (panjang + lebar).']]; },
      (r) => { const d = r.pick([2, 3, 4]), n = d * r.int(4, 12); return [`Ada ${n} ayam di kandang. Tepat 1/${d} dari ayam itu berwarna putih. Berapa ayam putih?`, n / d, [`Bagi ${n} dengan ${d}.`]]; },
      (r) => { const a = r.int(6, 12), b = r.int(3, 9); return [`Satu peti berisi ${a} koin. Arka membuka ${b} peti. Berapa koin yang ia dapat?`, a * b, [`${b} kali ${a}.`]]; },
      (r) => { const a = r.int(120, 480), b = r.int(110, 390); return [`Rak Nadiya berisi ${a} buku cerita dan ${b} buku hitung. Berapa buku semuanya?`, a + b, ['Jumlahkan ratusan, puluhan, lalu satuan.']]; },
      (r) => { const a = r.int(400, 900), b = r.int(120, a - 80); return [`Jarak rumah Arka ke sungai ${a} langkah. Ia sudah berjalan ${b} langkah. Berapa langkah lagi?`, a - b, [`${a} - ${b}.`]]; },
      (r) => { const d = r.int(3, 9), h = r.int(3, 9); return [`Ada ${d * h} telur dibagi rata ke ${d} keranjang. Berapa telur di tiap keranjang?`, h, [`${d} x berapa = ${d * h}?`]]; },
      (r) => { const s = r.int(4, 15); return [`Kolam ikan berbentuk persegi dengan sisi ${s} meter. Berapa meter keliling kolam?`, 4 * s, ['Keliling persegi = 4 x sisi.']]; },
      (r) => { const d = r.int(3, 8), h = r.int(4, 12); return [`Pita sepanjang ${d * h} cm dipotong menjadi ${d} bagian sama panjang. Berapa cm tiap bagian?`, h, [`Bagi ${d * h} dengan ${d}.`]]; },
      (r) => { const a = r.int(12, 30), d = r.int(3, 7); return [`Arka berlatih pedang ${a} menit tiap hari selama ${d} hari. Berapa menit semuanya?`, a * d, [`${a} x ${d}.`]]; },
      (r) => { const d = r.pick([2, 3, 4, 5]), n = d * r.int(3, 10); return [`Farah punya ${n} kelereng. Sebanyak 1/${d} kelerengnya berwarna biru. Berapa kelereng biru?`, n / d, [`Bagi ${n} dengan ${d}.`]]; },
      (r) => { const h = r.int(5, 9), n = r.int(3, 9); return [`Harga satu bibit ${h} koin. Ayah Hilmi membeli ${n} bibit dan membayar 100 koin. Berapa kembaliannya?`, 100 - n * h, [`Harga semua: ${n} x ${h} = ${n * h}.`, `Kembalian: 100 - ${n * h}.`]]; },
      (r) => { const a = r.int(3, 9), b = r.int(2, 5); return [`Di kandang ada ${a} ayam dan ${b} sapi. Berapa kaki semuanya?`, 2 * a + 4 * b, [`Kaki ayam: ${a} x 2. Kaki sapi: ${b} x 4.`, 'Jumlahkan keduanya.']]; },
      (r) => { const j = r.int(7, 10), d = r.int(1, 3); return [`Pertunjukan di alun-alun mulai pukul ${j}.00 dan selesai ${d} jam kemudian. Pukul berapa pertunjukan selesai? (tulis jamnya saja)`, j + d, [`${j} + ${d}.`]]; },
      (r) => { const rr = r.int(3, 6), k = r.int(4, 8), s = r.int(3, 9); return [`Rak Bida punya ${rr} susun, tiap susun berisi ${k} toples. Sebanyak ${s} toples sudah terjual. Berapa toples yang tersisa?`, rr * k - s, [`Semua toples: ${rr} x ${k} = ${rr * k}.`, `Sisa: ${rr * k} - ${s}.`]]; },
    ],
    4: [
      (r) => { const a = r.int(12, 35), b = r.int(12, 25); return [`Satu karung berisi ${a} kilogram gandum. Nadiya mencatat ada ${b} karung. Berapa kilogram semua gandum itu?`, a * b, ['Pecah salah satu angka jadi puluhan dan satuan.']]; },
      (r) => { const a = r.pick([4, 6, 8]), b = r.pick([6, 9, 10]); return [`Sapi diberi makan tiap ${a} jam, domba tiap ${b} jam. Keduanya baru makan bersamaan. Setelah berapa jam mereka makan bersamaan lagi?`, lcm(a, b), ['Cari KPK kedua angka.']]; },
      (r) => { const p = r.int(8, 20), l = r.int(4, 12); return [`Ladang baru panjangnya ${p} meter dan lebarnya ${l} meter. Berapa meter persegi luasnya?`, p * l, ['Luas = panjang x lebar.']]; },
      (r) => { const d = r.int(3, 8), h = r.int(12, 40); return [`Sebanyak ${d * h} kelereng dibagikan sama rata kepada ${d} anak. Berapa kelereng tiap anak?`, h, ['Bagi bersusun dari kiri.']]; },
      (r) => { const a = r.pick([3, 4, 6]), b = r.pick([5, 8, 9, 10]); return [`Lampu merah berkedip tiap ${a} detik, lampu kuning tiap ${b} detik. Keduanya baru berkedip bersamaan. Setelah berapa detik keduanya berkedip bersamaan lagi?`, lcm(a, b), ['Cari KPK kedua angka.']]; },
      (r) => { const k = r.pick([3, 4, 5, 6]), a = k * r.int(3, 7), b = k * r.int(2, 5); return [`Ada ${a} wortel dan ${b} telur. Keduanya dibagi ke bingkisan sama banyak, sebanyak mungkin bingkisan. Berapa bingkisan yang dibuat?`, gcd(a, b), ['Cari FPB kedua angka.']]; },
      (r) => { const p = r.int(15, 40), l = r.int(8, 20); return [`Taman kampung berbentuk persegi panjang, panjang ${p} meter dan lebar ${l} meter. Berapa meter kelilingnya?`, 2 * (p + l), ['Keliling = 2 x (panjang + lebar).']]; },
      (r) => { const k = r.int(6, 12), s = r.int(24, 36); return [`Sekolah Nadiya punya ${k} kelas. Tiap kelas ada ${s} murid. Berapa murid semuanya?`, k * s, ['Kalikan puluhan dan satuan terpisah.']]; },
      (r) => { const a = r.int(15, 45), w = r.int(4, 12); return [`Arka menabung ${a} koin tiap minggu. Berapa koin tabungannya setelah ${w} minggu?`, a * w, [`${a} x ${w}.`]]; },
      (r) => { const a = r.int(1200, 2500), b = r.int(350, 1100); return [`Panjang sungai kampung ${a} meter. Perahu sudah berlayar ${b} meter. Berapa meter lagi sampai ujung sungai?`, a - b, ['Kurangi ribuan, ratusan, puluhan, lalu satuan.']]; },
      (r) => { const a = r.int(12, 25), b = r.int(4, 9), c = r.int(10, 40); return [`Satu bungkus berisi ${a} benih. Bida punya ${b} bungkus dan sudah menanam ${c} benih. Berapa benih yang tersisa?`, a * b - c, [`Semua benih: ${a} x ${b}.`, `Lalu kurangi ${c}.`]]; },
      (r) => { const d = r.pick([8, 10, 12]), m = r.int(2, 4), f = r.int(1, 3); return [`Sebuah kue dipotong menjadi ${d} bagian sama besar. Arka makan ${m} bagian dan Farah ${f} bagian. Berapa bagian yang tersisa?`, d - m - f, [`${d} - ${m} - ${f}.`]]; },
      (r) => { const w = r.int(4, 9), p = r.int(6, 15); return [`Luas kebun bunga ${w * p} meter persegi. Lebarnya ${w} meter. Berapa meter panjangnya?`, p, [`Panjang = luas : lebar = ${w * p} : ${w}.`]]; },
      (r) => { const b = r.int(6, 12), n = r.int(5, 12); return [`Sebanyak ${b * n} murid berbaris rapi, tiap baris ${b} murid. Berapa barisnya?`, n, [`Bagi ${b * n} dengan ${b}.`]]; },
      (r) => { const a = r.int(35, 80), b = r.int(35, 80), c = r.int(35, 80); return [`Tiga perahu membawa ${a}, ${b}, dan ${c} karung beras. Berapa karung semuanya?`, a + b + c, ['Jumlahkan dua angka dulu, lalu tambah yang ketiga.']]; },
    ],
    5: [
      (r) => { const n = r.pick([200, 400, 500, 800]), pc = r.pick([10, 20, 25, 50]); return [`Arka punya ${n} koin. Ia menyedekahkan ${pc}% koinnya. Berapa koin yang disedekahkan?`, (n * pc) / 100, [`${pc}% dari ${n} = ${pc} : 100 x ${n}.`]]; },
      (r) => { const p = r.int(4, 9), l = r.int(3, 6), t = r.int(2, 5); return [`Peti Ayah Hilmi berbentuk balok, panjang ${p}, lebar ${l}, dan tinggi ${t} jengkal. Berapa jengkal kubik volumenya?`, p * l * t, ['Volume = p x l x t.']]; },
      (r) => { const v = r.pick([40, 50, 60]), h = r.int(2, 5); return [`Gerobak kampung melaju ${v} km per jam selama ${h} jam. Berapa km jaraknya?`, v * h, ['Jarak = kecepatan x waktu.']]; },
      (r) => { const h = r.pick([100, 200, 400]), p = r.pick([10, 20, 25, 50]); return [`Harga sepatu ${h} koin. Ada diskon ${p}%. Berapa koin harganya sekarang?`, h - (h * p) / 100, [`Potongan: ${p}% dari ${h} = ${(h * p) / 100}.`, 'Harga baru = harga - potongan.']]; },
      (r) => { const p = r.int(3, 8), l = r.int(2, 6), t = r.int(1, 3); return [`Kolam berbentuk balok, panjang ${p} m, lebar ${l} m, dan dalam ${t} m. Berapa meter kubik air untuk mengisinya penuh?`, p * l * t, ['Volume = p x l x t.']]; },
      (r) => { const v = r.pick([10, 12, 15, 20]), h = r.int(2, 5); return [`Sepeda Arka melaju ${v} km per jam. Berapa jam waktu yang ia perlukan untuk menempuh ${v * h} km?`, h, ['Waktu = jarak : kecepatan.']]; },
      (r) => { const k = r.int(5, 25); return [`Arka punya ${4 * k} koin. Sebanyak 3/4 koinnya diberikan kepada Farah. Berapa koin yang diterima Farah?`, 3 * k, [`1/4 dari ${4 * k} = ${k}.`, `3/4 = 3 x ${k}.`]]; },
      (r) => { const n = r.pick([20, 40, 60, 80, 100]), p = r.pick([10, 20, 25, 50]); return [`Ada ${n} murid. Sebanyak ${p}% murid suka matematika. Berapa murid yang suka matematika?`, (n * p) / 100, [`${p}% dari ${n} = ${p} : 100 x ${n}.`]]; },
      (r) => { const s = r.int(3, 9); return [`Sebuah kubus mainan sisinya ${s} cm. Berapa cm kubik volumenya?`, s * s * s, ['Volume kubus = s x s x s.']]; },
      (r) => { const d = r.int(3, 7), h = r.int(6, 15); return [`Ayah Hilmi menempa ${d * h} pedang dalam ${d} hari, sama banyak tiap hari. Berapa pedang tiap hari?`, h, [`Bagi ${d * h} dengan ${d}.`]]; },
      (r) => { const k = r.pick([2, 5, 10]), j = r.int(3, 12); return [`Skala peta kampung 1 : ${k * 100}. Jarak dua rumah pada peta ${j} cm. Berapa meter jarak sebenarnya?`, j * k, [`${j} cm x ${k * 100} = ${j * k * 100} cm.`, 'Ubah ke meter: bagi 100.']]; },
      (r) => { const a = r.int(4, 12), j = r.int(7, 10), d = r.int(3, 6); return [`Rumah Ramuan membuat ${a} botol ramuan tiap jam, dari pukul ${j}.00 sampai pukul ${j + d}.00. Berapa botol yang dibuat?`, a * d, [`Lamanya ${d} jam.`, `${a} x ${d}.`]]; },
      (r) => { const k = r.int(8, 30); return [`Farah sudah membaca ${2 * k} halaman, yaitu 2/5 dari bukunya. Berapa halaman seluruh bukunya?`, 5 * k, [`1/5 buku = ${2 * k} : 2 = ${k} halaman.`, `Seluruh buku = 5 x ${k}.`]]; },
      (r) => { const a = r.int(3, 8), b = a + 2 * r.int(1, 4), t = 2 * r.int(2, 5); return [`Ladang berbentuk trapesium. Sisi sejajarnya ${a} m dan ${b} m, tingginya ${t} m. Berapa meter persegi luasnya?`, ((a + b) * t) / 2, ['Luas trapesium = (a + b) x t : 2.']]; },
      (r) => { const opts = [[200, 5], [250, 4], [500, 2]], [a, m] = r.pick(opts), b = m * r.int(2, 6); return [`Arka berlari ${a} meter tiap putaran, sebanyak ${b} putaran. Berapa kilometer jarak yang ia tempuh?`, (a * b) / 1000, [`Jarak: ${a} x ${b} = ${a * b} meter.`, 'Ubah ke km: bagi 1000.']]; },
    ],
    6: [
      (r) => { const a = r.int(5, 12), b = a + r.int(3, 9); return [`Suhu puncak menara -${a} derajat. Siang hari naik ${b} derajat. Berapa derajat suhunya sekarang?`, b - a, [`Mulai dari -${a}, naik ${b}.`]]; },
      (r) => { const k = r.int(2, 5), a = 2 * k, b = 3 * k, tot = (a + b) * r.int(2, 6); return [`Perbandingan koin Arka dan Farah ${a}:${b}. Jumlah koin mereka ${tot}. Berapa koin Arka?`, (tot * a) / (a + b), [`Bagian Arka = ${a}/${a + b} dari ${tot}.`]]; },
      (r) => { const m = r.int(6, 12), v = [m - 2, m + 3, m - 1, m]; return [`Hasil panen 4 hari: ${v.join(', ')} ikat. Berapa rata-rata panen tiap hari?`, m, [`Jumlah semua, lalu bagi 4.`]]; },
      (r) => { const a = r.int(4, 12), b = a + r.int(2, 9); return [`Ember di dasar sumur berada di -${a} meter. Ember ditarik naik ${b} meter. Di berapa meter ember sekarang?`, b - a, [`Mulai dari -${a}, naik ${b}.`]]; },
      (r) => { const d = r.pick([5, 8, 10, 12]), m = r.int(4, 15); return [`Debit air keran ${d} liter per menit. Berapa menit untuk mengisi bak ${d * m} liter?`, m, ['Waktu = volume : debit.']]; },
      (r) => { const m = r.int(70, 85), a = m + r.int(-6, 6), b = m + r.int(-6, 6); return [`Rata-rata nilai tiga ulangan Arka ${m}. Nilai dua ulangan pertama ${a} dan ${b}. Berapa nilai ulangan ketiga?`, 3 * m - a - b, [`Jumlah ketiganya = 3 x ${m} = ${3 * m}.`, `Nilai ketiga = ${3 * m} - ${a} - ${b}.`]]; },
      (r) => { const a = r.int(2, 5), b = r.int(2, 5), k = r.int(3, 8); return [`Perbandingan ayam dan domba di kandang ${a}:${b}. Ada ${a * k} ayam. Berapa domba?`, b * k, [`${a * k} : ${a} = ${k}.`, `Domba = ${b} x ${k}.`]]; },
      (r) => { const a = r.int(20, 60), b = r.int(2, 5), c = r.int(10, 25), d = r.int(10, 30); return [`Arka punya ${a} koin. Ia membuka ${b} peti berisi ${c} koin, lalu membeli benih ${d} koin. Berapa koinnya sekarang?`, a + b * c - d, [`Peti: ${b} x ${c} = ${b * c}.`, `${a} + ${b * c} - ${d}.`]]; },
      (r) => { const s = r.int(3, 9); return [`Bak air berbentuk kubus dengan sisi ${s} dm. Berapa liter isinya bila penuh? (1 dm kubik = 1 liter)`, s * s * s, ['Volume kubus = s x s x s.']]; },
      (r) => { const a = r.int(3, 12), b = r.int(5, 20); return [`Suhu malam di puncak menara -${a} derajat, siang hari ${b} derajat. Berapa derajat selisihnya?`, a + b, [`Dari -${a} ke 0 ada ${a}, dari 0 ke ${b} ada ${b}.`]]; },
      (r) => { const x = r.pick([2, 3, 4]), y = r.pick([5, 6, 8]), z = r.pick([9, 10, 12]); return [`Tiga lampu kampung berkedip tiap ${x}, ${y}, dan ${z} detik. Ketiganya baru berkedip bersamaan. Setelah berapa detik ketiganya berkedip bersamaan lagi?`, lcm(lcm(x, y), z), ['Cari KPK ketiga angka.']]; },
      (r) => { const k = r.pick([100, 200, 500]), j = r.int(2, 9); return [`Skala peta 1 : ${k * 1000}. Jarak dua desa pada peta ${j} cm. Berapa kilometer jarak sebenarnya?`, (j * k) / 100, [`${j} x ${k * 1000} = ${j * k * 1000} cm.`, 'Ubah ke km: bagi 100.000.']]; },
      (r) => { const j = r.int(6, 10), v = r.pick([10, 12, 15]), h = r.int(2, 4); return [`Perahu berangkat pukul ${j}.00 dengan kecepatan ${v} km per jam dan menempuh ${v * h} km. Pukul berapa perahu tiba? (tulis jamnya saja)`, j + h, [`Lama perjalanan: ${v * h} : ${v} = ${h} jam.`]]; },
      (r) => { const s = r.int(6, 15); return [`Kebun berbentuk persegi luasnya ${s * s} meter persegi. Berapa meter panjang sisinya?`, s, [`Cari angka yang dikali dirinya sendiri = ${s * s}.`]]; },
      (r) => { const h = r.pick([100, 200, 400, 500]), p = r.pick([10, 20, 25, 50]); return [`Harga tombak ${h} koin, lalu naik ${p}%. Berapa koin harganya sekarang?`, h + (h * p) / 100, [`Kenaikan: ${p}% dari ${h} = ${(h * p) / 100}.`, 'Harga baru = harga lama + kenaikan.']]; },
    ],
  };
  // pilih: urutan bentuk soal. Peti berurutan mendapat bentuk berbeda; angka tetap dari seed.
  function cerita(kelas, seed, pilih) {
    const k = Math.max(1, Math.min(6, kelas | 0 || 1));
    const r = makeRng(seed);
    r.next();
    const list = CERITA[k];
    const make = Number.isInteger(pilih) ? list[((pilih % list.length) + list.length) % list.length] : r.pick(list);
    const [teks, jawaban, langkah] = make(r);
    return { kelas: k, teks, jawaban, langkah };
  }

  const untukLevel = (kelas, i, seed) => buat(kelasSoal(kelas, i), seed);
  const periksa = (q, v) => String(q.jawaban) === String(v);

  return { buat, untukLevel, kelasSoal, periksa, cerita, TEMPLATES, CERITA };
});
