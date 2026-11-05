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
    ],
    2: [
      (r) => { const a = r.int(5, 9), b = r.pick([2, 3, 4, 5]); return [`Ada ${b} keranjang. Tiap keranjang berisi ${a} telur. Berapa semua telurnya?`, a * b, [`${b} kali ${a}, atau jumlahkan ${a} sebanyak ${b} kali.`]]; },
      (r) => { const a = r.int(35, 80), b = r.int(12, 30); return [`Bida punya ${a} benih. Terjual ${b} benih. Berapa benih yang tersisa?`, a - b, ['Kurangi puluhan, lalu satuan.']]; },
      (r) => { const b = r.pick([2, 5, 10]), h = r.int(2, 9); return [`${b * h} kue dibagi rata kepada ${b} anak. Berapa kue yang didapat tiap anak?`, h, [`Bagi ${b * h} dengan ${b}.`]]; },
    ],
    3: [
      (r) => { const n = r.int(3, 9), h = r.int(4, 9); return [`Farah membeli ${n} ikat gandum, satu ikat harganya ${h} koin. Ia membayar dengan ${n * h + 10} koin. Berapa kembaliannya?`, 10, [`Harga semua: ${n} x ${h} = ${n * h}.`, `Kembalian: ${n * h + 10} - ${n * h}.`]]; },
      (r) => { const s = r.int(6, 15), l = r.int(3, 5); return [`Pagar ladang berbentuk persegi panjang, panjangnya ${s} meter dan lebarnya ${l} meter. Berapa meter pagar yang dibutuhkan?`, 2 * (s + l), ['Keliling = 2 x (panjang + lebar).']]; },
      (r) => { const d = r.pick([2, 3, 4]), n = d * r.int(4, 12); return [`Ada ${n} ayam di kandang. Tepat 1/${d} dari ayam itu berwarna putih. Berapa ayam putih?`, n / d, [`Bagi ${n} dengan ${d}.`]]; },
    ],
    4: [
      (r) => { const a = r.int(12, 35), b = r.int(12, 25); return [`Satu karung berisi ${a} kilogram gandum. Nadiya mencatat ada ${b} karung. Berapa kilogram semua gandum itu?`, a * b, ['Pecah salah satu angka jadi puluhan dan satuan.']]; },
      (r) => { const a = r.pick([4, 6, 8]), b = r.pick([6, 9, 10]); return [`Sapi diberi makan tiap ${a} jam, domba tiap ${b} jam. Keduanya baru makan bersamaan. Setelah berapa jam mereka makan bersamaan lagi?`, lcm(a, b), ['Cari KPK kedua angka.']]; },
      (r) => { const p = r.int(8, 20), l = r.int(4, 12); return [`Ladang baru panjangnya ${p} meter dan lebarnya ${l} meter. Berapa meter persegi luasnya?`, p * l, ['Luas = panjang x lebar.']]; },
    ],
    5: [
      (r) => { const n = r.pick([200, 400, 500, 800]), pc = r.pick([10, 20, 25, 50]); return [`Arka punya ${n} koin. Ia menyedekahkan ${pc}% koinnya. Berapa koin yang disedekahkan?`, (n * pc) / 100, [`${pc}% dari ${n} = ${pc} : 100 x ${n}.`]]; },
      (r) => { const p = r.int(4, 9), l = r.int(3, 6), t = r.int(2, 5); return [`Peti Ayah Hilmi berbentuk balok, panjang ${p}, lebar ${l}, dan tinggi ${t} jengkal. Berapa jengkal kubik volumenya?`, p * l * t, ['Volume = p x l x t.']]; },
      (r) => { const v = r.pick([40, 50, 60]), h = r.int(2, 5); return [`Gerobak kampung melaju ${v} km per jam selama ${h} jam. Berapa km jaraknya?`, v * h, ['Jarak = kecepatan x waktu.']]; },
    ],
    6: [
      (r) => { const a = r.int(5, 12), b = a + r.int(3, 9); return [`Suhu puncak menara -${a} derajat. Siang hari naik ${b} derajat. Berapa derajat suhunya sekarang?`, b - a, [`Mulai dari -${a}, naik ${b}.`]]; },
      (r) => { const k = r.int(2, 5), a = 2 * k, b = 3 * k, tot = (a + b) * r.int(2, 6); return [`Perbandingan koin Arka dan Farah ${a}:${b}. Jumlah koin mereka ${tot}. Berapa koin Arka?`, (tot * a) / (a + b), [`Bagian Arka = ${a}/${a + b} dari ${tot}.`]]; },
      (r) => { const m = r.int(6, 12), v = [m - 2, m + 3, m - 1, m]; return [`Hasil panen 4 hari: ${v.join(', ')} ikat. Berapa rata-rata panen tiap hari?`, m, [`Jumlah semua, lalu bagi 4.`]]; },
    ],
  };
  function cerita(kelas, seed) {
    const k = Math.max(1, Math.min(6, kelas | 0 || 1));
    const r = makeRng(seed);
    r.next();
    const [teks, jawaban, langkah] = r.pick(CERITA[k])(r);
    return { kelas: k, teks, jawaban, langkah };
  }

  const untukLevel = (kelas, i, seed) => buat(kelasSoal(kelas, i), seed);
  const periksa = (q, v) => String(q.jawaban) === String(v);

  return { buat, untukLevel, kelasSoal, periksa, cerita, TEMPLATES, CERITA };
});
